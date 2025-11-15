[🇬🇧 English](./GROUPS.en.md) | [🇧🇷 Português](./GROUPS.pt.md) | [🇳🇱 Nederlands](./GROUPS.nl.md)

---

# 👥 De Bot Gebruiken in Telegram Groepen

## Hoe het Werkt in Groepen

De bot werkt met **gedeelde sessie per groep**:
- ✅ Alle groepsleden kunnen berichten sturen
- ✅ Iedereen ziet Claude's antwoorden
- ✅ Eén enkel gesprek/sessie per groep
- ✅ Gedeelde geschiedenis tussen iedereen

## Stap voor Stap

### 1. Ontdek de Groep ID

**Optie A - Zonder autorisatie (ontdekkingsmodus):**
1. Commentarieer de `AUTHORIZED_CHAT_ID` regel uit in je `.env`:
   ```env
   # AUTHORIZED_CHAT_ID=775410953
   ```
2. Herstart de bot: `npm start`
3. Voeg de bot toe aan de groep
4. Stuur een willekeurig bericht in de groep
5. Bekijk de bot console, het zal weergeven:
   ```
   📱 Chat ID: -987654321 | Type: supergroup | Name: Mijn Dev Groep
   ```
6. Kopieer de groep ID (inclusief de `-` indien aanwezig)

**Optie B - Met @RawDataBot:**
1. Voeg [@RawDataBot](https://t.me/RawDataBot) toe aan je groep
2. De bot zal een bericht sturen met de groep ID
3. Zoek naar `"id": -987654321` in de JSON
4. Verwijder @RawDataBot daarna uit de groep

### 2. Autoriseer de Groep

Bewerk je `.env` en voeg de groep ID toe:

```env
# Om alleen de groep te autoriseren:
AUTHORIZED_CHAT_ID=-987654321

# Om je privéchat EN de groep te autoriseren (kommagescheiden):
AUTHORIZED_CHAT_ID=775410953,-987654321

# Om meerdere groepen te autoriseren:
AUTHORIZED_CHAT_ID=-987654321,-123456789,-555666777
```

**⚠️ BELANGRIJK:** Groep IDs beginnen normaal met `-` (negatief)

### 3. Voeg de Bot toe aan de Groep

1. Ga naar de groep op Telegram
2. Klik op de groepsnaam → **Leden toevoegen**
3. Zoek naar je bot (bijv. @jouw_bot_gebruikersnaam)
4. Voeg de bot toe aan de groep

### 4. Promoveer de Bot (Optioneel maar Aanbevolen)

Om de bot beter te laten werken in groepen:
1. Ga naar **Beheerders** → **Beheerder toevoegen**
2. Selecteer de bot
3. Schakel alleen deze permissies in:
   - ✅ **Berichten lezen** (essentieel)
   - ✅ **Berichten sturen** (essentieel)
   - ❌ Andere permissies zijn niet nodig

**Opmerking:** Als je niet promoveert tot beheerder, configureer de groep zodat bots alle berichten kunnen zien:
- Ga naar **Groep Bewerken** → **Groepstype**
- Zorg ervoor dat "Geschiedenis zichtbaar voor nieuwe leden" is ingeschakeld

### 5. Start Sessie

In de groep, stuur:
```
/start
```

De bot zal antwoorden en bevestigen dat het een groep is:
```
🚀 Claude Code Stream Sessie Gestart!

👥 Type: groep (gedeelde sessie)
...
⚠️ Groep: Iedereen ziet en deelt hetzelfde gesprek
```

### 6. Gebruik Normaal

Nu kan elk lid:
- Tekstberichten sturen → Claude antwoordt
- Foto's/screenshots sturen → Claude analyseert
- Audio/spraak sturen → Transcribeert en stuurt naar Claude
- Commando's gebruiken: `/status`, `/stop`, `/help`

## Commando's in Groepen

- `/start` - Start nieuwe sessie (elk lid kan gebruiken)
- `/stop` - Beëindig huidige sessie (elk lid kan stoppen)
- `/status` - Bekijk sessie-informatie
- `/help` - Help

## Voorbeeld van Groepsgebruik

```
👤 Jan: /start
🤖 Bot: 🚀 Sessie gestart! (gedeelde groep)

👤 Maria: Claude, help me deze code debuggen
🤖 Bot: [Claude's antwoord in streaming...]

👤 Pieter: [stuurt foutscreenshot]
🤖 Bot: [Claude analyseert de afbeelding en antwoordt]

👤 Jan: /stop
🤖 Bot: 🛑 Sessie beëindigd.
```

## Beveiligingstips

⚠️ **BELANGRIJK:**
- Voeg de bot alleen toe aan **vertrouwde** groepen
- Alle groepsleden zien Claude's antwoorden
- Alle leden kunnen de bot besturen (start/stop)
- Claude heeft toegang tot de directory geconfigureerd in `WORKING_DIR`
- Deel geen code of gevoelige informatie in openbare groepen

## Meerdere Groepen

Je kunt zoveel groepen autoriseren als je wilt:

```env
AUTHORIZED_CHAT_ID=775410953,-100123456789,-100987654321,-100555666777
```

Elke groep heeft zijn **eigen onafhankelijke sessie**:
- Groep A heeft zijn gesprek met Claude
- Groep B heeft een ander apart gesprek
- Sessies mengen zich niet

## Probleemoplossing

**Bot reageert niet in de groep:**
- ✅ Zorg ervoor dat de bot beheerder is OF dat de groep bots toestaat om berichten te zien
- ✅ Verifieer dat de groep ID correct is in `.env` (inclusief de `-`)
- ✅ Bevestig dat de bot online is (`npm start` draait)

**Bot antwoordt "Ongeautoriseerde toegang":**
- ✅ De groep ID staat niet in `AUTHORIZED_CHAT_ID`
- ✅ Vergeten de `-` aan het begin van de groep ID
- ✅ Herstart de bot na het wijzigen van `.env`

**Bot ziet berichten niet:**
- ✅ Promoveer de bot tot beheerder
- ✅ OF schakel "Privacy Mode Off" in met @BotFather:
  1. Praat met [@BotFather](https://t.me/BotFather)
  2. `/mybots` → selecteer je bot
  3. `Bot Settings` → `Group Privacy`
  4. `Turn off`

## Beperkingen

- ⚠️ Eén sessie per groep (geen individuele sessies per gebruiker)
- ⚠️ Elk lid kan de sessie beëindigen met `/stop`
- ⚠️ Geen permissiecontrole binnen de groep
- ⚠️ Lange antwoorden kunnen worden opgesplitst in meerdere berichten

## Volgende Stappen

Wil je meer geavanceerde functies voor groepen?
- [ ] Individuele sessies per gebruiker (zelfs in de groep)
- [ ] Bot reageert alleen wanneer genoemd `@bot`
- [ ] Per-gebruiker permissies (alleen-admin commando's)
- [ ] Meerdere gelijktijdige sessies in dezelfde groep

Open een issue op GitHub! 🚀
