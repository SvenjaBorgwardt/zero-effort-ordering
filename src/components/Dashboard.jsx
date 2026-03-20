import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../config'
import { ladeStatus, ladeGesamt } from '../services/api'

function Dashboard() {
  const [datum, setDatum] = useState('heute')
  const [status, setStatus] = useState(null)
  const [gesamt, setGesamt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openFiliale, setOpenFiliale] = useState(null)

  const getDatum = () => {
    const d = new Date()
    if (datum === 'gestern') d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }

  useEffect(() => {
    setLoading(true)
    const d = getDatum()
    Promise.all([ladeStatus(d), ladeGesamt(d)])
      .then(([s, g]) => { setStatus(s); setGesamt(g); setLoading(false); })
      .catch(() => setLoading(false))
  }, [datum])

  const handleErinnern = (filialName) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${APP_NAME} – Erinnerung`, {
        body: `${filialName} hat noch nicht bestellt!`,
        icon: '🥐'
      })
    } else if ('Notification' in window) {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          new Notification(`${APP_NAME} – Erinnerung`, {
            body: `${filialName} hat noch nicht bestellt!`
          })
        }
      })
    }
    alert(`Erinnerung an ${filialName} gesendet!`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-baeckerei-text-secondary text-lg">Lade Dashboard...</p>
      </div>
    )
  }

  const fehlende = status?.filialen?.filter(f => !f.hat_bestellt && f.id !== 'f15') || []
  const bestellte = status?.filialen?.filter(f => f.hat_bestellt) || []

  return (
    <div className="max-w-4xl mx-auto p-4 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-baeckerei-text">{APP_NAME} – Zentrale</h1>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setDatum('heute')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${datum === 'heute' ? 'bg-baeckerei-accent text-white' : 'bg-white text-baeckerei-text-secondary border'}`}
            >
              Heute
            </button>
            <button
              onClick={() => setDatum('gestern')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${datum === 'gestern' ? 'bg-baeckerei-accent text-white' : 'bg-white text-baeckerei-text-secondary border'}`}
            >
              Gestern
            </button>
          </div>
        </div>
        <Link to="/" className="text-sm text-baeckerei-accent">
          ← Zur Filiale
        </Link>
      </div>

      {/* Status-Übersicht */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-baeckerei-text">
            {status?.bestellt || 0} <span className="text-baeckerei-text-secondary font-normal text-2xl">von {(status?.gesamt || 15) - 1}</span>
          </div>
          <div className="text-baeckerei-text-secondary mt-1">Filialen haben bestellt</div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
            <div
              className="bg-baeckerei-gruen h-3 rounded-full transition-all"
              style={{ width: `${((status?.bestellt || 0) / ((status?.gesamt || 15) - 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Fehlende Filialen */}
      {fehlende.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-red-800 mb-3">⏳ Noch nicht bestellt:</h2>
          <div className="space-y-2">
            {fehlende.map(f => (
              <div key={f.id} className="flex justify-between items-center bg-white rounded-lg p-3">
                <span className="font-medium text-baeckerei-text">{f.name}</span>
                <button
                  onClick={() => handleErinnern(f.name)}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                >
                  🔔 Erinnern
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sonderbestellungen */}
      {gesamt?.sonderbestellungen && gesamt.sonderbestellungen.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-amber-800 mb-3">🔔 Kundenbestellungen</h2>
          <div className="space-y-2">
            {gesamt.sonderbestellungen.map((sb, i) => (
              <div key={i} className="bg-white rounded-lg p-3 text-sm">
                <span className="font-medium">{sb.menge}× {sb.produkt_name || sb.produkt}</span>
                {sb.kunde && <span className="text-baeckerei-text-secondary"> – {sb.kunde}</span>}
                {sb.lieferdatum && <span className="text-baeckerei-text-secondary"> – {sb.lieferdatum}</span>}
                <span className="text-baeckerei-text-secondary"> ({sb.filiale_name})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Konsolidierte Gesamtbestellung */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold text-baeckerei-text">📦 Gesamtbedarf {datum === 'heute' ? 'heute' : 'gestern'}</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 text-sm text-baeckerei-text-secondary">Produkt</th>
              <th className="text-right p-3 text-sm text-baeckerei-text-secondary">Gesamt</th>
              <th className="text-right p-3 text-sm text-baeckerei-text-secondary">Filialen</th>
            </tr>
          </thead>
          <tbody>
            {(gesamt?.gesamtbestellung || []).map((p, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">
                  <div className="font-medium text-baeckerei-text">{p.produkt_name}</div>
                  <div className="text-xs text-baeckerei-text-secondary">{p.kategorie}</div>
                </td>
                <td className="p-3 text-right font-semibold whitespace-nowrap">{p.gesamt_menge} {p.einheit}</td>
                <td className="p-3 text-right text-baeckerei-text-secondary">{p.anzahl_filialen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Filial-Details (aufklappbar) */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold text-baeckerei-text">📋 Alle Filialen</h2>
        </div>
        {bestellte.map(f => (
          <div key={f.id} className="border-t">
            <button
              onClick={() => setOpenFiliale(openFiliale === f.id ? null : f.id)}
              className="w-full flex justify-between items-center p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{f.hat_anomalie ? '⚠️' : '✅'}</span>
                <span className="font-medium text-baeckerei-text">{f.name}</span>
                {f.hat_sonderbestellung && <span className="text-amber-500 text-xs">🔔</span>}
              </div>
              <span className="text-baeckerei-text-secondary text-sm">
                {f.letzte_bestellung ? new Date(f.letzte_bestellung).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''}
                {' '}{openFiliale === f.id ? '▲' : '▼'}
              </span>
            </button>
            {/* TODO: Aufklappbare Details mit Bestellpositionen – am Hackathon verfeinern */}
            {openFiliale === f.id && (
              <div className="p-3 bg-gray-50 text-sm text-baeckerei-text-secondary">
                Bestellung von {f.letzte_bestellung ? new Date(f.letzte_bestellung).toLocaleString('de-DE') : 'unbekannt'}
                {/* TODO: Hier Bestellpositionen anzeigen */}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
