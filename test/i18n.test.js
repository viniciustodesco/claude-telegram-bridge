import { describe, it } from 'node:test';
import assert from 'node:assert';
import { t, setLanguage, getLanguage, getSupportedLanguages, getDefaultLanguage } from '../lib/i18n.js';

describe('i18n Module', () => {
  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const langs = getSupportedLanguages();
      assert.deepStrictEqual(langs, ['en', 'pt', 'nl']);
    });
  });

  describe('getDefaultLanguage', () => {
    it('should return default language', () => {
      const defaultLang = getDefaultLanguage();
      assert.strictEqual(typeof defaultLang, 'string');
    });
  });

  describe('setLanguage and getLanguage', () => {
    it('should set and get language for a chat', () => {
      const chatId = 'test123';
      setLanguage(chatId, 'pt');
      assert.strictEqual(getLanguage(chatId), 'pt');
    });

    it('should reject invalid language codes', () => {
      const result = setLanguage('test456', 'fr');
      assert.strictEqual(result, false);
    });

    it('should return default language for unknown chatId', () => {
      const lang = getLanguage('unknown999');
      assert.strictEqual(lang, getDefaultLanguage());
    });
  });

  describe('t function - translation', () => {
    it('should translate simple keys', () => {
      const chatId = 'test_en';
      setLanguage(chatId, 'en');
      const text = t(chatId, 'errors.unauthorized');
      assert.match(text, /Unauthorized/);
    });

    it('should interpolate parameters', () => {
      const chatId = 'test_params';
      setLanguage(chatId, 'en');
      const text = t(chatId, 'session.created', { sessionId: 'abc-123' });
      assert.match(text, /abc-123/);
    });

    it('should fallback to English for missing keys', () => {
      const chatId = 'test_fallback';
      setLanguage(chatId, 'nl');
      const text = t(chatId, 'nonexistent.key');
      assert.strictEqual(text, 'nonexistent.key');
    });

    it('should handle multiple languages', () => {
      const chatEn = 'test_multi_en';
      const chatPt = 'test_multi_pt';
      const chatNl = 'test_multi_nl';

      setLanguage(chatEn, 'en');
      setLanguage(chatPt, 'pt');
      setLanguage(chatNl, 'nl');

      const textEn = t(chatEn, 'errors.unauthorized');
      const textPt = t(chatPt, 'errors.unauthorized');
      const textNl = t(chatNl, 'errors.unauthorized');

      assert.match(textEn, /Unauthorized/);
      assert.match(textPt, /autorizado/);
      assert.match(textNl, /Ongeautoriseerde/);
    });
  });
});
