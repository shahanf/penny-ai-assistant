import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { usePennyChat } from '../../context/PennyChatContext'
import PennyAvatar from '../PennyAvatar'
import PennySpotlightModal from './PennySpotlightModal'

function PennySearchBar() {
  const { isOpen } = usePennyChat()
  const location = useLocation()
  const [isGlowing, setIsGlowing] = useState(true)
  const [showSpotlight, setShowSpotlight] = useState(false)

  // Reset glow effect when navigating to a new page
  useEffect(() => {
    setIsGlowing(true)

    // Stop glowing after 3 seconds
    const timer = setTimeout(() => {
      setIsGlowing(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [location.pathname])

  // Stop glowing when chat is opened
  useEffect(() => {
    if (isOpen || showSpotlight) {
      setIsGlowing(false)
    }
  }, [isOpen, showSpotlight])

  const handleSearchBarClick = () => {
    setShowSpotlight(true)
  }

  const handleSpotlightClose = () => {
    setShowSpotlight(false)
  }

  return (
    <>
      <button
        onClick={handleSearchBarClick}
        className={`
          flex items-center gap-3 px-4 py-3 w-full sm:w-auto sm:min-w-[280px] md:min-w-[320px]
          bg-white rounded-xl border-2
          hover:border-purple-400 hover:shadow-lg
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
          transition-all duration-300 cursor-pointer
          ${showSpotlight
            ? 'border-purple-500 shadow-lg ring-2 ring-purple-500 ring-offset-2'
            : isGlowing
              ? 'border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse-glow'
              : 'border-gray-200'
          }
        `}
        aria-label="Ask Penny AI Assistant"
      >
        {/* Penny Icon */}
        <div className="w-8 h-8 flex-shrink-0">
          <PennyAvatar size={32} id="search-bar" isWaving={showSpotlight || isGlowing} />
        </div>

        {/* Placeholder text */}
        <span className={`text-base whitespace-nowrap transition-colors duration-300 ${isGlowing ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
          Ask Penny anything...
        </span>

        {/* Sparkle icon when glowing */}
        {isGlowing && (
          <span className="ml-auto text-purple-500 animate-bounce">
            ✨
          </span>
        )}
      </button>

      {/* Spotlight Modal */}
      <PennySpotlightModal
        isOpen={showSpotlight}
        onClose={handleSpotlightClose}
      />
    </>
  )
}

export default PennySearchBar
