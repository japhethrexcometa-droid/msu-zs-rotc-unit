import { Shield } from 'lucide-react'

export default function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-rotc-bg">
      {/* Animated shield icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-rotc-accent/20 animate-ping" />
        <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-rotc-card border border-rotc-border">
          <Shield className="h-8 w-8 text-rotc-accent animate-pulse" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-xl font-semibold text-rotc-text mb-1">MSU-ZS ROTC</h1>
      <p className="text-sm text-rotc-textMuted">Loading...</p>

      {/* Spinner bar */}
      <div className="mt-6 w-48 h-1 bg-rotc-border rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-rotc-accent rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
          style={{
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  )
}
