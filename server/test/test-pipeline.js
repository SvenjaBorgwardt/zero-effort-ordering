/**
 * Test-Pipeline: Prüft alle Komponenten der Vorbau-Pipeline.
 * Ausführen mit: node server/test/test-pipeline.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { testeVerbindung, erkenneBild } from '../services/mistralService.js';
import { matcheProdukt, matcheAllePositionen } from '../services/produktMatcher.js';
import { pruefeAllePositionen } from '../services/plausiCheck.js';
import { getMockMode, getMockResponse } from '../mock/mock-controller.js';

let bestanden = 0;
let fehlgeschlagen = 0;

function test(name, bedingung, detail = '') {
  if (bedingung) {
    console.log(`  ✅ ${name}`);
    bestanden++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' – ' + detail : ''}`);
    fehlgeschlagen++;
  }
}

async function runTests() {
  console.log('');
  console.log('  ═══════════════════════════════════════════');
  console.log('  🧪 Pipeline Test-Suite');
  console.log('  ═══════════════════════════════════════════');
  console.log('');

  // ---- Test 1: API-Verbindung ----
  console.log('  --- Test 1: API-Verbindung ---');
  const apiOk = await testeVerbindung();
  test('Mistral API erreichbar', apiOk, 'Prüfe MISTRAL_API_KEY in .env');

  // ---- Test 2: Fuzzy Matching ----
  console.log('');
  console.log('  --- Test 2: Fuzzy Matching ---');

  const match1 = matcheProdukt('Weizenbrötchen');
  test('Exakter Match: "Weizenbrötchen"', match1?.produkt_id === 'weizenbroetchen');

  const match2 = matcheProdukt('WB');
  test('Abkürzung: "WB" → Weizenbrötchen', match2?.produkt_id === 'weizenbroetchen', `Ergab: ${match2?.produkt_name}`);

  const match3 = matcheProdukt('Croi');
  test('Abkürzung: "Croi" → Buttercroissant', match3?.produkt_id === 'croissant', `Ergab: ${match3?.produkt_name}`);

  const match4 = matcheProdukt('Brötchen');
  test('Generisch: "Brötchen" → Weizenbrötchen', match4?.produkt_id === 'weizenbroetchen', `Ergab: ${match4?.produkt_name}`);

  const match5 = matcheProdukt('KB');
  test('Abkürzung: "KB" → Körnerbrötchen', match5?.produkt_id === 'koernerbroetchen', `Ergab: ${match5?.produkt_name}`);

  const match6 = matcheProdukt('RS');
  test('Abkürzung: "RS" → Rosinenschnecke', match6?.produkt_id === 'rosinenschnecke', `Ergab: ${match6?.produkt_name}`);

  const match7 = matcheProdukt('DVK');
  test('Abkürzung: "DVK" → Dinkelvollkornbrot', match7?.produkt_id === 'dinkelbrot', `Ergab: ${match7?.produkt_name}`);

  const match8 = matcheProdukt('Mischbrot');
  test('Exakt: "Mischbrot"', match8?.produkt_id === 'mischbrot', `Ergab: ${match8?.produkt_name}`);

  // ---- Test 3: Plausibilitäts-Check ----
  console.log('');
  console.log('  --- Test 3: Plausibilitäts-Check ---');

  const testPositionen = [
    {
      produkt: 'Weizenbrötchen', menge: 80, einheit: 'Stück',
      original_text: '80 Brötchen', konfidenz: 0.95,
      katalog_match: true, typische_menge: { min: 30, max: 150, einheit: 'Stück' }
    },
    {
      produkt: 'Mohnbrötchen', menge: 500, einheit: 'Stück',
      original_text: '500 Mohnbrötchen', konfidenz: 0.94,
      katalog_match: true, typische_menge: { min: 10, max: 60, einheit: 'Stück' }
    },
    {
      produkt: 'Käsekuchen', menge: 2, einheit: 'Stück',
      original_text: '2 KK', konfidenz: 0.90,
      katalog_match: true, typische_menge: { min: 1, max: 5, einheit: 'Stück' }
    },
    {
      produkt: 'Unbekanntes Produkt', menge: 5, einheit: 'Stück',
      original_text: '5 ???', konfidenz: 0.30,
      katalog_match: false
    }
  ];

  const geprüft = pruefeAllePositionen(testPositionen);
  test('80 Weizenbrötchen → grün', geprüft[0].plausibilitaet === 'gruen');
  test('500 Mohnbrötchen → gelb/rot (Ausreißer)', geprüft[1].plausibilitaet === 'gelb' || geprüft[1].plausibilitaet === 'rot', `Ergab: ${geprüft[1].plausibilitaet}`);
  test('2 Käsekuchen → grün', geprüft[2].plausibilitaet === 'gruen');
  test('Unbekanntes Produkt → rot', geprüft[3].plausibilitaet === 'rot');

  // ---- Test 4: Mock-System ----
  console.log('');
  console.log('  --- Test 4: Mock-System ---');

  const mockMode = getMockMode();
  test('Mock-Mode konfiguriert', ['auto', 'true', 'false'].includes(mockMode), `Wert: ${mockMode}`);

  const mockResponse = getMockResponse('zettel1');
  test('Mock "zettel1" ladbar', mockResponse && mockResponse.positionen?.length > 0, `Positionen: ${mockResponse?.positionen?.length || 0}`);

  const mockRandom = getMockResponse(null);
  test('Zufälliger Mock ladbar', mockRandom && mockRandom.positionen?.length > 0);

  // ---- Test 5: Kompletter Flow (Mock) ----
  console.log('');
  console.log('  --- Test 5: Kompletter Mock-Flow ---');

  const mockDaten = getMockResponse('zettel6'); // Ausreißer-Zettel
  const gematchtePos = matcheAllePositionen(mockDaten.positionen);
  const geprüftePos = pruefeAllePositionen(gematchtePos);

  test('Mock-Daten → Matching → Plausi-Check: Pipeline läuft', geprüftePos.length > 0, `${geprüftePos.length} Positionen verarbeitet`);

  const hatAusreißer = geprüftePos.some(p => p.plausibilitaet === 'gelb' || p.plausibilitaet === 'rot');
  test('Ausreißer im Zettel 6 erkannt', hatAusreißer, 'Sollte 500 Mohnbrötchen als auffällig markieren');

  // ---- Test 6: Vision-API (nur wenn API erreichbar) ----
  console.log('');
  console.log('  --- Test 6: Vision-API (optional) ---');

  if (apiOk) {
    // Erstelle ein minimales Test-Bild (1x1 weißes PNG als Base64)
    // Das testet nur, ob der API-Call funktioniert, nicht die Erkennungsqualität
    const miniPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    try {
      const ergebnis = await erkenneBild(miniPng);
      test('Vision-API Call funktioniert', ergebnis.success === true, `Modus: ${ergebnis.meta?.modus}`);
    } catch (err) {
      test('Vision-API Call funktioniert', false, err.message);
    }
  } else {
    console.log('  ⏭️  Übersprungen (API nicht erreichbar)');
  }

  // ---- Test 7: Auto-Fallback ----
  console.log('');
  console.log('  --- Test 7: Auto-Fallback ---');

  // Simuliere: Wenn Mock-Mode auto und API-Fehler → Mock greift
  const originalMode = process.env.MOCK_MODE;
  process.env.MOCK_MODE = 'true';
  const forcedMock = getMockResponse('zettel1');
  process.env.MOCK_MODE = originalMode || 'auto';
  test('Erzwungener Mock-Modus liefert Daten', forcedMock && forcedMock.positionen?.length > 0);

  // ---- Ergebnis ----
  console.log('');
  console.log('  ═══════════════════════════════════════════');
  const total = bestanden + fehlgeschlagen;
  if (fehlgeschlagen === 0) {
    console.log(`  🎉 ${bestanden}/${total} Tests bestanden ✅`);
    console.log('  Pipeline ist hackathon-ready!');
  } else {
    console.log(`  ⚠️  ${bestanden}/${total} Tests bestanden, ${fehlgeschlagen} fehlgeschlagen`);
  }
  console.log('  ═══════════════════════════════════════════');
  console.log('');
}

runTests().catch(err => {
  console.error('Test-Pipeline Fehler:', err);
  process.exit(1);
});
