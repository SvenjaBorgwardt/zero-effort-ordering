import { useState, useEffect } from 'react'
import { APP_NAME, APP_SUBTITLE } from './config'
import KassenApp from './components/KassenApp'

// Demo-Mitarbeiter für den Hackathon
const MITARBEITER = [
  { id: 'm1', name: 'Stefanie', rolle: 'Verkauf' },
  { id: 'm2', name: 'Viktoria', rolle: 'Verkauf' },
  { id: 'm3', name: 'Rebecca', rolle: 'Verkauf' },
  { id: 'm4', name: 'Svenja', rolle: 'Verkauf' },
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
      <div className="min-h-screen bg-baeckerei-bg flex flex-col items-center justify-center p-6">
        <div className="text-center mb-10">
          <span className="text-5xl mb-4 block">🥐</span>
          <h1 className="text-4xl font-bold text-baeckerei-text">{APP_NAME}</h1>
          <p className="text-baeckerei-text-secondary mt-2 text-lg">{APP_SUBTITLE}</p>
        </div>

        <p className="text-baeckerei-text-secondary mb-6 text-sm">Wer arbeitet heute an der Theke?</p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {MITARBEITER.map(ma => (
            <button
              key={ma.id}
              onClick={() => handleAuswahl(ma)}
              className="bg-white rounded-2xl shadow-sm border-2 border-stone-100 p-6 text-center
                         hover:shadow-md hover:border-baeckerei-accent active:bg-amber-50
                         transition-all flex flex-col items-center gap-2"
            >
              <span className="text-3xl">👤</span>
              <span className="font-semibold text-baeckerei-text text-lg">{ma.name}</span>
              <span className="text-xs text-baeckerei-text-secondary">{ma.rolle}</span>
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
