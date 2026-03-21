import { useState, useRef, useEffect, useCallback } from 'react'
import { transkribiere, erkenneSprache, speichereKassenBestellung, ladeKatalog } from '../services/api'

// ============================================================
// PRODUKT-KATEGORIEN (für Touchscreen-Buttons)
// ============================================================
const KATEGORIEN = [
  { id: 'alle', label: 'Alle', icon: '🛒' },
  { id: 'Brötchen', label: 'Brötchen', icon: '🥐' },
  { id: 'Laugengebäck', label: 'Laugen', icon: '🥨' },
  { id: 'Feingebäck', label: 'Süßes', icon: '🥐' },
  { id: 'Brot', label: 'Brot', icon: '🍞' },
  { id: 'Torten & Kuchen', label: 'Kuchen', icon: '🎂' },
  { id: 'Belegware', label: 'Belag', icon: '🧀' },
  { id: 'Getränke', label: 'Getränke', icon: '☕' },
]

// Demo-Stammkunden
const STAMMKUNDEN = [
  { id: 'sk1', name: 'Herr Mayer', letzte: [
    { produkt_id: 'weizenbroetchen', name: 'Weizenbrötchen', menge: 6, preis: 0.45 },
    { produkt_id: 'mohnbroetchen', name: 'Mohnbrötchen', menge: 2, preis: 0.50 },
    { produkt_id: 'mischbrot', name: 'Mischbrot (Weizen/Roggen)', menge: 1, preis: 3.90 },
  ]},
  { id: 'sk2', name: 'Frau Schmidt', letzte: [
    { produkt_id: 'croissant', name: 'Buttercroissant', menge: 2, preis: 1.80 },
    { produkt_id: 'dinkelbrot', name: 'Dinkelvollkornbrot', menge: 1, preis: 4.50 },
  ]},
  { id: 'sk3', name: 'Herr Klein', letzte: [
    { produkt_id: 'koernerbroetchen', name: 'Körnerbrötchen', menge: 4, preis: 0.55 },
    { produkt_id: 'rosinenschnecke', name: 'Rosinenschnecke', menge: 1, preis: 1.60 },
  ]},
]

// Kaffee-Produkt (für Cross-Selling, noch nicht im Katalog)
const KAFFEE = { id: 'kaffee', name: 'Kaffee', preis: 1.80, einheit: 'Stück', kategorie: 'Getränke', allergene: ['G'], zutaten: ['Kaffee', 'Milch (optional)'], kann_enthalten: [] }

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
  'ein': 1, 'eine': 1, 'einen': 1, 'eins': 1,
  'zwei': 2, 'zwo': 2,
  'drei': 3, 'vier': 4, 'fünf': 5, 'sechs': 6,
  'sieben': 7, 'acht': 8, 'neun': 9, 'zehn': 10,
  'elf': 11, 'zwölf': 12, 'fünfzehn': 15, 'zwanzig': 20,
}

/**
 * Live-Matching: Durchsucht den Text nach Produktnamen/Aliasen und Mengen.
 * Gibt ein Array von { produkt, menge } zurück.
 */
function liveMatchProdukte(text, produktListe) {
  if (!text || text.length < 3) return []
  const textLower = text.toLowerCase()
  const gefunden = []
  const bereitsGefunden = new Set()

  for (const produkt of produktListe) {
    // Alle suchbaren Namen: Name + Aliase
    const suchNamen = [produkt.name, ...(produkt.aliase || [])].map(n => n.toLowerCase())

    for (const suchName of suchNamen) {
      if (suchName.length < 3) continue
      const idx = textLower.indexOf(suchName)
      if (idx === -1) continue
      if (bereitsGefunden.has(produkt.id)) break

      // Menge vor dem Produktnamen suchen
      let menge = 1
      const vorher = textLower.substring(Math.max(0, idx - 20), idx).trim()
      const wörter = vorher.split(/\s+/)
      const letztesWort = wörter[wörter.length - 1]

      if (letztesWort) {
        // Erst Zahlwort probieren
        if (ZAHLWOERTER[letztesWort]) {
          menge = ZAHLWOERTER[letztesWort]
        } else {
          // Dann Ziffer probieren
          const zahl = parseInt(letztesWort)
          if (!isNaN(zahl) && zahl > 0 && zahl <= 100) {
            menge = zahl
          }
        }
      }

      gefunden.push({ produkt, menge })
      bereitsGefunden.add(produkt.id)
      break // Nächstes Produkt
    }
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

  // Katalog laden
  useEffect(() => {
    ladeKatalog().then(data => {
      // Nur Backwaren (keine Rohstoffe) + Kaffee hinzufügen
      const backwaren = (data.backwaren || []).map(p => ({
        ...p,
        produkt_name: p.name,
      }))
      setProdukte([...backwaren, KAFFEE])
      // Allergen-Legende laden
      if (data.allergene_legende) setAllergenLegende(data.allergene_legende)
    }).catch(() => {
      // Fallback: leerer Katalog
      setProdukte([KAFFEE])
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

  // ── CROSS-SELLING LOGIK ──
  function prüfeCrossSelling(produkt) {
    const süßeKategorien = ['Feingebäck', 'Torten & Kuchen']
    const brötchenKategorien = ['Brötchen', 'Laugengebäck']
    const hatSchonKaffee = positionen.some(p => p.produkt_id === 'kaffee')

    if (!hatSchonKaffee && (süßeKategorien.includes(produkt.kategorie) || brötchenKategorien.includes(produkt.kategorie))) {
      setCrossSelling({
        text: produkt.kategorie === 'Feingebäck' || produkt.kategorie === 'Torten & Kuchen'
          ? `Dazu einen Kaffee? Passt perfekt zu ${produkt.name || produkt.produkt_name}!`
          : `Frühstücksmenü: Dazu einen Kaffee für nur ${formatPreis(KAFFEE.preis)}?`,
        produkt: KAFFEE,
      })
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
    setVerarbeitung(true)

    // Live-Positionen sofort als echte Positionen übernehmen (Vorschau → fest)
    if (livePositionen.length > 0) {
      setPositionen(prev => {
        const neu = [...prev]
        livePositionen.forEach(lp => {
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

    mediaRecorderRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    await new Promise(r => setTimeout(r, 300))

    try {
      const chunks = audioChunksRef.current
      if (chunks.length === 0) throw new Error('Keine Audio-Daten')
      const mimeType = chunks[0].type || 'audio/webm'
      const audioBlob = new Blob(chunks, { type: mimeType })
      const audioBase64 = await blobToBase64(audioBlob)

      // Schritt 1: Transkription (Voxtral – genauer als Browser)
      const transkriptErgebnis = await transkribiere(audioBase64, mimeType)
      const text = transkriptErgebnis.text || liveText || ''

      // Schritt 2: Erkennung (Mistral Large – Smarttalk raus, Positionen extrahieren)
      const erkennungsErgebnis = await erkenneSprache(text)
      if (erkennungsErgebnis.success && erkennungsErgebnis.positionen?.length > 0) {
        // Finale Positionen ersetzen die vorläufigen komplett
        setPositionen(prev => {
          // Behalte manuell hinzugefügte Positionen (die vor der Aufnahme da waren)
          const manuell = prev.filter(p => !livePositionen.some(lp => lp.produkt_id === p.produkt_id) || p.istLive === undefined)
          // Aber entferne die, die aus der Live-Erkennung kamen
          const vorherigeManuell = prev.filter(p => {
            // Position war schon vor Aufnahme da (nicht aus dieser Live-Session)
            return !livePositionen.some(lp => lp.produkt_id === p.produkt_id)
          })

          const neu = [...vorherigeManuell]
          erkennungsErgebnis.positionen.forEach(ep => {
            const existing = neu.findIndex(p => p.produkt_id === ep.produkt_id)
            if (existing >= 0) {
              neu[existing] = {
                ...neu[existing],
                menge: neu[existing].menge + ep.menge,
                preis_gesamt: ep.preis_pro_stueck != null
                  ? Math.round((neu[existing].menge + ep.menge) * ep.preis_pro_stueck * 100) / 100
                  : null
              }
            } else {
              neu.push(ep)
            }
          })
          return neu
        })
      }
    } catch (err) {
      setFehler('Spracherkennung fehlgeschlagen: ' + err.message)
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
  const gefilterteProdukte = aktiveKategorie === 'alle'
    ? produkte
    : produkte.filter(p => p.kategorie === aktiveKategorie)

  function formatZeit(sek) {
    const m = Math.floor(sek / 60).toString().padStart(2, '0')
    const s = (sek % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // ── BESTÄTIGT SCREEN ──
  if (abgeschlossen) {
    return (
      <div className="min-h-screen bg-baeckerei-bg flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-5xl mb-6">✅</div>
        <h2 className="text-3xl font-bold text-baeckerei-text mb-2">Bestellung abgeschlossen!</h2>
        <p className="text-baeckerei-text-secondary text-lg mb-2">
          {positionen.length} Position{positionen.length !== 1 ? 'en' : ''} · {formatPreis(gesamtpreis)} · {zahlart === 'bar' ? 'Barzahlung' : 'Kartenzahlung'}
        </p>
        <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 my-6">
          {positionen.map((p, i) => (
            <div key={i} className="flex justify-between px-5 py-3">
              <span>{p.menge}× {p.produkt_name}</span>
              <span className="font-semibold">{formatPreis(p.preis_gesamt)}</span>
            </div>
          ))}
          <div className="flex justify-between px-5 py-3 bg-stone-50 font-bold text-lg">
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
      <header className="bg-white border-b border-stone-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🥐</span>
          <div>
            <h1 className="text-lg font-bold text-baeckerei-text">UTE Kasse</h1>
            <p className="text-xs text-baeckerei-text-secondary">Hallo, {mitarbeiter?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Allergen-Check Button */}
          <button onClick={() => setAllergenCheck(true)}
            className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium hover:bg-red-100">
            ⚠️ Allergene
          </button>
          {/* Stammkunde-Button */}
          <button onClick={() => setStammkundePopup(true)}
            className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium hover:bg-amber-100">
            👤 Stammkunde
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
          <button onClick={() => setFehler(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
        </div>
      )}

      {/* ═══ HAUPTBEREICH ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LINKE SEITE: PRODUKT-BUTTONS ── */}
        <div className="w-1/2 flex flex-col border-r border-stone-200 overflow-hidden">
          {/* Kategorie-Tabs */}
          <div className="flex gap-1 p-2 bg-stone-50 border-b border-stone-200 overflow-x-auto flex-shrink-0">
            {KATEGORIEN.map(kat => (
              <button key={kat.id} onClick={() => setAktiveKategorie(kat.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                  ${aktiveKategorie === kat.id
                    ? 'bg-baeckerei-accent text-white shadow-sm'
                    : 'bg-white text-baeckerei-text-secondary border border-stone-200 hover:border-baeckerei-accent'
                  }`}>
                {kat.icon} {kat.label}
              </button>
            ))}
          </div>

          {/* Allergen-Ausschluss-Banner */}
          {gesperrteAllergene.size > 0 && (
            <div className="mx-2 mt-2 bg-red-50 border border-red-200 rounded-xl p-2 flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-red-700 font-medium whitespace-nowrap">⚠️ Ausschluss:</span>
              <div className="flex flex-wrap gap-1 flex-1">
                {[...gesperrteAllergene].map(a => (
                  <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                    {ALLERGEN_ICONS[a]} {ALLERGEN_KURZ[a]}
                    <button onClick={() => setGesperrteAllergene(prev => {
                      const neu = new Set(prev); neu.delete(a); return neu
                    })} className="ml-0.5 hover:text-red-900">✕</button>
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
                          : 'bg-white border-stone-100 hover:border-baeckerei-accent hover:shadow-sm active:bg-amber-50'
                        }`}>
                      <span className={`font-medium text-sm leading-tight pr-6 ${istGesperrt ? 'text-stone-400' : 'text-baeckerei-text'}`}>
                        {produkt.name || produkt.produkt_name}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`font-bold text-sm ${istGesperrt ? 'text-stone-400' : 'text-baeckerei-accent'}`}>
                          {produkt.preis ? formatPreis(produkt.preis) : '—'}
                        </span>
                        {istGesperrt && (
                          <span className="text-xs text-red-500 ml-auto font-medium">⚠️</span>
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
                        ℹ️
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
                <span className="text-4xl mb-3">🛒</span>
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
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-lg font-bold flex items-center justify-center">−</button>
                        )}
                        <span className="w-8 text-center font-bold text-baeckerei-text">{pos.menge}</span>
                        {!istLive && (
                          <button onClick={() => aendereMenge(idx, pos.menge + 1)}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-lg font-bold flex items-center justify-center">+</button>
                        )}
                      </div>
                      {/* Preis */}
                      <span className="font-bold text-baeckerei-text w-16 text-right text-sm">
                        {formatPreis(pos.preis_gesamt)}
                      </span>
                      {/* Löschen */}
                      {!istLive && (
                        <button onClick={() => entfernePosition(idx)}
                          className="w-7 h-7 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center text-sm">✕</button>
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
              <span className="text-xl">☕</span>
              <p className="flex-1 text-sm text-amber-800">{crossSelling.text}</p>
              <button onClick={() => { produktHinzufuegen(crossSelling.produkt); setCrossSelling(null) }}
                className="px-3 py-1.5 bg-baeckerei-accent text-white rounded-lg text-sm font-medium hover:bg-baeckerei-accent-hover">
                Ja!
              </button>
              <button onClick={() => setCrossSelling(null)}
                className="text-amber-400 hover:text-amber-600">✕</button>
            </div>
          )}

          {/* ═══ KASSIEREN-BEREICH ═══ */}
          <div className="border-t border-stone-200 bg-white p-3 flex-shrink-0">
            {/* Gesamtpreis */}
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-baeckerei-text">Gesamt</span>
              <span className="text-2xl font-bold text-baeckerei-accent">{formatPreis(gesamtpreis)}</span>
            </div>
            {/* Zahlart + Kassieren */}
            <div className="flex gap-2">
              <button onClick={() => setZahlart('bar')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors
                  ${zahlart === 'bar' ? 'bg-green-100 border-2 border-green-400 text-green-800' : 'bg-stone-50 border-2 border-stone-200 text-baeckerei-text-secondary'}`}>
                💵 Bar
              </button>
              <button onClick={() => setZahlart('karte')}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors
                  ${zahlart === 'karte' ? 'bg-blue-100 border-2 border-blue-400 text-blue-800' : 'bg-stone-50 border-2 border-stone-200 text-baeckerei-text-secondary'}`}>
                💳 Karte
              </button>
              <button onClick={kassieren} disabled={positionen.length === 0}
                className="flex-[2] py-3 rounded-xl bg-baeckerei-accent hover:bg-baeckerei-accent-hover
                           text-white text-lg font-bold shadow-md active:scale-95 transition-all
                           disabled:opacity-30 disabled:cursor-not-allowed">
                Kassieren ✓
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
              <span className="text-lg">🎙️</span>
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
            <div className="flex-1 bg-stone-50 rounded-xl px-3 py-2 text-sm text-baeckerei-text min-h-[40px] max-h-[60px] overflow-y-auto">
              {liveText || <span className="text-baeckerei-text-secondary italic">Warte auf Sprache…</span>}
            </div>
            <button onClick={stoppeAufnahme}
              className="px-5 py-3 rounded-2xl bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white font-semibold shadow-md active:scale-95 transition-all">
              Fertig ✓
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
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-baeckerei-text mb-4">👤 Stammkunde auswählen</h3>
            <p className="text-sm text-baeckerei-text-secondary mb-4">Letzte Bestellung wird automatisch geladen</p>
            <div className="flex flex-col gap-3">
              {STAMMKUNDEN.map(kunde => (
                <button key={kunde.id} onClick={() => ladeStammkunde(kunde)}
                  className="bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-baeckerei-accent rounded-xl p-4 text-left transition-colors">
                  <p className="font-semibold text-baeckerei-text">{kunde.name}</p>
                  <p className="text-xs text-baeckerei-text-secondary mt-1">
                    Letzte: {kunde.letzte.map(p => `${p.menge}× ${p.name}`).join(', ')}
                  </p>
                </button>
              ))}
            </div>
            <button onClick={() => setStammkundePopup(false)}
              className="w-full mt-4 py-2 text-baeckerei-text-secondary text-sm hover:text-baeckerei-text">
              Abbrechen
            </button>
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
              <button onClick={() => setAllergenInfo(null)} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
            </div>

            {/* Allergene */}
            {allergenInfo.allergene?.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2">⚠️ Enthält (Allergene)</h4>
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
                <h4 className="text-sm font-semibold text-amber-700 mb-2">⚡ Kann Spuren enthalten</h4>
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
                <h4 className="text-sm font-semibold text-baeckerei-text mb-2">📋 Zutaten</h4>
                <p className="text-sm text-baeckerei-text-secondary leading-relaxed">
                  {allergenInfo.zutaten.join(', ')}
                </p>
              </div>
            )}

            {/* Allergen-Legende Link */}
            {allergenInfo.allergene?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-100">
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
                <h3 className="text-lg font-bold text-baeckerei-text">⚠️ Allergen-Check</h3>
                <p className="text-sm text-baeckerei-text-secondary">
                  {positionen.length > 0 ? 'Allergene in der aktuellen Bestellung' : 'Keine Positionen in der Bestellung'}
                </p>
              </div>
              <button onClick={() => setAllergenCheck(false)} className="text-stone-400 hover:text-stone-600 text-xl">✕</button>
            </div>

            {/* Schnellfilter: Allergene per Tap ausschließen */}
            <div className="mb-4 p-3 bg-stone-50 rounded-xl">
              <h4 className="text-xs font-semibold text-baeckerei-text mb-2">🚫 Allergene ausschließen (Produkte werden ausgegraut)</h4>
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
                <span className="text-4xl mb-3 block">🛒</span>
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
                <h4 className="text-sm font-semibold text-baeckerei-text mb-3 pt-3 border-t border-stone-100">
                  Aufschlüsselung pro Produkt
                </h4>
                <div className="flex flex-col gap-2">
                  {positionen.map((pos, idx) => {
                    const prod = produkte.find(p => p.id === pos.produkt_id)
                    return (
                      <div key={idx} className="bg-stone-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-baeckerei-text text-sm">{pos.menge}× {pos.produkt_name}</span>
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
                    ℹ️ Diese Angaben dienen der Kundenberatung. Bei schweren Allergien bitte immer die vollständige Zutatenliste prüfen und Rücksprache mit der Backstube halten.
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
              <span className="text-5xl block mb-3">⚠️</span>
              <h3 className="text-lg font-bold text-red-700">Allergen-Warnung!</h3>
            </div>
            <p className="text-sm text-baeckerei-text text-center mb-3">
              <strong>{allergenWarnung.produkt.name || allergenWarnung.produkt.produkt_name}</strong> enthält:
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mb-4">
              {allergenWarnung.allergene.map(a => (
                <span key={a} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm font-medium">
                  {ALLERGEN_ICONS[a]} {ALLERGEN_KURZ[a]}
                </span>
              ))}
            </div>
            <p className="text-xs text-baeckerei-text-secondary text-center mb-5">
              Der Kunde hat angegeben, diese Allergene zu meiden.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setAllergenWarnung(null)}
                className="flex-1 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-baeckerei-text font-medium text-sm">
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
    </div>
  )
}
