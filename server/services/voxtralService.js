import dotenv from 'dotenv';
dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const VOXTRAL_MODEL = 'voxtral-mini-2602';
const API_TIMEOUT = 30000; // 30 Sekunden für Audio

// Demo-Transkription für Mock-Modus – enthält Smalltalk + echte Bestellung
const MOCK_TRANSKRIPTION = 'Guten Morgen! – Morgen, was darf\'s sein? – Ich hätte gerne acht Weizenbrötchen und drei Mohnbrötchen bitte. – Sonst noch was? – Ja, zwei Buttercroissants. Und ach so, ein Mischbrot. – Noch einen Kaffee vielleicht? – Nein danke, das ist alles. – Macht dann 5,65 Euro. – Hier bitte. – Danke schön, auf Wiedersehen! – Tschüss!';

function getMockMode() {
  return (process.env.MOCK_MODE || 'auto').toLowerCase();
}

function hatGueligenKey() {
  return MISTRAL_API_KEY &&
    MISTRAL_API_KEY.trim().length > 0 &&
    !MISTRAL_API_KEY.includes('dein-') &&
    !MISTRAL_API_KEY.includes('hier');
}

/**
 * Gibt eine Mock-Transkription zurück.
 */
export function getMockTranskription() {
  return {
    success: true,
    text: MOCK_TRANSKRIPTION,
    modell: 'mock',
    modus: 'mock'
  };
}

/**
 * Prüft ob die Voxtral-API erreichbar ist (und der Key gültig).
 */
export async function testeVoxtralVerbindung() {
  if (!hatGueligenKey()) return false;
  try {
    // Sende eine minimal-Anfrage (leere Datei würde 400 ergeben, aber das zeigt zumindest Auth-Status)
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Transkribiert eine Audio-Datei (als base64 + mimeType) über die Voxtral API.
 * Respektiert MOCK_MODE: "true" → immer Mock, "auto" → Live mit Mock-Fallback, "false" → nur Live.
 */
export async function transkribiere(audioBase64, mimeType = 'audio/webm') {
  const mockMode = getMockMode();

  // Erzwungener Mock-Modus oder kein gültiger Key
  if (mockMode === 'true' || !hatGueligenKey()) {
    console.log('  🎭 Kasse: Mock-Transkription (MOCK_MODE oder kein API-Key)');
    return getMockTranskription();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    const ext = mimeType.includes('mp4') ? 'mp4'
      : mimeType.includes('ogg') ? 'ogg'
      : mimeType.includes('wav') ? 'wav'
      : 'webm';

    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    formData.append('file', audioBlob, `audio.${ext}`);
    formData.append('model', VOXTRAL_MODEL);
    formData.append('language', 'de');

    const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`
        // Content-Type NICHT setzen – FormData setzt boundary automatisch
      },
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voxtral API Fehler ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      text: data.text || '',
      modell: VOXTRAL_MODEL,
      modus: 'live'
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      const msg = 'TIMEOUT: Voxtral API hat nicht innerhalb von 30 Sekunden geantwortet';
      if (mockMode === 'auto') {
        console.warn(`  ⚠️  ${msg} – nutze Mock-Fallback`);
        return getMockTranskription();
      }
      throw new Error(msg);
    }

    // Auto-Modus: Fallback auf Mock
    if (mockMode === 'auto') {
      console.warn(`  ⚠️  Voxtral fehlgeschlagen (${error.message}) – nutze Mock-Fallback`);
      return getMockTranskription();
    }

    throw error;
  }
}
