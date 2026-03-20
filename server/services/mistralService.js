import dotenv from 'dotenv';
dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL = 'mistral-large-latest';
const API_TIMEOUT = 15000; // 15 seconds

const PROMPT_TEMPLATE = `Du bist ein KI-Bestellsystem für eine handwerkliche Bäckerei mit 15 Filialen und einer zentralen Backstube.
Deine Aufgabe: Extrahiere alle Bestellpositionen aus dem fotografierten handgeschriebenen Bestellzettel.

KONTEXT:
Dies ist ein Bestellzettel einer Bäckerei-Filiale an die Zentral-Backstube.
Die Filialen bestellen hauptsächlich FERTIGE BACKWAREN und TEIGLINGE:
- Brötchen (Weizen, Mohn, Sesam, Körner) – als Teiglinge, Filiale backt fertig
- Laugengebäck (Brezeln, Laugenstangen) – als Teiglinge
- Feingebäck (Croissants, Rosinenschnecken, Nussschnecken, Apfeltaschen, Berliner)
- Brot (Mischbrot, Dinkelbrot, Krustenbrot, Roggenbrot, Toast) – fertig geliefert
- Torten & Kuchen (Erdbeertorte, Käsekuchen, Marmorkuchen, Bienenstich) – fertig geliefert
- Belegware (Aufschnitt-Sortiment, Käse-Sortiment) – fertig geliefert

SONDERBESTELLUNGEN:
Manchmal steht eine Kundenbestellung auf dem Zettel – erkennbar an: einem zukünftigen Datum, einem Kundennamen, Wörtern wie "bestellt", "Vorbestellung", "Kunde", "Sonderbestellung", "Abholung".

BEKANNTE ABKÜRZUNGEN:
- WB = Weizenbrötchen, KB = Körnerbrötchen, MB = Mischbrot
- DVK = Dinkelvollkornbrot, RVK = Roggenvollkornbrot
- RS = Rosinenschnecke, NS = Nussschnecke, AT = Apfeltasche
- LS = Laugenstange, KK = Käsekuchen, BS = Bienenstich
- Croi = Croissant, "Schnecke" = Rosinenschnecke, "Brötchen" = Weizenbrötchen

REGELN:
1. Extrahiere jede Bestellposition als eigenes Objekt
2. Normalisiere Produktnamen auf die vollständige Bezeichnung
3. Mengen immer als Zahl (Integer)
4. Durchgestrichenes ignorieren, Korrektur verwenden
5. Bei unleserlichen Stellen: beste Vermutung, Konfidenz niedrig (< 0.5)
6. Nicht-Bestelltexte (Lieferhinweise, Kommentare, Grüße) ins Kommentar-Feld
7. Datum extrahieren falls erkennbar
8. Filialname extrahieren falls erkennbar
9. SONDERBESTELLUNGEN separat in "sonderbestellungen" auflisten

ANTWORTFORMAT (NUR gültiges JSON, kein anderer Text):
{
  "positionen": [
    {
      "produkt": "Normalisierter Produktname",
      "menge": 20,
      "einheit": "Stück|Packung|Sonstiges",
      "original_text": "Exakt was auf dem Zettel steht",
      "konfidenz": 0.95
    }
  ],
  "sonderbestellungen": [
    {
      "produkt": "Normalisierter Produktname",
      "menge": 1,
      "einheit": "Stück",
      "lieferdatum": "YYYY-MM-DD oder null",
      "kunde": "Kundenname oder null",
      "original_text": "Exakt was auf dem Zettel steht",
      "konfidenz": 0.85
    }
  ],
  "kommentar": "Nicht-Bestell-Texte vom Zettel",
  "meta": {
    "filiale": "Falls erkennbar, sonst null",
    "datum": "Falls erkennbar im Format YYYY-MM-DD, sonst null",
    "unlesbare_stellen": ["Beschreibung"]
  }
}`;

// Main function: takes base64 image, returns parsed JSON from Mistral
export async function erkenneBild(base64Image) {
  const startTime = Date.now();

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: PROMPT_TEMPLATE },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }],
        max_tokens: 2000,
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

    // Try to parse JSON from response (Mistral sometimes wraps in markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);
    const verarbeitungszeit = Date.now() - startTime;

    return {
      success: true,
      data: parsed,
      meta: {
        verarbeitungszeit_ms: verarbeitungszeit,
        modell: MISTRAL_MODEL,
        modus: "live"
      }
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT: Mistral API hat nicht innerhalb von 15 Sekunden geantwortet');
    }
    throw error;
  }
}

// Simple test: checks if API key works
export async function testeVerbindung() {
  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [{ role: "user", content: "Antworte nur mit: OK" }],
        max_tokens: 10
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}
