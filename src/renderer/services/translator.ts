import TextTranslationClient, {
  TranslatorCredential,
  isUnexpected,
} from '@azure-rest/ai-translation-text';

const ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

// Singleton client instance
let client: ReturnType<typeof TextTranslationClient> | null = null;

/**
 * Initialize the translator client with API credentials.
 * Call this when the app starts or when settings change.
 */
export function initializeTranslator(apiKey: string, region: string): void {
  const credential: TranslatorCredential = { key: apiKey, region };
  client = TextTranslationClient(ENDPOINT, credential);
}

/**
 * Get the translator client instance.
 * Throws if not initialized.
 */
export function getTranslator() {
  if (!client) {
    throw new Error('Translator not initialized. Please set your Azure API key in settings.');
  }
  return client;
}

/**
 * Check if translator is ready to use.
 */
export function isTranslatorReady(): boolean {
  return client !== null;
}

/**
 * Translate Chinese text to English and get Pinyin.
 */
export async function translateWithPinyin(text: string) {
  const translator = getTranslator();

  // Run translation and transliteration in parallel
  const [translateRes, pinyinRes] = await Promise.all([
    // Chinese → English translation
    translator.path('/translate').post({
      body: [{ text }],
      queryParameters: {
        'api-version': '3.0',
        from: 'zh-Hans',
        to: 'en',
      },
    }),
    // Chinese → Pinyin (Latin script)
    translator.path('/transliterate').post({
      body: [{ text }],
      queryParameters: {
        'api-version': '3.0',
        language: 'zh-Hans',
        fromScript: 'Hans',
        toScript: 'Latn',
      },
    }),
  ]);

  if (isUnexpected(translateRes) || isUnexpected(pinyinRes)) {
    throw new Error('Translation API request failed');
  }

  return {
    original: text,
    translation: translateRes.body[0].translations[0].text,
    pinyin: pinyinRes.body[0].text,
  };
}

