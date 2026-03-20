import { useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../config'
import { sendeErkennung, speichereBestellung } from '../services/api'

function FilialApp({ filiale, onWechsel }) {
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [ergebnis, setErgebnis] = useState(null)
  const [gesendet, setGesendet] = useState(false)
  const [fehler, setFehler] = useState(null)

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setFehler(null)
    setErgebnis(null)
    setGesendet(false)

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFotoPreview(ev.target.result)
      // Base64 ohne "data:image/...;base64," Prefix
      const base64 = ev.target.result.split(',')[1]
      setFoto(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleVerarbeiten = async () => {
    if (!foto) return
    setLoading(true)
    setFehler(null)

    try {
      const result = await sendeErkennung(foto, filiale.id)
      if (result.success) {
        setErgebnis(result)
      } else {
        setFehler(result.error || 'Erkennung fehlgeschlagen')
      }
    } catch (err) {
      setFehler('Verbindung zum Server fehlgeschlagen: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBestaetigen = async () => {
    if (!ergebnis) return
    try {
      await speichereBestellung(
        filiale.id,
        filiale.name,
        ergebnis.positionen,
        ergebnis.sonderbestellungen,
        ergebnis.kommentar
      )
      setGesendet(true)
      // Nach 3 Sekunden zurücksetzen
      setTimeout(() => {
        setFoto(null)
        setFotoPreview(null)
        setErgebnis(null)
        setGesendet(false)
      }, 3000)
    } catch (err) {
      setFehler('Bestellung konnte nicht gespeichert werden: ' + err.message)
    }
  }

  const handleNeu = () => {
    setFoto(null)
    setFotoPreview(null)
    setErgebnis(null)
    setFehler(null)
    setGesendet(false)
  }

  const ampelFarbe = (plausi) => {
    if (plausi === 'gruen') return 'bg-green-500'
    if (plausi === 'gelb') return 'bg-yellow-400'
    return 'bg-red-500'
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-baeckerei-text">{filiale.name}</h1>
          <button onClick={onWechsel} className="text-xs text-baeckerei-text-secondary underline">
            Filiale wechseln
          </button>
        </div>
        <Link to="/dashboard" className="text-sm text-baeckerei-accent">
          Zentrale →
        </Link>
      </div>

      {/* Erfolgs-Meldung */}
      {gesendet && (
        <div className="bg-green-100 border border-green-400 text-green-800 rounded-xl p-4 mb-4 text-center text-lg font-semibold">
          ✅ Bestellung gesendet!
        </div>
      )}

      {/* Fehler-Meldung */}
      {fehler && (
        <div className="bg-red-100 border border-red-400 text-red-800 rounded-xl p-4 mb-4">
          ⚠️ {fehler}
        </div>
      )}

      {/* Kamera + Galerie Buttons */}
      {!ergebnis && !gesendet && (
        <div className="space-y-3 mb-6">
          <label className="block w-full bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white text-center
                           font-semibold py-5 rounded-xl cursor-pointer text-lg transition-colors shadow-sm">
            📷 Bestellzettel fotografieren
            <input type="file" accept="image/*" capture="environment" onChange={handleFoto} className="hidden" />
          </label>
          <label className="block w-full bg-white border-2 border-gray-200 hover:border-baeckerei-accent text-baeckerei-text-secondary
                           text-center py-3 rounded-xl cursor-pointer transition-colors">
            Aus Galerie wählen
            <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
          </label>
        </div>
      )}

      {/* Foto Preview */}
      {fotoPreview && !ergebnis && !gesendet && (
        <div className="mb-6">
          <img src={fotoPreview} alt="Bestellzettel" className="w-full rounded-xl shadow-sm max-h-64 object-contain bg-white" />
          <div className="flex gap-3 mt-3">
            <button
              onClick={handleVerarbeiten}
              disabled={loading}
              className="flex-1 bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white font-semibold
                         py-4 rounded-xl text-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? '⏳ Wird gelesen...' : '🔍 Verarbeiten'}
            </button>
            <button onClick={handleNeu} className="px-4 py-4 bg-white border-2 border-gray-200 rounded-xl text-baeckerei-text-secondary">
              ↩️
            </button>
          </div>
        </div>
      )}

      {/* Ergebnis-Tabelle */}
      {ergebnis && !gesendet && (
        <div className="space-y-4">
          {/* Warnung bei unlesbaren Stellen */}
          {ergebnis.erkennungs_meta?.unlesbare_stellen?.length > 0 && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-xl p-3 text-sm">
              ⚠️ Zettel teilweise schwer lesbar – bitte alle Positionen prüfen
            </div>
          )}

          {/* Modus-Anzeige */}
          <div className="text-xs text-baeckerei-text-secondary text-right">
            {ergebnis.erkennungs_meta?.modus === 'live' ? '🟢 Live' : '🟠 Demo-Modus'}
          </div>

          {/* Positionen */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-baeckerei-text-secondary">Produkt</th>
                  <th className="text-right p-3 text-sm font-semibold text-baeckerei-text-secondary">Menge</th>
                  <th className="text-center p-3 text-sm font-semibold text-baeckerei-text-secondary w-12"></th>
                </tr>
              </thead>
              <tbody>
                {ergebnis.positionen && ergebnis.positionen.map((pos, i) => (
                  <tr key={i} className={`border-t ${pos.plausibilitaet === 'gelb' ? 'bg-yellow-50' : pos.plausibilitaet === 'rot' ? 'bg-red-50' : ''}`}>
                    <td className="p-3">
                      <div className="font-medium text-baeckerei-text">{pos.produkt_name || pos.produkt}</div>
                      {pos.plausibilitaet_grund && (
                        <div className="text-xs text-yellow-700 mt-1">{pos.plausibilitaet_grund}</div>
                      )}
                      <div className="text-xs text-baeckerei-text-secondary mt-0.5">Zettel: „{pos.original_text}"</div>
                    </td>
                    <td className="p-3 text-right font-semibold text-baeckerei-text whitespace-nowrap">
                      {pos.menge} {pos.einheit}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${ampelFarbe(pos.plausibilitaet)}`}></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sonderbestellungen */}
          {ergebnis.sonderbestellungen && ergebnis.sonderbestellungen.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-800 mb-2">🔔 Kundenbestellungen</h3>
              {ergebnis.sonderbestellungen.map((sb, i) => (
                <div key={i} className="text-sm text-amber-900">
                  <span className="font-medium">{sb.menge}× {sb.produkt_name || sb.produkt}</span>
                  {sb.kunde && <span> – {sb.kunde}</span>}
                  {sb.lieferdatum && <span> – Lieferung: {sb.lieferdatum}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Kommentar */}
          {ergebnis.kommentar && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-1">💬 Kommentar</h3>
              <p className="text-sm text-blue-900">{ergebnis.kommentar}</p>
            </div>
          )}

          {/* Bestätigungs-Button */}
          <button
            onClick={handleBestaetigen}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold
                       py-5 rounded-xl text-lg transition-colors shadow-sm"
          >
            ✓ Bestellung bestätigen und senden
          </button>

          <button onClick={handleNeu} className="w-full text-baeckerei-text-secondary text-sm py-2 underline">
            Verwerfen und neues Foto
          </button>
        </div>
      )}

      {/* TODO: BestellHistorie – am Hackathon bauen */}
      {/* <BestellHistorie filialeId={filiale.id} /> */}
    </div>
  )
}

export default FilialApp
