import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================
// ES6 MODULE COMPATIBILITY
// ============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================
// CONFIGURATION
// ============================
const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE || 'en';
const SUPPORTED_LANGUAGES = ['en', 'pt', 'nl'];
const FALLBACK_LANGUAGE = 'en';
const PREFERENCES_FILE = path.join(__dirname, '..', 'data', 'language-preferences.json');
const MAX_PREFERENCES = 10000; // Safety limit

// ============================
// TRANSLATION STORAGE
// ============================
const translations = new Map();
const userLanguages = new Map();

// ============================
// LOAD TRANSLATIONS
// ============================

/**
 * Load all translation files synchronously at startup
 */
function loadTranslations() {
  const localesDir = path.join(__dirname, '..', 'locales');

  console.log('📚 Loading translations...');

  for (const lang of SUPPORTED_LANGUAGES) {
    const filePath = path.join(localesDir, `${lang}.json`);

    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Translation file not found: ${filePath}`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      translations.set(lang, data);

      console.log(`✅ Loaded ${lang}.json`);
    } catch (error) {
      console.error(`❌ Error loading ${lang}.json:`, error.message);
    }
  }

  console.log(`📚 Translations loaded: ${translations.size} language(s)\n`);
}

/**
 * Load language preferences from disk
 */
function loadPreferences() {
  try {
    if (fs.existsSync(PREFERENCES_FILE)) {
      const data = JSON.parse(fs.readFileSync(PREFERENCES_FILE, 'utf-8'));
      Object.entries(data).forEach(([chatId, lang]) => {
        userLanguages.set(chatId, lang);
      });
      console.log(`✅ Loaded ${userLanguages.size} language preference(s)`);
    }
  } catch (error) {
    console.error('⚠️ Error loading language preferences:', error.message);
  }
}

/**
 * Save language preferences to disk
 */
function savePreferences() {
  try {
    const dataDir = path.dirname(PREFERENCES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const data = Object.fromEntries(userLanguages);
    fs.writeFileSync(PREFERENCES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('⚠️ Error saving language preferences:', error.message);
  }
}

// Load translations immediately at module initialization
loadTranslations();
loadPreferences();

// ============================
// TRANSLATION FUNCTIONS
// ============================

/**
 * Get a nested property from an object using dot notation
 * @param {Object} obj - The object to search
 * @param {string} path - Dot-separated path (e.g., 'errors.noToken')
 * @returns {*} The value at the path, or undefined
 */
function getNestedProperty(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Interpolate parameters into a translation string
 * @param {string} text - Translation string with {param} placeholders
 * @param {Object} params - Parameters to interpolate
 * @returns {string} Interpolated string
 */
function interpolate(text, params = {}) {
  if (!params || typeof params !== 'object') {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

/**
 * Translate a key for a specific chat
 * @param {string|number} chatId - Chat ID to get language preference for
 * @param {string} key - Translation key in dot notation (e.g., 'errors.noToken')
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string} Translated string with interpolated parameters
 */
export function t(chatId, key, params = {}) {
  // Get user's language preference (default to DEFAULT_LANGUAGE)
  const userLang = userLanguages.get(chatId?.toString()) || DEFAULT_LANGUAGE;

  // Try to get translation in user's language
  let translation = translations.get(userLang);
  let text = translation ? getNestedProperty(translation, key) : undefined;

  // Fallback to English if translation not found
  if (text === undefined && userLang !== FALLBACK_LANGUAGE) {
    console.warn(`⚠️ Translation key "${key}" not found for language "${userLang}", using fallback (${FALLBACK_LANGUAGE})`);
    translation = translations.get(FALLBACK_LANGUAGE);
    text = translation ? getNestedProperty(translation, key) : undefined;
  }

  // If still not found, return the key itself as last resort
  if (text === undefined) {
    console.warn(`⚠️ Translation key "${key}" not found in any language, returning key`);
    return key;
  }

  // Interpolate parameters
  return interpolate(text, params);
}

/**
 * Set language preference for a chat
 * @param {string|number} chatId - Chat ID
 * @param {string} language - Language code (en, pt, nl)
 * @returns {boolean} True if language was set, false if invalid
 */
export function setLanguage(chatId, language) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    console.warn(`⚠️ Attempted to set unsupported language: ${language}`);
    return false;
  }

  // Safety check: prevent unbounded growth
  if (userLanguages.size >= MAX_PREFERENCES) {
    console.warn(`⚠️ Language preferences limit reached (${MAX_PREFERENCES}), clearing oldest entries`);
    // Keep only last 50% of entries
    const entries = Array.from(userLanguages.entries());
    userLanguages.clear();
    entries.slice(-Math.floor(MAX_PREFERENCES / 2)).forEach(([id, lang]) => {
      userLanguages.set(id, lang);
    });
  }

  userLanguages.set(chatId?.toString(), language);
  console.log(`🌍 Language set to "${language}" for chat ${chatId}`);

  // Save to disk
  savePreferences();

  return true;
}

/**
 * Get current language for a chat
 * @param {string|number} chatId - Chat ID
 * @returns {string} Current language code (defaults to DEFAULT_LANGUAGE)
 */
export function getLanguage(chatId) {
  return userLanguages.get(chatId?.toString()) || DEFAULT_LANGUAGE;
}

/**
 * Get list of supported languages
 * @returns {string[]} Array of supported language codes
 */
export function getSupportedLanguages() {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Get default language from environment or fallback
 * @returns {string} Default language code
 */
export function getDefaultLanguage() {
  return DEFAULT_LANGUAGE;
}

// ============================
// EXPORTS
// ============================
export default {
  t,
  setLanguage,
  getLanguage,
  getSupportedLanguages,
  getDefaultLanguage
};
