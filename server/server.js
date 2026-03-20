import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { erkenneBild, testeVerbindung } from './services/mistralService.js';
import { matcheAllePositionen, getKatalog } from './services/produktMatcher.js';
import { pruefeAllePositionen } from './services/plausiCheck.js';
import { getMockMode, getMockResponse } from './mock/mock-controller.js';
import { transkribiere, testeVoxtralVerbindung } from './services/voxtralService.js';
import { parseBestellung } from './services/sprachParser.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Groß genug für Base64-Fotos

// === Datei-Pfade ===
// Auf Vercel (serverless) ist nur /tmp beschreibbar
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const bestellungenPath = isServerless
  ? '/tmp/bestellungen.json'
  : join(__dirname, 'data', 'bestellungen.json');
const demoBestellungenPath = join(__dirname, 'data', 'demo-bestellungen.json');
const filialenPath = join(__dirname, 'data', 'filialen.json');

// === Hilfsfunktionen ===
function ladeBestellungen() {
  try {
    const data = readFileSync(bestellungenPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function speichereBestellungen(bestellungen) {
  writeFileSync(bestellungenPath, JSON.stringify(bestellungen, null, 2), 'utf-8');
}

function ladeFilialen() {
  const data = readFileSync(filialenPath, 'utf-8');
  return JSON.parse(data).filialen;
}

// Beim Start: Demo-Bestellungen laden falls bestellungen.json leer ist
function initDemoBestellungen() {
  const bestellungen = ladeBestellungen();
  if (bestellungen.length === 0 && existsSync(demoBestellungenPath)) {
    const demo = JSON.parse(readFileSync(demoBestellungenPath, 'utf-8'));
    speichereBestellungen(demo);
    console.log(`  📦 ${demo.length} Demo-Bestellungen geladen`);
  }
}

// ============================================================
// KERN-ENDPOINT: Foto → Erkennung → Matching → Plausibilitäts-Check
// ============================================================
app.post('/api/erkennung', async (req, res) => {
  const { foto_base64, filiale_id, mock_id } = req.body;

  if (!foto_base64 && !mock_id) {
    return res.status(400).json({ error: 'foto_base64 oder mock_id erforderlich' });
  }

  const mockMode = getMockMode();
  let rohdaten;
  let modus = 'live';

  try {
    // Entscheide: Mock oder Live?
    if (mockMode === 'true' || mock_id) {
      // Erzwungener Mock-Modus
      rohdaten = getMockResponse(mock_id || null);
      modus = 'mock';
    } else if (mockMode === 'auto') {
      // Auto-Modus: Versuche Live, Fallback auf Mock
      try {
        const ergebnis = await erkenneBild(foto_base64);
        rohdaten = ergebnis.data;
        modus = 'live';
      } catch (apiError) {
        console.warn(`  ⚠️  Live-API fehlgeschlagen (${apiError.message}), nutze Mock-Fallback`);
        rohdaten = getMockResponse(null);
        modus = 'mock-fallback';
      }
    } else {
      // Nur Live, kein Fallback
      const ergebnis = await erkenneBild(foto_base64);
      rohdaten = ergebnis.data;
      modus = 'live';
    }

    // Schritt 2: Produkt-Matching gegen Katalog
    const gematchtePositionen = matcheAllePositionen(rohdaten.positionen || []);

    // Schritt 3: Plausibilitäts-Check (Ampelfarben)
    const geprüftePositionen = pruefeAllePositionen(gematchtePositionen);

    // Schritt 4: Sonderbestellungen durchreichen (kein Matching nötig)
    const sonderbestellungen = (rohdaten.sonderbestellungen || []).map(sb => ({
      ...sb,
      produkt_name: sb.produkt,
      typ: 'sonderbestellung'
    }));

    // Response zusammenbauen
    const response = {
      success: true,
      positionen: geprüftePositionen,
      sonderbestellungen,
      kommentar: rohdaten.kommentar || '',
      erkennungs_meta: {
        filiale: rohdaten.meta?.filiale || null,
        datum: rohdaten.meta?.datum || null,
        unlesbare_stellen: rohdaten.meta?.unlesbare_stellen || [],
        verarbeitungszeit_ms: rohdaten.meta?.verarbeitungszeit_ms || 0,
        modell: 'mistral-large-latest',
        modus
      }
    };

    console.log(`  ✅ Erkennung abgeschlossen (${modus}): ${geprüftePositionen.length} Positionen, ${sonderbestellungen.length} Sonderbestellungen`);
    res.json(response);

  } catch (error) {
    console.error(`  ❌ Erkennungsfehler: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      hinweis: 'Bitte neues Foto versuchen oder Mock-Modus aktivieren (MOCK_MODE=true in .env)'
    });
  }
});

// ============================================================
// BESTELLUNGEN
// ============================================================
app.post('/api/bestellung', (req, res) => {
  const { filiale_id, filiale_name, positionen, sonderbestellungen, kommentar, foto_base64 } = req.body;

  if (!filiale_id || !positionen) {
    return res.status(400).json({ error: 'filiale_id und positionen erforderlich' });
  }

  const bestellungen = ladeBestellungen();
  const heute = new Date().toISOString().split('T')[0];
  const filialeBestellungen = bestellungen.filter(b =>
    b.filiale_id === filiale_id && b.zeitstempel.startsWith(heute)
  );

  const neueBestellung = {
    id: `best-${heute.replace(/-/g, '')}-${filiale_id}-${String(filialeBestellungen.length + 1).padStart(3, '0')}`,
    filiale_id,
    filiale_name: filiale_name || filiale_id,
    zeitstempel: new Date().toISOString(),
    status: 'bestaetigt',
    positionen,
    sonderbestellungen: sonderbestellungen || [],
    kommentar: kommentar || '',
    foto_base64: foto_base64 ? '[gespeichert]' : null, // Foto nicht nochmal speichern, nur Marker
    erkennungs_meta: {
      modell: 'mistral-large-latest'
    }
  };

  bestellungen.push(neueBestellung);
  speichereBestellungen(bestellungen);

  console.log(`  📝 Neue Bestellung: ${neueBestellung.id} von ${filiale_name}`);
  res.json({ success: true, bestellung_id: neueBestellung.id });
});

app.get('/api/bestellungen', (req, res) => {
  const { datum, filiale } = req.query;
  let bestellungen = ladeBestellungen();

  if (datum) {
    bestellungen = bestellungen.filter(b => b.zeitstempel.startsWith(datum));
  }
  if (filiale) {
    bestellungen = bestellungen.filter(b => b.filiale_id === filiale);
  }

  res.json(bestellungen);
});

// ============================================================
// DASHBOARD-ENDPOINTS
// ============================================================
app.get('/api/status', (req, res) => {
  const datum = req.query.datum || new Date().toISOString().split('T')[0];
  const bestellungen = ladeBestellungen().filter(b => b.zeitstempel.startsWith(datum));
  const filialen = ladeFilialen();

  const filialenMitBestellung = new Set(bestellungen.map(b => b.filiale_id));

  const status = filialen.map(f => ({
    ...f,
    hat_bestellt: filialenMitBestellung.has(f.id),
    anzahl_bestellungen: bestellungen.filter(b => b.filiale_id === f.id).length,
    letzte_bestellung: bestellungen
      .filter(b => b.filiale_id === f.id)
      .sort((a, b) => new Date(b.zeitstempel) - new Date(a.zeitstempel))[0]?.zeitstempel || null,
    hat_anomalie: bestellungen.some(b =>
      b.filiale_id === f.id &&
      b.positionen.some(p => p.plausibilitaet === 'gelb' || p.plausibilitaet === 'rot')
    ),
    hat_sonderbestellung: bestellungen.some(b =>
      b.filiale_id === f.id && b.sonderbestellungen && b.sonderbestellungen.length > 0
    )
  }));

  const bestellt = status.filter(s => s.hat_bestellt).length;
  const gesamt = filialen.length;

  res.json({
    datum,
    bestellt,
    gesamt,
    fehlend: gesamt - bestellt,
    filialen: status
  });
});

app.get('/api/gesamt', (req, res) => {
  const datum = req.query.datum || new Date().toISOString().split('T')[0];
  const bestellungen = ladeBestellungen().filter(b => b.zeitstempel.startsWith(datum));

  // Alle Positionen aufaddieren
  const produktSummen = {};
  bestellungen.forEach(b => {
    b.positionen.forEach(p => {
      const key = p.produkt_id || p.produkt_name;
      if (!produktSummen[key]) {
        produktSummen[key] = {
          produkt_id: p.produkt_id,
          produkt_name: p.produkt_name,
          einheit: p.einheit,
          kategorie: p.kategorie || 'Sonstiges',
          gesamt_menge: 0,
          anzahl_filialen: new Set(),
        };
      }
      produktSummen[key].gesamt_menge += p.menge;
      produktSummen[key].anzahl_filialen.add(b.filiale_id);
    });
  });

  // Set zu Zahl konvertieren und sortieren
  const gesamtbestellung = Object.values(produktSummen)
    .map(p => ({
      ...p,
      anzahl_filialen: p.anzahl_filialen.size
    }))
    .sort((a, b) => {
      // Erst nach Kategorie, dann nach Menge absteigend
      if (a.kategorie < b.kategorie) return -1;
      if (a.kategorie > b.kategorie) return 1;
      return b.gesamt_menge - a.gesamt_menge;
    });

  // Sonderbestellungen sammeln
  const sonderbestellungen = [];
  bestellungen.forEach(b => {
    (b.sonderbestellungen || []).forEach(sb => {
      sonderbestellungen.push({
        ...sb,
        filiale_id: b.filiale_id,
        filiale_name: b.filiale_name
      });
    });
  });

  res.json({
    datum,
    anzahl_bestellungen: bestellungen.length,
    gesamtbestellung,
    sonderbestellungen
  });
});

// ============================================================
// KASSEN-ENDPOINTS (Sprach-basiertes POS)
// ============================================================

// Schritt 1: Audio → Transkription (Voxtral)
app.post('/api/kasse/transkribiere', async (req, res) => {
  const { audio_base64, mime_type } = req.body;

  if (!audio_base64) {
    return res.status(400).json({ error: 'audio_base64 erforderlich' });
  }

  try {
    const ergebnis = await transkribiere(audio_base64, mime_type || 'audio/webm');
    console.log(`  🎙️  Transkription: "${ergebnis.text.substring(0, 80)}..."`);
    res.json(ergebnis);
  } catch (error) {
    console.error(`  ❌ Transkriptionsfehler: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Schritt 2: Transkription → Bestellpositionen (Mistral Large + Matching + Plausibilität)
app.post('/api/kasse/erkenne', async (req, res) => {
  const { transkription } = req.body;

  if (!transkription) {
    return res.status(400).json({ error: 'transkription erforderlich' });
  }

  try {
    // Mistral Large: Smalltalk rausfiltern, Positionen extrahieren
    const rohdaten = await parseBestellung(transkription);

    // Produkt-Matching gegen Katalog
    const gematchtePositionen = matcheAllePositionen(rohdaten.positionen || []);

    // Plausibilitäts-Check
    const geprüftePositionen = pruefeAllePositionen(gematchtePositionen);

    // Preise aus Katalog anreichern
    const katalog = getKatalog();
    const alleProdukte = [...katalog.backwaren, ...(katalog.rohstoffe || [])];
    const positionenMitPreis = geprüftePositionen.map(p => {
      const katProdukt = alleProdukte.find(k => k.id === p.produkt_id);
      return {
        ...p,
        preis_pro_stueck: katProdukt?.preis ?? null,
        preis_gesamt: katProdukt?.preis != null ? Math.round(katProdukt.preis * p.menge * 100) / 100 : null
      };
    });

    console.log(`  🛒 Kassenerkennung: ${positionenMitPreis.length} Positionen erkannt`);
    res.json({
      success: true,
      positionen: positionenMitPreis,
      kommentar: rohdaten.kommentar || ''
    });
  } catch (error) {
    console.error(`  ❌ Kassenerkennungsfehler: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// STAMMDATEN
// ============================================================
app.get('/api/katalog', (req, res) => {
  res.json(getKatalog());
});

app.get('/api/filialen', (req, res) => {
  res.json(ladeFilialen());
});

// ============================================================
// HEALTH-CHECK
// ============================================================
app.get('/api/health', async (req, res) => {
  const [apiOk, voxtralOk] = await Promise.all([testeVerbindung(), testeVoxtralVerbindung()]);
  res.json({
    status: 'ok',
    mock_mode: getMockMode(),
    mistral_api: apiOk ? 'verbunden' : 'nicht erreichbar',
    voxtral_api: voxtralOk ? 'verbunden' : 'nicht erreichbar (Mock aktiv)',
    timestamp: new Date().toISOString()
  });
});

// App exportieren (für Vercel Serverless Function)
export default app;

// ============================================================
// SERVER START (nur wenn direkt aufgerufen, nicht wenn importiert)
// ============================================================
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log('  🥐 [APPNAME] Backend Server');
    console.log(`  ═══════════════════════════════════════`);
    console.log(`  🌐 Port:      ${PORT}`);
    console.log(`  🤖 Mock-Mode: ${getMockMode()}`);
    console.log(`  📁 Daten:     ${join(__dirname, 'data')}`);
    console.log('  ═══════════════════════════════════════');
    console.log('');

    initDemoBestellungen();

    // API-Verbindung testen
    testeVerbindung().then(ok => {
      if (ok) {
        console.log('  ✅ Mistral API: Verbindung steht');
      } else {
        console.log('  ⚠️  Mistral API: Nicht erreichbar (Mock-Modus verfügbar)');
      }
      console.log('');
    });
  });
}
