# 👥 Usando o Bot em Grupos do Telegram

## Como Funciona em Grupos

O bot funciona com **sessão compartilhada por grupo**:
- ✅ Todos os membros do grupo podem enviar mensagens
- ✅ Todos veem as respostas do Claude
- ✅ Uma única conversa/sessão por grupo
- ✅ Histórico compartilhado entre todos

## Passo a Passo

### 1. Descobrir o ID do Grupo

**Opção A - Sem autorização (modo descoberta):**
1. Comente a linha `AUTHORIZED_CHAT_ID` no seu `.env`:
   ```env
   # AUTHORIZED_CHAT_ID=775410953
   ```
2. Reinicie o bot: `npm start`
3. Adicione o bot ao grupo
4. Envie qualquer mensagem no grupo
5. Veja o console do bot, vai aparecer:
   ```
   📱 Chat ID: -987654321 | Tipo: supergroup | Nome: Meu Grupo Dev
   ```
6. Copie o ID do grupo (incluindo o `-` se tiver)

**Opção B - Usando @RawDataBot:**
1. Adicione [@RawDataBot](https://t.me/RawDataBot) ao seu grupo
2. O bot vai enviar uma mensagem com o ID do grupo
3. Procure por `"id": -987654321` no JSON
4. Remova o @RawDataBot do grupo depois

### 2. Autorizar o Grupo

Edite seu `.env` e adicione o ID do grupo:

```env
# Para autorizar apenas o grupo:
AUTHORIZED_CHAT_ID=-987654321

# Para autorizar seu chat privado E o grupo (separados por vírgula):
AUTHORIZED_CHAT_ID=775410953,-987654321

# Para autorizar múltiplos grupos:
AUTHORIZED_CHAT_ID=-987654321,-123456789,-555666777
```

**⚠️ IMPORTANTE:** IDs de grupos normalmente começam com `-` (negativo)

### 3. Adicionar o Bot ao Grupo

1. Vá ao grupo no Telegram
2. Clique no nome do grupo → **Adicionar membros**
3. Procure pelo seu bot (ex: @seu_bot_username)
4. Adicione o bot ao grupo

### 4. Promover o Bot (Opcional mas Recomendado)

Para o bot funcionar melhor em grupos:
1. Vá em **Administradores** → **Adicionar administrador**
2. Selecione o bot
3. Ative apenas estas permissões:
   - ✅ **Ler mensagens** (essencial)
   - ✅ **Enviar mensagens** (essencial)
   - ❌ Outras permissões não são necessárias

**Nota:** Se não promover a administrador, configure o grupo para que bots vejam todas as mensagens:
- Vá em **Editar Grupo** → **Tipo de Grupo**
- Certifique-se que "Histórico visível para novos membros" está ativado

### 5. Iniciar Sessão

No grupo, envie:
```
/start
```

O bot vai responder confirmando que é um grupo:
```
🚀 Sessão Claude Code Stream Iniciada!

👥 Tipo: grupo (sessão compartilhada)
...
⚠️ Grupo: Todos veem e compartilham a mesma conversa
```

### 6. Usar Normalmente

Agora qualquer membro pode:
- Enviar mensagens de texto → Claude responde
- Enviar fotos/screenshots → Claude analisa
- Enviar áudio/voz → Transcreve e envia para Claude
- Usar comandos: `/status`, `/stop`, `/help`

## Comandos no Grupo

- `/start` - Inicia nova sessão (qualquer membro pode usar)
- `/stop` - Encerra sessão atual (qualquer membro pode parar)
- `/status` - Ver informações da sessão
- `/help` - Ajuda

## Exemplo de Uso em Grupo

```
👤 João: /start
🤖 Bot: 🚀 Sessão iniciada! (grupo compartilhado)

👤 Maria: Claude, me ajuda a debugar esse código
🤖 Bot: [resposta do Claude em streaming...]

👤 Pedro: [envia screenshot de erro]
🤖 Bot: [Claude analisa a imagem e responde]

👤 João: /stop
🤖 Bot: 🛑 Sessão encerrada.
```

## Dicas de Segurança

⚠️ **IMPORTANTE:**
- Só adicione o bot em grupos **de confiança**
- Todos os membros do grupo veem as respostas do Claude
- Todos os membros podem controlar o bot (start/stop)
- Claude tem acesso ao diretório configurado em `WORKING_DIR`
- Não compartilhe códigos ou informações sensíveis em grupos públicos

## Múltiplos Grupos

Você pode autorizar quantos grupos quiser:

```env
AUTHORIZED_CHAT_ID=775410953,-100123456789,-100987654321,-100555666777
```

Cada grupo terá sua **própria sessão independente**:
- Grupo A tem sua conversa com Claude
- Grupo B tem outra conversa separada
- As sessões não se misturam

## Troubleshooting

**Bot não responde no grupo:**
- ✅ Certifique-se que o bot é admin OU que o grupo permite bots verem mensagens
- ✅ Verifique se o ID do grupo está correto no `.env` (incluindo o `-`)
- ✅ Confirme que o bot está online (`npm start` rodando)

**Bot responde "Acesso não autorizado":**
- ✅ O ID do grupo não está em `AUTHORIZED_CHAT_ID`
- ✅ Esqueceu o `-` no início do ID do grupo
- ✅ Reinicie o bot após alterar `.env`

**Bot não vê as mensagens:**
- ✅ Promova o bot a administrador
- ✅ OU ative "Privacy Mode Off" com @BotFather:
  1. Fale com [@BotFather](https://t.me/BotFather)
  2. `/mybots` → selecione seu bot
  3. `Bot Settings` → `Group Privacy`
  4. `Turn off`

## Limitações

- ⚠️ Uma sessão por grupo (não há sessões individuais por usuário)
- ⚠️ Qualquer membro pode encerrar a sessão com `/stop`
- ⚠️ Não há controle de permissões dentro do grupo
- ⚠️ Respostas longas podem ser divididas em múltiplas mensagens

## Próximos Passos

Quer funcionalidades mais avançadas para grupos?
- [ ] Sessões individuais por usuário (mesmo no grupo)
- [ ] Bot responde apenas quando mencionado `@bot`
- [ ] Permissões por usuário (admin-only commands)
- [ ] Múltiplas sessões simultâneas no mesmo grupo

Abra uma issue no GitHub! 🚀
