// UTE Logo – handgezeichnetes Croissant mit geschlossenen Augen
// Basiert auf dem Branding-Bild von Rebecca

export function UTELogo({ size = 40, showText = false, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size * 0.7}
        viewBox="0 0 200 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Croissant body – hand-drawn style */}
        <path
          d="M30 90 C20 70, 35 45, 60 40 C70 38, 75 42, 80 48 C85 40, 92 36, 100 35 C108 36, 115 40, 120 48 C125 42, 130 38, 140 40 C165 45, 180 70, 170 90 C165 105, 140 115, 100 118 C60 115, 35 105, 30 90Z"
          stroke="#2D2D2D"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Inner croissant lines */}
        <path d="M80 48 C85 60, 90 75, 88 95" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M120 48 C115 60, 110 75, 112 95" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Left closed eye */}
        <path d="M68 62 C73 56, 83 56, 88 62" stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Left eyelashes */}
        <path d="M72 56 L70 51" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M78 54 L77 49" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M84 56 L85 51" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />

        {/* Right closed eye */}
        <path d="M112 62 C117 56, 127 56, 132 62" stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Right eyelashes */}
        <path d="M116 56 L115 51" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M122 54 L122 49" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M128 56 L130 51" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />

        {/* Small smile/nose */}
        <path d="M96 72 C98 75, 102 75, 104 72" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight" style={{ color: '#2D2D2D' }}>UTE</span>
          <span className="text-[0.6rem] opacity-60 -mt-1" style={{ color: '#2D2D2D' }}>Unkomplizierte Theken Eingabe</span>
        </div>
      )}
    </div>
  )
}

// Größere Version für Login-Screen
export function UTELogoLarge({ className = '' }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <UTELogo size={160} />
      <h2 className="text-3xl font-bold tracking-tight mt-2" style={{ color: '#2D2D2D' }}>UTE</h2>
      <p className="text-sm opacity-60" style={{ color: '#2D2D2D' }}>Unkomplizierte Theken Eingabe</p>
    </div>
  )
}
