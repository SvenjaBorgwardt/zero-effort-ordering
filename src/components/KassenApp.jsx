import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Check, X, AlertTriangle, User, ShoppingCart, Coffee, CreditCard, Banknote, Leaf, Info } from 'lucide-react'
import { transkribiere, erkenneSprache, speichereKassenBestellung, ladeKatalog } from '../services/api'
import { UTELogo } from './ute-logo'

// ============================================================
// PRODUKT-KATEGORIEN (für Touchscreen-Buttons)
// ============================================================
const KATEGORIEN = [
  { id: 'alle', label: 'Alle' },
  { id: 'Brötchen', label: 'Brötchen' },
  { id: 'Laugengebäck', label: 'Laugen' },
  { id: 'Feingebäck', label: 'Süßes' },
  { id: 'Brot', label: 'Brot' },
  { id: 'Torten & Kuchen', label: 'Kuchen' },
  { id: 'Snacks', label: 'Snacks' },
  { id: 'Belegware', label: 'Belag' },
  { id: 'Heißgetränke', label: 'Getränke' },
]

// Stammkunden (Daten von den Bäckerinnen)
const STAMMKUNDEN = [
  { id: 'sk1', name: 'Frau Mayer', spitzname: 'Der Herr Mayer', letzte: [
    { produkt_id: 'weizenbroetchen', name: 'Weizenbrötchen', menge: 6, preis: 0.45 },
    { produkt_id: 'mohnbroetchen', name: 'Mohnbrötchen', menge: 2, preis: 0.50 },
    { produkt_id: 'mischbrot', name: 'Mischbrot', menge: 1, preis: 3.90 },
  ]},
  { id: 'sk2', name: 'Frau Schmidt', spitzname: 'Die Frau Schmidt', allergie: 'Sesam', letzte: [
    { produkt_id: 'croissant', name: 'Buttercroissant', menge: 2, preis: 1.80 },
    { produkt_id: 'dinkelbrot', name: 'Dinkelvollkornbrot', menge: 1, preis: 4.50 },
  ]},
  { id: 'sk3', name: 'Frau Klein', letzte: [
    { produkt_id: 'koernerbroetchen', name: 'Körnerbrötchen', menge: 4, preis: 0.55 },
    { produkt_id: 'rosinenschnecke', name: 'Rosinenschnecke', menge: 1, preis: 1.60 },
  ]},
]

// Cross-Selling Regeln (von den Bäckerinnen)
const CROSS_SELLING_REGELN = [
  { trigger_produkt: 'roeggelchen', vorschlag: 'nussecke', text: 'Da passt etwas Süßes noch gut dazu!', prio: 1 },
  { trigger_produkt: 'nussschnecke', vorschlag: 'nussecke', text: 'Nuss und Nuss gesellt sich gern!', prio: 1 },
  { trigger_produkt: 'mischbrot', vorschlag: 'leinsaatbrot', text: 'Ein Körnerbrot wäre eine gute Ergänzung!', prio: 2 },
  { trigger_produkt: 'laugenbrezel', vorschlag: 'vollkornbroetchen', text: 'Ein paar zusätzliche Ballaststoffe passen ganz gut!', prio: 3 },
  { trigger_produkt: 'apfeltasche', vorschlag: 'vegane-quiche', text: 'Dazu eine vegane Quiche? Herzhaft trifft süß!', prio: 1 },
]

// ============================================================
// ALLERGEN-ICONS & FARBEN
// ============================================================
// Allergen-SVG-Icons (klar erkennbar für Bäckereifachverkäuferinnen)
const AllergenIcon = ({ code, size = 16 }) => {
  const s = size
  const icons = {
    // Ähre (Gluten/Getreide)
    'A': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 21V10"/><path d="M12 10C12 10 8 7 8 4c0 0 4 1 4 6"/><path d="M12 10c0 0 4-3 4-6 0 0-4 1-4 6"/><path d="M12 14c0 0-3-2-3-5 0 0 3 1 3 5"/><path d="M12 14c0 0 3-2 3-5 0 0-3 1-3 5"/></svg>,
    'A1': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 21V10"/><path d="M12 10C12 10 8 7 8 4c0 0 4 1 4 6"/><path d="M12 10c0 0 4-3 4-6 0 0-4 1-4 6"/></svg>,
    'A2': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 21V10"/><path d="M12 10C12 10 8 7 8 4c0 0 4 1 4 6"/><path d="M12 10c0 0 4-3 4-6 0 0-4 1-4 6"/></svg>,
    'A3': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 21V10"/><path d="M12 10C12 10 8 7 8 4c0 0 4 1 4 6"/><path d="M12 10c0 0 4-3 4-6 0 0-4 1-4 6"/></svg>,
    // Krabbe (Krebstiere)
    'B': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="13" r="4"/><path d="M5 9l3 4"/><path d="M19 9l-3 4"/><path d="M8 17l-2 3"/><path d="M16 17l2 3"/><path d="M5 9l-1-3"/><path d="M19 9l1-3"/></svg>,
    // Ei
    'C': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="14" rx="6" ry="7"/><path d="M12 3c-3 0-6 4.5-6 11" strokeLinecap="round"/><path d="M12 3c3 0 6 4.5 6 11" strokeLinecap="round"/></svg>,
    // Fisch
    'D': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12c3-4 7-6 12-6 2 0 4 1 6 3-2 2-4 3-6 3-5 0-9-2-12-6z"/><path d="M2 12c3 4 7 6 12 6 2 0 4-1 6-3"/><path d="M20 9l2-3"/><path d="M20 15l2 3"/><circle cx="16" cy="11" r="1" fill="currentColor"/></svg>,
    // Erdnuss
    'E': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><ellipse cx="10" cy="9" rx="4" ry="5"/><ellipse cx="14" cy="15" rx="4" ry="5"/><path d="M12 4v16"/></svg>,
    // Soja (Bohne)
    'F': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3C8 3 5 7 5 12s3 9 7 9c4 0 7-4 7-9S16 3 12 3z"/><path d="M12 3v18"/></svg>,
    // Milch
    'G': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2h8l1 5H7l1-5z"/><rect x="7" y="7" width="10" height="14" rx="1"/><path d="M7 12h10"/></svg>,
    // Nuss
    'H': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 4C7 4 4 8 4 13c0 4 3 7 8 7s8-3 8-7c0-5-3-9-8-9z"/><path d="M12 4v4"/><path d="M9 20c1-3 1-6 0-9"/><path d="M15 20c-1-3-1-6 0-9"/></svg>,
    'H1': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 4C7 4 4 8 4 13c0 4 3 7 8 7s8-3 8-7c0-5-3-9-8-9z"/><path d="M12 4v4"/></svg>,
    'H2': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 4C7 4 4 8 4 13c0 4 3 7 8 7s8-3 8-7c0-5-3-9-8-9z"/><path d="M12 4v4"/></svg>,
    'H3': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 4C7 4 4 8 4 13c0 4 3 7 8 7s8-3 8-7c0-5-3-9-8-9z"/><path d="M12 4v4"/></svg>,
    // Sellerie
    'I': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 21v-8"/><path d="M8 21v-6c0-3 2-6 4-8"/><path d="M16 21v-6c0-3-2-6-4-8"/><path d="M12 7c-1-2-3-4-4-4"/><path d="M12 7c1-2 3-4 4-4"/></svg>,
    // Senf
    'J': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="8" y="8" width="8" height="13" rx="2"/><path d="M10 8V5h4v3"/><path d="M12 2v3"/><path d="M8 14h8"/></svg>,
    // Sesam (Körner)
    'K': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><ellipse cx="8" cy="8" rx="2" ry="3" transform="rotate(-20 8 8)"/><ellipse cx="16" cy="8" rx="2" ry="3" transform="rotate(20 16 8)"/><ellipse cx="12" cy="15" rx="2" ry="3"/><ellipse cx="6" cy="16" rx="2" ry="3" transform="rotate(-15 6 16)"/><ellipse cx="18" cy="16" rx="2" ry="3" transform="rotate(15 18 16)"/></svg>,
    // Sulfite (SO₂)
    'L': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8"/><text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none" fontWeight="bold">S</text></svg>,
    // Lupine (Blüte)
    'M': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 21v-8"/><path d="M12 13c-3 0-5-2-5-5 0 2-2 5 0 7"/><path d="M12 13c3 0 5-2 5-5 0 2 2 5 0 7"/><path d="M12 9c0-3-2-5-4-6 1 2 1 5 4 6"/><path d="M12 9c0-3 2-5 4-6-1 2-1 5-4 6"/></svg>,
    // Weichtiere (Muschel)
    'N': <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 17c0-6 3.5-13 8-13s8 7 8 13"/><path d="M4 17h16"/><path d="M8 17c0-4 1.5-8 4-10"/><path d="M16 17c0-4-1.5-8-4-10"/></svg>,
  }
  return icons[code] || <span style={{fontWeight:'bold',fontSize:s*0.7}}>{code}</span>
}

// Allergen-Icons Mapping (für .join() Kompatibilität im Produkt-Grid)
const ALLERGEN_ICONS = {
  'A': 'A', 'A1': 'A1', 'A2': 'A2', 'A3': 'A3',
  'B': 'B', 'C': 'C', 'D': 'D', 'E': 'E',
  'F': 'F', 'G': 'G', 'H': 'H', 'H1': 'H1', 'H2': 'H2', 'H3': 'H3',
  'I': 'I', 'J': 'J', 'K': 'K', 'L': 'L', 'M': 'M', 'N': 'N',
}

// Kurznamen für Allergen-Tags
const ALLERGEN_KURZ = {
  'A': 'Gluten', 'A1': 'Weizen', 'A2': 'Roggen', 'A3': 'Dinkel',
  'B': 'Krebstiere', 'C': 'Ei', 'D': 'Fisch', 'E': 'Erdnuss',
  'F': 'Soja', 'G': 'Milch', 'H': 'Nüsse', 'H1': 'Mandel', 'H2': 'Haselnuss', 'H3': 'Walnuss',
  'I': 'Sellerie', 'J': 'Senf', 'K': 'Sesam', 'L': 'Sulfite', 'M': 'Lupine', 'N': 'Weichtiere',
}

// ============================================================
// ALLERGEN-AUSSCHLUSS per Sprache
// ============================================================
// Erkennt Phrasen wie "keine Nüsse", "ohne Milch", "allergie gegen Ei"
const ALLERGEN_SPRACH_MAP = [
  { phrasen: ['keine nüsse', 'ohne nüsse', 'nussallergie', 'nuss allergie', 'allergie gegen nüsse', 'keine nuss', 'ohne nuss'], codes: ['H', 'H1', 'H2', 'H3'] },
  { phrasen: ['keine mandeln', 'ohne mandeln', 'mandelallergie'], codes: ['H1'] },
  { phrasen: ['keine haselnüsse', 'ohne haselnüsse', 'keine haselnuss', 'ohne haselnuss'], codes: ['H2'] },
  { phrasen: ['keine walnüsse', 'ohne walnüsse', 'keine walnuss', 'ohne walnuss'], codes: ['H3'] },
  { phrasen: ['keine milch', 'ohne milch', 'laktosefrei', 'milchallergie', 'laktose', 'keine laktose', 'ohne laktose'], codes: ['G'] },
  { phrasen: ['kein ei', 'keine eier', 'ohne ei', 'ohne eier', 'eiallergie', 'ei allergie'], codes: ['C'] },
  { phrasen: ['kein gluten', 'ohne gluten', 'glutenfrei', 'zöliakie', 'glutenunverträglichkeit', 'kein weizen', 'ohne weizen'], codes: ['A', 'A1', 'A2', 'A3'] },
  { phrasen: ['kein sesam', 'ohne sesam', 'sesamallergie'], codes: ['K'] },
  { phrasen: ['keine soja', 'ohne soja', 'kein soja', 'sojaallergie'], codes: ['F'] },
  { phrasen: ['kein senf', 'ohne senf', 'senfallergie'], codes: ['J'] },
  { phrasen: ['keine erdnüsse', 'ohne erdnüsse', 'erdnussallergie', 'keine erdnuss', 'ohne erdnuss'], codes: ['E'] },
  { phrasen: ['keine lupine', 'ohne lupine'], codes: ['M'] },
]

// ============================================================
// BESONDERHEITEN-ERKENNUNG per Sprache
// ============================================================
// Erkennt Phrasen wie "vegan", "bio", "ohne Tierprodukte"
const BESONDERHEITEN_SPRACH_MAP = [
  { phrasen: ['vegan', 'veganes', 'vegane', 'ohne tierprodukte', 'pflanzlich', 'rein pflanzlich', 'ohne tier', 'tierfrei'], id: 'vegan' },
  { phrasen: ['bio', 'biologisch', 'ökologisch', 'öko', 'aus biologischem', 'bio produkte', 'bio-'], id: 'bio' },
  { phrasen: ['regional', 'aus der region', 'von hier', 'regionale', 'regionales', 'heimisch'], id: 'regional' },
]

/**
 * Erkennt Besonderheiten-Wünsche im Sprachtext.
 * Gibt ein Set von Besonderheiten-IDs zurück ('vegan', 'bio', 'regional').
 */
function erkenneBesonderheiten(text) {
  if (!text || text.length < 3) return new Set()
  const lower = text.toLowerCase()
  const gefunden = new Set()
  for (const { phrasen, id } of BESONDERHEITEN_SPRACH_MAP) {
    for (const phrase of phrasen) {
      if (lower.includes(phrase)) {
        gefunden.add(id)
        break
      }
    }
  }
  return gefunden
}

/**
 * Erkennt Allergen-Ausschlüsse im Sprachtext.
 * Gibt ein Set von Allergen-Codes zurück, die ausgeschlossen werden sollen.
 */
function erkenneAllergenAusschluss(text) {
  if (!text || text.length < 5) return new Set()
  const lower = text.toLowerCase()
  const gefunden = new Set()
  for (const { phrasen, codes } of ALLERGEN_SPRACH_MAP) {
    for (const phrase of phrasen) {
      if (lower.includes(phrase)) {
        codes.forEach(c => gefunden.add(c))
        break
      }
    }
  }
  return gefunden
}

/**
 * Prüft ob ein Produkt ein gesperrtes Allergen enthält.
 */
function hatGesperrtesAllergen(produkt, gesperrteAllergene) {
  if (!gesperrteAllergene || gesperrteAllergene.size === 0) return false
  const produktAllergene = [...(produkt.allergene || []), ...(produkt.kann_enthalten || [])]
  return produktAllergene.some(a => gesperrteAllergene.has(a))
}

// ============================================================
// ZAHLWÖRTER → Ziffern (für Live-Erkennung)
// ============================================================
const ZAHLWOERTER = {
  'ein': 1, 'eine': 1, 'einen': 1, 'eins': 1, 'einem': 1,
  'zwei': 2, 'zwo': 2, 'paar': 2,
  'drei': 3, 'vier': 4, 'fünf': 5, 'sechs': 6,
  'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10,
  'elf': 11, 'zwölf': 12, 'dreizehn': 13, 'vierzehn': 14,
  'fünfzehn': 15, 'zwanzig': 20, 'halbes': 0.5, 'halbe': 0.5,
}

/**
 * Normalisiert deutschen Text für besseres Matching:
 * - Umlaute auflösen (ö→oe etc.) für Vergleich
 * - Plural-Endungen entfernen
 */
function normalisiereText(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
}

/**
 * Erzeugt Suchvarianten für ein Wort (Plural, Singular, mit/ohne Umlaut-Auflösung)
 */
function suchVarianten(name) {
  const lower = name.toLowerCase()
  const varianten = new Set([lower])
  // Plural-Varianten
  if (lower.endsWith('en')) varianten.add(lower.slice(0, -2)) // Brötchen → Brötch (naja)
  if (lower.endsWith('n')) varianten.add(lower.slice(0, -1))  // Semmeln → Semmel
  if (lower.endsWith('e')) varianten.add(lower + 'n')          // Brezel → Brezeln
  if (!lower.endsWith('n') && !lower.endsWith('s')) {
    varianten.add(lower + 'n')  // Croissant → Croissantn (harmlos)
    varianten.add(lower + 's')  // Croissant → Croissants
  }
  // Umlaut-aufgelöste Version
  varianten.add(normalisiereText(lower))
  return [...varianten].filter(v => v.length >= 3)
}

/**
 * Stammkunden-Erkennung im Sprachtext.
 * Sucht nach Begrüßungen + Namen wie "Hallo Herr Mayer", "Guten Morgen Frau Schmidt"
 */
function erkenneStammkunde(text, stammkunden) {
  if (!text || text.length < 5) return null
  const lower = text.toLowerCase()
  for (const kunde of stammkunden) {
    // Name direkt suchen
    if (lower.includes(kunde.name.toLowerCase())) return kunde
    // Nachname extrahieren und suchen
    const teile = kunde.name.split(/\s+/)
    const nachname = teile[teile.length - 1].toLowerCase()
    if (nachname.length >= 3 && lower.includes(nachname)) return kunde
    // Spitzname suchen
    if (kunde.spitzname && lower.includes(kunde.spitzname.toLowerCase())) return kunde
  }
  return null
}

/**
 * Live-Matching: Durchsucht den Text nach Produktnamen/Aliasen und Mengen.
 * Mit Fuzzy-Matching: Plural/Singular, Umlaut-Varianten.
 * Gibt ein Array von { produkt, menge } zurück.
 */
function liveMatchProdukte(text, produktListe) {
  if (!text || text.length < 3) return []
  const textLower = text.toLowerCase()
  const textNorm = normalisiereText(text)
  const gefunden = []
  const bereitsGefunden = new Set()

  for (const produkt of produktListe) {
    if (bereitsGefunden.has(produkt.id)) continue

    // Alle suchbaren Namen: Name + Aliase, jeweils mit Varianten
    const alleNamen = [produkt.name, ...(produkt.aliase || [])]
    let besteMatch = null
    let besteIdx = -1

    for (const originalName of alleNamen) {
      const varianten = suchVarianten(originalName)
      for (const variante of varianten) {
        if (variante.length < 3) continue
        // Suche in Original und normalisiertem Text
        let idx = textLower.indexOf(variante)
        if (idx === -1) idx = textNorm.indexOf(normalisiereText(variante))
        if (idx === -1) continue

        // Längere Matches bevorzugen (spezifischer)
        if (!besteMatch || variante.length > besteMatch.length) {
          besteMatch = variante
          besteIdx = idx
        }
      }
    }

    if (!besteMatch) continue

    // Menge vor dem Produktnamen suchen (erweiterte Suche)
    let menge = 1
    const vorher = textLower.substring(Math.max(0, besteIdx - 25), besteIdx).trim()
    const wörter = vorher.split(/\s+/)

    // Von hinten nach vorne nach Zahl suchen
    for (let w = wörter.length - 1; w >= Math.max(0, wörter.length - 3); w--) {
      const wort = wörter[w]
      if (ZAHLWOERTER[wort]) {
        menge = ZAHLWOERTER[wort]
        break
      }
      const zahl = parseInt(wort)
      if (!isNaN(zahl) && zahl > 0 && zahl <= 100) {
        menge = zahl
        break
      }
    }

    gefunden.push({ produkt, menge })
    bereitsGefunden.add(produkt.id)
  }
  return gefunden
}

// Hilfsfunktion: AudioBlob → Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function formatPreis(wert) {
  if (wert == null) return '—'
  return wert.toFixed(2).replace('.', ',') + ' €'
}

// ============================================================
// HAUPTKOMPONENTE
// ============================================================
export default function KassenApp({ mitarbeiter, onAbmelden }) {
  // Produkte aus Katalog
  const [produkte, setProdukte] = useState([])
  const [aktiveKategorie, setAktiveKategorie] = useState('alle')

  // Bestellliste
  const [positionen, setPositionen] = useState([])

  // Spracherkennung
  const [sprachModus, setSprachModus] = useState(false) // false=idle, true=recording
  const [verarbeitung, setVerarbeitung] = useState(false)
  const [liveText, setLiveText] = useState('')
  const [aufnahmeZeit, setAufnahmeZeit] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const zeitRef = useRef(null)
  const recognitionRef = useRef(null)

  // Live-Vorschau Positionen (während Aufnahme)
  const [livePositionen, setLivePositionen] = useState([])
  const letzterLiveTextRef = useRef('')

  // UI State
  const [fehler, setFehler] = useState(null)
  const [abgeschlossen, setAbgeschlossen] = useState(false)
  const [zahlart, setZahlart] = useState('bar')
  const [stammkundePopup, setStammkundePopup] = useState(false)
  const [crossSelling, setCrossSelling] = useState(null) // null oder Produkt-Vorschlag

  // Allergen-Feature
  const [allergenInfo, setAllergenInfo] = useState(null) // null oder {produkt, ...}
  const [allergenCheck, setAllergenCheck] = useState(false) // Gesamt-Allergen-Check
  const [allergenLegende, setAllergenLegende] = useState({})
  const [gesperrteAllergene, setGesperrteAllergene] = useState(new Set()) // per Sprache erkannte Ausschlüsse
  const [allergenWarnung, setAllergenWarnung] = useState(null) // {produkt, allergene} für Warnungs-Popup

  // Stammkunden-Erkennung per Sprache
  const [erkannterStammkunde, setErkannterStammkunde] = useState(null) // per Sprache erkannter Stammkunde
  const stammkundeErkanntRef = useRef(false) // verhindert mehrfaches Popup

  // Besonderheiten-Filter (Bio, Vegan, Regional)
  const [besonderheitenPopup, setBesonderheitenPopup] = useState(false)
  const [aktiveBesonderheiten, setAktiveBesonderheiten] = useState(new Set()) // 'bio', 'vegan', 'regional'

  // Refs für Sprach-Erkennung (verhindert mehrfache Auslösung)
  const besonderheitenErkanntRef = useRef(new Set())
  const allergenErkanntRef = useRef(new Set())
  const zahlartErkanntRef = useRef(false)

  // Stammkunden-Verwaltung (dynamisch erweiterbar)
  const [stammkundenListe, setStammkundenListe] = useState(STAMMKUNDEN)
  const [neuerStammkundePopup, setNeuerStammkundePopup] = useState(false)
  const [neuerStammkundeName, setNeuerStammkundeName] = useState('')
  const [neuerStammkundeAllergie, setNeuerStammkundeAllergie] = useState('')

  // Katalog laden (alle Produkte inkl. Getränke kommen jetzt aus dem Katalog)
  useEffect(() => {
    ladeKatalog().then(data => {
      const backwaren = (data.backwaren || []).map(p => ({
        ...p,
        produkt_name: p.name,
      }))
      setProdukte(backwaren)
      if (data.allergene_legende) setAllergenLegende(data.allergene_legende)
    }).catch(() => {
      setProdukte([])
    })
  }, [])

  // Aufnahmezeit hochzählen
  useEffect(() => {
    if (sprachModus) {
      setAufnahmeZeit(0)
      zeitRef.current = setInterval(() => setAufnahmeZeit(s => s + 1), 1000)
    } else {
      clearInterval(zeitRef.current)
    }
    return () => clearInterval(zeitRef.current)
  }, [sprachModus])

  // ── LIVE-ERKENNUNG während Aufnahme ──
  useEffect(() => {
    if (!sprachModus || !liveText || produkte.length === 0) return
    // Nur neue Teile des Textes analysieren, um Duplikate zu vermeiden
    const matches = liveMatchProdukte(liveText, produkte)
    if (matches.length > 0) {
      setLivePositionen(matches.map(m => ({
        produkt_id: m.produkt.id,
        produkt_name: m.produkt.name || m.produkt.produkt_name,
        menge: m.menge,
        einheit: m.produkt.einheit || 'Stück',
        preis_pro_stueck: m.produkt.preis,
        preis_gesamt: m.produkt.preis != null ? Math.round(m.produkt.preis * m.menge * 100) / 100 : null,
        kategorie: m.produkt.kategorie,
        istLive: true, // Markierung für UI
      })))
    }
  }, [liveText, sprachModus, produkte])

  // ── LIVE-ALLERGEN-AUSSCHLUSS-ERKENNUNG ──
  useEffect(() => {
    if (!liveText) return
    const ausschlüsse = erkenneAllergenAusschluss(liveText)
    if (ausschlüsse.size > 0) {
      setGesperrteAllergene(prev => {
        const neu = new Set(prev)
        ausschlüsse.forEach(a => neu.add(a))
        return neu.size !== prev.size ? neu : prev
      })
    }
  }, [liveText])

  // ── STAMMKUNDEN-ERKENNUNG per Sprache ──
  useEffect(() => {
    if (!sprachModus || !liveText || stammkundeErkanntRef.current) return
    const kunde = erkenneStammkunde(liveText, stammkundenListe)
    if (kunde) {
      stammkundeErkanntRef.current = true
      setErkannterStammkunde(kunde)
    }
  }, [liveText, sprachModus])

  // ── BESONDERHEITEN-ERKENNUNG per Sprache (vegan, bio, regional) ──
  useEffect(() => {
    if (!liveText) return
    const neueBesonderheiten = erkenneBesonderheiten(liveText)
    if (neueBesonderheiten.size > 0) {
      const wirklichNeu = []
      neueBesonderheiten.forEach(b => {
        if (!besonderheitenErkanntRef.current.has(b)) {
          besonderheitenErkanntRef.current.add(b)
          wirklichNeu.push(b)
        }
      })
      if (wirklichNeu.length > 0) {
        setAktiveBesonderheiten(prev => {
          const neu = new Set(prev)
          wirklichNeu.forEach(b => neu.add(b))
          return neu.size !== prev.size ? neu : prev
        })
      }
    }
  }, [liveText])

  // ── ZAHLART-ERKENNUNG per Sprache (bar / karte) ──
  useEffect(() => {
    if (!liveText || zahlartErkanntRef.current) return
    const lower = liveText.toLowerCase()
    // Nur die letzten ~60 Zeichen prüfen (damit nicht ein frühes "bar" im Gespräch triggert)
    const ende = lower.slice(-60)
    if (ende.match(/\b(bar|barzahlung|bar zahlen|in bar)\b/)) {
      zahlartErkanntRef.current = true
      setZahlart('bar')
    } else if (ende.match(/\b(karte|kartenzahlung|mit karte|ec|ec-karte|kreditkarte)\b/)) {
      zahlartErkanntRef.current = true
      setZahlart('karte')
    }
  }, [liveText])

  // ── PRODUKT MANUELL HINZUFÜGEN (mit Allergen-Warnung) ──
  function produktHinzufuegen(produkt) {
    // Prüfe ob Produkt gesperrtes Allergen enthält
    if (hatGesperrtesAllergen(produkt, gesperrteAllergene)) {
      const betroffene = [...(produkt.allergene || []), ...(produkt.kann_enthalten || [])]
        .filter(a => gesperrteAllergene.has(a))
      setAllergenWarnung({ produkt, allergene: betroffene })
      return // Nicht direkt hinzufügen, erst bestätigen
    }
    produktWirklichHinzufuegen(produkt)
  }

  // Eigentliches Hinzufügen (nach Bestätigung oder wenn kein Allergen-Konflikt)
  function produktWirklichHinzufuegen(produkt) {
    setPositionen(prev => {
      const existing = prev.findIndex(p => p.produkt_id === produkt.id)
      if (existing >= 0) {
        // Menge erhöhen
        return prev.map((p, i) => i === existing ? {
          ...p,
          menge: p.menge + 1,
          preis_gesamt: Math.round((p.menge + 1) * p.preis_pro_stueck * 100) / 100
        } : p)
      }
      // Neue Position
      return [...prev, {
        produkt_id: produkt.id,
        produkt_name: produkt.name || produkt.produkt_name,
        menge: 1,
        einheit: produkt.einheit || 'Stück',
        preis_pro_stueck: produkt.preis,
        preis_gesamt: produkt.preis,
        kategorie: produkt.kategorie,
      }]
    })

    // Cross-Selling Check
    prüfeCrossSelling(produkt)
  }

  // ── CROSS-SELLING LOGIK (mit Regeln der Bäckerinnen) ──
  function prüfeCrossSelling(produkt) {
    // Beste Regel finden (niedrigste Prio-Zahl = höchste Priorität)
    let besteRegel = null
    for (const regel of CROSS_SELLING_REGELN) {
      // Gerade hinzugefügtes Produkt ist das vorgeschlagene? → überspringen
      if (produkt.id === regel.vorschlag) continue

      let passt = false
      if (regel.trigger_produkt && produkt.id === regel.trigger_produkt) passt = true
      if (regel.trigger && regel.trigger.includes(produkt.kategorie)) passt = true

      if (passt && (!besteRegel || regel.prio < besteRegel.prio)) {
        besteRegel = regel
      }
    }

    if (besteRegel) {
      const vorschlagProdukt = produkte.find(p => p.id === besteRegel.vorschlag)
      if (vorschlagProdukt) {
        // Kurze Verzögerung damit der State aktualisiert ist
        setTimeout(() => {
          setCrossSelling({
            text: besteRegel.text,
            produkt: vorschlagProdukt,
          })
        }, 100)
      }
    }
  }

  // ── MENGE ÄNDERN ──
  function aendereMenge(idx, neueMenge) {
    const menge = Math.max(0, parseInt(neueMenge) || 0)
    if (menge === 0) {
      setPositionen(prev => prev.filter((_, i) => i !== idx))
      return
    }
    setPositionen(prev => prev.map((p, i) => i === idx ? {
      ...p,
      menge,
      preis_gesamt: p.preis_pro_stueck != null ? Math.round(p.preis_pro_stueck * menge * 100) / 100 : null
    } : p))
  }

  // ── POSITION ENTFERNEN ──
  function entfernePosition(idx) {
    setPositionen(prev => prev.filter((_, i) => i !== idx))
  }

  // ── STAMMKUNDE LADEN ──
  function ladeStammkunde(kunde) {
    const neuePositionen = kunde.letzte.map(p => ({
      produkt_id: p.produkt_id,
      produkt_name: p.name,
      menge: p.menge,
      einheit: 'Stück',
      preis_pro_stueck: p.preis,
      preis_gesamt: Math.round(p.preis * p.menge * 100) / 100,
    }))
    setPositionen(neuePositionen)
    setStammkundePopup(false)
    // Stammkunden-Allergien automatisch als Ausschluss setzen
    if (kunde.allergie) {
      const allergieMap = {
        'Sesam': ['K'], 'Nüsse': ['H', 'H1', 'H2', 'H3'], 'Milch': ['G'],
        'Ei': ['C'], 'Gluten': ['A', 'A1', 'A2', 'A3'], 'Soja': ['F'],
        'Erdnuss': ['E'], 'Senf': ['J'],
      }
      const codes = allergieMap[kunde.allergie] || []
      if (codes.length > 0) {
        setGesperrteAllergene(prev => {
          const neu = new Set(prev)
          codes.forEach(c => neu.add(c))
          return neu
        })
      }
    }
  }

  // ── NEUEN STAMMKUNDEN ANLEGEN ──
  function stammkundeAnlegen() {
    if (!neuerStammkundeName.trim()) return
    const neuerKunde = {
      id: 'sk' + Date.now(),
      name: neuerStammkundeName.trim(),
      spitzname: neuerStammkundeName.trim(),
      allergie: neuerStammkundeAllergie.trim() || undefined,
      letzte: positionen.map(p => ({
        produkt_id: p.produkt_id,
        name: p.produkt_name,
        menge: p.menge,
        preis: p.preis_pro_stueck,
      })),
    }
    setStammkundenListe(prev => [...prev, neuerKunde])
    setNeuerStammkundePopup(false)
    setNeuerStammkundeName('')
    setNeuerStammkundeAllergie('')
  }

  // ── SPRACHERKENNUNG ──
  const starteSpeechRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'de-DE'
    r.continuous = true
    r.interimResults = true
    r.onresult = (event) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + ' '
      }
      setLiveText(text.trim())
    }
    r.onerror = () => {}
    r.onend = () => {
      if (recognitionRef.current === r) try { r.start() } catch {}
    }
    recognitionRef.current = r
    try { r.start() } catch {}
  }, [])

  function stoppeSpeechRecognition() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
  }

  async function starteAufnahme() {
    setFehler(null)
    setLiveText('')
    setLivePositionen([])
    letzterLiveTextRef.current = ''
    audioChunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      const supportedMime = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || ''
      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : {})
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.start(1000)
      setSprachModus(true)
      starteSpeechRecognition()
    } catch {
      setFehler('Mikrofon-Zugriff verweigert.')
    }
  }

  async function stoppeAufnahme() {
    if (!mediaRecorderRef.current) return
    stoppeSpeechRecognition()
    setSprachModus(false)

    // SOFORT: Live-Positionen als echte Positionen übernehmen (kein Warten!)
    const übernahmeIds = new Set()
    if (livePositionen.length > 0) {
      setPositionen(prev => {
        const neu = [...prev]
        livePositionen.forEach(lp => {
          übernahmeIds.add(lp.produkt_id)
          const existing = neu.findIndex(p => p.produkt_id === lp.produkt_id)
          if (existing >= 0) {
            neu[existing] = { ...neu[existing], menge: lp.menge, preis_gesamt: lp.preis_gesamt }
          } else {
            neu.push({ ...lp, istLive: false })
          }
        })
        return neu
      })
      setLivePositionen([])
    }

    // HINTERGRUND: Voxtral + Mistral als Korrektur-Pass
    setVerarbeitung(true)
    mediaRecorderRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    await new Promise(r => setTimeout(r, 300))

    try {
      const chunks = audioChunksRef.current
      if (chunks.length === 0) {
        setVerarbeitung(false)
        return
      }
      const mimeType = chunks[0].type || 'audio/webm'
      const audioBlob = new Blob(chunks, { type: mimeType })
      const audioBase64 = await blobToBase64(audioBlob)

      // Schritt 1: Transkription (Voxtral – genauer als Browser)
      const transkriptErgebnis = await transkribiere(audioBase64, mimeType)
      const text = transkriptErgebnis.text || liveText || ''

      // Schritt 2: Erkennung (Mistral Large – Smarttalk raus, Positionen extrahieren)
      const erkennungsErgebnis = await erkenneSprache(text)
      if (erkennungsErgebnis.success && erkennungsErgebnis.positionen?.length > 0) {
        // Korrektur-Pass: Mistral-Ergebnis überschreibt nur wenn es besser/anders ist
        setPositionen(prev => {
          const neu = [...prev]
          erkennungsErgebnis.positionen.forEach(ep => {
            const existing = neu.findIndex(p => p.produkt_id === ep.produkt_id)
            if (existing >= 0) {
              // Nur Menge korrigieren wenn Mistral eine andere Menge erkannt hat
              if (ep.menge !== neu[existing].menge) {
                neu[existing] = {
                  ...neu[existing],
                  menge: ep.menge,
                  preis_gesamt: ep.preis_pro_stueck != null
                    ? Math.round(ep.menge * ep.preis_pro_stueck * 100) / 100
                    : null
                }
              }
            } else {
              // Neues Produkt das Live nicht erkannt hat → hinzufügen
              neu.push(ep)
            }
          })
          return neu
        })
      }
    } catch (err) {
      // Kein Fehler anzeigen wenn Live-Erkennung schon was hat
      if (übernahmeIds.size === 0) {
        setFehler('Spracherkennung fehlgeschlagen: ' + err.message)
      }
    }
    setVerarbeitung(false)
  }

  // ── BESTELLUNG ABSCHLIESSEN ──
  async function kassieren() {
    setAbgeschlossen(true)
    try {
      await speichereKassenBestellung(positionen, '', '')
    } catch {}
  }

  function neueBestellung() {
    setPositionen([])
    setLivePositionen([])
    setAbgeschlossen(false)
    setFehler(null)
    setCrossSelling(null)
    setZahlart('bar')
    setLiveText('')
    setGesperrteAllergene(new Set())
    setAllergenWarnung(null)
    setErkannterStammkunde(null)
    stammkundeErkanntRef.current = false
    setAktiveBesonderheiten(new Set())
    besonderheitenErkanntRef.current = new Set()
    allergenErkanntRef.current = new Set()
    zahlartErkanntRef.current = false
  }

  // ── BERECHNUNGEN ──
  // Kombinierte Positionen: echte + Live-Vorschau (ohne Duplikate)
  const anzeigePositionen = [...positionen]
  if (sprachModus) {
    livePositionen.forEach(lp => {
      if (!anzeigePositionen.some(p => p.produkt_id === lp.produkt_id)) {
        anzeigePositionen.push(lp)
      }
    })
  }
  const gesamtpreis = anzeigePositionen.reduce((sum, p) => sum + (p.preis_gesamt || 0), 0)
  let gefilterteProdukte = aktiveKategorie === 'alle'
    ? produkte
    : produkte.filter(p => p.kategorie === aktiveKategorie)
  // Besonderheiten-Filter anwenden
  if (aktiveBesonderheiten.size > 0) {
    gefilterteProdukte = gefilterteProdukte.filter(p => {
      if (aktiveBesonderheiten.has('bio') && !p.bio) return false
      if (aktiveBesonderheiten.has('vegan') && !p.vegan) return false
      if (aktiveBesonderheiten.has('regional') && !p.regional) return false
      return true
    })
  }

  function formatZeit(sek) {
    const m = Math.floor(sek / 60).toString().padStart(2, '0')
    const s = (sek % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ── BESTÄTIGT SCREEN ──
  if (abgeschlossen) {
    return (
      <div className="min-h-screen bg-baeckerei-bg flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6"><Check size={48} className="text-green-600" /></div>
        <h2 className="text-3xl font-bold text-baeckerei-text mb-2">Bestellung abgeschlossen!</h2>
        <p className="text-baeckerei-text-secondary text-lg mb-2">
          {positionen.length} Position{positionen.length !== 1 ? 'en' : ''} · {formatPreis(gesamtpreis)} · {zahlart === 'bar' ? 'Barzahlung' : 'Kartenzahlung'}
        </p>
        <div className="w-full max-w-md bg-white rounded-2xl border border-violet-200 divide-y divide-violet-100 my-6">
          {positionen.map((p, i) => (
            <div key={i} className="flex justify-between px-5 py-3">
              <span>{p.menge}× {p.produkt_name}</span>
              <span className="font-semibold">{formatPreis(p.preis_gesamt)}</span>
            </div>
          ))}
          <div className="flex justify-between px-5 py-3 bg-violet-50/50 font-bold text-lg">
            <span>Gesamt</span>
            <span className="text-baeckerei-accent">{formatPreis(gesamtpreis)}</span>
          </div>
        </div>
        <button onClick={neueBestellung}
          className="px-8 py-4 rounded-2xl bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white text-xl font-bold shadow-lg">
          Nächster Kunde
        </button>
      </div>
    )
  }

  // ── HAUPT-LAYOUT ──
  return (
    <div className="h-screen bg-baeckerei-bg flex flex-col overflow-hidden">
      {/* ═══ HEADER ═══ */}
      <header className="bg-white border-b border-violet-100 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <UTELogo size={36} />
          <div>
            <h1 className="text-lg font-bold text-baeckerei-text">UTE Kasse</h1>
            <p className="text-xs text-baeckerei-text-secondary">Hallo, {mitarbeiter?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Allergen-Check Button */}
          <button onClick={() => setAllergenCheck(true)}
            className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100">
            <AlertTriangle size={14} className="inline mr-1" /> Allergene
          </button>
          {/* Besonderheiten-Button */}
          <button onClick={() => setBesonderheitenPopup(true)}
            className={`px-3 py-2 rounded-xl text-sm font-medium ${aktiveBesonderheiten.size > 0
              ? 'bg-green-100 border border-green-400 text-green-800'
              : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'}`}>
            <Leaf size={14} className="inline mr-1" /> Besonderheiten{aktiveBesonderheiten.size > 0 ? ` (${aktiveBesonderheiten.size})` : ''}
          </button>
          {/* Stammkunde-Button */}
          <button onClick={() => setStammkundePopup(true)}
            className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-sm font-medium hover:bg-purple-100">
            <User size={14} className="inline mr-1" /> Stammkunde
          </button>
          <button onClick={onAbmelden}
            className="text-sm text-baeckerei-text-secondary hover:text-baeckerei-text underline">
            Abmelden
          </button>
        </div>
      </header>

      {/* ═══ FEHLER ═══ */}
      {fehler && (
        <div className="mx-4 mt-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm flex justify-between items-center flex-shrink-0">
          <span>{fehler}</span>
          <button onClick={() => setFehler(null)} className="text-red-400 hover:text-red-600 ml-2"><X size={16} /></button>
        </div>
      )}

      {/* ═══ HAUPTBEREICH ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LINKE SEITE: PRODUKT-BUTTONS ── */}
        <div className="w-1/2 flex flex-col border-r border-violet-100 overflow-hidden">
          {/* Kategorie-Tabs */}
          <div className="flex gap-1 p-2 bg-violet-50/50 border-b border-violet-100 overflow-x-auto flex-shrink-0">
            {KATEGORIEN.map(kat => (
              <button key={kat.id} onClick={() => setAktiveKategorie(kat.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                  ${aktiveKategorie === kat.id
                    ? 'bg-baeckerei-accent text-white shadow-sm'
                    : 'bg-white text-baeckerei-text-secondary border border-violet-200 hover:border-baeckerei-accent'
                  }`}>
                {kat.label}
              </button>
            ))}
          </div>

          {/* Allergen-Ausschluss-Banner */}
          {gesperrteAllergene.size > 0 && (
            <div className="mx-2 mt-2 bg-red-50 border border-red-200 rounded-xl p-2 flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-red-700 font-medium whitespace-nowrap flex items-center gap-1"><AlertTriangle size={14} /> Ausschluss:</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {[...gesperrteAllergene].map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                    <AllergenIcon code={a} size={14} /> {ALLERGEN_KURZ[a]}
                    <button onClick={() => setGesperrteAllergene(prev => {
                      const neu = new Set(prev); neu.delete(a); return neu
                    })} className="ml-0.5 hover:text-red-900"><X size={12} /></button>
                  </span>
                ))}
              </div>
              <button onClick={() => setGesperrteAllergene(new Set())}
                className="text-xs text-red-400 hover:text-red-600 whitespace-nowrap">Alle aufheben</button>
            </div>
          )}

          {/* Produkt-Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-3 gap-2">
              {gefilterteProdukte.map(produkt => {
                const istGesperrt = hatGesperrtesAllergen(produkt, gesperrteAllergene)
                return (
                  <div key={produkt.id} className="relative">
                    <button onClick={() => produktHinzufuegen(produkt)}
                      className={`w-full rounded-xl border-2 p-3 text-left transition-all flex flex-col justify-between min-h-[80px]
                        ${istGesperrt
                          ? 'bg-stone-100 border-red-200 opacity-60'
                          : 'bg-white border-violet-100 hover:border-baeckerei-accent hover:shadow-sm active:bg-violet-50'
                        }`}>
                      <span className={`font-medium text-sm leading-tight pr-6 ${istGesperrt ? 'text-stone-400' : 'text-baeckerei-text'}`}>
                        {produkt.name || produkt.produkt_name}
                      </span>
                      {/* Bio/Vegan/Regional Tags */}
                      {(produkt.bio || produkt.vegan || produkt.regional) && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap">
                          {produkt.bio && <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">Bio</span>}
                          {produkt.vegan && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded">Vegan</span>}
                          {produkt.regional && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Regional</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`font-bold text-sm ${istGesperrt ? 'text-stone-400' : 'text-baeckerei-accent'}`}>
                          {produkt.preis ? formatPreis(produkt.preis) : '—'}
                        </span>
                        {istGesperrt && (
                          <span className="text-xs text-red-500 ml-auto font-medium"><AlertTriangle size={12} /></span>
                        )}
                        {!istGesperrt && produkt.allergene?.length > 0 && (
                          <span className="flex items-center gap-0.5 text-violet-500 ml-auto">
                            {produkt.allergene.slice(0, 3).map(a => <AllergenIcon key={a} code={a} size={16} />)}
                          </span>
                        )}
                      </div>
                    </button>
                    {/* Allergen-Info Button */}
                    {(produkt.allergene?.length > 0 || produkt.zutaten?.length > 0) && (
                      <button onClick={(e) => { e.stopPropagation(); setAllergenInfo(produkt) }}
                        className="absolute top-1.5 right-1.5 text-violet-400 hover:text-violet-700 transition-colors"
                        title="Allergene & Zutaten">
                        <Info size={20} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── RECHTE SEITE: BESTELLLISTE ── */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Bestellpositionen */}
          <div className="flex-1 overflow-y-auto p-3">
            {anzeigePositionen.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-baeckerei-text-secondary">
                <ShoppingCart size={36} className="mb-3 text-baeckerei-text-secondary" />
                <p className="text-lg font-medium">Noch keine Positionen</p>
                <p className="text-sm mt-1">Produkte links antippen oder Spracheingabe nutzen</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {anzeigePositionen.map((pos, idx) => {
                  const istLive = pos.istLive === true
                  return (
                    <div key={pos.produkt_id + '-' + idx}
                      className={`rounded-xl border p-3 flex items-center gap-3 transition-all
                        ${istLive
                          ? 'bg-blue-50 border-blue-200 border-dashed animate-pulse'
                          : 'bg-white border-violet-200'
                        }`}>
                      {/* Live-Indikator */}
                      {istLive && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                      )}
                      {/* Produktname */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-baeckerei-text text-sm truncate">
                          {pos.produkt_name}
                          {istLive && <span className="text-blue-500 text-xs ml-2">live erkannt</span>}
                        </p>
                        {pos.preis_pro_stueck != null && (
                          <p className="text-xs text-baeckerei-text-secondary">{formatPreis(pos.preis_pro_stueck)}/{pos.einheit || 'Stk.'}</p>
                        )}
                      </div>
                      {/* Menge */}
                      <div className="flex items-center gap-1">
                        {!istLive && (
                          <button onClick={() => aendereMenge(idx, pos.menge - 1)}
                            className="w-8 h-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-lg font-bold flex items-center justify-center">−</button>
                        )}
                        <span className="w-8 text-center font-bold text-baeckerei-text">{pos.menge}</span>
                        {!istLive && (
                          <button onClick={() => aendereMenge(idx, pos.menge + 1)}
                            className="w-8 h-8 rounded-lg bg-violet-50 hover:bg-violet-100 text-lg font-bold flex items-center justify-center">+</button>
                        )}
                      </div>
                      {/* Preis */}
                      <span className="font-bold text-baeckerei-text w-16 text-right text-sm">
                        {formatPreis(pos.preis_gesamt)}
                      </span>
                      {/* Löschen */}
                      {!istLive && (
                        <button onClick={() => entfernePosition(idx)}
                          className="w-7 h-7 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"><X size={14} /></button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cross-Selling Popup */}
          {crossSelling && (
            <div className="mx-3 mb-2 bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3 flex-shrink-0">
              <Coffee size={20} className="text-purple-600 flex-shrink-0" />
              <p className="flex-1 text-sm text-purple-800">{crossSelling.text}</p>
              <button onClick={() => { produktHinzufuegen(crossSelling.produkt); setCrossSelling(null) }}
                className="px-3 py-1.5 bg-baeckerei-accent text-white rounded-lg text-sm font-medium hover:bg-baeckerei-accent-hover">
                Ja!
              </button>
              <button onClick={() => setCrossSelling(null)}
                className="text-purple-300 hover:text-purple-500"><X size={16} /></button>
            </div>
          )}

          {/* ═══ KASSIEREN-BEREICH ═══ */}
          <div className="border-t border-violet-100 bg-white p-3 flex-shrink-0">
            {/* Gesamtpreis */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-baeckerei-text">Gesamt</span>
              <span className="text-2xl font-bold text-baeckerei-accent">{formatPreis(gesamtpreis)}</span>
            </div>
            {/* Zahlart + Kassieren */}
            <div className="flex gap-2">
              <button onClick={() => setZahlart('bar')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors
                  ${zahlart === 'bar' ? 'bg-green-50 border-2 border-green-500 text-green-700 font-semibold' : 'bg-white border-2 border-violet-200 text-baeckerei-text-secondary hover:border-violet-400'}`}>
                <Banknote size={16} className="inline mr-1" /> Bar
              </button>
              <button onClick={() => setZahlart('karte')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors
                  ${zahlart === 'karte' ? 'bg-blue-50 border-2 border-blue-500 text-blue-700 font-semibold' : 'bg-white border-2 border-violet-200 text-baeckerei-text-secondary hover:border-violet-400'}`}>
                <CreditCard size={16} className="inline mr-1" /> Karte
              </button>
              <button onClick={kassieren} disabled={positionen.length === 0}
                className="flex-[2] py-3 rounded-xl text-white text-lg font-bold shadow-lg active:scale-95 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: positionen.length > 0 ? 'linear-gradient(135deg, #6D28D9, #4C1D95)' : '#6D28D9' }}>
                <Check size={18} className="inline mr-1" /> Kassieren
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SPRACH-LEISTE (unten) ═══ */}
      <div className="border-t-2 border-violet-200 bg-white px-4 py-2 flex items-center gap-4 flex-shrink-0">
        {!sprachModus && !verarbeitung && (
          <>
            <button onClick={starteAufnahme}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md active:scale-95 transition-all">
              <Mic size={18} />
              Spracheingabe
            </button>
            <p className="text-sm text-baeckerei-text-secondary">Gespräch aufnehmen – Bestellung wird automatisch erkannt</p>
          </>
        )}

        {sprachModus && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-semibold text-red-600 text-sm">Aufnahme {formatZeit(aufnahmeZeit)}</span>
            </div>
            <div className="flex-1 bg-violet-50/50 rounded-xl px-3 py-2 text-sm text-baeckerei-text min-h-[40px] max-h-[60px] overflow-y-auto">
              {liveText || <span className="text-baeckerei-text-secondary italic">Warte auf Sprache…</span>}
              {/* Auto-erkannte Features anzeigen */}
              {(aktiveBesonderheiten.size > 0 || erkannterStammkunde) && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {erkannterStammkunde && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                      {erkannterStammkunde.name}
                    </span>
                  )}
                  {aktiveBesonderheiten.has('vegan') && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">Vegan</span>
                  )}
                  {aktiveBesonderheiten.has('bio') && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Bio</span>
                  )}
                  {aktiveBesonderheiten.has('regional') && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Regional</span>
                  )}
                </div>
              )}
            </div>
            <button onClick={stoppeAufnahme}
              className="px-5 py-3 rounded-2xl bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white font-semibold shadow-md active:scale-95 transition-all">
              <Check size={16} className="inline mr-1" /> Fertig
            </button>
          </>
        )}

        {verarbeitung && (
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-baeckerei-accent border-t-transparent animate-spin" />
            <span className="text-sm text-baeckerei-text-secondary">Bestellung wird erkannt…</span>
          </div>
        )}
      </div>

      {/* ═══ STAMMKUNDE POPUP ═══ */}
      {stammkundePopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setStammkundePopup(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-baeckerei-text mb-4 flex items-center gap-2"><User size={20} /> Stammkunde auswählen</h3>
            <p className="text-sm text-baeckerei-text-secondary mb-4">Letzte Bestellung wird automatisch geladen</p>
            <div className="flex flex-col gap-3">
              {stammkundenListe.map(kunde => (
                <button key={kunde.id} onClick={() => ladeStammkunde(kunde)}
                  className="bg-violet-50/50 hover:bg-violet-50 border border-violet-200 hover:border-baeckerei-accent rounded-xl p-4 text-left transition-colors">
                  <p className="font-semibold text-baeckerei-text">{kunde.name}</p>
                  <p className="text-xs text-baeckerei-text-secondary mt-1">
                    Letzte: {kunde.letzte.map(p => `${p.menge}× ${p.name}`).join(', ')}
                  </p>
                  {kunde.allergie && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> Allergie: {kunde.allergie}</p>
                  )}
                </button>
              ))}
            </div>
            {/* Neu anlegen Button */}
            <button onClick={() => { setStammkundePopup(false); setNeuerStammkundePopup(true) }}
              className="w-full mt-3 py-3 bg-baeckerei-accent/10 hover:bg-baeckerei-accent/20 text-baeckerei-accent font-semibold rounded-xl border-2 border-dashed border-baeckerei-accent/40 transition-colors">
              + Neuen Stammkunden anlegen
            </button>
            <button onClick={() => setStammkundePopup(false)}
              className="w-full mt-2 py-2 text-baeckerei-text-secondary text-sm hover:text-baeckerei-text">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ═══ NEUER STAMMKUNDE POPUP ═══ */}
      {neuerStammkundePopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setNeuerStammkundePopup(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-baeckerei-text mb-4 flex items-center gap-2"><User size={20} /> Neuen Stammkunden anlegen</h3>
            {positionen.length > 0 ? (
              <p className="text-sm text-green-600 mb-4 flex items-center gap-1"><Check size={14} /> Aktuelle Bestellung ({positionen.length} Positionen) wird als "wie immer" gespeichert</p>
            ) : (
              <p className="text-sm text-orange-500 mb-4 flex items-center gap-1"><AlertTriangle size={14} /> Noch keine Produkte in der Bestellung — erst bestellen, dann Stammkunde anlegen!</p>
            )}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-baeckerei-text">Name *</label>
                <input type="text" value={neuerStammkundeName} onChange={e => setNeuerStammkundeName(e.target.value)}
                  placeholder="z.B. Frau Müller"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-violet-300 focus:border-baeckerei-accent focus:outline-none text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-baeckerei-text">Allergie (optional)</label>
                <input type="text" value={neuerStammkundeAllergie} onChange={e => setNeuerStammkundeAllergie(e.target.value)}
                  placeholder="z.B. Sesam, Nüsse"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-violet-300 focus:border-baeckerei-accent focus:outline-none text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setNeuerStammkundePopup(false)}
                className="flex-1 py-2 text-baeckerei-text-secondary text-sm border border-violet-200 rounded-lg hover:bg-violet-50/50">
                Abbrechen
              </button>
              <button onClick={stammkundeAnlegen}
                disabled={!neuerStammkundeName.trim() || positionen.length === 0}
                className="flex-1 py-2 bg-baeckerei-accent text-white font-semibold rounded-lg hover:bg-baeckerei-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ALLERGEN-INFO POPUP (einzelnes Produkt) ═══ */}
      {allergenInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAllergenInfo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-baeckerei-text">{allergenInfo.name || allergenInfo.produkt_name}</h3>
                <p className="text-sm text-baeckerei-text-secondary">{allergenInfo.kategorie}</p>
              </div>
              <button onClick={() => setAllergenInfo(null)} className="text-violet-300 hover:text-violet-600"><X size={20} /></button>
            </div>

            {/* Allergene */}
            {allergenInfo.allergene?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1"><AlertTriangle size={14} /> Enthält (Allergene)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {allergenInfo.allergene.map(a => (
                    <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                      <AllergenIcon code={a} size={14} /> {ALLERGEN_KURZ[a] || a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Kann Spuren enthalten */}
            {allergenInfo.kann_enthalten?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-amber-700 mb-2">Kann Spuren enthalten</h4>
                <div className="flex flex-wrap gap-1.5">
                  {allergenInfo.kann_enthalten.map(a => (
                    <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                      <AllergenIcon code={a} size={14} /> {ALLERGEN_KURZ[a] || a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Zutaten */}
            {allergenInfo.zutaten?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-baeckerei-text mb-2">Zutaten</h4>
                <p className="text-sm text-baeckerei-text-secondary leading-relaxed">
                  {allergenInfo.zutaten.join(', ')}
                </p>
              </div>
            )}

            {/* Allergen-Legende Link */}
            {allergenInfo.allergene?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-violet-100">
                <p className="text-xs text-baeckerei-text-secondary">
                  {allergenInfo.allergene.map(a => `${a}: ${allergenLegende[a] || ALLERGEN_KURZ[a] || a}`).join(' · ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ ALLERGEN-CHECK POPUP (gesamte Bestellung) ═══ */}
      {allergenCheck && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAllergenCheck(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-baeckerei-text flex items-center gap-2"><AlertTriangle size={20} className="text-red-600" /> Allergen-Check</h3>
                <p className="text-sm text-baeckerei-text-secondary">
                  {positionen.length > 0 ? 'Allergene in der aktuellen Bestellung' : 'Keine Positionen in der Bestellung'}
                </p>
              </div>
              <button onClick={() => setAllergenCheck(false)} className="text-violet-300 hover:text-violet-600"><X size={20} /></button>
            </div>

            {/* Schnellfilter: Allergene per Tap ausschließen */}
            <div className="mb-4 p-3 bg-violet-50/50 rounded-xl">
              <h4 className="text-xs font-semibold text-baeckerei-text mb-2">Allergene ausschließen (Produkte werden ausgegraut)</h4>
              <div className="flex flex-wrap gap-1.5">
                {['A1', 'A2', 'A3', 'C', 'G', 'H', 'H1', 'H2', 'K', 'F', 'E', 'J', 'M'].map(code => {
                  const aktiv = gesperrteAllergene.has(code)
                  return (
                    <button key={code} onClick={() => setGesperrteAllergene(prev => {
                      const neu = new Set(prev)
                      if (aktiv) neu.delete(code); else neu.add(code)
                      return neu
                    })}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors
                        ${aktiv
                          ? 'bg-red-500 text-white border border-red-500'
                          : 'bg-white text-violet-600 border border-violet-200 hover:border-red-300'
                        }`}>
                      <AllergenIcon code={code} size={14} /> {ALLERGEN_KURZ[code]}
                    </button>
                  )
                })}
              </div>
            </div>

            {positionen.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart size={36} className="mb-3 mx-auto text-baeckerei-text-secondary" />
                <p className="text-baeckerei-text-secondary">Füge Produkte hinzu, um einen Allergen-Check durchzuführen.</p>
              </div>
            ) : (
              <>
                {/* Zusammenfassung aller Allergene */}
                {(() => {
                  const alleAllergene = new Set()
                  const alleKannEnthalten = new Set()
                  positionen.forEach(pos => {
                    const prod = produkte.find(p => p.id === pos.produkt_id)
                    if (prod) {
                      (prod.allergene || []).forEach(a => alleAllergene.add(a))
                      ;(prod.kann_enthalten || []).forEach(a => alleKannEnthalten.add(a))
                    }
                  })
                  // Kann-enthalten minus echte Allergene
                  alleAllergene.forEach(a => alleKannEnthalten.delete(a))

                  return (
                    <div className="mb-5">
                      <h4 className="text-sm font-semibold text-red-700 mb-2">
                        Enthaltene Allergene ({alleAllergene.size})
                      </h4>
                      {alleAllergene.size > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {[...alleAllergene].sort().map(a => (
                            <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                              <AllergenIcon code={a} size={14} /> {ALLERGEN_KURZ[a] || a}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-green-600 mb-3">Keine Allergendaten vorhanden.</p>
                      )}

                      {alleKannEnthalten.size > 0 && (
                        <>
                          <h4 className="text-sm font-semibold text-amber-700 mb-2">
                            Kann Spuren enthalten ({alleKannEnthalten.size})
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {[...alleKannEnthalten].sort().map(a => (
                              <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                                <AllergenIcon code={a} size={14} /> {ALLERGEN_KURZ[a] || a}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}

                {/* Aufschlüsselung pro Produkt */}
                <h4 className="text-sm font-semibold text-baeckerei-text mb-3 pt-3 border-t border-violet-100">
                  Aufschlüsselung pro Produkt
                </h4>
                <div className="flex flex-col gap-2">
                  {positionen.map((pos, idx) => {
                    const prod = produkte.find(p => p.id === pos.produkt_id)
                    return (
                      <div key={idx} className="bg-violet-50/50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-baeckerei-text text-sm">{pos.menge}× {pos.produkt_name}</span>
                          {prod && (
                            <button onClick={() => { setAllergenCheck(false); setAllergenInfo(prod) }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline">Details</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(prod?.allergene || []).map(a => (
                            <span key={a} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-xs">
                              <AllergenIcon code={a} size={12} /> {ALLERGEN_KURZ[a]}
                            </span>
                          ))}
                          {(prod?.kann_enthalten || []).map(a => (
                            <span key={'k-' + a} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 text-xs">
                              <AllergenIcon code={a} size={12} /> {ALLERGEN_KURZ[a]}?
                            </span>
                          ))}
                          {!prod?.allergene?.length && !prod?.kann_enthalten?.length && (
                            <span className="text-xs text-stone-400">Keine Allergendaten</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Hinweis */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs text-blue-700">
                    Diese Angaben dienen der Kundenberatung. Bei schweren Allergien bitte immer die vollständige Zutatenliste prüfen und Rücksprache mit der Backstube halten.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ ALLERGEN-WARNUNG POPUP (gesperrtes Produkt angeklickt) ═══ */}
      {allergenWarnung && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setAllergenWarnung(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <AlertTriangle size={48} className="mx-auto mb-3 text-red-500" />
              <h3 className="text-lg font-bold text-red-700">Allergen-Warnung!</h3>
            </div>
            <p className="text-sm text-baeckerei-text text-center mb-3">
              <strong>{allergenWarnung.produkt.name || allergenWarnung.produkt.produkt_name}</strong> enthält:
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mb-4">
              {allergenWarnung.allergene.map(a => (
                <span key={a} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm font-medium">
                  <AllergenIcon code={a} size={16} /> {ALLERGEN_KURZ[a]}
                </span>
              ))}
            </div>
            <p className="text-xs text-baeckerei-text-secondary text-center mb-5">
              Der Kunde hat angegeben, diese Allergene zu meiden.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAllergenWarnung(null)}
                className="flex-1 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-baeckerei-text font-medium text-sm">
                Abbrechen
              </button>
              <button onClick={() => {
                produktWirklichHinzufuegen(allergenWarnung.produkt)
                setAllergenWarnung(null)
              }}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm">
                Trotzdem hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STAMMKUNDE ERKANNT POPUP (per Sprache) ═══ */}
      {erkannterStammkunde && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setErkannterStammkunde(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <User size={48} className="mx-auto mb-3 text-baeckerei-accent" />
              <h3 className="text-lg font-bold text-baeckerei-text">Stammkunde erkannt!</h3>
              <p className="text-baeckerei-accent font-semibold text-xl mt-1">{erkannterStammkunde.name}</p>
            </div>
            <p className="text-sm text-baeckerei-text-secondary text-center mb-3">
              Letzte Bestellung laden?
            </p>
            <div className="bg-violet-50/50 rounded-xl p-3 mb-4">
              {erkannterStammkunde.letzte.map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>{p.menge}× {p.name}</span>
                  <span className="text-baeckerei-text-secondary">{formatPreis(p.preis * p.menge)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setErkannterStammkunde(null)}
                className="flex-1 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-baeckerei-text font-medium text-sm">
                Nein danke
              </button>
              <button onClick={() => { ladeStammkunde(erkannterStammkunde); setErkannterStammkunde(null) }}
                className="flex-1 py-3 rounded-xl bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white font-medium text-sm">
                Ja, laden!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BESONDERHEITEN POPUP ═══ */}
      {besonderheitenPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setBesonderheitenPopup(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-baeckerei-text mb-2 flex items-center gap-2"><Leaf size={20} className="text-green-600" /> Besonderheiten</h3>
            <p className="text-sm text-baeckerei-text-secondary mb-4">Nur Produkte mit diesen Eigenschaften anzeigen:</p>
            <div className="flex flex-col gap-3">
              {[
                { id: 'bio', label: 'Bio', farbe: 'green', desc: 'Aus biologischem Anbau' },
                { id: 'vegan', label: 'Vegan', farbe: 'emerald', desc: 'Ohne tierische Zutaten' },
                { id: 'regional', label: 'Regional', farbe: 'blue', desc: 'Aus der Region' },
              ].map(b => {
                const aktiv = aktiveBesonderheiten.has(b.id)
                return (
                  <button key={b.id} onClick={() => setAktiveBesonderheiten(prev => {
                    const neu = new Set(prev)
                    if (aktiv) neu.delete(b.id); else neu.add(b.id)
                    return neu
                  })}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                      ${aktiv
                        ? 'bg-green-50 border-green-400'
                        : 'bg-violet-50/50 border-violet-200 hover:border-green-300'}`}>
                    <Leaf size={24} className={aktiv ? 'text-green-600' : 'text-stone-400'} />
                    <div className="flex-1">
                      <p className={`font-semibold ${aktiv ? 'text-green-800' : 'text-baeckerei-text'}`}>{b.label}</p>
                      <p className="text-xs text-baeckerei-text-secondary">{b.desc}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                      ${aktiv ? 'bg-green-500 border-green-500 text-white' : 'border-violet-300'}`}>
                      {aktiv && <Check size={14} />}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setAktiveBesonderheiten(new Set()); setBesonderheitenPopup(false) }}
                className="flex-1 py-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-baeckerei-text font-medium text-sm">
                Filter aufheben
              </button>
              <button onClick={() => setBesonderheitenPopup(false)}
                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium text-sm">
                Anwenden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
