import dotenv from 'dotenv';
dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL = 'mistral-large-latest';
const API_TIMEOUT = 20000;

function hatGueligenKey() {
  return MISTRAL_API_KEY &&
    MISTRAL_API_KEY.trim().length > 0 &&
    !MISTRAL_API_KEY.includes('dein-') &&
    !MISTRAL_API_KEY.includes('hier');
}

function getMockMode() {
  return (process.env.MOCK_MODE || 'auto').toLowerCase();
}

// Demo-Ergebnis für Mock-Modus
function getMockBestellungErgebnis() {
  return {
    positionen: [
      { produkt: 'Weizenbrötchen', menge: 8, einheit: 'Stück', original_text: '8 Weizenbrötchen', konfidenz: 0.99 },
      { produkt: 'Mohnbrötchen',   menge: 3, einheit: 'Stück', original_text: '3 Mohnbrötchen',   konfidenz: 0.99 },
      { produkt: 'Buttercroissant', menge: 2, einheit: 'Stück', original_text: '2 Buttercroissants', konfidenz: 0.97 },
      { produkt: 'Mischbrot',      menge: 1, einheit: 'Stück', original_text: 'ein Mischbrot',    konfidenz: 0.95 },
    ],
    kommentar: ''
  };
}

const PROMPT_TEMPLATE = `Du bist ein KI-Bestellsystem für eine handwerkliche Bäckerei.
Du bekommst eine Transkription eines Gesprächs zwischen Kassiererin und Kunde.
Deine Aufgabe: Extrahiere NUR die bestellten Produkte mit Mengen. Ignoriere Smalltalk, Begrüßungen, Verabschiedungen und alles was kein konkretes Produkt ist.

KONTEXT – Produkte dieser Bäckerei:
Brötchen: Weizenbrötchen, Mohnbrötchen, Sesambrötchen, Körnerbrötchen
Laugengebäck: Laugenbrezel, Laugenstange
Feingebäck: Buttercroissant, Rosinenschnecke, Nussschnecke, Apfeltasche, Berliner
Brot: Mischbrot, Dinkelvollkornbrot, Krustenbrot, Roggenvollkornbrot, Toastbrot
Torten & Kuchen: Erdbeertorte, Käsekuchen, Marmorkuchen, Bienenstich
Belegware: Aufschnitt-Sortiment, Käse-Sortiment

REGELN:
1. Extrahiere nur konkrete Bestellpositionen (Produkt + Menge)
2. Wenn keine Menge genannt wird, nimm 1 an
3. "noch mal" / "noch eins" / "dazu noch" → addiere zur bisherigen Position
4. Normalisiere Produktnamen auf obige vollständige Bezeichnungen
5. Wenn unklar ob bestellt oder nur erwähnt, niedrige konfidenz setzen (< 0.6)
6. Mengen immer als positive Ganzzahl

ANTWORTFORMAT (NUR gültiges JSON, kein anderer Text):
{
  "positionen": [
    {
      "produkt": "Normalisierter Produktname",
      "menge": 3,
      "einheit": "Stück",
      "original_text": "Was der Kunde gesagt hat",
      "konfidenz": 0.95
    }
  ],
  "kommentar": "Besonderheiten oder Anmerkungen, leer wenn nichts"
}

TRANSKRIPTION:
`;

/**
 * Parst eine Transkription und extrahiert Bestellpositionen.
 * Ignoriert Smalltalk, gibt strukturiertes JSON zurück.
 */
export async function parseBestellung(transkription) {
  if (!transkription || transkription.trim().length === 0) {
    return { positionen: [], kommentar: 'Keine Transkription vorhanden' };
  }

  const mockMode = getMockMode();

  // Mock-Modus oder kein gültiger Key → Demo-Ergebnis
  if (mockMode === 'true' || !hatGueligenKey()) {
    console.log('  🎭 SprachParser: Mock-Ergebnis (MOCK_MODE oder kein API-Key)');
    return getMockBestellungErgebnis();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [{
          role: 'user',
          content: PROMPT_TEMPLATE + transkription
        }],
        max_tokens: 1000,
        temperature: 0.1
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mistral API Fehler ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // JSON aus Antwort extrahieren (manchmal in Markdown-Codeblock)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const parsed = JSON.parse(jsonStr);
    return {
      positionen: parsed.positionen || [],
      kommentar: parsed.kommentar || ''
    };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      const msg = 'TIMEOUT: Mistral Large hat nicht innerhalb von 20 Sekunden geantwortet';
      if (mockMode === 'auto') {
        console.warn(`  ⚠️  ${msg} – nutze Mock-Fallback`);
        return getMockBestellungErgebnis();
      }
      throw new Error(msg);
    }
    if (mockMode === 'auto') {
      console.warn(`  ⚠️  SprachParser fehlgeschlagen (${error.message}) – nutze Mock-Fallback`);
      return getMockBestellungErgebnis();
    }
    throw error;
  }
}
