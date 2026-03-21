import { useState, useEffect } from 'react'
import KassenApp from './components/KassenApp'
import { UTEMascot } from './components/ute-logo'

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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <UTEMascot size={200} className="mb-8" />

        <p className="text-muted-foreground mb-6 text-sm">Wer arbeitet heute an der Theke?</p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {MITARBEITER.map(ma => (
            <button
              key={ma.id}
              onClick={() => handleAuswahl(ma)}
              className="bg-card rounded-2xl shadow-sm border-2 border-border p-6 text-center
                         hover:shadow-md hover:border-primary active:bg-ute-cream
                         transition-all flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 rounded-full bg-ute-dusty-rose-light flex items-center justify-center">
                <span className="text-xl font-bold text-ute-charcoal">{ma.name[0]}</span>
              </div>
              <span className="font-semibold text-foreground text-lg">{ma.name}</span>
              <span className="text-xs text-muted-foreground">{ma.rolle}</span>
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
