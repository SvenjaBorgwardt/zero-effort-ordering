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
const KAFFEE = { id: 'kaffee', name: 'Kaffee', preis: 1.80, einheit: 'Stück', kategorie: 'Getränke' }

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

  // UI State
  const [fehler, setFehler] = useState(null)
  const [abgeschlossen, setAbgeschlossen] = useState(false)
  const [zahlart, setZahlart] = useState('bar')
  const [stammkundePopup, setStammkundePopup] = useState(false)
  const [crossSelling, setCrossSelling] = useState(null) // null oder Produkt-Vorschlag

  // Katalog laden
  useEffect(() => {
    ladeKatalog().then(data => {
      // Nur Backwaren (keine Rohstoffe) + Kaffee hinzufügen
      const backwaren = (data.backwaren || []).map(p => ({
        ...p,
        produkt_name: p.name,
      }))
      setProdukte([...backwaren, KAFFEE])
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

  // ── PRODUKT MANUELL HINZUFÜGEN ──
  function produktHinzufuegen(produkt) {
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
    mediaRecorderRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    await new Promise(r => setTimeout(r, 300))

    try {
      const chunks = audioChunksRef.current
      if (chunks.length === 0) throw new Error('Keine Audio-Daten')
      const mimeType = chunks[0].type || 'audio/webm'
      const audioBlob = new Blob(chunks, { type: mimeType })
      const audioBase64 = await blobToBase64(audioBlob)

      // Schritt 1: Transkription
      const transkriptErgebnis = await transkribiere(audioBase64, mimeType)
      const text = transkriptErgebnis.text || liveText || ''

      // Schritt 2: Erkennung
      const erkennungsErgebnis = await erkenneSprache(text)
      if (erkennungsErgebnis.success && erkennungsErgebnis.positionen?.length > 0) {
        // Erkannte Positionen zur bestehenden Bestellung hinzufügen
        setPositionen(prev => {
          const neu = [...prev]
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
    setAbgeschlossen(false)
    setFehler(null)
    setCrossSelling(null)
    setZahlart('bar')
    setLiveText('')
  }

  // ── BERECHNUNGEN ──
  const gesamtpreis = positionen.reduce((sum, p) => sum + (p.preis_gesamt || 0), 0)
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

          {/* Produkt-Grid */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-3 gap-2">
              {gefilterteProdukte.map(produkt => (
                <button key={produkt.id} onClick={() => produktHinzufuegen(produkt)}
                  className="bg-white rounded-xl border-2 border-stone-100 p-3 text-left
                             hover:border-baeckerei-accent hover:shadow-sm active:bg-amber-50
                             transition-all flex flex-col justify-between min-h-[80px]">
                  <span className="font-medium text-baeckerei-text text-sm leading-tight">
                    {produkt.name || produkt.produkt_name}
                  </span>
                  <span className="text-baeckerei-accent font-bold text-sm mt-1">
                    {produkt.preis ? formatPreis(produkt.preis) : '—'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RECHTE SEITE: BESTELLLISTE ── */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Bestellpositionen */}
          <div className="flex-1 overflow-y-auto p-3">
            {positionen.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-baeckerei-text-secondary">
                <span className="text-4xl mb-3">🛒</span>
                <p className="text-lg font-medium">Noch keine Positionen</p>
                <p className="text-sm mt-1">Produkte links antippen oder Spracheingabe nutzen</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {positionen.map((pos, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-3">
                    {/* Produktname */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-baeckerei-text text-sm truncate">{pos.produkt_name}</p>
                      {pos.preis_pro_stueck != null && (
                        <p className="text-xs text-baeckerei-text-secondary">{formatPreis(pos.preis_pro_stueck)}/{pos.einheit || 'Stk.'}</p>
                      )}
                    </div>
                    {/* Menge */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => aendereMenge(idx, pos.menge - 1)}
                        className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-lg font-bold flex items-center justify-center">−</button>
                      <span className="w-8 text-center font-bold text-baeckerei-text">{pos.menge}</span>
                      <button onClick={() => aendereMenge(idx, pos.menge + 1)}
                        className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-lg font-bold flex items-center justify-center">+</button>
                    </div>
                    {/* Preis */}
                    <span className="font-bold text-baeckerei-text w-16 text-right text-sm">
                      {formatPreis(pos.preis_gesamt)}
                    </span>
                    {/* Löschen */}
                    <button onClick={() => entfernePosition(idx)}
                      className="w-7 h-7 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center text-sm">✕</button>
                  </div>
                ))}
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
    </div>
  )
}
