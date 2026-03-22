// UTE Logo – handgezeichnetes Croissant von Rebecca

export function UTELogo({ size = 40, showText = false, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/ute-logo.png"
        alt="UTE Logo"
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
      />
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight" style={{ color: '#1E1B2E' }}>UTE</span>
          <span className="text-[0.55em] opacity-60 -mt-1" style={{ color: '#1E1B2E' }}>Unkomplizierte Theken Eingabe</span>
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
      <h2 className="text-3xl font-bold tracking-tight mt-2" style={{ color: '#1E1B2E' }}>UTE</h2>
      <p className="text-sm opacity-60" style={{ color: '#1E1B2E' }}>Unkomplizierte Theken Eingabe</p>
    </div>
  )
}
