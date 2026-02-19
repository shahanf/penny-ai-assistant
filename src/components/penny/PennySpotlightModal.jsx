import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PennyAvatar from '../PennyAvatar'
import PennyMessage from './PennyMessage'
import PennyTypingIndicator from './PennyTypingIndicator'
import PennyListExpandedPanel from './PennyListExpandedPanel'
import { processQueryWithAI } from '../../services/pennyAIService'
import { resetConversationContext } from '../../utils/pennyQueryProcessor'
import { getRotatingExampleQuestions, PENNY_EXAMPLE_ROTATE_MS } from '../../constants/pennyExampleQuestions'
import pennyDataService from '../../services/pennyDataService'

// Confetti particle component
function ConfettiParticle({ delay, duration, left, size, color }) {
  return (
    <div
      className="absolute rounded-full animate-confetti-fall pointer-events-none"
      style={{
        left: `${left}%`,
        top: '-10px',
        width: size,
        height: size,
        backgroundColor: color,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        boxShadow: `0 0 6px ${color}`,
      }}
    />
  )
}

// Generate confetti particles
function generateConfetti(count = 40) {
  const colors = [
    'rgba(168, 85, 247, 1)', // purple
    'rgba(139, 92, 246, 1)', // violet
    'rgba(192, 132, 252, 1)', // light purple
    'rgba(236, 72, 153, 0.9)', // pink
    'rgba(99, 102, 241, 0.9)', // indigo
  ]
  
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: Math.random() * 5,
    duration: 12 + Math.random() * 8,
    left: Math.random() * 100,
    size: `${4 + Math.random() * 5}px`,
    color: colors[Math.floor(Math.random() * colors.length)],
  }))
}

function PennySpotlightModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [confetti] = useState(() => generateConfetti(50))
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedList, setExpandedList] = useState(null)
  const [isDancing, setIsDancing] = useState(false)
  const [entranceType, setEntranceType] = useState('bounce')
  const [parachuteDetached, setParachuteDetached] = useState(false)
  const [scooterHidden, setScooterHidden] = useState(false)
  const [vaultDoorOpen, setVaultDoorOpen] = useState(false)
  const [carHidden, setCarHidden] = useState(false)
  const [parasailDetached, setParasailDetached] = useState(false)
  // No localStorage - conversations are session-only for data privacy
  const [conversations, setConversations] = useState([])
  const [promptRotationIndex, setPromptRotationIndex] = useState(0)
  const [randomExampleEmployeeName, setRandomExampleEmployeeName] = useState(null)
  const [randomExampleCompanyName, setRandomExampleCompanyName] = useState(null)
  const [randomExamplePartnershipName, setRandomExamplePartnershipName] = useState(null)
  const [companyNames, setCompanyNames] = useState([])
  const [employeeNames, setEmployeeNames] = useState([])
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const lastUserMessageRef = useRef(null)
  const listOpenCursorTimeoutRef = useRef(null)

  // Rotate "More questions" every 20 seconds (show 6 at a time)
  useEffect(() => {
    const interval = setInterval(() => setPromptRotationIndex(prev => prev + 1), PENNY_EXAMPLE_ROTATE_MS)
    return () => clearInterval(interval)
  }, [])

  // Pick a random employee, company, and partnership for example prompts when modal opens; load all names for clickable links
  useEffect(() => {
    if (!isOpen) return
    Promise.all([
      pennyDataService.getRandomEmployeeName(),
      pennyDataService.getRandomCompanyName(),
      pennyDataService.getRandomPartnershipName(),
      pennyDataService.getAllCompanies(),
      pennyDataService.getAllEmployees(),
    ]).then(([employeeName, companyName, partnershipName, companies, employees]) => {
      if (employeeName) setRandomExampleEmployeeName(employeeName)
      if (companyName) setRandomExampleCompanyName(companyName)
      if (partnershipName) setRandomExamplePartnershipName(partnershipName)
      setCompanyNames((companies || []).map(c => (c && c.company) ? String(c.company).trim() : '').filter(Boolean))
      setEmployeeNames((employees || []).map(e => (e && e.full_name) ? String(e.full_name).trim() : '').filter(Boolean).slice(0, 2500))
    }).catch(() => {})
  }, [isOpen])

  // Entrance animation types (including vault, car, parasail)
  const entranceTypes = ['parachute', 'scooter', 'walk-right', 'vault', 'car', 'parasail']

  // Pick random entrance animation when modal opens
  useEffect(() => {
    if (isOpen) {
      const randomEntrance = entranceTypes[Math.floor(Math.random() * entranceTypes.length)]
      setEntranceType(randomEntrance)
      setParachuteDetached(false)
      setScooterHidden(false)
      setVaultDoorOpen(false)
      setCarHidden(false)
      setParasailDetached(false)
      
      if (randomEntrance === 'parachute') {
        setTimeout(() => setParachuteDetached(true), 1500)
      }
      if (randomEntrance === 'scooter') {
        setTimeout(() => setScooterHidden(true), 1200)
      }
      if (randomEntrance === 'vault') {
        setTimeout(() => setVaultDoorOpen(true), 1200)
      }
      if (randomEntrance === 'car') {
        setTimeout(() => setCarHidden(true), 1400)
      }
      if (randomEntrance === 'parasail') {
        setTimeout(() => setParasailDetached(true), 1600)
      }
    }
  }, [isOpen])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Auto-scroll: scroll to the user's last message so their question stays visible at top
  useEffect(() => {
    if (isTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else if (lastUserMessageRef.current) {
      requestAnimationFrame(() => {
        lastUserMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [messages, isTyping])

  // Thinking Penny cursor while processing
  useEffect(() => {
    if (isTyping) {
      document.body.classList.add('penny-thinking-cursor')
    } else {
      document.body.classList.remove('penny-thinking-cursor')
    }
    return () => document.body.classList.remove('penny-thinking-cursor')
  }, [isTyping])

  // Happy Penny cursor when opening full list: show immediately on click, remove when sidebar has opened (after paint)
  useEffect(() => {
    if (expandedList) {
      document.body.classList.add('penny-thinking-cursor')
      listOpenCursorTimeoutRef.current = requestAnimationFrame(() => {
        listOpenCursorTimeoutRef.current = requestAnimationFrame(() => {
          document.body.classList.remove('penny-thinking-cursor')
          listOpenCursorTimeoutRef.current = null
        })
      })
    } else {
      document.body.classList.remove('penny-thinking-cursor')
      if (listOpenCursorTimeoutRef.current != null) {
        cancelAnimationFrame(listOpenCursorTimeoutRef.current)
        listOpenCursorTimeoutRef.current = null
      }
    }
    return () => {
      document.body.classList.remove('penny-thinking-cursor')
      if (listOpenCursorTimeoutRef.current != null) {
        cancelAnimationFrame(listOpenCursorTimeoutRef.current)
      }
    }
  }, [expandedList])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // No localStorage persistence - data privacy (conversations cleared on refresh)

  // Idle dancing timer - starts dancing after 15 seconds of inactivity
  useEffect(() => {
    if (!isOpen) {
      setIsDancing(false)
      return
    }
    
    // Reset dancing state on any activity
    setIsDancing(false)
    
    const timer = setTimeout(() => {
      // Only dance if not currently typing and no query in progress
      if (!isTyping) {
        setIsDancing(true)
      }
    }, 15000) // 15 seconds
    
    return () => clearTimeout(timer)
  }, [isOpen, query, messages, isTyping, showHistory])

  const handleClose = () => {
    // Save current conversation if there are messages
    if (messages.length > 0) {
      const firstUserMessage = messages.find(m => m.type === 'user')
      const newConversation = {
        id: Date.now(),
        preview: firstUserMessage?.content || 'Conversation',
        timestamp: new Date().toISOString(),
        messages: messages,
      }
      setConversations(prev => [newConversation, ...prev].slice(0, 10)) // Keep last 10
    }
    // Reset state
    setMessages([])
    setShowHistory(false)
    resetConversationContext()
    onClose()
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const queryText = query.trim()
    if (!queryText) return

    // Add user message
    const userMessage = { id: Date.now(), type: 'user', content: queryText }
    setMessages(prev => [...prev, userMessage])
    setQuery('')
    setIsTyping(true)

    // Build conversation history for context
    const conversationHistory = messages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    try {
      const response = await processQueryWithAI(queryText, conversationHistory)

      setIsTyping(false)

      const pennyMessage = {
        id: Date.now() + 1,
        type: 'penny',
        content: response.text,
        richContent: response.richContent,
        actions: response.actions,
        suggestions: response.suggestions,
        followUp: response.followUp,
      }
      setMessages(prev => [...prev, pennyMessage])

      // Auto-execute navigation if specified
      if (response.actions) {
        const autoAction = response.actions.find(a => a.autoExecute && a.type === 'navigate')
        if (autoAction) {
          setTimeout(() => {
            navigate(autoAction.target)
            handleClose()
          }, 500)
        }
      }
    } catch (error) {
      console.error('Penny query error:', error)
      setIsTyping(false)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'penny',
        content: "I'm sorry, I encountered an error. Please try asking your question in a different way.",
      }])
    }
  }

  const handlePromptClick = (promptText) => {
    setQuery(promptText)
    // Submit after a brief moment
    setTimeout(() => {
      const userMessage = { id: Date.now(), type: 'user', content: promptText }
      setMessages(prev => [...prev, userMessage])
      setQuery('')
      submitQuery(promptText)
    }, 100)
  }

  const submitQuery = async (queryText) => {
    setIsTyping(true)

    const conversationHistory = messages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    try {
      const response = await processQueryWithAI(queryText, conversationHistory)

      setIsTyping(false)

      const pennyMessage = {
        id: Date.now() + 1,
        type: 'penny',
        content: response.text,
        richContent: response.richContent,
        actions: response.actions,
        suggestions: response.suggestions,
        followUp: response.followUp,
      }
      setMessages(prev => [...prev, pennyMessage])
    } catch (error) {
      console.error('Penny query error:', error)
      setIsTyping(false)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'penny',
        content: "I'm sorry, I encountered an error. Please try again.",
      }])
    }
  }

  const handleAction = async (action) => {
    if (action.type === 'navigate') {
      navigate(action.target)
      handleClose()
    } else if (action.type === 'suggestion') {
      handlePromptClick(action.text)
    } else if (action.type === 'show-table' && action.data === 'outstanding') {
      const breakdownPrompt = 'Show me the outstanding balance breakdown by employee'
      const userMessage = { id: Date.now(), type: 'user', content: breakdownPrompt }
      setMessages(prev => [...prev, userMessage])
      setIsTyping(true)
      try {
        const response = await processQueryWithAI(breakdownPrompt, [])
        setIsTyping(false)
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'penny',
          content: response.text,
          richContent: response.richContent,
          actions: response.actions,
          suggestions: response.suggestions,
          followUp: response.followUp,
        }])
      } catch (error) {
        console.error('Penny query error:', error)
        setIsTyping(false)
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'penny',
          content: "I'm sorry, I encountered an error. Please try again.",
        }])
      }
    } else if (action.type === 'show-table' && action.data === 'companies') {
      handlePromptClick('List companies by adoption')
    }
  }

  const loadConversation = (conversationId) => {
    const conv = conversations.find(c => c.id === conversationId)
    if (conv) {
      setMessages(conv.messages)
      setShowHistory(false)
    }
  }

  const startNewConversation = () => {
    // Save current conversation if there are messages
    if (messages.length > 0) {
      const firstUserMessage = messages.find(m => m.type === 'user')
      const newConversation = {
        id: Date.now(),
        preview: firstUserMessage?.content || 'Conversation',
        timestamp: new Date().toISOString(),
        messages: messages,
      }
      setConversations(prev => [newConversation, ...prev].slice(0, 10))
    }
    setMessages([])
    setShowHistory(false)
    resetConversationContext()
  }

  if (!isOpen) return null

  const hasMessages = messages.length > 0

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop with blur — close list first if open, otherwise close modal */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
        onClick={expandedList ? () => setExpandedList(null) : handleClose}
      />
      
      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((particle) => (
          <ConfettiParticle key={particle.id} {...particle} />
        ))}
      </div>

      {/* Main modal: chat + optional expanded list panel */}
      <div 
        className={`relative flex items-stretch gap-0 w-full mx-4 animate-spotlight-enter ${expandedList ? 'max-w-[95vw]' : 'max-w-2xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`relative w-full max-w-2xl flex-shrink-0 ${expandedList ? 'cursor-pointer' : ''}`}
          onClick={expandedList ? (e) => { e.stopPropagation(); setExpandedList(null); } : undefined}
          role={expandedList ? 'button' : undefined}
          aria-label={expandedList ? 'Close full list and return to chat' : undefined}
        >
          {/* Purple glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-purple-500/20 
                          rounded-3xl blur-2xl animate-pulse-slow" />
          
          {/* Modal content — frosted glass */}
          <div className={`relative bg-white/70 backdrop-blur-2xl rounded-2xl shadow-2xl
                          border border-white/50 overflow-hidden flex flex-col max-h-[80vh] ${expandedList ? 'rounded-r-none' : ''}`}>
          {/* Top shine */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          
          {/* Header with Penny */}
          <div className="relative px-6 pt-6 pb-4 flex-shrink-0">
            {/* Action buttons - positioned absolutely on the right */}
            <div className="absolute right-6 top-6 flex items-center gap-2">
              {hasMessages && (
                <button
                  onClick={startNewConversation}
                  className="text-sm text-slate-500 hover:text-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  New Chat
                </button>
              )}
              {conversations.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    showHistory 
                      ? 'text-purple-600 bg-purple-50' 
                      : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Centered Penny and title */}
            <div className="flex flex-col items-center justify-center">
              <div className={`relative mb-2 animate-penny-${entranceType}-in`}>
                <div className="absolute -inset-3 bg-purple-400/20 rounded-full blur-md animate-pulse" />
                
                {/* Parachute prop - z-20 so it appears above Penny */}
                {entranceType === 'parachute' && !parachuteDetached && (
                  <svg className="absolute -top-12 left-1/2 -translate-x-1/2 w-16 h-12 z-20 pointer-events-none" viewBox="0 0 64 48">
                    <path d="M 32 48 L 8 20 Q 8 2 32 2 Q 56 2 56 20 L 32 48" fill="#f472b6" stroke="#ec4899" strokeWidth="2" />
                    <path d="M 32 2 Q 32 20 32 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" />
                    <path d="M 20 6 Q 20 20 24 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" />
                    <path d="M 44 6 Q 44 20 40 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" />
                    <line x1="8" y1="20" x2="32" y2="48" stroke="#a855f7" strokeWidth="1.5" />
                    <line x1="56" y1="20" x2="32" y2="48" stroke="#a855f7" strokeWidth="1.5" />
                    <line x1="32" y1="2" x2="32" y2="48" stroke="#a855f7" strokeWidth="1.5" opacity="0.5" />
                  </svg>
                )}
                
                {/* Parachute detaching and floating away */}
                {entranceType === 'parachute' && parachuteDetached && (
                  <svg className="absolute -top-12 left-1/2 -translate-x-1/2 w-16 h-12 z-20 pointer-events-none animate-parachute-detach" viewBox="0 0 64 48">
                    <path d="M 32 48 L 8 20 Q 8 2 32 2 Q 56 2 56 20 L 32 48" fill="#f472b6" stroke="#ec4899" strokeWidth="2" />
                    <path d="M 32 2 Q 32 20 32 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" />
                    <path d="M 20 6 Q 20 20 24 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" />
                    <path d="M 44 6 Q 44 20 40 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" />
                  </svg>
                )}
                
                {/* Scooter prop - Penny rides on it, then it disappears */}
                {entranceType === 'scooter' && !scooterHidden && (
                  <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10" viewBox="0 0 96 40">
                    <rect x="20" y="24" width="48" height="6" rx="2" fill="#64748b" stroke="#475569" strokeWidth="1" />
                    <rect x="60" y="6" width="4" height="22" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
                    <rect x="54" y="4" width="16" height="4" rx="2" fill="#475569" />
                    <rect x="52" y="3" width="4" height="5" rx="1" fill="#1f2937" />
                    <rect x="68" y="3" width="4" height="5" rx="1" fill="#1f2937" />
                    <g>
                      <circle cx="28" cy="34" r="6" fill="#374151" stroke="#1f2937" strokeWidth="2" />
                      <circle cx="28" cy="34" r="2" fill="#6b7280" />
                      <g stroke="#6b7280" strokeWidth="1">
                        <line x1="28" y1="28" x2="28" y2="40">
                          <animateTransform attributeName="transform" type="rotate" from="0 28 34" to="360 28 34" dur="0.3s" repeatCount="4" />
                        </line>
                        <line x1="22" y1="34" x2="34" y2="34">
                          <animateTransform attributeName="transform" type="rotate" from="0 28 34" to="360 28 34" dur="0.3s" repeatCount="4" />
                        </line>
                      </g>
                    </g>
                    <g>
                      <circle cx="64" cy="34" r="6" fill="#374151" stroke="#1f2937" strokeWidth="2" />
                      <circle cx="64" cy="34" r="2" fill="#6b7280" />
                      <g stroke="#6b7280" strokeWidth="1">
                        <line x1="64" y1="28" x2="64" y2="40">
                          <animateTransform attributeName="transform" type="rotate" from="0 64 34" to="360 64 34" dur="0.3s" repeatCount="4" />
                        </line>
                        <line x1="58" y1="34" x2="70" y2="34">
                          <animateTransform attributeName="transform" type="rotate" from="0 64 34" to="360 64 34" dur="0.3s" repeatCount="4" />
                        </line>
                      </g>
                    </g>
                  </svg>
                )}

                {/* Bank vault - door slides open left, Penny steps out in front */}
                {entranceType === 'vault' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <div
                      className="absolute left-1/2 transition-all duration-[1.6s] ease-out"
                      style={{
                        width: 80,
                        height: 70,
                        transform: vaultDoorOpen ? 'translateX(calc(-50% - 90px))' : 'translateX(-50%)',
                        opacity: vaultDoorOpen ? 0 : 1,
                      }}
                    >
                      <svg viewBox="0 0 80 70" className="w-full h-full drop-shadow-md" aria-hidden>
                        <defs>
                          <linearGradient id="vault-metal-spotlight" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#64748b" />
                            <stop offset="50%" stopColor="#475569" />
                            <stop offset="100%" stopColor="#334155" />
                          </linearGradient>
                        </defs>
                        <rect x="4" y="8" width="72" height="54" rx="8" fill="url(#vault-metal-spotlight)" stroke="#475569" strokeWidth="2" />
                        <circle cx="40" cy="35" r="12" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                        <circle cx="40" cy="35" r="6" fill="#64748b" />
                        <line x1="40" y1="29" x2="40" y2="41" stroke="#94a3b8" strokeWidth="1" />
                        <line x1="34" y1="35" x2="46" y2="35" stroke="#94a3b8" strokeWidth="1" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Red car - Penny drives in, then car disappears */}
                {entranceType === 'car' && !carHidden && (
                  <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-12" viewBox="0 0 112 48">
                    <rect x="12" y="20" width="72" height="20" rx="4" fill="#dc2626" stroke="#b91c1c" strokeWidth="1.5" />
                    <rect x="20" y="12" width="36" height="14" rx="2" fill="#fef2f2" stroke="#fecaca" strokeWidth="1" />
                    <circle cx="32" cy="42" r="6" fill="#1f2937" stroke="#111827" strokeWidth="1.5" />
                    <circle cx="32" cy="42" r="2" fill="#6b7280" />
                    <circle cx="80" cy="42" r="6" fill="#1f2937" stroke="#111827" strokeWidth="1.5" />
                    <circle cx="80" cy="42" r="2" fill="#6b7280" />
                    <g stroke="#6b7280" strokeWidth="1">
                      <line x1="32" y1="36" x2="32" y2="48">
                        <animateTransform attributeName="transform" type="rotate" from="0 32 42" to="360 32 42" dur="0.25s" repeatCount="indefinite" />
                      </line>
                      <line x1="80" y1="36" x2="80" y2="48">
                        <animateTransform attributeName="transform" type="rotate" from="0 80 42" to="360 80 42" dur="0.25s" repeatCount="indefinite" />
                      </line>
                    </g>
                  </svg>
                )}

                {/* Parasail - Penny parasails in, then canopy detaches */}
                {entranceType === 'parasail' && !parasailDetached && (
                  <svg className="absolute -top-14 left-1/2 -translate-x-1/2 w-20 h-16" viewBox="0 0 80 64">
                    <path d="M 40 56 Q 8 24 16 8 Q 40 4 64 8 Q 72 24 40 56" fill="#38bdf8" stroke="#0ea5e9" strokeWidth="2" />
                    <path d="M 40 56 L 24 20 M 40 56 L 40 16 M 40 56 L 56 20" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
                {entranceType === 'parasail' && parasailDetached && (
                  <svg className="absolute -top-14 left-1/2 -translate-x-1/2 w-20 h-16 animate-parasail-detach" viewBox="0 0 80 64">
                    <path d="M 40 56 Q 8 24 16 8 Q 40 4 64 8 Q 72 24 40 56" fill="#38bdf8" stroke="#0ea5e9" strokeWidth="2" />
                  </svg>
                )}
                
                <div className="relative z-10">
                  <PennyAvatar size={56} id="spotlight-modal" isWaving={!hasMessages && !query && !isDancing} isHappy={query.length > 0} isDancing={isDancing} />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-slate-800">Ask Penny</h2>
              <p className="text-sm text-slate-500">CS and Delivery Assistant</p>
            </div>
          </div>

          {/* Messages Area */}
          {(hasMessages || showHistory) && (
            <div className="flex-1 overflow-y-auto px-6 min-h-[200px] max-h-[350px]">
              {showHistory ? (
                <div className="py-2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Previous Conversations</h4>
                  {conversations.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No previous conversations</p>
                  ) : (
                    <div className="space-y-2">
                      {conversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => loadConversation(conv.id)}
                          className="w-full text-left p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-200 hover:bg-purple-50 transition-colors"
                        >
                          <p className="text-sm text-gray-700 truncate">{conv.preview}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(conv.timestamp).toLocaleDateString()}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-2 space-y-3">
                  {messages.map((message, idx) => {
                    const isLastUser = message.type === 'user' && !messages.slice(idx + 1).some(m => m.type === 'user')
                    return (
                      <div key={message.id} ref={isLastUser ? lastUserMessageRef : undefined}>
                        <PennyMessage
                          message={message}
                          onAction={handleAction}
                          onExpandList={(list) => {
                            document.body.classList.add('penny-thinking-cursor')
                            setExpandedList(list)
                          }}
                          companyNames={companyNames}
                          employeeNames={employeeNames}
                          onEmployeeClick={(name) => handlePromptClick('Tell me about ' + name)}
                          onCompanyClick={(name) => handlePromptClick('Show company stats for ' + name)}
                        />
                      </div>
                    )
                  })}
                  {isTyping && <PennyTypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}

          {/* Input and Prompts Area */}
          <div className="relative px-6 pb-5 pt-3 flex-shrink-0">
            {/* Search input */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative group">
                {/* Input glow on focus */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 
                                rounded-xl opacity-0 group-focus-within:opacity-50 blur-md transition-opacity duration-300" />
                
                <div className="relative flex items-center bg-white/60 backdrop-blur-lg rounded-2xl border border-white/70
                                group-focus-within:border-purple-300/80 shadow-sm group-focus-within:shadow-purple-300/25
                                transition-all duration-300">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={hasMessages ? "Ask a follow-up question..." : "Ask me anything about your employees, transfers, savings..."}
                    className="flex-1 px-5 py-3 text-base sm:text-sm bg-transparent outline-none text-slate-800
                               placeholder:text-slate-400"
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!query.trim() || isTyping}
                    className="mr-2 p-2.5 bg-gradient-to-r from-purple-500 to-fuchsia-500
                               hover:from-purple-400 hover:to-fuchsia-400
                               disabled:from-slate-300 disabled:to-slate-300
                               text-white rounded-xl transition-all duration-200
                               disabled:cursor-not-allowed shadow-md shadow-purple-500/20
                               hover:shadow-lg hover:shadow-purple-500/30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                            d="M6 12h12m0 0l-5-5m5 5l-5 5" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>

            {/* Sample prompts below search - always visible */}
            {!showHistory && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  {hasMessages ? 'More questions' : 'Try asking'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {getRotatingExampleQuestions(promptRotationIndex, randomExampleEmployeeName ? [randomExampleEmployeeName] : [], randomExampleCompanyName ? [randomExampleCompanyName] : [], randomExamplePartnershipName ? [randomExamplePartnershipName] : []).map((prompt, idx) => (
                    <button
                      key={`${promptRotationIndex}-${idx}-${prompt.text}`}
                      onClick={() => handlePromptClick(prompt.text)}
                      disabled={isTyping}
                      className="
                        flex items-start gap-1.5 px-2.5 py-2
                        bg-white/40 hover:bg-white/60
                        border border-white/50 hover:border-purple-200/60
                        backdrop-blur-sm
                        rounded-lg text-gray-700 hover:text-purple-700
                        transition-all duration-200
                        text-left
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      <span className="text-sm flex-shrink-0 mt-0.5">{prompt.icon}</span>
                      <span className="line-clamp-2 text-xs leading-relaxed">{prompt.displayText ?? prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard hint */}
            <p className="mt-3 text-center text-xs text-slate-400">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono">Enter</kbd> to ask 
              or <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
        </div>

        {expandedList && (
          <div className="w-[64rem] min-w-[56rem] max-w-[90vw] max-h-[80vh] flex-shrink-0 rounded-r-2xl overflow-hidden border border-l-0 border-white/50 shadow-2xl bg-white/70 backdrop-blur-2xl">
            <PennyListExpandedPanel
              richContent={expandedList}
              title={expandedList?.title ?? 'Full list'}
              onClose={() => setExpandedList(null)}
              onEmployeeClick={(name) => {
                handlePromptClick('Tell me about ' + name)
                setExpandedList(null)
              }}
              onCompanyClick={(name) => {
                handlePromptClick('Show company stats for ' + name)
                setExpandedList(null)
              }}
              companyNames={companyNames}
            />
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.9;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        @keyframes spotlight-enter {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .animate-confetti-fall {
          animation: confetti-fall linear infinite;
        }
        
        .animate-spotlight-enter {
          animation: spotlight-enter 0.3s ease-out forwards;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default PennySpotlightModal
