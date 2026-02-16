import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, useNavigate } from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { PennyChatProvider } from './context/PennyChatContext'
import PennyAvatar from './components/PennyAvatar'
import PennyMessage from './components/penny/PennyMessage'
import PennyTypingIndicator from './components/penny/PennyTypingIndicator'
import PennyListExpandedPanel from './components/penny/PennyListExpandedPanel'
import { processQueryWithAI } from './services/pennyAIService'
import { resetConversationContext } from './utils/pennyQueryProcessor'
import pennyDataService from './services/pennyDataService'
import { getRotatingExampleQuestions, PENNY_EXAMPLE_ROTATE_MS } from './constants/pennyExampleQuestions'

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

function PennyInterface() {
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
  const [hasEntered, setHasEntered] = useState(false)
  // No localStorage - conversations are session-only for data privacy
  const [conversations, setConversations] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [companyNames, setCompanyNames] = useState([])
  const [employeeNames, setEmployeeNames] = useState([])
  const [promptRotationIndex, setPromptRotationIndex] = useState(0)
  const [randomExampleEmployeeName, setRandomExampleEmployeeName] = useState(null)
  const [randomExampleCompanyName, setRandomExampleCompanyName] = useState(null)
  const [randomExamplePartnershipName, setRandomExamplePartnershipName] = useState(null)
  const inputRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Rotate "More questions" every 20 seconds (show 6 at a time)
  useEffect(() => {
    const interval = setInterval(() => {
      setPromptRotationIndex(prev => prev + 1)
    }, PENNY_EXAMPLE_ROTATE_MS)
    return () => clearInterval(interval)
  }, [])

  // Pick a random employee, company, and partnership for example prompts (once data is loaded)
  useEffect(() => {
    if (!dataLoaded) return
    Promise.all([
      pennyDataService.getRandomEmployeeName(),
      pennyDataService.getRandomCompanyName(),
      pennyDataService.getRandomPartnershipName(),
    ]).then(([employeeName, companyName, partnershipName]) => {
      if (employeeName) setRandomExampleEmployeeName(employeeName)
      if (companyName) setRandomExampleCompanyName(companyName)
      if (partnershipName) setRandomExamplePartnershipName(partnershipName)
    })
  }, [dataLoaded])

  // Entrance animation types
  const entranceTypes = ['parachute', 'scooter', 'walk-right', 'vault', 'car', 'parasail']

  // Pre-load CSV data on mount
  useEffect(() => {
    pennyDataService.initialize().then(() => {
      setDataLoaded(true)
      console.log('Penny data loaded successfully')
    }).catch(err => {
      console.error('Failed to load Penny data:', err)
      setDataLoaded(true) // Continue anyway
    })
  }, [])

  // Load company and employee names for clickable links (open info card in chat)
  useEffect(() => {
    if (!dataLoaded) return
    Promise.all([
      pennyDataService.getAllCompanies(),
      pennyDataService.getAllEmployees(),
    ]).then(([companies, employees]) => {
      const cNames = (companies || [])
        .map(c => (c && c.company) ? String(c.company).trim() : '')
        .filter(Boolean)
      setCompanyNames(cNames)
      const eNames = (employees || [])
        .map(e => (e && e.full_name) ? String(e.full_name).trim() : '')
        .filter(Boolean)
      setEmployeeNames(eNames.slice(0, 2500))
    }).catch(() => {
      setCompanyNames([])
      setEmployeeNames([])
    })
  }, [dataLoaded])

  // Play entrance animation on mount
  useEffect(() => {
    const randomEntrance = entranceTypes[Math.floor(Math.random() * entranceTypes.length)]
    setEntranceType(randomEntrance)

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

    setTimeout(() => setHasEntered(true), 2000)
  }, [])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 500)
    }
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Thinking Penny cursor while processing a query
  useEffect(() => {
    if (isTyping) {
      document.body.classList.add('penny-thinking-cursor')
    } else {
      document.body.classList.remove('penny-thinking-cursor')
    }
    return () => document.body.classList.remove('penny-thinking-cursor')
  }, [isTyping])

  // Happy Penny cursor when opening full list: show immediately on click, remove when sidebar has opened (after paint)
  const listOpenCursorRafRef = useRef(null)
  useEffect(() => {
    if (expandedList) {
      document.body.classList.add('penny-thinking-cursor')
      listOpenCursorRafRef.current = requestAnimationFrame(() => {
        listOpenCursorRafRef.current = requestAnimationFrame(() => {
          document.body.classList.remove('penny-thinking-cursor')
          listOpenCursorRafRef.current = null
        })
      })
    } else {
      document.body.classList.remove('penny-thinking-cursor')
      if (listOpenCursorRafRef.current != null) {
        cancelAnimationFrame(listOpenCursorRafRef.current)
        listOpenCursorRafRef.current = null
      }
    }
    return () => {
      document.body.classList.remove('penny-thinking-cursor')
      if (listOpenCursorRafRef.current != null) {
        cancelAnimationFrame(listOpenCursorRafRef.current)
      }
    }
  }, [expandedList])

  // No localStorage persistence - data privacy (conversations cleared on refresh)

  // Idle dancing timer
  useEffect(() => {
    setIsDancing(false)

    const timer = setTimeout(() => {
      if (!isTyping) {
        setIsDancing(true)
      }
    }, 15000)

    return () => clearTimeout(timer)
  }, [query, messages, isTyping, showHistory])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const queryText = query.trim()
    if (!queryText) return

    const userMessage = { id: Date.now(), type: 'user', content: queryText }
    setMessages(prev => [...prev, userMessage])
    setQuery('')
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
      if (response.richContent?.expandList) {
        setExpandedList(response.richContent.expandList)
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

  const handlePromptClick = (promptText, fromSuggestion = false) => {
    setQuery(promptText)
    setTimeout(() => {
      const userMessage = { id: Date.now(), type: 'user', content: promptText }
      setMessages(prev => [...prev, userMessage])
      setQuery('')
      submitQuery(promptText, { fromSuggestion })
    }, 100)
  }

  const submitQuery = async (queryText, options = {}) => {
    const { fromSuggestion } = options
    setIsTyping(true)

    const conversationHistory = messages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    try {
      const response = await processQueryWithAI(queryText, conversationHistory)

      setIsTyping(false)

      // When a suggestion click opens the sidebar, don't add any chat messages
      if (fromSuggestion && response.richContent?.expandList) {
        setExpandedList(response.richContent.expandList)
        setMessages(prev => prev.slice(0, -1)) // remove the user message we just added
        return
      }

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
      if (response.richContent?.expandList) {
        setExpandedList(response.richContent.expandList)
      }
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
    if (action.type === 'suggestion') {
      handlePromptClick(action.text, true)
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
        if (response.richContent?.expandList) {
          setExpandedList(response.richContent.expandList)
        }
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

  const hasMessages = messages.length > 0

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-2 sm:p-4">
      {/* Confetti layer */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {confetti.map((particle) => (
          <ConfettiParticle key={particle.id} {...particle} />
        ))}
      </div>

      {/* Main interface: chat card + optional expanded list panel */}
      <div className={`flex items-stretch gap-0 w-full min-w-0 ${expandedList ? 'max-w-[95vw] overflow-hidden' : 'max-w-4xl'} justify-center animate-spotlight-enter mx-auto`}>
        <div
          className={`relative flex-shrink-0 min-w-0 max-w-full ${expandedList ? 'w-full max-w-sm cursor-pointer' : 'w-full max-w-4xl'}`}
          onClick={expandedList ? () => setExpandedList(null) : undefined}
          role={expandedList ? 'button' : undefined}
          aria-label={expandedList ? 'Close full list and return to chat' : undefined}
        >
          {/* Purple glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-400/30 via-fuchsia-400/30 to-purple-400/30
                          rounded-3xl blur-2xl animate-pulse-slow" />

          {/* Modal content */}
          <div className={`relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl
                          border border-purple-200/50 overflow-hidden flex flex-col max-h-[90vh] ${expandedList ? 'rounded-r-none' : ''}`}>
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none" />

          {/* Header with Penny */}
          <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0">
            {/* Action buttons - positioned absolutely on the right */}
            <div className="absolute right-4 sm:right-6 top-4 sm:top-6 flex items-center gap-2">
              {hasMessages && (
                <button
                  onClick={startNewConversation}
                  className="text-base text-slate-500 hover:text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  New Chat
                </button>
              )}
              {conversations.length > 0 && (
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`text-base px-4 py-2 rounded-lg transition-colors ${
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
            </div>

            {/* Centered Penny and title */}
            <div className="flex flex-col items-center justify-center">
              <div className={`relative mb-2 animate-penny-${entranceType}-in`}>
                <div className="absolute -inset-3 bg-purple-400/20 rounded-full blur-md animate-pulse" />

                {/* Parachute prop */}
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

                {/* Parachute detaching */}
                {entranceType === 'parachute' && parachuteDetached && (
                  <svg className="absolute -top-12 left-1/2 -translate-x-1/2 w-16 h-12 z-20 pointer-events-none animate-parachute-detach" viewBox="0 0 64 48">
                    <path d="M 32 48 L 8 20 Q 8 2 32 2 Q 56 2 56 20 L 32 48" fill="#f472b6" stroke="#ec4899" strokeWidth="2" />
                    <path d="M 32 2 Q 32 20 32 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" />
                    <path d="M 20 6 Q 20 20 24 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" />
                    <path d="M 44 6 Q 44 20 40 20" stroke="#ec4899" strokeWidth="1" opacity="0.5" />
                  </svg>
                )}

                {/* Scooter prop */}
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
                    </g>
                    <g>
                      <circle cx="64" cy="34" r="6" fill="#374151" stroke="#1f2937" strokeWidth="2" />
                      <circle cx="64" cy="34" r="2" fill="#6b7280" />
                    </g>
                  </svg>
                )}

                {/* Bank vault */}
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

                {/* Red car */}
                {entranceType === 'car' && !carHidden && (
                  <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-12" viewBox="0 0 112 48">
                    <rect x="12" y="20" width="72" height="20" rx="4" fill="#dc2626" stroke="#b91c1c" strokeWidth="1.5" />
                    <rect x="20" y="12" width="36" height="14" rx="2" fill="#fef2f2" stroke="#fecaca" strokeWidth="1" />
                    <circle cx="32" cy="42" r="6" fill="#1f2937" stroke="#111827" strokeWidth="1.5" />
                    <circle cx="32" cy="42" r="2" fill="#6b7280" />
                    <circle cx="80" cy="42" r="6" fill="#1f2937" stroke="#111827" strokeWidth="1.5" />
                    <circle cx="80" cy="42" r="2" fill="#6b7280" />
                  </svg>
                )}

                {/* Parasail */}
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
                  <PennyAvatar size={56} id="main-interface" isWaving={!hasMessages && !query && !isDancing} isHappy={query.length > 0} isDancing={isDancing} />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-slate-800">Hi, I'm Penny!</h2>
              <p className="text-sm text-slate-500">Your AI-powered assistant</p>
            </div>
          </div>

          {/* Messages Area */}
          {(hasMessages || showHistory) && (
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto px-4 sm:px-6">
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
                <div className="py-3 pb-4 space-y-4">
                  {messages.map((message) => (
                    <PennyMessage
                      key={message.id}
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
                  ))}
                  {isTyping && <PennyTypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}

          {/* Input and Prompts Area */}
          <div className="relative px-4 sm:px-6 pb-4 pt-3 flex-shrink-0">
            {/* Search input */}
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative group">
                {/* Input glow on focus */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400
                                rounded-xl opacity-0 group-focus-within:opacity-50 blur-md transition-opacity duration-300" />

                <div className="relative flex items-center bg-white rounded-xl border-2 border-slate-200
                                group-focus-within:border-purple-400 shadow-sm group-focus-within:shadow-lg
                                transition-all duration-300">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={hasMessages ? "Ask a follow-up question..." : "Ask me anything..."}
                    className="flex-1 px-5 py-2.5 text-sm bg-transparent outline-none text-slate-800
                               placeholder:text-slate-400"
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!query.trim() || isTyping}
                    className="mr-2 p-2 bg-gradient-to-r from-purple-500 to-fuchsia-500
                               hover:from-purple-600 hover:to-fuchsia-600
                               disabled:from-slate-300 disabled:to-slate-300
                               text-white rounded-lg transition-all duration-200
                               disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </form>

            {/* Sample prompts below search */}
            {!showHistory && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {hasMessages ? 'More questions' : 'Try asking'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {getRotatingExampleQuestions(promptRotationIndex, randomExampleEmployeeName, randomExampleCompanyName, randomExamplePartnershipName).map((prompt, idx) => (
                    <button
                      key={`${promptRotationIndex}-${idx}-${prompt.text}`}
                      onClick={() => handlePromptClick(prompt.text)}
                      disabled={isTyping}
                      className="
                        flex items-start gap-2 px-3 py-2
                        bg-gray-50 hover:bg-purple-50
                        border border-gray-200 hover:border-purple-200
                        rounded-lg text-gray-700 hover:text-purple-700
                        transition-colors duration-150
                        text-left
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      <span className="text-sm flex-shrink-0">{prompt.icon}</span>
                      <span className="line-clamp-2 text-xs leading-snug">{prompt.displayText ?? prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyboard hint */}
            <p className="mt-2 text-center text-[10px] text-slate-400">
              Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-500 font-mono text-[10px]">Enter</kbd> to ask
            </p>
          </div>
        </div>
        </div>

        {expandedList && (
          <div className="flex-1 min-w-[min(18rem,45vw)] max-w-[70vw] max-h-[85vh] rounded-r-2xl overflow-hidden border border-l-0 border-purple-200/50 shadow-2xl bg-white">
            <PennyListExpandedPanel
              richContent={expandedList}
              title={expandedList.title ?? 'Full list'}
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

function App() {
  return (
    <PennyChatProvider>
      <Router>
        <PennyInterface />
        <SpeedInsights />
      </Router>
    </PennyChatProvider>
  )
}

export default App
