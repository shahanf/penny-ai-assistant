import { useState, useEffect, useRef } from 'react'
import PennyAvatar from '../PennyAvatar'

const LOADING_MESSAGES = [
  'Counting all the pennies...',
  'Polishing my coin collection...',
  'Rounding up the employees...',
  'Crunching the numbers...',
  'Checking every payroll...',
  'Reading the balance sheets...',
  'Warming up my circuits...',
]

export default function PennyLoadingScreen({ isReady, onTransitionDone }) {
  const [messageIdx, setMessageIdx] = useState(0)
  const [messageFading, setMessageFading] = useState(false)
  const [exiting, setExiting] = useState(false)
  const exitTimerRef = useRef(null)

  // Rotate loading messages every 2.5s
  useEffect(() => {
    if (isReady) return // stop rotating once ready
    const interval = setInterval(() => {
      setMessageFading(true)
      setTimeout(() => {
        setMessageIdx(prev => (prev + 1) % LOADING_MESSAGES.length)
        setMessageFading(false)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [isReady])

  // When ready, quickly fade out (minimal delay — bootstrap is fast)
  useEffect(() => {
    if (!isReady) return
    exitTimerRef.current = setTimeout(() => {
      setExiting(true)
      // After exit animation completes, notify parent
      setTimeout(() => {
        onTransitionDone?.()
      }, 200)
    }, 100)
    return () => clearTimeout(exitTimerRef.current)
  }, [isReady, onTransitionDone])

  const displayMessage = isReady ? "Ready! Let's go!" : LOADING_MESSAGES[messageIdx]

  return (
    <div
      className={`flex flex-col items-center justify-center ${exiting ? 'animate-loading-exit' : ''}`}
      style={{ minHeight: '300px' }}
    >
      {/* Pulsing glow behind Penny */}
      <div className="relative mb-4">
        <div className="absolute -inset-4 bg-purple-400/25 rounded-full blur-xl animate-pulse" />
        <div className="relative animate-penny-loading-bounce">
          <PennyAvatar
            size={80}
            id="loading-screen"
            isDancing={!isReady}
            isHappy={isReady}
            isWaving={isReady}
          />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-semibold text-white mb-2 drop-shadow-lg">
        {isReady ? 'Hi, I\'m Penny!' : 'Penny is getting ready...'}
      </h2>

      {/* Rotating message */}
      <p
        className={`text-sm text-purple-200 h-6 transition-opacity duration-300 ${
          messageFading ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {displayMessage}
      </p>

      {/* Bouncing dots (same pattern as PennyTypingIndicator) */}
      {!isReady && (
        <div className="flex items-center gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
