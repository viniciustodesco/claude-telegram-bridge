[🇬🇧 English](./GROUPS.en.md) | [🇧🇷 Português](./GROUPS.pt.md) | [🇳🇱 Nederlands](./GROUPS.nl.md)

---

# 👥 Using the Bot in Telegram Groups

## How It Works in Groups

The bot works with **shared session per group**:
- ✅ All group members can send messages
- ✅ Everyone sees Claude's responses
- ✅ One single conversation/session per group
- ✅ Shared history between everyone

## Step by Step

### 1. Discover the Group ID

**Option A - Without authorization (discovery mode):**
1. Comment out the `AUTHORIZED_CHAT_ID` line in your `.env`:
   ```env
   # AUTHORIZED_CHAT_ID=775410953
   ```
2. Restart the bot: `npm start`
3. Add the bot to the group
4. Send any message in the group
5. Check the bot console, it will display:
   ```
   📱 Chat ID: -987654321 | Type: supergroup | Name: My Dev Group
   ```
6. Copy the group ID (including the `-` if present)

**Option B - Using @RawDataBot:**
1. Add [@RawDataBot](https://t.me/RawDataBot) to your group
2. The bot will send a message with the group ID
3. Look for `"id": -987654321` in the JSON
4. Remove @RawDataBot from the group afterwards

### 2. Authorize the Group

Edit your `.env` and add the group ID:

```env
# To authorize only the group:
AUTHORIZED_CHAT_ID=-987654321

# To authorize your private chat AND the group (comma-separated):
AUTHORIZED_CHAT_ID=775410953,-987654321

# To authorize multiple groups:
AUTHORIZED_CHAT_ID=-987654321,-123456789,-555666777
```

**⚠️ IMPORTANT:** Group IDs normally start with `-` (negative)

### 3. Add the Bot to the Group

1. Go to the group on Telegram
2. Click on the group name → **Add members**
3. Search for your bot (e.g., @your_bot_username)
4. Add the bot to the group

### 4. Promote the Bot (Optional but Recommended)

For the bot to work better in groups:
1. Go to **Administrators** → **Add administrator**
2. Select the bot
3. Enable only these permissions:
   - ✅ **Read messages** (essential)
   - ✅ **Send messages** (essential)
   - ❌ Other permissions are not necessary

**Note:** If you don't promote to administrator, configure the group so bots can see all messages:
- Go to **Edit Group** → **Group Type**
- Make sure "History visible to new members" is enabled

### 5. Start Session

In the group, send:
```
/start
```

The bot will respond confirming it's a group:
```
🚀 Claude Code Stream Session Started!

👥 Type: group (shared session)
...
⚠️ Group: Everyone sees and shares the same conversation
```

### 6. Use Normally

Now any member can:
- Send text messages → Claude responds
- Send photos/screenshots → Claude analyzes
- Send audio/voice → Transcribes and sends to Claude
- Use commands: `/status`, `/stop`, `/help`

## Commands in Groups

- `/start` - Start new session (any member can use)
- `/stop` - End current session (any member can stop)
- `/status` - View session information
- `/help` - Help

## Group Usage Example

```
👤 John: /start
🤖 Bot: 🚀 Session started! (shared group)

👤 Mary: Claude, help me debug this code
🤖 Bot: [Claude's response in streaming...]

👤 Peter: [sends error screenshot]
🤖 Bot: [Claude analyzes the image and responds]

👤 John: /stop
🤖 Bot: 🛑 Session ended.
```

## Security Tips

⚠️ **IMPORTANT:**
- Only add the bot to **trusted** groups
- All group members see Claude's responses
- All members can control the bot (start/stop)
- Claude has access to the directory configured in `WORKING_DIR`
- Don't share code or sensitive information in public groups

## Multiple Groups

You can authorize as many groups as you want:

```env
AUTHORIZED_CHAT_ID=775410953,-100123456789,-100987654321,-100555666777
```

Each group will have its **own independent session**:
- Group A has its conversation with Claude
- Group B has another separate conversation
- Sessions don't mix

## Troubleshooting

**Bot doesn't respond in the group:**
- ✅ Make sure the bot is admin OR the group allows bots to see messages
- ✅ Verify the group ID is correct in `.env` (including the `-`)
- ✅ Confirm the bot is online (`npm start` running)

**Bot responds "Unauthorized access":**
- ✅ The group ID is not in `AUTHORIZED_CHAT_ID`
- ✅ Forgot the `-` at the beginning of the group ID
- ✅ Restart the bot after changing `.env`

**Bot doesn't see messages:**
- ✅ Promote the bot to administrator
- ✅ OR enable "Privacy Mode Off" with @BotFather:
  1. Talk to [@BotFather](https://t.me/BotFather)
  2. `/mybots` → select your bot
  3. `Bot Settings` → `Group Privacy`
  4. `Turn off`

## Limitations

- ⚠️ One session per group (no individual sessions per user)
- ⚠️ Any member can end the session with `/stop`
- ⚠️ No permission control within the group
- ⚠️ Long responses may be split into multiple messages

## Next Steps

Want more advanced features for groups?
- [ ] Individual sessions per user (even in the group)
- [ ] Bot responds only when mentioned `@bot`
- [ ] Per-user permissions (admin-only commands)
- [ ] Multiple simultaneous sessions in the same group

Open an issue on GitHub! 🚀
