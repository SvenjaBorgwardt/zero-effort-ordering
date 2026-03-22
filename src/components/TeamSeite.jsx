import { useState, useEffect } from 'react'
import { ArrowLeft, Linkedin, Cpu, Database, Search, Shield, ChevronDown, Zap, Mic } from 'lucide-react'

// ── Team-Mitglieder (v.l.n.r. wie auf dem Foto) ──
const TEAM = [
  { name: 'Viktoria', rolle: 'Frontend & UX Design', linkedin: 'https://www.linkedin.com/in/vikt%C3%B3ria-utters-b57310b2', bild: '/Viktoria.png' },
  { name: 'Rebecca', rolle: 'Backend & Datenbank', linkedin: 'https://www.linkedin.com/in/rebecca-thinnes-ba1304389/', bild: '/Rebecca.png' },
  { name: 'Svenja', rolle: 'KI & Spracherkennung', linkedin: 'https://www.linkedin.com/in/svenja-borgwardt-5581b03b4/', bild: '/Svenja.png' },
  { name: 'Stefanie', rolle: 'Projektleitung & Testing', linkedin: 'https://www.linkedin.com/in/stefanie-pfeiffer-a793293b9', bild: '/Stefanie.png' },
]

// ── Pipeline-Schritt Komponente ──
function PipelineSchritt({ icon: Icon, label, sublabel, farbe, delay, istLetzter }) {
  return (
    <div className="flex flex-col items-center" style={{ animation: `fadeIn 0.5s ease-out ${delay}ms both` }}>
      <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl ${farbe} flex items-center justify-center shadow-md`}>
        <Icon size={20} className="text-white sm:w-6 sm:h-6" />
      </div>
      <p className="text-xs sm:text-sm font-bold text-purple-900 mt-1.5 text-center leading-tight">{label}</p>
      {sublabel && <p className="text-[10px] sm:text-xs text-purple-500 text-center leading-tight mt-0.5">{sublabel}</p>}
      {!istLetzter && (
        <ChevronDown size={16} className="text-purple-300 mt-1 sm:hidden" />
      )}
    </div>
  )
}

export default function TeamSeite({ onZurueck }) {
  const [geladen, setGeladen] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setGeladen(true))
  }, [])

  return (
    <div className="min-h-screen bg-baeckerei-bg flex flex-col">
      {/* Header */}
      <header
        className="border-b border-purple-300/30 px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm"
        style={{ background: 'linear-gradient(135deg, #DDD6F3 0%, #D4CBF0 100%)' }}
      >
        <button
          onClick={onZurueck}
          className="p-2 rounded-xl hover:bg-purple-200/50 active:scale-95 transition-all"
        >
          <ArrowLeft size={22} className="text-purple-800" />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-baeckerei-text tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            UTE
          </h1>
          <p className="text-xs text-baeckerei-text-secondary font-medium">Unser Team & Technologie</p>
        </div>
      </header>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto transition-all duration-700 ease-out ${geladen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center gap-8 sm:gap-10">

          {/* ════════ TEAM-BEREICH ════════ */}

          {/* Teamfoto */}
          <div className="w-full rounded-2xl overflow-hidden shadow-xl border-2 border-purple-200">
            <img
              src="/UTE-team.png"
              alt="Team UTE"
              className="w-full h-auto object-cover"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>

          {/* Überschrift */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-purple-900 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Unser Team
          </h2>

          {/* Team-Mitglieder */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {TEAM.map((person, i) => (
              <a
                key={person.name}
                href={person.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-2xl bg-white/40 border border-purple-200/50 backdrop-blur-sm hover:bg-white/60 hover:border-purple-300 hover:shadow-md active:scale-95 transition-all cursor-pointer no-underline"
                style={{ animationDelay: `${i * 100}ms`, animation: 'fadeIn 0.5s ease-out both' }}
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-purple-300 to-violet-400 flex items-center justify-center shadow-md overflow-hidden">
                  <img
                    src={person.bild}
                    alt={person.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                  <span className="text-white font-bold text-lg sm:text-xl hidden items-center justify-center w-full h-full">{person.name[0]}</span>
                </div>
                <span className="font-bold text-purple-900 text-sm sm:text-base flex items-center gap-1">
                  {person.name}
                  <Linkedin size={14} className="text-[#0A66C2]" />
                </span>
                <span className="text-xs text-purple-500 text-center leading-tight">{person.rolle}</span>
              </a>
            ))}
          </div>

          {/* ════════ ARCHITEKTUR-BEREICH ════════ */}

          {/* Trennlinie */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-purple-200" />
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Technologie</span>
            <div className="flex-1 h-px bg-purple-200" />
          </div>

          {/* Architektur-Überschrift */}
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-extrabold text-purple-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              So funktioniert UTE
            </h2>
            <p className="text-sm text-purple-600 mt-1">
              Zwei KI-Pipelines für schnelle und präzise Spracherkennung
            </p>
          </div>

          {/* ── DUAL PIPELINE VISUALISIERUNG ── */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Pipeline 1: Live (schnell) */}
            <div className="rounded-2xl bg-white/40 border border-purple-200/50 backdrop-blur-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-900 text-sm sm:text-base">Pipeline 1 — Live</h3>
                  <p className="text-[10px] sm:text-xs text-green-600 font-semibold">&lt; 200ms Reaktionszeit</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Mic size={15} className="text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-purple-900">Browser Speech API</p>
                    <p className="text-[10px] sm:text-xs text-purple-500">Echtzeit-Transkription</p>
                  </div>
                </div>

                <div className="ml-4 border-l-2 border-green-200 pl-3 flex flex-col gap-1.5">
                  {['Produkterkennung', 'Stammkunden', 'Allergene', 'Zahlart'].map(t => (
                    <span key={t} className="text-[10px] sm:text-xs text-purple-600 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0" /> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pipeline 2: KI-Korrektur (präzise) */}
            <div className="rounded-2xl bg-white/40 border border-purple-200/50 backdrop-blur-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
                  <Cpu size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-900 text-sm sm:text-base">Pipeline 2 — Mistral KI</h3>
                  <p className="text-[10px] sm:text-xs text-violet-600 font-semibold">~2s Korrektur-Pass</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Mic size={15} className="text-violet-700" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-purple-900">Mistral Voxtral</p>
                    <p className="text-[10px] sm:text-xs text-purple-500">Präzise Transkription</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Cpu size={15} className="text-violet-700" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-purple-900">Mistral Large</p>
                    <p className="text-[10px] sm:text-xs text-purple-500">Smalltalk filtern, Positionen parsen</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Search size={15} className="text-violet-700" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-purple-900">Fuse.js Matching</p>
                    <p className="text-[10px] sm:text-xs text-purple-500">Fuzzy-Suche im Produktkatalog</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pfeil nach unten → Datenbank */}
          <div className="flex flex-col items-center -mt-3 -mb-3">
            <ChevronDown size={24} className="text-purple-300" />
          </div>

          {/* Datenbank-Zeile */}
          <div className="w-full rounded-2xl bg-white/40 border border-purple-200/50 backdrop-blur-sm p-4 sm:p-5 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Database size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-purple-900">Supabase (PostgreSQL)</p>
              <p className="text-[10px] sm:text-xs text-purple-500">Bestellungen, Produktkatalog, Stammkunden</p>
            </div>
          </div>

          {/* ── EU AI ACT BADGE ── */}
          <div className="w-full rounded-2xl p-4 sm:p-5 flex items-start gap-3 border-2 border-blue-200" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E8EEFF 100%)' }}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900 text-sm sm:text-base">EU AI Act konform</h3>
              <p className="text-xs sm:text-sm text-blue-700 mt-0.5 leading-relaxed">
                Mistral AI ist ein europäischer Anbieter. Alle Daten werden DSGVO-konform verarbeitet.
                UTE fällt als Kassensystem unter die Risikoklasse „minimal" — keine Hochrisiko-Anwendung.
              </p>
            </div>
          </div>

          {/* ── TECH-STACK ÜBERSICHT ── */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'React 18', sub: 'Frontend', farbe: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
              { label: 'Vite', sub: 'Build Tool', farbe: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
              { label: 'Tailwind CSS', sub: 'Styling', farbe: 'bg-sky-100 text-sky-700 border-sky-200' },
              { label: 'Express.js', sub: 'Backend', farbe: 'bg-green-100 text-green-700 border-green-200' },
              { label: 'Mistral AI', sub: '2 API-Abfragen', farbe: 'bg-violet-100 text-violet-700 border-violet-200' },
              { label: 'Vercel', sub: 'Deployment', farbe: 'bg-gray-100 text-gray-700 border-gray-200' },
            ].map(t => (
              <div key={t.label} className={`rounded-xl border p-2.5 sm:p-3 text-center ${t.farbe}`}>
                <p className="font-bold text-xs sm:text-sm">{t.label}</p>
                <p className="text-[10px] sm:text-xs opacity-70">{t.sub}</p>
              </div>
            ))}
          </div>

          {/* ════════ QR-CODE ════════ */}

          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-purple-200" />
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Ausprobieren</span>
            <div className="flex-1 h-px bg-purple-200" />
          </div>

          <div className="flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-white/30 border border-purple-200/50 backdrop-blur-sm w-full sm:w-auto">
            <h3 className="text-base sm:text-lg font-bold text-purple-900">Probier UTE selbst aus!</h3>
            <div className="flex flex-col items-center gap-2">
              <img
                src="/QR-Code-UTE.png"
                alt="QR-Code zum Projekt"
                className="rounded-2xl shadow-lg border-2 border-purple-200"
                style={{ width: 180, height: 180, objectFit: 'contain' }}
              />
              <p className="text-xs text-purple-500 font-medium">Scanne mich!</p>
            </div>
          </div>

          {/* Spacing unten */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  )
}
