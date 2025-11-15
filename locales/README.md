# Translation Keys Naming Convention

## Structure
Translation keys follow dot notation: `category.subcategory.name`

## Categories
- `errors.*` - Error messages
- `session.*` - Session management messages
- `commands.*` - Bot command responses
- `media.*` - Media processing messages
- `language.*` - Language selection messages

## Naming Rules
1. Use camelCase for multi-word keys: `noSession`, `statusInactive`
2. Be specific: `photoProcessing` not just `processing`
3. Group related keys: `session.statusActive`, `session.statusInactive`
4. Use present tense for actions: `creating`, `processing`
5. Use past tense for completed: `created`, `closed`

## Parameter Interpolation
Use `{paramName}` for dynamic values:
- `{sessionId}`, `{error}`, `{size}`, `{type}`, etc.

## Examples

### Good
```json
{
  "errors": {
    "noSession": "No active session",
    "photoProcessing": "Error processing photo: {error}"
  },
  "session": {
    "statusActive": "Session active: {sessionId}",
    "statusInactive": "No active session"
  }
}
```

### Avoid
```json
{
  "errors": {
    "no_session": "...",           // Use camelCase, not snake_case
    "error": "..."                 // Too generic, be specific
  },
  "processing": "..."              // Missing category
}
```

## Adding New Translations

1. Add the key to `en.json` first (this is the fallback language)
2. Add corresponding translations to `pt.json` and `nl.json`
3. Use the translation in code: `t(chatId, 'category.key', { param: value })`
4. Test with all supported languages

## Supported Languages

- `en` - English (fallback)
- `pt` - Portuguese
- `nl` - Dutch

## File Structure

Each language file should have the same structure:
```json
{
  "errors": { ... },
  "session": { ... },
  "commands": { ... },
  "media": { ... },
  "language": { ... }
}
```
