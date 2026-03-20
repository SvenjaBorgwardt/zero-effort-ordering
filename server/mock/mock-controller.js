import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Available mock responses
const MOCK_FILES = {
  'zettel1': 'zettel1-sauber.json',
  'zettel2': 'zettel2-abkuerzer.json',
  'zettel3': 'zettel3-chaotisch.json',
  'zettel4': 'zettel4-unleserlich.json',
  'zettel5': 'zettel5-sonderbestell.json',
  'zettel6': 'zettel6-ausreisser.json'
};

/**
 * Get mock mode from environment.
 * "auto" = try live first, fallback to mock
 * "true" = always mock
 * "false" = never mock
 */
export function getMockMode() {
  const mode = process.env.MOCK_MODE || 'auto';
  return mode.toLowerCase();
}

/**
 * Load a specific mock response by ID.
 * If no ID given, returns a random mock.
 */
export function getMockResponse(mockId = null) {
  let filename;

  if (mockId && MOCK_FILES[mockId]) {
    filename = MOCK_FILES[mockId];
  } else {
    // Random mock
    const keys = Object.keys(MOCK_FILES);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    filename = MOCK_FILES[randomKey];
  }

  const filePath = join(__dirname, filename);

  if (!existsSync(filePath)) {
    // Return a minimal fallback if mock file doesn't exist
    return {
      mock: true,
      mock_quelle: "fallback",
      positionen: [
        {
          produkt: "Weizenbrötchen",
          menge: 50,
          einheit: "Stück",
          original_text: "50 Brötchen",
          konfidenz: 0.95
        }
      ],
      sonderbestellungen: [],
      kommentar: "",
      meta: {
        filiale: null,
        datum: null,
        unlesbare_stellen: []
      }
    };
  }

  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  return data;
}

/**
 * Check if we should use mock for this request.
 */
export function shouldUseMock() {
  return getMockMode() === 'true';
}
