import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { APP_NAME } from './config'
import FilialAuswahl from './components/FilialAuswahl'
import FilialApp from './components/FilialApp'
import Dashboard from './components/Dashboard'
import KassenApp from './components/KassenApp'

function App() {
  const [filiale, setFiliale] = useState(null)

  // Filiale aus localStorage laden (bleibt nach Neustart)
  useEffect(() => {
    const gespeichert = localStorage.getItem('ausgewaehlte_filiale')
    if (gespeichert) {
      setFiliale(JSON.parse(gespeichert))
    }
  }, [])

  const handleFilialAuswahl = (f) => {
    setFiliale(f)
    localStorage.setItem('ausgewaehlte_filiale', JSON.stringify(f))
  }

  const handleFilialWechsel = () => {
    setFiliale(null)
    localStorage.removeItem('ausgewaehlte_filiale')
  }

  return (
    <div className="min-h-screen bg-baeckerei-bg">
      <Routes>
        {/* Filialauswahl – Startscreen */}
        <Route path="/" element={
          filiale
            ? <Navigate to="/filiale" replace />
            : <FilialAuswahl onSelect={handleFilialAuswahl} />
        } />

        {/* Filial-App – Hauptscreen für Filialmitarbeiterinnen */}
        <Route path="/filiale" element={
          filiale
            ? <FilialApp filiale={filiale} onWechsel={handleFilialWechsel} />
            : <Navigate to="/" replace />
        } />

        {/* Zentral-Dashboard – Für die Backstube */}
        <Route path="/dashboard" element={
          <Dashboard />
        } />

        {/* Kassensystem – Sprach-basiertes POS */}
        <Route path="/kasse" element={
          <KassenApp />
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
