import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load product catalog
const katalogPath = join(__dirname, '..', 'data', 'produktkatalog.json');
const katalog = JSON.parse(readFileSync(katalogPath, 'utf-8'));

// Combine backwaren and rohstoffe into one flat array for matching
const alleProdukte = [
  ...katalog.backwaren.map(p => ({ ...p, bereich: 'backwaren' })),
  ...katalog.rohstoffe.map(p => ({ ...p, bereich: 'rohstoffe' }))
];

// Configure fuse.js for fuzzy matching
const fuse = new Fuse(alleProdukte, {
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'aliase', weight: 0.6 }
  ],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 2
});

/**
 * Match a recognized product name against the catalog.
 * Returns the best match with score, or null if no match found.
 */
export function matcheProdukt(erkannterName) {
  if (!erkannterName || erkannterName.trim() === '') return null;

  const results = fuse.search(erkannterName.trim());

  if (results.length === 0) return null;

  const best = results[0];
  // fuse.js score: 0 = perfect match, 1 = no match
  const matchScore = 1 - best.score;

  return {
    produkt_id: best.item.id,
    produkt_name: best.item.name,
    einheit: best.item.einheit,
    bereich: best.item.bereich,
    kategorie: best.item.kategorie,
    typ: best.item.typ || null,
    typische_menge: best.item.typische_menge,
    match_score: matchScore
  };
}

/**
 * Process all positions from Mistral response: match each against catalog.
 * Returns enriched positions with product IDs and match info.
 */
export function matcheAllePositionen(positionen) {
  return positionen.map(pos => {
    const match = matcheProdukt(pos.produkt);

    if (match) {
      return {
        ...pos,
        produkt_id: match.produkt_id,
        produkt_name: match.produkt_name,
        einheit: pos.einheit || match.einheit,
        bereich: match.bereich,
        kategorie: match.kategorie,
        typ: match.typ,
        typische_menge: match.typische_menge,
        match_score: match.match_score,
        katalog_match: true
      };
    } else {
      return {
        ...pos,
        produkt_id: null,
        produkt_name: pos.produkt,
        katalog_match: false,
        match_score: 0
      };
    }
  });
}

/**
 * Get the full catalog (for frontend dropdowns)
 */
export function getKatalog() {
  return katalog;
}
