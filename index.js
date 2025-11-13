import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
dotenv.config();

// ============================
// CONFIGURAÇÕES
// ============================
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WORKING_DIR = process.env.WORKING_DIR || process.cwd();
const AUTHORIZED_CHAT_IDS = process.env.AUTHORIZED_CHAT_ID
  ? process.env.AUTHORIZED_CHAT_ID.split(',').map(id => id.trim())
  : [];
const CLAUDE_CODE_PATH = process.env.CLAUDE_CODE_PATH || 'claude';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!TELEGRAM_TOKEN) {
  console.error('❌ Erro: Configure TELEGRAM_BOT_TOKEN no arquivo .env');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Inicializar OpenAI (opcional, só se tiver API key)
let openai = null;
if (OPENAI_API_KEY && OPENAI_API_KEY !== 'sua_api_key_aqui') {
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  console.log('✅ OpenAI Whisper habilitado para transcrição de áudio');
} else {
  console.log('⚠️ OpenAI API key não configurada - áudio será salvo sem transcrição');
}

// Map de sessões: chatId -> { process, sessionId, buffer }
const sessions = new Map();

// ============================
// UTILITÁRIOS
// ============================

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function splitMessage(text, maxLength = 4000) {
  if (text.length <= maxLength) return [text];

  const parts = [];
  let currentPart = '';
  const lines = text.split('\n');

  for (const line of lines) {
    if ((currentPart + line + '\n').length > maxLength) {
      if (currentPart) parts.push(currentPart);
      currentPart = line + '\n';
    } else {
      currentPart += line + '\n';
    }
  }

  if (currentPart) parts.push(currentPart);
  return parts;
}

async function sendMessage(chatId, text, options = {}) {
  if (!text || text.trim() === '') return;

  const parts = splitMessage(text);

  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const prefix = parts.length > 1 ? `[${i + 1}/${parts.length}]\n` : '';
    try {
      await bot.sendMessage(chatId, prefix + parts[i], isLast ? options : {});
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
    }
  }
}

// ============================
// CRIAR SESSÃO STREAM JSON
// ============================

function createClaudeSession(chatId) {
  console.log(`\n🚀 [${chatId}] Criando sessão stream...`);

  const sessionId = generateUUID();

  // Iniciar Claude em modo stream-json
  // No Windows, usar .cmd explicitamente
  const claudeCmd = CLAUDE_CODE_PATH.endsWith('.cmd') ? CLAUDE_CODE_PATH : CLAUDE_CODE_PATH + '.cmd';

  const claudeProcess = spawn(claudeCmd, [
    '--print',
    '--verbose',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--replay-user-messages',
    '--session-id', sessionId,
    '--dangerously-skip-permissions'
  ], {
    cwd: WORKING_DIR,
    shell: true,
    windowsHide: true
  });

  const session = {
    process: claudeProcess,
    sessionId: sessionId,
    buffer: '',
    active: true,
    messageBuffer: new Map() // messageId -> content acumulado
  };

  sessions.set(chatId, session);

  // ============================
  // PROCESSAR OUTPUT STREAM JSON
  // ============================

  claudeProcess.stdout.on('data', (data) => {
    session.buffer += data.toString();
    processStreamBuffer(chatId, session);
  });

  claudeProcess.stderr.on('data', (data) => {
    const text = data.toString();
    console.log(`⚠️ [${chatId}] Stderr: ${text}`);
  });

  claudeProcess.on('error', (error) => {
    console.error(`❌ [${chatId}] Erro no processo:`, error);
    bot.sendMessage(chatId, `❌ Erro: ${error.message}`);
    sessions.delete(chatId);
  });

  claudeProcess.on('close', (code) => {
    console.log(`🔴 [${chatId}] Sessão encerrada (code: ${code})`);
    bot.sendMessage(chatId, `🔴 Sessão Claude encerrada (código: ${code})`);
    sessions.delete(chatId);
  });

  console.log(`✅ [${chatId}] Sessão criada! Session ID: ${sessionId}`);
  return session;
}

// ============================
// PROCESSAR BUFFER STREAM JSON
// ============================

function processStreamBuffer(chatId, session) {
  const lines = session.buffer.split('\n');

  // Guardar última linha incompleta
  session.buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const event = JSON.parse(line);
      handleStreamEvent(chatId, session, event);
    } catch (error) {
      console.log(`⚠️ [${chatId}] Linha não-JSON ignorada: ${line.substring(0, 100)}`);
    }
  }
}

// ============================
// PROCESSAR EVENTOS STREAM
// ============================

const pendingMessages = new Map(); // chatId -> { messageId, content, timeout }

function handleStreamEvent(chatId, session, event) {
  // Log apenas eventos importantes (não logar cada stream_event)
  if (event.type !== 'stream_event') {
    const preview = JSON.stringify(event).substring(0, 80);
    console.log(`📨 [${chatId}] ${event.type}: ${preview}...`);
  }

  switch (event.type) {
    case 'user':
      // Confirmação da mensagem enviada (replay)
      console.log(`✅ [${chatId}] Mensagem confirmada`);
      break;

    case 'assistant':
      // Mensagem completa do assistente - NÃO enviar aqui para evitar duplicação
      // As mensagens já foram enviadas via streaming parcial (content_block_delta)
      console.log(`✅ [${chatId}] Mensagem completa recebida (já enviada via streaming)`);
      break;

    case 'stream_event':
      // Evento de streaming aninhado
      if (event.event) {
        handleStreamingSubEvent(chatId, session, event.event);
      }
      break;

    case 'result':
      // Resultado final - apenas log (mensagem já foi enviada via streaming)
      const success = event.subtype === 'success' ? '✅' : '❌';
      const duration = event.duration_ms ? `${Math.round(event.duration_ms / 1000)}s` : 'N/A';
      console.log(`${success} [${chatId}] Resultado final - Duração: ${duration}`);
      break;

    case 'system':
      // Mensagem do sistema - ignorar silenciosamente
      break;

    case 'error':
      sendMessage(chatId, `❌ Erro: ${event.message || 'Erro desconhecido'}`);
      break;

    default:
      // Ignorar silenciosamente
      break;
  }
}

function handleStreamingSubEvent(chatId, session, subEvent) {
  switch (subEvent.type) {
    case 'content_block_delta':
      // Conteúdo parcial chegando
      if (subEvent.delta?.text) {
        accumulatePartialMessage(chatId, subEvent.delta.text);
      }
      break;

    case 'message_start':
      console.log(`🎬 [${chatId}] Claude começou a responder`);
      break;

    case 'message_stop':
      // Forçar flush da mensagem parcial
      flushPartialMessage(chatId);
      console.log(`🏁 [${chatId}] Claude terminou de responder`);
      break;

    case 'content_block_start':
    case 'content_block_stop':
      // Eventos de controle, ignorar
      break;

    default:
      break;
  }
}

// ============================
// ACUMULAR MENSAGENS PARCIAIS
// ============================

function accumulatePartialMessage(chatId, deltaText) {
  if (!pendingMessages.has(chatId)) {
    pendingMessages.set(chatId, {
      content: '',
      timeout: null,
      lastSent: ''
    });
  }

  const pending = pendingMessages.get(chatId);
  pending.content += deltaText; // Adicionar incrementalmente

  // Cancelar timeout anterior
  if (pending.timeout) {
    clearTimeout(pending.timeout);
  }

  // Enviar após 1.5 segundos de silêncio, ou se acumulou muito (>800 chars novos)
  const newChars = pending.content.length - pending.lastSent.length;
  const shouldSendNow = newChars > 800;

  if (shouldSendNow) {
    flushPartialMessage(chatId);
  } else {
    pending.timeout = setTimeout(() => flushPartialMessage(chatId), 1500);
  }
}

async function flushPartialMessage(chatId) {
  const pending = pendingMessages.get(chatId);
  if (!pending || !pending.content || pending.content === pending.lastSent) return;

  // Enviar apenas o que é novo (diff)
  const newContent = pending.content.substring(pending.lastSent.length);

  if (newContent.trim()) {
    await sendMessage(chatId, `🤖 ${newContent}`);
    pending.lastSent = pending.content;
  }

  if (pending.timeout) {
    clearTimeout(pending.timeout);
    pending.timeout = null;
  }
}

// ============================
// PROCESSAR FOTO
// ============================

async function handlePhotoMessage(chatId, photo) {
  const session = sessions.get(chatId);

  if (!session || !session.active) {
    await bot.sendMessage(chatId, '⚠️ Nenhuma sessão ativa. Use /start primeiro.');
    return;
  }

  console.log(`📸 [${chatId}] Processando foto...`);
  await bot.sendChatAction(chatId, 'typing');

  try {
    // Pegar a maior resolução disponível
    const photoFile = photo[photo.length - 1];
    const file = await bot.getFile(photoFile.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;

    // Baixar arquivo
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');

    // Detectar tipo MIME
    const ext = path.extname(file.file_path).toLowerCase();
    const mediaType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      ext === '.png' ? 'image/png' :
                      ext === '.gif' ? 'image/gif' :
                      ext === '.webp' ? 'image/webp' : 'image/jpeg';

    console.log(`📸 [${chatId}] Foto baixada (${(buffer.byteLength / 1024).toFixed(1)} KB, ${mediaType})`);

    // Limpar buffer de mensagens pendentes
    if (pendingMessages.has(chatId)) {
      flushPartialMessage(chatId);
      pendingMessages.get(chatId).content = '';
      pendingMessages.get(chatId).lastSent = '';
    }

    // Enviar para Claude no formato stream-json com imagem
    const jsonMessage = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image
            }
          },
          {
            type: 'text',
            text: 'O que você vê nesta imagem?'
          }
        ]
      },
      session_id: session.sessionId,
      parent_tool_use_id: null
    }) + '\n';

    session.process.stdin.write(jsonMessage);
    console.log(`✅ [${chatId}] Foto enviada para Claude`);

  } catch (error) {
    console.error(`❌ [${chatId}] Erro ao processar foto:`, error);
    await bot.sendMessage(chatId, `❌ Erro ao processar foto: ${error.message}`);
  }
}

// ============================
// PROCESSAR ÁUDIO/VOZ
// ============================

async function handleVoiceMessage(chatId, voice) {
  const session = sessions.get(chatId);

  if (!session || !session.active) {
    await bot.sendMessage(chatId, '⚠️ Nenhuma sessão ativa. Use /start primeiro.');
    return;
  }

  console.log(`🎤 [${chatId}] Processando áudio...`);
  await bot.sendChatAction(chatId, 'typing');

  let tempFile = null;

  try {
    const file = await bot.getFile(voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;

    // Baixar arquivo
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();

    // Salvar temporariamente
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempFile = path.join(tempDir, `voice_${Date.now()}.ogg`);
    fs.writeFileSync(tempFile, Buffer.from(buffer));

    console.log(`🎤 [${chatId}] Áudio salvo (${(buffer.byteLength / 1024).toFixed(1)} KB)`);

    // Se OpenAI está configurado, transcrever
    if (openai) {
      console.log(`🎙️ [${chatId}] Transcrevendo com Whisper...`);

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFile),
        model: 'whisper-1',
        language: 'pt', // Português
        response_format: 'text'
      });

      console.log(`✅ [${chatId}] Transcrição: "${transcription.substring(0, 100)}..."`);

      // Enviar transcrição para o usuário
      await bot.sendMessage(chatId, `🎤 *Áudio transcrito:*\n\n"${transcription}"`, { parse_mode: 'Markdown' });

      // Enviar transcrição para Claude
      sendToClaudeSession(chatId, transcription);

      // Limpar arquivo imediatamente após transcrever
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
        console.log(`🗑️ [${chatId}] Áudio temporário removido`);
      }

    } else {
      // Sem OpenAI configurado
      await bot.sendMessage(chatId,
        '🎤 *Áudio recebido!*\n\n' +
        'ℹ️ Para habilitar transcrição automática:\n' +
        '1. Configure `OPENAI_API_KEY` no arquivo .env\n' +
        '2. Reinicie o bot\n\n' +
        `Arquivo salvo em: \`${tempFile}\``,
        { parse_mode: 'Markdown' }
      );

      // Limpar arquivo depois de 5 minutos
      setTimeout(() => {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.log(`🗑️ [${chatId}] Áudio temporário removido`);
        }
      }, 5 * 60 * 1000);
    }

  } catch (error) {
    console.error(`❌ [${chatId}] Erro ao processar áudio:`, error);

    // Limpar arquivo em caso de erro
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    await bot.sendMessage(chatId, `❌ Erro ao processar áudio: ${error.message}`);
  }
}

// ============================
// ENVIAR MENSAGEM PARA CLAUDE
// ============================

function sendToClaudeSession(chatId, message) {
  const session = sessions.get(chatId);

  if (!session || !session.active) {
    bot.sendMessage(chatId, '⚠️ Nenhuma sessão ativa. Use /start primeiro.');
    return false;
  }

  console.log(`💬 [${chatId}] Enviando: "${message}"`);

  // Limpar buffer de mensagens pendentes antes de enviar nova mensagem
  if (pendingMessages.has(chatId)) {
    flushPartialMessage(chatId);
    pendingMessages.get(chatId).content = '';
    pendingMessages.get(chatId).lastSent = '';
  }

  try {
    // Formato stream-json correto
    const jsonMessage = JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: message
      },
      session_id: session.sessionId,
      parent_tool_use_id: null
    }) + '\n';
    session.process.stdin.write(jsonMessage);
    return true;
  } catch (error) {
    console.error(`❌ [${chatId}] Erro ao enviar:`, error);
    bot.sendMessage(chatId, `❌ Erro ao enviar: ${error.message}`);
    return false;
  }
}

// ============================
// HANDLERS TELEGRAM
// ============================

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const chatType = msg.chat.type; // 'private', 'group', 'supergroup'
  const isGroup = chatType === 'group' || chatType === 'supergroup';

  // Verificar autorização
  if (AUTHORIZED_CHAT_IDS.length > 0 && !AUTHORIZED_CHAT_IDS.includes(chatId.toString())) {
    await bot.sendMessage(chatId, '❌ Acesso não autorizado.');
    console.log(`⚠️ Acesso negado: ${chatId} (${chatType})`);
    return;
  }

  // Log do chat ID (útil para descobrir IDs de grupos)
  if (AUTHORIZED_CHAT_IDS.length === 0) {
    const chatName = msg.chat.title || msg.chat.username || msg.chat.first_name || 'Desconhecido';
    console.log(`📱 Chat ID: ${chatId} | Tipo: ${chatType} | Nome: ${chatName} (configure no .env)`);
  }

  // ============================
  // PROCESSAR FOTO
  // ============================
  if (msg.photo) {
    await handlePhotoMessage(chatId, msg.photo);
    return;
  }

  // ============================
  // PROCESSAR ÁUDIO/VOZ
  // ============================
  if (msg.voice || msg.audio) {
    await handleVoiceMessage(chatId, msg.voice || msg.audio);
    return;
  }

  // ============================
  // COMANDOS
  // ============================

  if (text === '/start') {
    // Encerrar sessão anterior se existir
    const oldSession = sessions.get(chatId);
    if (oldSession?.process) {
      oldSession.process.kill();
      sessions.delete(chatId);
      pendingMessages.delete(chatId);
    }

    // Criar nova sessão
    const session = createClaudeSession(chatId);

    const chatIcon = isGroup ? '👥' : '💬';
    const chatTypeText = isGroup ? 'grupo (sessão compartilhada)' : 'chat privado';

    await bot.sendMessage(chatId,
      `🚀 *Sessão Claude Code Stream Iniciada!*\n\n` +
      `${chatIcon} *Tipo:* ${chatTypeText}\n` +
      `✨ *Modo Stream JSON Ativo*\n` +
      `• Mensagens em tempo real via stream\n` +
      `• Atualizações parciais enquanto Claude pensa\n` +
      `• Notificações de ferramentas sendo executadas\n` +
      `• 📸 Suporte a imagens (visão)\n` +
      `• 🎤 Suporte a áudio/voz${openai ? ' com transcrição Whisper' : ''}\n\n` +
      `📝 Session ID: \`${session.sessionId}\`\n` +
      `📁 Diretório: \`${WORKING_DIR}\`\n` +
      (openai ? `🎙️ Whisper: ✅ Ativo\n` : `🎙️ Whisper: ⚠️ Configure OPENAI_API_KEY\n`) +
      (isGroup ? `\n⚠️ *Grupo:* Todos veem e compartilham a mesma conversa\n` : '') +
      `\n*Comandos:*\n` +
      `/start - Nova sessão\n` +
      `/stop - Encerrar sessão\n` +
      `/status - Ver status\n` +
      `/help - Ajuda`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  if (text === '/stop') {
    const session = sessions.get(chatId);
    if (session?.process) {
      session.process.kill();
      sessions.delete(chatId);
      pendingMessages.delete(chatId);
      await bot.sendMessage(chatId, '🛑 Sessão encerrada.');
    } else {
      await bot.sendMessage(chatId, '⚠️ Nenhuma sessão ativa.');
    }
    return;
  }

  if (text === '/status') {
    const session = sessions.get(chatId);

    if (session?.active) {
      await bot.sendMessage(chatId,
        `📊 *Status*\n\n` +
        `Sessão: 🟢 Ativa\n` +
        `Session ID: \`${session.sessionId}\`\n` +
        `PID: ${session.process.pid}\n` +
        `Diretório: \`${WORKING_DIR}\``,
        { parse_mode: 'Markdown' }
      );
    } else {
      await bot.sendMessage(chatId, '📊 *Status*\n\nSessão: 🔴 Inativa', { parse_mode: 'Markdown' });
    }
    return;
  }

  if (text === '/help') {
    await bot.sendMessage(chatId,
      `❓ *Como usar*\n\n` +
      `Controle o Claude Code via Telegram com streaming em tempo real!\n\n` +
      `*Fluxo:*\n` +
      `1. /start - Inicia sessão stream\n` +
      `2. Digite sua mensagem/pedido\n` +
      `3. 📸 Envie fotos - Claude analisa com visão\n` +
      `4. 🎤 Envie áudio - Salvo localmente\n` +
      `5. Veja respostas em tempo real\n` +
      `6. Responda Y/N para aprovações\n\n` +
      `*Comandos:*\n` +
      `/start - Iniciar nova sessão\n` +
      `/stop - Encerrar sessão\n` +
      `/status - Ver status\n` +
      `/help - Esta ajuda\n\n` +
      `*Mídia suportada:*\n` +
      `📸 Fotos - Análise com visão do Claude\n` +
      `🎤 Áudio/Voz - Transcrição automática via Whisper${openai ? ' (✅ ativo)' : ' (⚠️ configure OPENAI_API_KEY)'}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // ============================
  // MENSAGEM NORMAL
  // ============================
  if (text && !text.startsWith('/')) {
    sendToClaudeSession(chatId, text);
  }
});

// ============================
// ERROR HANDLERS
// ============================
bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando todas as sessões...');

  for (const [chatId, session] of sessions.entries()) {
    if (session.process) {
      console.log(`🛑 Encerrando sessão ${chatId}...`);
      session.process.kill();
    }
  }

  process.exit(0);
});

// ============================
// INICIALIZAÇÃO
// ============================
console.log('╔════════════════════════════════════════════╗');
console.log('║   TELEGRAM CLAUDE CODE STREAM             ║');
console.log('║      Streaming JSON em Tempo Real         ║');
console.log('╚════════════════════════════════════════════╝');
console.log(`📁 Diretório: ${WORKING_DIR}`);
console.log(`🤖 Claude CLI: ${CLAUDE_CODE_PATH}`);
if (AUTHORIZED_CHAT_IDS.length > 0) {
  console.log(`🔐 Autorização: Habilitada (${AUTHORIZED_CHAT_IDS.length} chat(s) autorizado(s))`);
  AUTHORIZED_CHAT_IDS.forEach(id => console.log(`   ├─ Chat ID: ${id}`));
} else {
  console.log(`🔐 Autorização: Desabilitada (qualquer chat pode usar)`);
}
console.log('✅ Bot iniciado - Aguardando comandos...\n');
