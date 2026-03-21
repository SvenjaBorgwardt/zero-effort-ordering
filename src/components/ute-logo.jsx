// Simple UTE Logo with text
export function UTELogo({ className = '', size = 40, showText = false }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Croissant image from UTE branding */}
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gemini_Generated_Image_mmgdcjmmgdcjmmgd-8k1VzEIYhVIjShYKjoRDfMASbJkbQ8.png"
        alt="UTE Croissant Logo"
        width={size * 1.5}
        height={size}
        className="object-contain"
      />
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-ute-charcoal">UTE</span>
          <span className="text-xs text-ute-taupe -mt-1">Unkomplizierte Theken Eingabe</span>
        </div>
      )}
    </div>
  )
}

// Animated mascot version with eyes above the croissant image
export function UTEMascot({ className = '', size = 200 }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Animated eyes and eyebrows only */}
      <svg
        width={size * 0.5}
        height={size * 0.25}
        viewBox="0 0 100 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-ute-charcoal mb-[-20px] relative z-10"
      >
        {/* Left eye */}
        <g className="eye-blink" style={{ transformOrigin: '30px 30px' }}>
          <ellipse cx="30" cy="30" rx="6" ry="8" fill="currentColor" />
          <ellipse cx="32" cy="28" rx="2" ry="2.5" fill="white" />
        </g>

        {/* Right eye */}
        <g className="eye-blink" style={{ transformOrigin: '70px 30px', animationDelay: '0.1s' }}>
          <ellipse cx="70" cy="30" rx="6" ry="8" fill="currentColor" />
          <ellipse cx="72" cy="28" rx="2" ry="2.5" fill="white" />
        </g>

        {/* Left eyebrow */}
        <path
          className="eyebrow-left"
          d="M18 16 C24 12, 34 12, 42 16"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          style={{ transformOrigin: '30px 14px' }}
        />

        {/* Right eyebrow */}
        <path
          className="eyebrow-right"
          d="M58 16 C64 12, 74 12, 82 16"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          style={{ transformOrigin: '70px 14px' }}
        />
      </svg>

      {/* Croissant image from UTE branding */}
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gemini_Generated_Image_mmgdcjmmgdcjmmgd-8k1VzEIYhVIjShYKjoRDfMASbJkbQ8.png"
        alt="UTE Croissant"
        width={size}
        height={size * 0.6}
        className="object-contain"
      />

      <div className="text-center mt-4">
        <h2 className="text-2xl font-bold text-ute-charcoal tracking-tight">UTE</h2>
        <p className="text-sm text-ute-taupe">Unkomplizierte Theken Eingabe</p>
      </div>
    </div>
  )
}
