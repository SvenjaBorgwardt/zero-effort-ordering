import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Mic, MicOff, Check, X, AlertTriangle, User, ShoppingCart, Coffee, CreditCard, Banknote, Leaf } from 'lucide-react'
import { transkribiere, erkenneSprache, speichereKassenBestellung, ladeKatalog } from '../services/api'
import { UTELogo, UTEMascot } from './ute-logo'

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
  { trigger: ['Feingebäck', 'Torten & Kuchen'], vorschlag: 'kaffee', text: 'Dazu einen Kaffee? Passt perfekt!', prio: 1 },
  { trigger: ['Brötchen'], vorschlag: 'kaffee', text: 'Einen Kaffee zum Wachwerden?', prio: 1 },
  { trigger_produkt: 'butterhoernchen', vorschlag: 'cappuccino', text: 'Ein Cappuccino würde super dazu passen!', prio: 2 },
  { trigger_produkt: 'roeggelchen', vorschlag: 'nussecke', text: 'Da passt etwas Süßes noch gut dazu!', prio: 1 },
  { trigger_produkt: 'nussschnecke', vorschlag: 'nussecke', text: 'Nuss und Nuss gesellt sich gern!', prio: 1 },
  { trigger_produkt: 'cappuccino', vorschlag: 'butterhoernchen', text: 'Nur mit Kaffee wird der Tag aber zu lang!', prio: 2 },
  { trigger_produkt: 'mischbrot', vorschlag: 'leinsaatbrot', text: 'Ein Körnerbrot wäre eine gute Ergänzung!', prio: 2 },
  { trigger_produkt: 'laugenbrezel', vorschlag: 'vollkornbroetchen', text: 'Ein paar zusätzliche Ballaststoffe passen ganz gut!', prio: 3 },
  { trigger_produkt: 'apfeltasche', vorschlag: 'vegane-quiche', text: 'Dazu eine vegane Quiche? Herzhaft trifft süß!', prio: 1 },
]

// ============================================================
// ALLERGEN-ICONS & FARBEN
// ============================================================
const ALLERGEN_ICONS = {
  'A': '🌾', 'A1': '🌾', 'A2': '🌾', 'A3': '🌾',
  'B': '🦐', 'C': '🥚', 'D': '🐟', 'E': '🥜',
  'F': '🫘', 'G': '🥛', 'H': '🌰', 'H1': '🌰', 'H2': '🌰', 'H3': '🌰',
  'I': '🥬', 'J': '🟡', 'K': '⚪', 'L': '🍷', 'M': '🌱', 'N': '🐚',
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
  const [produkteExpanded, setProdukteExpanded] = useState(false)

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
      // Bereits in Bestellung? → überspringen
      if (positionen.some(p => p.produkt_id === regel.vorschlag)) continue
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
        setCrossSelling({
          text: besteRegel.text,
          produkt: vorschlagProdukt,
        })
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
      <div className="min-h-screen bg-ute-cream flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-ute-sage-light flex items-center justify-center mb-6">
          <Check size={48} className="text-ute-sage" />
        </div>
        <h2 className="text-3xl font-bold text-ute-charcoal mb-2">Bestellung abgeschlossen!</h2>
        <p className="text-ute-taupe text-lg mb-2">
          {positionen.length} Position{positionen.length !== 1 ? 'en' : ''} · {formatPreis(gesamtpreis)} · {zahlart === 'bar' ? 'Barzahlung' : 'Kartenzahlung'}
        </p>
        <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 my-6">
          {positionen.map((p, i) => (
            <div key={i} className="flex justify-between px-5 py-3">
              <span>{p.menge}× {p.produkt_name}</span>
              <span className="font-semibold">{formatPreis(p.preis_gesamt)}</span>
            </div>
          ))}
          <div className="flex justify-between px-5 py-3 bg-ute-cream font-bold text-lg">
            <span>Gesamt</span>
            <span className="text-ute-terracotta">{formatPreis(gesamtpreis)}</span>
          </div>
        </div>
        <button onClick={neueBestellung}
          className="px-8 py-4 rounded-2xl bg-ute-terracotta hover:bg-ute-terracotta-light text-white text-xl font-bold shadow-lg">
          Nächster Kunde
        </button>
      </div>
    )
  }

  // ── HAUPT-LAYOUT ──
  return (
    <div className="h-screen bg-ute-cream flex flex-col overflow-hidden">
      {/* ═══ HEADER ═══ */}
      <header className="bg-ute-warm-white border-b border-stone-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setProdukteExpanded(prev => !prev)}
            className="w-8 h-8 rounded-lg bg-ute-cream hover:bg-stone-200 flex items-center justify-center text-ute-taupe transition-colors"
            title={produkteExpanded ? 'Produkte einklappen' : 'Produkte ausklappen'}>
            {produkteExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
          <UTELogo size={28} />
          <div>
            <h1 className="text-lg font-bold text-ute-charcoal">UTE Kasse</h1>
            <p className="text-xs text-ute-taupe">Hallo, {mitarbeiter?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Allergen-Check Button */}
          <button onClick={() => setAllergenCheck(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ute-dusty-rose-light/40 border border-ute-dusty-rose text-ute-charcoal text-sm font-medium hover:bg-ute-dusty-rose-light/60">
            <AlertTriangle size={14} /> Allergene
          </button>
          {/* Besonderheiten-Button */}
          <button onClick={() => setBesonderheitenPopup(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium ${aktiveBesonderheiten.size > 0
              ? 'bg-ute-sage-light border border-ute-sage text-ute-charcoal'
              : 'bg-ute-sage-light/40 border border-ute-sage/40 text-ute-charcoal hover:bg-ute-sage-light/60'}`}>
            <Leaf size={14} /> Besonderheiten{aktiveBesonderheiten.size > 0 ? ` (${aktiveBesonderheiten.size})` : ''}
          </button>
          {/* Stammkunde-Button */}
          <button onClick={() => setStammkundePopup(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ute-sage-light/40 border border-ute-sage/40 text-ute-charcoal text-sm font-medium hover:bg-ute-sage-light/60">
            <User size={14} /> Stammkunde
          </button>
          <button onClick={onAbmelden}
            className="text-sm text-ute-taupe hover:text-ute-charcoal underline">
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

        {/* ── LINKE SEITE: PRODUKT-BUTTONS oder MASCOT ── */}
        <div className={`flex flex-col border-r border-stone-200 overflow-hidden transition-all duration-300 ${produkteExpanded ? 'w-1/2' : 'w-48'}`}>
        {!produkteExpanded ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-ute-cream p-4">
            <UTEMascot size={120} />
            <p className="text-sm text-ute-taupe mt-4 text-center">Produkte einblenden mit dem Pfeil oben links</p>
          </div>
        ) : (
          <>
          {/* Kategorie-Tabs */}
          <div className="flex gap-1 p-2 bg-stone-50 border-b border-stone-200 overflow-x-auto flex-shrink-0">
            {KATEGORIEN.map(kat => (
              <button key={kat.id} onClick={() => setAktiveKategorie(kat.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                  ${aktiveKategorie === kat.id
                    ? 'bg-ute-terracotta text-white shadow-sm'
                    : 'bg-white text-ute-taupe border border-stone-200 hover:border-ute-terracotta'
                  }`}>
                {kat.icon} {kat.label}
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
                    {ALLERGEN_ICONS[a]} {ALLERGEN_KURZ[a]}
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
                          : 'bg-white border-stone-100 hover:border-ute-terracotta hover:shadow-sm active:bg-amber-50'
                        }`}>
                      <span className={`font-medium text-sm leading-tight pr-6 ${istGesperrt ? 'text-stone-400' : 'text-ute-charcoal'}`}>
                        {produkt.name || produkt.produkt_name}
                      </span>
                      {/* Bio/Vegan/Regional Tags */}
                      {(produkt.bio || produkt.vegan || produkt.regional) && (
                        <div className="flex gap-0.5 mt-0.5 flex-wrap">
                          {produkt.bio && <span className="text-[0.625em] bg-green-100 text-green-700 px-1 rounded">🌱 Bio</span>}
                          {produkt.vegan && <span className="text-[0.625em] bg-emerald-100 text-emerald-700 px-1 rounded">🥬 Vegan</span>}
                          {produkt.regional && <span className="text-[0.625em] bg-blue-100 text-blue-700 px-1 rounded">📍 Regional</span>}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`font-bold text-sm ${istGesperrt ? 'text-stone-400' : 'text-ute-terracotta'}`}>
                          {produkt.preis ? formatPreis(produkt.preis) : '—'}
                        </span>
                        {istGesperrt && (
                          <span className="text-xs text-red-500 ml-auto font-medium"><AlertTriangle size={12} /></span>
                        )}
                        {!istGesperrt && produkt.allergene?.length > 0 && (
                          <span className="text-xs text-stone-400 ml-auto">
                            {produkt.allergene.slice(0, 3).map(a => ALLERGEN_ICONS[a] || '⚠️').join('')}
                          </span>
                        )}
                      </div>
                    </button>
                    {/* Allergen-Info Button */}
                    {(produkt.allergene?.length > 0 || produkt.zutaten?.length > 0) && (
                      <button onClick={(e) => { e.stopPropagation(); setAllergenInfo(produkt) }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-stone-100 hover:bg-red-100
                                   text-stone-400 hover:text-red-600 text-xs flex items-center justify-center transition-colors"
                        title="Allergene & Zutaten">
                        <span className="font-serif font-bold">i</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          </>
        )}
        </div>

        {/* ── RECHTE SEITE: BESTELLLISTE ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Bestellpositionen */}
          <div className="flex-1 overflow-y-auto p-3">
            {anzeigePositionen.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-ute-taupe">
                <ShoppingCart size={36} className="mb-3 text-ute-taupe" />
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
                          : 'bg-white border-stone-200'
                        }`}>
                      {/* Live-Indikator */}
                      {istLive && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                      )}
                      {/* Produktname */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ute-charcoal text-sm truncate">
                          {pos.produkt_name}
                          {istLive && <span className="text-blue-500 text-xs ml-2">live erkannt</span>}
                        </p>
                        {pos.preis_pro_stueck != null && (
                          <p className="text-xs text-ute-taupe">{formatPreis(pos.preis_pro_stueck)}/{pos.einheit || 'Stk.'}</p>
                        )}
                      </div>
                      {/* Menge */}
                      <div className="flex items-center gap-1">
                        {!istLive && (
                          <button onClick={() => aendereMenge(idx, pos.menge - 1)}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-lg font-bold flex items-center justify-center">−</button>
                        )}
                        <span className="w-8 text-center font-bold text-ute-charcoal">{pos.menge}</span>
                        {!istLive && (
                          <button onClick={() => aendereMenge(idx, pos.menge + 1)}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-lg font-bold flex items-center justify-center">+</button>
                        )}
                      </div>
                      {/* Preis */}
                      <span className="font-bold text-ute-charcoal w-16 text-right text-sm">
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
            <div className="mx-3 mb-2 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 flex-shrink-0">
              <Coffee size={20} className="text-ute-terracotta flex-shrink-0" />
              <p className="flex-1 text-sm text-amber-800">{crossSelling.text}</p>
              <button onClick={() => { produktHinzufuegen(crossSelling.produkt); setCrossSelling(null) }}
                className="px-3 py-1.5 bg-ute-terracotta text-white rounded-lg text-sm font-medium hover:bg-ute-terracotta-light">
                Ja!
              </button>
              <button onClick={() => setCrossSelling(null)}
                className="text-amber-400 hover:text-amber-600"><X size={16} /></button>
            </div>
          )}

          {/* ═══ KASSIEREN-BEREICH ═══ */}
          <div className="border-t border-stone-200 bg-white p-3 flex-shrink-0">
            {/* Gesamtpreis */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-ute-charcoal">Gesamt</span>
              <span className="text-2xl font-bold text-ute-terracotta">{formatPreis(gesamtpreis)}</span>
            </div>
            {/* Zahlart + Kassieren */}
            <div className="flex gap-2">
              <button onClick={() => setZahlart('bar')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-1
                  ${zahlart === 'bar' ? 'bg-green-100 border-2 border-green-400 text-green-800' : 'bg-stone-50 border-2 border-stone-200 text-ute-taupe'}`}>
                <Banknote size={16} /> Bar
              </button>
              <button onClick={() => setZahlart('karte')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-1
                  ${zahlart === 'karte' ? 'bg-blue-100 border-2 border-blue-400 text-blue-800' : 'bg-stone-50 border-2 border-stone-200 text-ute-taupe'}`}>
                <CreditCard size={16} /> Karte
              </button>
              <button onClick={kassieren} disabled={positionen.length === 0}
                className="flex-[2] py-3 rounded-xl bg-ute-terracotta hover:bg-ute-terracotta-light
                           text-white text-lg font-bold shadow-md active:scale-95 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed">
                <Check size={18} className="inline mr-1" /> Kassieren
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SPRACH-LEISTE (unten) ═══ */}
      <div className="border-t-2 border-stone-200 bg-white px-4 py-2 flex items-center gap-4 flex-shrink-0">
        {!sprachModus && !verarbeitung && (
          <>
            <button onClick={starteAufnahme}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md active:scale-95 transition-all">
              <Mic size={18} />
              Spracheingabe
            </button>
            <p className="text-sm text-ute-taupe">Gespräch aufnehmen – Bestellung wird automatisch erkannt</p>
          </>
        )}

        {sprachModus && (
          <>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-semibold text-red-600 text-sm">Aufnahme {formatZeit(aufnahmeZeit)}</span>
            </div>
            <div className="flex-1 bg-stone-50 rounded-xl px-3 py-2 text-sm text-ute-charcoal min-h-[40px] max-h-[60px] overflow-y-auto">
              {liveText || <span className="text-ute-taupe italic">Warte auf Sprache…</span>}
            </div>
            <button onClick={stoppeAufnahme}
              className="px-5 py-3 rounded-2xl bg-ute-terracotta hover:bg-ute-terracotta-light text-white font-semibold shadow-md active:scale-95 transition-all">
              <Check size={16} className="inline" /> Fertig
            </button>
          </>
        )}

        {verarbeitung && (
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-ute-terracotta border-t-transparent animate-spin" />
            <span className="text-sm text-ute-taupe">Bestellung wird erkannt…</span>
          </div>
        )}
      </div>

      {/* ═══ STAMMKUNDE POPUP ═══ */}
      {stammkundePopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setStammkundePopup(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ute-charcoal mb-4 flex items-center gap-2"><User size={20} /> Stammkunde auswählen</h3>
            <p className="text-sm text-ute-taupe mb-4">Letzte Bestellung wird automatisch geladen</p>
            <div className="flex flex-col gap-3">
              {stammkundenListe.map(kunde => (
                <button key={kunde.id} onClick={() => ladeStammkunde(kunde)}
                  className="bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-ute-terracotta rounded-xl p-4 text-left transition-colors">
                  <p className="font-semibold text-ute-charcoal">{kunde.name}</p>
                  <p className="text-xs text-ute-taupe mt-1">
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
              className="w-full mt-3 py-3 bg-ute-terracotta/10 hover:bg-ute-terracotta/20 text-ute-terracotta font-semibold rounded-xl border-2 border-dashed border-ute-terracotta/40 transition-colors">
              + Neuen Stammkunden anlegen
            </button>
            <button onClick={() => setStammkundePopup(false)}
              className="w-full mt-2 py-2 text-ute-taupe text-sm hover:text-ute-charcoal">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ═══ NEUER STAMMKUNDE POPUP ═══ */}
      {neuerStammkundePopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setNeuerStammkundePopup(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ute-charcoal mb-4 flex items-center gap-2"><User size={20} /> Neuen Stammkunden anlegen</h3>
            {positionen.length > 0 ? (
              <p className="text-sm text-green-600 mb-4 flex items-center gap-1"><Check size={14} /> Aktuelle Bestellung ({positionen.length} Positionen) wird als "wie immer" gespeichert</p>
            ) : (
              <p className="text-sm text-orange-500 mb-4">⚠ Noch keine Produkte in der Bestellung — erst bestellen, dann Stammkunde anlegen!</p>
            )}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium text-ute-charcoal">Name *</label>
                <input type="text" value={neuerStammkundeName} onChange={e => setNeuerStammkundeName(e.target.value)}
                  placeholder="z.B. Frau Müller"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:border-ute-terracotta focus:outline-none text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-ute-charcoal">Allergie (optional)</label>
                <input type="text" value={neuerStammkundeAllergie} onChange={e => setNeuerStammkundeAllergie(e.target.value)}
                  placeholder="z.B. Sesam, Nüsse"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-stone-300 focus:border-ute-terracotta focus:outline-none text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setNeuerStammkundePopup(false)}
                className="flex-1 py-2 text-ute-taupe text-sm border border-stone-200 rounded-lg hover:bg-stone-50">
                Abbrechen
              </button>
              <button onClick={stammkundeAnlegen}
                disabled={!neuerStammkundeName.trim() || positionen.length === 0}
                className="flex-1 py-2 bg-ute-terracotta text-white font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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
                <h3 className="text-lg font-bold text-ute-charcoal">{allergenInfo.name || allergenInfo.produkt_name}</h3>
                <p className="text-sm text-ute-taupe">{allergenInfo.kategorie}</p>
              </div>
              <button onClick={() => setAllergenInfo(null)} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
            </div>

            {/* Allergene */}
            {allergenInfo.allergene?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1"><AlertTriangle size={14} /> Enthält (Allergene)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {allergenInfo.allergene.map(a => (
                    <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                      {ALLERGEN_ICONS[a] || '⚠️'} {ALLERGEN_KURZ[a] || a}
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
                      {ALLERGEN_ICONS[a] || '⚠️'} {ALLERGEN_KURZ[a] || a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Zutaten */}
            {allergenInfo.zutaten?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-ute-charcoal mb-2">Zutaten</h4>
                <p className="text-sm text-ute-taupe leading-relaxed">
                  {allergenInfo.zutaten.join(', ')}
                </p>
              </div>
            )}

            {/* Allergen-Legende Link */}
            {allergenInfo.allergene?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-100">
                <p className="text-xs text-ute-taupe">
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
                <h3 className="text-lg font-bold text-ute-charcoal flex items-center gap-2"><AlertTriangle size={20} className="text-red-600" /> Allergen-Check</h3>
                <p className="text-sm text-ute-taupe">
                  {positionen.length > 0 ? 'Allergene in der aktuellen Bestellung' : 'Keine Positionen in der Bestellung'}
                </p>
              </div>
              <button onClick={() => setAllergenCheck(false)} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
            </div>

            {/* Schnellfilter: Allergene per Tap ausschließen */}
            <div className="mb-4 p-3 bg-stone-50 rounded-xl">
              <h4 className="text-xs font-semibold text-ute-charcoal mb-2">Allergene ausschließen (Produkte werden ausgegraut)</h4>
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
                          : 'bg-white text-stone-600 border border-stone-200 hover:border-red-300'
                        }`}>
                      {ALLERGEN_ICONS[code]} {ALLERGEN_KURZ[code]}
                    </button>
                  )
                })}
              </div>
            </div>

            {positionen.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart size={36} className="mx-auto mb-3 text-ute-taupe" />
                <p className="text-ute-taupe">Füge Produkte hinzu, um einen Allergen-Check durchzuführen.</p>
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
                              {ALLERGEN_ICONS[a] || '⚠️'} {ALLERGEN_KURZ[a] || a}
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
                                {ALLERGEN_ICONS[a] || '⚠️'} {ALLERGEN_KURZ[a] || a}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}

                {/* Aufschlüsselung pro Produkt */}
                <h4 className="text-sm font-semibold text-ute-charcoal mb-3 pt-3 border-t border-stone-100">
                  Aufschlüsselung pro Produkt
                </h4>
                <div className="flex flex-col gap-2">
                  {positionen.map((pos, idx) => {
                    const prod = produkte.find(p => p.id === pos.produkt_id)
                    return (
                      <div key={idx} className="bg-stone-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-ute-charcoal text-sm">{pos.menge}× {pos.produkt_name}</span>
                          {prod && (
                            <button onClick={() => { setAllergenCheck(false); setAllergenInfo(prod) }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline">Details</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(prod?.allergene || []).map(a => (
                            <span key={a} className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-xs">
                              {ALLERGEN_ICONS[a]} {ALLERGEN_KURZ[a]}
                            </span>
                          ))}
                          {(prod?.kann_enthalten || []).map(a => (
                            <span key={'k-' + a} className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 text-xs">
                              {ALLERGEN_ICONS[a]} {ALLERGEN_KURZ[a]}?
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
            <p className="text-sm text-ute-charcoal text-center mb-3">
              <strong>{allergenWarnung.produkt.name || allergenWarnung.produkt.produkt_name}</strong> enthält:
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mb-4">
              {allergenWarnung.allergene.map(a => (
                <span key={a} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm font-medium">
                  {ALLERGEN_ICONS[a]} {ALLERGEN_KURZ[a]}
                </span>
              ))}
            </div>
            <p className="text-xs text-ute-taupe text-center mb-5">
              Der Kunde hat angegeben, diese Allergene zu meiden.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAllergenWarnung(null)}
                className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-ute-charcoal font-medium text-sm">
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
              <User size={48} className="mx-auto mb-3 text-ute-terracotta" />
              <h3 className="text-lg font-bold text-ute-charcoal">Stammkunde erkannt!</h3>
              <p className="text-ute-terracotta font-semibold text-xl mt-1">{erkannterStammkunde.name}</p>
            </div>
            <p className="text-sm text-ute-taupe text-center mb-3">
              Letzte Bestellung laden?
            </p>
            <div className="bg-stone-50 rounded-xl p-3 mb-4">
              {erkannterStammkunde.letzte.map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>{p.menge}× {p.name}</span>
                  <span className="text-ute-taupe">{formatPreis(p.preis * p.menge)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setErkannterStammkunde(null)}
                className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-ute-charcoal font-medium text-sm">
                Nein danke
              </button>
              <button onClick={() => { ladeStammkunde(erkannterStammkunde); setErkannterStammkunde(null) }}
                className="flex-1 py-3 rounded-xl bg-ute-terracotta hover:bg-ute-terracotta-light text-white font-medium text-sm">
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
            <h3 className="text-lg font-bold text-ute-charcoal mb-2 flex items-center gap-2"><Leaf size={20} className="text-ute-sage" /> Besonderheiten</h3>
            <p className="text-sm text-ute-taupe mb-4">Nur Produkte mit diesen Eigenschaften anzeigen:</p>
            <div className="flex flex-col gap-3">
              {[
                { id: 'bio', label: 'Bio', icon: '🌱', farbe: 'green', desc: 'Aus biologischem Anbau' },
                { id: 'vegan', label: 'Vegan', icon: '🥬', farbe: 'emerald', desc: 'Ohne tierische Zutaten' },
                { id: 'regional', label: 'Regional', icon: '📍', farbe: 'blue', desc: 'Aus der Region' },
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
                        : 'bg-stone-50 border-stone-200 hover:border-green-300'}`}>
                    <span className="text-2xl">{b.icon}</span>
                    <div className="flex-1">
                      <p className={`font-semibold ${aktiv ? 'text-green-800' : 'text-ute-charcoal'}`}>{b.label}</p>
                      <p className="text-xs text-ute-taupe">{b.desc}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                      ${aktiv ? 'bg-ute-sage border-ute-sage text-white' : 'border-stone-300'}`}>
                      {aktiv && <Check size={14} />}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setAktiveBesonderheiten(new Set()); setBesonderheitenPopup(false) }}
                className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-ute-charcoal font-medium text-sm">
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
