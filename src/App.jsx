import { useState, useEffect } from 'react'
import { APP_NAME, APP_SUBTITLE } from './config'
import KassenApp from './components/KassenApp'
import { UTEMascot } from './components/ute-logo'

// Demo-Mitarbeiter für den Hackathon
const MITARBEITER = [
  { id: 'm1', name: 'Stefanie', rolle: 'Verkauf' },
  { id: 'm2', name: 'Viktoria', rolle: 'Verkauf' },
  { id: 'm3', name: 'Rebecca', rolle: 'Verkauf' },
  { id: 'm4', name: 'Svenja', rolle: 'Verkauf' },
]

// Initialen-Farben für Mitarbeiter-Kreise
const INITIALEN_FARBEN = [
  'bg-ute-terracotta',
  'bg-ute-sage',
  'bg-ute-dusty-rose',
  'bg-ute-taupe',
]

function App() {
  const [mitarbeiter, setMitarbeiter] = useState(null)

  // Mitarbeiter aus sessionStorage laden (bleibt in Tab-Session)
  useEffect(() => {
    const gespeichert = sessionStorage.getItem('ute_mitarbeiter')
    if (gespeichert) {
      setMitarbeiter(JSON.parse(gespeichert))
    }
  }, [])

  const handleAuswahl = (ma) => {
    setMitarbeiter(ma)
    sessionStorage.setItem('ute_mitarbeiter', JSON.stringify(ma))
  }

  const handleAbmelden = () => {
    setMitarbeiter(null)
    sessionStorage.removeItem('ute_mitarbeiter')
  }

  // === STARTBILDSCHIRM: Mitarbeiter-Auswahl ===
  if (!mitarbeiter) {
    return (
      <div className="min-h-screen bg-ute-cream flex flex-col items-center justify-center p-6">
        <div className="text-center mb-10">
          <UTEMascot size={140} />
        </div>

        <p className="text-ute-taupe mb-6 text-sm">Wer arbeitet heute an der Theke?</p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {MITARBEITER.map((ma, idx) => (
            <button
              key={ma.id}
              onClick={() => handleAuswahl(ma)}
              className="bg-ute-warm-white rounded-2xl shadow-sm border-2 border-stone-100 p-6 text-center
                         hover:shadow-md hover:border-ute-terracotta active:bg-ute-dusty-rose-light/20
                         transition-all flex flex-col items-center gap-2"
            >
              <div className={`w-12 h-12 rounded-full ${INITIALEN_FARBEN[idx % INITIALEN_FARBEN.length]} flex items-center justify-center text-white font-bold text-lg`}>
                {ma.name.charAt(0)}
              </div>
              <span className="font-semibold text-ute-charcoal text-lg">{ma.name}</span>
              <span className="text-xs text-ute-taupe">{ma.rolle}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // === KASSENSYSTEM ===
  return <KassenApp mitarbeiter={mitarbeiter} onAbmelden={handleAbmelden} />
}

export default App
