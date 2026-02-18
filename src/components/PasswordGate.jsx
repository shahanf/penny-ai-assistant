import { useState, useRef, useEffect } from 'react'
import PennyAvatar from './PennyAvatar'

export default function PasswordGate({ onAuthenticated }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    // Check if already authenticated this session
    if (sessionStorage.getItem('penny_auth') === 'true') {
      onAuthenticated()
      return
    }
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim() || isChecking) return

    setIsChecking(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })

      const data = await res.json()

      if (data.success) {
        sessionStorage.setItem('penny_auth', 'true')
        onAuthenticated()
      } else {
        setError('Incorrect password')
        setShake(true)
        setTimeout(() => setShake(false), 500)
        setPassword('')
        inputRef.current?.focus()
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Confetti-style ambient particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-confetti-fall pointer-events-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10px',
              width: `${4 + Math.random() * 4}px`,
              height: `${4 + Math.random() * 4}px`,
              backgroundColor: ['rgba(168,85,247,1)', 'rgba(139,92,246,1)', 'rgba(192,132,252,1)', 'rgba(236,72,153,0.9)', 'rgba(99,102,241,0.9)'][Math.floor(Math.random() * 5)],
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
              boxShadow: `0 0 6px rgba(168,85,247,0.5)`,
            }}
          />
        ))}
      </div>

      {/* Glow */}
      <div className="absolute -inset-4 bg-gradient-to-r from-purple-400/30 via-fuchsia-400/30 to-purple-400/30 rounded-3xl blur-2xl animate-pulse-slow" />

      {/* Card */}
      <div className={`relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-200/50 overflow-hidden w-full max-w-sm ${shake ? 'animate-shake' : ''}`}>
        {/* Inner glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none" />

        <div className="relative px-8 py-10 flex flex-col items-center">
          {/* Penny avatar */}
          <div className="relative mb-4">
            <div className="absolute -inset-3 bg-purple-400/20 rounded-full blur-md animate-pulse" />
            <div className="relative z-10">
              <PennyAvatar size={64} id="password-gate" isWaving={!error} isHappy={password.length > 0} />
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-800 mb-1">Hi, I'm Penny!</h2>
          <p className="text-sm text-slate-500 mb-6">Enter the password to get started</p>

          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative group mb-4">
              {/* Input glow on focus */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 rounded-xl opacity-0 group-focus-within:opacity-50 blur-md transition-opacity duration-300" />

              <div className="relative flex items-center bg-white rounded-xl border-2 border-slate-200 group-focus-within:border-purple-400 shadow-sm group-focus-within:shadow-lg transition-all duration-300">
                {/* Lock icon */}
                <div className="pl-4 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>

                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Password"
                  className="flex-1 px-3 py-3 text-base sm:text-sm bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                  disabled={isChecking}
                  autoComplete="current-password"
                />

                <button
                  type="submit"
                  disabled={!password.trim() || isChecking}
                  className="mr-2 p-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 disabled:from-slate-300 disabled:to-slate-300 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {isChecking ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-center text-sm text-red-500 mb-2 animate-fade-in">{error}</p>
            )}
          </form>

          {/* Keyboard hint */}
          <p className="mt-1 text-center text-[10px] text-slate-400 hidden sm:block">
            Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">Enter</kbd> to continue
          </p>
        </div>
      </div>

      {/* Extra animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.8; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
