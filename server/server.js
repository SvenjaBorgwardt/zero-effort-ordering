import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { erkenneBild, testeVerbindung } from './services/mistralService.js';
import { matcheAllePositionen, getKatalog } from './services/produktMatcher.js';
import { pruefeAllePositionen } from './services/plausiCheck.js';
import { transkribiere, testeVoxtralVerbindung } from './services/voxtralService.js';
import { parseBestellung } from './services/sprachParser.js';
import { speichereBestellung, zaehleFilialBestellungen } from './services/supabaseService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
    const rohdaten = await parseBestellung(transkription);
    const gematchtePositionen = matcheAllePositionen(rohdaten.positionen || []);
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

// Schritt 3: Kassen-Bestellung speichern
app.post('/api/kasse/bestellung', async (req, res) => {
  const { positionen, kommentar, transkription } = req.body;

  if (!positionen || positionen.length === 0) {
    return res.status(400).json({ error: 'positionen erforderlich' });
  }

  try {
    const zeitstempel = new Date().toISOString();
    const datum = zeitstempel.split('T')[0];
    const lfdNr = await zaehleFilialBestellungen('kasse', datum);

    const neueBestellung = {
      id: `kasse-${datum.replace(/-/g, '')}-${String(lfdNr + 1).padStart(3, '0')}`,
      filiale_id: 'kasse',
      filiale_name: 'UTE Kasse',
      zeitstempel,
      status: 'bestaetigt',
      positionen,
      sonderbestellungen: [],
      kommentar: kommentar || transkription || '',
      foto_base64: null,
      erkennungs_meta: { modell: 'voxtral + mistral-large-latest' },
      quelle: 'kasse'
    };

    await speichereBestellung(neueBestellung);
    const gesamtPreis = positionen.reduce((s, p) => s + (p.preis_gesamt || 0), 0);
    console.log(`  🛒 Kassen-Bestellung: ${neueBestellung.id} (${positionen.length} Positionen, ${gesamtPreis.toFixed(2)} €)`);
    res.json({ success: true, bestellung_id: neueBestellung.id });
  } catch (error) {
    console.error(`  ❌ Kassen-Bestellungsfehler: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// STAMMDATEN
// ============================================================
app.get('/api/katalog', (req, res) => {
  res.json(getKatalog());
});

// ============================================================
// BACKUP: Foto-Erkennung (für spätere Nutzung)
// ============================================================
app.post('/api/erkennung', async (req, res) => {
  const { foto_base64 } = req.body;

  if (!foto_base64) {
    return res.status(400).json({ error: 'foto_base64 erforderlich' });
  }

  try {
    const ergebnis = await erkenneBild(foto_base64);
    const rohdaten = ergebnis.data;
    const gematchtePositionen = matcheAllePositionen(rohdaten.positionen || []);
    const geprüftePositionen = pruefeAllePositionen(gematchtePositionen);

    res.json({
      success: true,
      positionen: geprüftePositionen,
      kommentar: rohdaten.kommentar || ''
    });
  } catch (error) {
    console.error(`  ❌ Erkennungsfehler: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HEALTH-CHECK
// ============================================================
app.get('/api/health', async (req, res) => {
  const [apiOk, voxtralOk] = await Promise.all([testeVerbindung(), testeVoxtralVerbindung()]);
  res.json({
    status: 'ok',
    mistral_api: apiOk ? 'verbunden' : 'nicht erreichbar',
    voxtral_api: voxtralOk ? 'verbunden' : 'nicht erreichbar',
    timestamp: new Date().toISOString()
  });
});

// App exportieren (für Vercel Serverless Function)
export default app;

// ============================================================
// SERVER START (nur wenn direkt aufgerufen)
// ============================================================
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log('  🥐 UTE – Unmittelbare Thekenkommunikation');
    console.log('  ═══════════════════════════════════════');
    console.log(`  🌐 Port:      ${PORT}`);
    console.log(`  🗄️  Datenbank: Supabase`);
    console.log('  ═══════════════════════════════════════');
    console.log('');

    testeVerbindung().then(ok => {
      if (ok) {
        console.log('  ✅ Mistral API: Verbindung steht');
      } else {
        console.log('  ⚠️  Mistral API: Nicht erreichbar');
      }
      console.log('');
    });
  });
}
