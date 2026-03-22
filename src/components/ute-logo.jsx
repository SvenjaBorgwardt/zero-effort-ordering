// UTE Logo – handgezeichnetes Croissant von Rebecca

export function UTELogo({ size = 40, showText = false, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/ute-logo.png"
        alt="UTE Logo"
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-extrabold tracking-tight" style={{ color: '#1A1333' }}>UTE</span>
          <span className="text-[0.6rem] font-medium -mt-0.5" style={{ color: '#6E6589' }}>Unkomplizierte Theken Eingabe</span>
        </div>
      )}
    </div>
  )
}

// Größere Version für Login-Screen – Croissant als großer Hintergrund hinter der Schrift
export function UTELogoLarge({ className = '' }) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Croissant als großes Hintergrund-Element – responsive skaliert */}
      <img
        src="/ute-logo.png"
        alt=""
        aria-hidden="true"
        className="absolute pointer-events-none select-none w-[220px] h-[220px] sm:w-[320px] sm:h-[320px] md:w-[420px] md:h-[420px]"
        style={{
          objectFit: 'contain',
          opacity: 0.08,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* Text im Vordergrund – responsive Schriftgrößen */}
      <h2 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight relative" style={{ color: '#1A1333' }}>UTE</h2>
      <p className="text-lg sm:text-xl md:text-2xl font-medium mt-1 relative" style={{ color: '#6E6589' }}>Unkomplizierte Theken Eingabe</p>
    </div>
  )
}
