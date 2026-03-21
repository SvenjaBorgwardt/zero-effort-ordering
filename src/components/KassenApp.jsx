import { useState, useRef, useEffect, useCallback } from 'react'
import { transkribiere, erkenneSprache, speichereKassenBestellung } from '../services/api'

// Ampelfarben
const PLAUSI_STYLE = {
  gruen: { bg: 'bg-green-50', border: 'border-green-300', badge: 'bg-green-100 text-green-800', dot: 'bg-green-500', label: 'OK' },
  gelb:  { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', label: 'Prüfen' },
  rot:   { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-800', dot: 'bg-red-500', label: 'Unsicher' },
}

function formatPreis(wert) {
  if (wert == null) return '—'
  return wert.toFixed(2).replace('.', ',') + ' €'
}

// Hilfsfunktion: AudioBlob → Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function KassenApp({ mitarbeiter, onAbmelden }) {
  // State Machine: idle | recording | processing | reviewing | confirmed
  const [phase, setPhase] = useState('idle')
  const [liveText, setLiveText] = useState('')
  const [transkriptText, setTranskriptText] = useState('')
  const [positionen, setPositionen] = useState([])
  const [kommentar, setKommentar] = useState('')
  const [fehler, setFehler] = useState(null)
  const [aufnahmeZeit, setAufnahmeZeit] = useState(0)

  // Refs für MediaRecorder
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const zeitRef = useRef(null)
  const recognitionRef = useRef(null)

  // Aufnahmezeit hochzählen
  useEffect(() => {
    if (phase === 'recording') {
      setAufnahmeZeit(0)
      zeitRef.current = setInterval(() => {
        setAufnahmeZeit(s => s + 1)
      }, 1000)
    } else {
      clearInterval(zeitRef.current)
    }
    return () => clearInterval(zeitRef.current)
  }, [phase])

  function formatZeit(sek) {
    const m = Math.floor(sek / 60).toString().padStart(2, '0')
    const s = (sek % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Browser SpeechRecognition für Live-Anzeige
  const starteSpeechRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    const r = new SR()
    r.lang = 'de-DE'
    r.continuous = true
    r.interimResults = true
    r.maxAlternatives = 1

    r.onresult = (event) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + ' '
      }
      setLiveText(text.trim())
    }

    r.onerror = () => {
      // Stille bei SpeechRecognition-Fehler – Voxtral macht die finale Transkription
    }

    r.onend = () => {
      // Auto-restart wenn noch im Recording-Modus
      if (recognitionRef.current === r) {
        try { r.start() } catch {}
      }
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

  // Aufnahme starten
  async function starteAufnahme() {
    setFehler(null)
    setLiveText('')
    setTranskriptText('')
    setPositionen([])
    setKommentar('')
    audioChunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Besten verfügbaren MIME-Type wählen
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      const supportedMime = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || ''

      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : {})
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.start(1000) // Chunks jede Sekunde
      setPhase('recording')
      starteSpeechRecognition()

    } catch (err) {
      setFehler('Mikrofon-Zugriff verweigert. Bitte Berechtigung erteilen.')
      console.error('Mikrofon-Fehler:', err)
    }
  }

  // Aufnahme stoppen & verarbeiten
  async function schliesseAb() {
    if (!mediaRecorderRef.current) return

    stoppeSpeechRecognition()
    setPhase('processing')

    // Stream und Recorder stoppen
    mediaRecorderRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())

    // Kurz warten bis letzter Chunk da ist
    await new Promise(r => setTimeout(r, 300))

    try {
      const chunks = audioChunksRef.current
      if (chunks.length === 0) {
        throw new Error('Keine Audio-Daten aufgenommen')
      }

      const mimeType = chunks[0].type || 'audio/webm'
      const audioBlob = new Blob(chunks, { type: mimeType })

      // Schritt 1: Audio → Transkription (Voxtral)
      const audioBase64 = await blobToBase64(audioBlob)
      const transkriptErgebnis = await transkribiere(audioBase64, mimeType)

      if (!transkriptErgebnis.success && !transkriptErgebnis.text) {
        throw new Error(transkriptErgebnis.error || 'Transkription fehlgeschlagen')
      }

      const text = transkriptErgebnis.text || liveText || ''
      setTranskriptText(text)

      // Schritt 2: Transkription → Bestellpositionen (Mistral Large + Matching)
      const erkennungsErgebnis = await erkenneSprache(text)

      if (!erkennungsErgebnis.success) {
        throw new Error(erkennungsErgebnis.error || 'Erkennung fehlgeschlagen')
      }

      setPositionen(erkennungsErgebnis.positionen || [])
      setKommentar(erkennungsErgebnis.kommentar || '')
      setPhase('reviewing')

    } catch (err) {
      setFehler(err.message)
      setPhase('idle')
    }
  }

  // Menge einer Position korrigieren
  function aendereMenge(idx, neueMenge) {
    setPositionen(prev => prev.map((p, i) => {
      if (i !== idx) return p
      const menge = Math.max(0, parseInt(neueMenge) || 0)
      return {
        ...p,
        menge,
        preis_gesamt: p.preis_pro_stueck != null ? Math.round(p.preis_pro_stueck * menge * 100) / 100 : null
      }
    }))
  }

  // Position entfernen
  function entfernePosition(idx) {
    setPositionen(prev => prev.filter((_, i) => i !== idx))
  }

  // Bestellung bestätigen und speichern
  async function bestaetigen() {
    setPhase('confirmed')
    try {
      // Positionen in das Format bringen das /api/bestellung erwartet
      const positionenZumSpeichern = positionen.map(p => ({
        produkt_id: p.produkt_id || null,
        produkt_name: p.produkt_name || p.produkt,
        menge: p.menge,
        einheit: p.einheit || 'Stück',
        kategorie: p.kategorie || 'Sonstiges',
        plausibilitaet: p.plausibilitaet || 'gruen',
        konfidenz: p.konfidenz || 1,
        preis_pro_stueck: p.preis_pro_stueck || null,
        preis_gesamt: p.preis_gesamt || null
      }))
      await speichereKassenBestellung(
        positionenZumSpeichern,
        kommentar,
        transkriptText
      )
    } catch (err) {
      // Speicherfehler still ignorieren – Bestätigung ist trotzdem angezeigt
      console.warn('Bestellung konnte nicht gespeichert werden:', err.message)
    }
  }

  // Neue Bestellung starten
  function neueBestellung() {
    setPhase('idle')
    setLiveText('')
    setTranskriptText('')
    setPositionen([])
    setKommentar('')
    setFehler(null)
    setAufnahmeZeit(0)
    audioChunksRef.current = []
  }

  // Gesamtpreis berechnen
  const gesamtpreis = positionen.reduce((sum, p) => sum + (p.preis_gesamt || 0), 0)
  const hatUnbekanntePreise = positionen.some(p => p.preis_pro_stueck == null)

  // === RENDER ===

  return (
    <div className="min-h-screen bg-baeckerei-bg flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🥐</span>
          <div>
            <h1 className="text-lg font-bold text-baeckerei-text">UTE Kasse</h1>
            <p className="text-xs text-baeckerei-text-secondary">Hallo, {mitarbeiter?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAbmelden}
            className="text-sm text-baeckerei-text-secondary hover:text-baeckerei-text underline"
          >
            Abmelden
          </button>
        </div>
        {phase !== 'idle' && phase !== 'confirmed' && (
          <button
            onClick={neueBestellung}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Abbrechen
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-2xl mx-auto w-full">

        {/* ── IDLE ── */}
        {phase === 'idle' && (
          <div className="w-full flex flex-col items-center gap-6">
            {fehler && (
              <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
                {fehler}
              </div>
            )}
            <div className="text-center">
              <p className="text-baeckerei-text-secondary text-lg mb-2">Bereit für neue Bestellung</p>
              <p className="text-sm text-baeckerei-text-secondary">Drücke den Button, bediene den Kunden wie gewohnt – das System hört mit.</p>
            </div>
            <button
              onClick={starteAufnahme}
              className="w-48 h-48 rounded-full bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white text-xl font-bold shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center gap-2"
            >
              <span className="text-4xl">🎙️</span>
              <span>Neue Bestellung</span>
            </button>
          </div>
        )}

        {/* ── RECORDING ── */}
        {phase === 'recording' && (
          <div className="w-full flex flex-col items-center gap-6">
            {/* Aufnahme-Indikator */}
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-6 py-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-semibold text-red-700">Aufnahme läuft</span>
              <span className="text-red-500 font-mono text-sm ml-2">{formatZeit(aufnahmeZeit)}</span>
            </div>

            {/* Live-Transkription */}
            <div className="w-full bg-white rounded-2xl border border-stone-200 p-4 min-h-32">
              <p className="text-xs text-baeckerei-text-secondary mb-2 font-medium">Live-Mitschrift</p>
              {liveText ? (
                <p className="text-baeckerei-text leading-relaxed">{liveText}</p>
              ) : (
                <p className="text-baeckerei-text-secondary italic text-sm">Warte auf Spracheingabe…</p>
              )}
            </div>

            {/* Abschließen-Button */}
            <button
              onClick={schliesseAb}
              className="w-full max-w-sm py-5 rounded-2xl bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white text-xl font-bold shadow-lg active:scale-95 transition-all"
            >
              Abschließen →
            </button>
            <p className="text-xs text-baeckerei-text-secondary text-center">
              Drücke wenn der Kunde fertig bestellt hat
            </p>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {phase === 'processing' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full border-4 border-baeckerei-accent border-t-transparent animate-spin" />
            <div>
              <p className="text-xl font-semibold text-baeckerei-text">Bestellung wird erkannt…</p>
              <p className="text-sm text-baeckerei-text-secondary mt-1">Smalltalk wird herausgefiltert</p>
            </div>
          </div>
        )}

        {/* ── REVIEWING ── */}
        {phase === 'reviewing' && (
          <div className="w-full flex flex-col gap-4">
            <h2 className="text-xl font-bold text-baeckerei-text">Bestellung prüfen</h2>

            {/* Transkript (aufklappbar) */}
            <details className="bg-stone-50 rounded-xl border border-stone-200">
              <summary className="px-4 py-3 cursor-pointer text-sm text-baeckerei-text-secondary font-medium select-none">
                Aufgenommener Text anzeigen
              </summary>
              <p className="px-4 pb-3 text-sm text-baeckerei-text leading-relaxed">{transkriptText || '(kein Text)'}</p>
            </details>

            {/* Keine Positionen erkannt */}
            {positionen.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-center">
                <p className="text-yellow-800 font-medium">Keine Bestellpositionen erkannt</p>
                <p className="text-yellow-700 text-sm mt-1">Bitte Bestellung erneut aufnehmen</p>
                <button onClick={neueBestellung} className="mt-3 px-4 py-2 bg-baeckerei-accent text-white rounded-xl text-sm font-medium">
                  Neu starten
                </button>
              </div>
            )}

            {/* Positionsliste */}
            {positionen.length > 0 && (
              <>
                <div className="flex flex-col gap-2">
                  {positionen.map((pos, idx) => {
                    const style = PLAUSI_STYLE[pos.plausibilitaet] || PLAUSI_STYLE.gelb
                    return (
                      <div key={idx} className={`bg-white rounded-2xl border-2 ${style.border} p-4 flex items-center gap-4`}>
                        {/* Ampel-Dot */}
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${style.dot}`} title={pos.grund || ''} />

                        {/* Produktname */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-baeckerei-text truncate">
                            {pos.produkt_name || pos.produkt}
                          </p>
                          {!pos.katalog_match && (
                            <p className="text-xs text-baeckerei-rot">Nicht im Katalog gefunden</p>
                          )}
                          {pos.grund && pos.plausibilitaet !== 'gruen' && (
                            <p className="text-xs text-baeckerei-text-secondary">{pos.grund}</p>
                          )}
                        </div>

                        {/* Menge (editierbar) */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => aendereMenge(idx, pos.menge - 1)}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-lg font-bold flex items-center justify-center"
                          >−</button>
                          <input
                            type="number"
                            min="0"
                            value={pos.menge}
                            onChange={e => aendereMenge(idx, e.target.value)}
                            className="w-14 text-center border border-stone-300 rounded-lg py-1 font-semibold"
                          />
                          <button
                            onClick={() => aendereMenge(idx, pos.menge + 1)}
                            className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-lg font-bold flex items-center justify-center"
                          >+</button>
                        </div>

                        {/* Einheit */}
                        <span className="text-sm text-baeckerei-text-secondary w-12 text-right flex-shrink-0">
                          {pos.einheit}
                        </span>

                        {/* Preis */}
                        <div className="text-right flex-shrink-0 w-20">
                          {pos.preis_gesamt != null ? (
                            <p className="font-semibold text-baeckerei-text">{formatPreis(pos.preis_gesamt)}</p>
                          ) : (
                            <p className="text-sm text-baeckerei-text-secondary">—</p>
                          )}
                          {pos.preis_pro_stueck != null && (
                            <p className="text-xs text-baeckerei-text-secondary">{formatPreis(pos.preis_pro_stueck)}/Stk.</p>
                          )}
                        </div>

                        {/* Löschen */}
                        <button
                          onClick={() => entfernePosition(idx)}
                          className="w-8 h-8 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center flex-shrink-0"
                          title="Position entfernen"
                        >✕</button>
                      </div>
                    )
                  })}
                </div>

                {/* Kommentar */}
                {kommentar && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    <span className="font-medium">Hinweis: </span>{kommentar}
                  </div>
                )}

                {/* Gesamtpreis */}
                <div className="bg-white rounded-2xl border-2 border-stone-200 px-5 py-4 flex items-center justify-between">
                  <span className="font-bold text-lg text-baeckerei-text">Gesamt</span>
                  <div className="text-right">
                    <span className="font-bold text-2xl text-baeckerei-accent">{formatPreis(gesamtpreis)}</span>
                    {hatUnbekanntePreise && (
                      <p className="text-xs text-baeckerei-text-secondary">* einige Preise unbekannt</p>
                    )}
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex gap-3">
                  <button
                    onClick={neueBestellung}
                    className="flex-1 py-4 rounded-2xl border-2 border-stone-300 text-baeckerei-text font-semibold hover:bg-stone-50 active:scale-95 transition-all"
                  >
                    Verwerfen
                  </button>
                  <button
                    onClick={bestaetigen}
                    className="flex-2 flex-grow-[2] py-4 rounded-2xl bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white text-lg font-bold shadow-lg active:scale-95 transition-all"
                  >
                    Bestätigen ✓
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CONFIRMED ── */}
        {phase === 'confirmed' && (
          <div className="w-full flex flex-col items-center gap-6 text-center">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-5xl">
              ✅
            </div>
            <div>
              <h2 className="text-2xl font-bold text-baeckerei-text">Bestellung bestätigt!</h2>
              <p className="text-baeckerei-text-secondary mt-1">{positionen.length} Position{positionen.length !== 1 ? 'en' : ''} · {formatPreis(gesamtpreis)}</p>
            </div>

            {/* Zusammenfassung */}
            <div className="w-full bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
              {positionen.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center px-5 py-3">
                  <span className="text-baeckerei-text">
                    {p.menge}× {p.produkt_name || p.produkt}
                  </span>
                  <span className="font-semibold text-baeckerei-text">{formatPreis(p.preis_gesamt)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-5 py-3 bg-stone-50 font-bold">
                <span>Gesamt</span>
                <span className="text-baeckerei-accent text-lg">{formatPreis(gesamtpreis)}</span>
              </div>
            </div>

            <button
              onClick={neueBestellung}
              className="w-full max-w-sm py-5 rounded-2xl bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white text-xl font-bold shadow-lg active:scale-95 transition-all"
            >
              Neue Bestellung
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
