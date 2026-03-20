import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { APP_NAME } from '../config'
import { ladeFilialen } from '../services/api'

function FilialAuswahl({ onSelect }) {
  const [filialen, setFilialen] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    ladeFilialen()
      .then(data => { setFilialen(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [])

  const handleSelect = (filiale) => {
    onSelect(filiale)
    navigate('/filiale')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-baeckerei-text-secondary text-lg">Lade Filialen...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 pt-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-baeckerei-text">{APP_NAME}</h1>
        <p className="text-baeckerei-text-secondary mt-2">Wähle deine Filiale</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filialen.map(f => (
          <button
            key={f.id}
            onClick={() => handleSelect(f)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left
                       hover:shadow-md hover:border-baeckerei-accent active:bg-amber-50
                       transition-all min-h-[70px] flex flex-col justify-center"
          >
            <span className="font-semibold text-baeckerei-text text-sm">{f.name}</span>
            <span className="text-xs text-baeckerei-text-secondary mt-1">{f.adresse}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          to="/kasse"
          className="w-full max-w-sm py-3 rounded-xl bg-baeckerei-accent hover:bg-baeckerei-accent-hover text-white text-center font-semibold shadow-sm transition-colors"
        >
          🧾 Zur Kasse
        </Link>
        <Link to="/dashboard" className="text-baeckerei-accent text-sm underline">
          Zur Zentrale →
        </Link>
      </div>
    </div>
  )
}

export default FilialAuswahl
