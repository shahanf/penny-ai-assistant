import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePennyChat } from '../../context/PennyChatContext'
import PennyAvatar from '../PennyAvatar'
import PennyMessage from './PennyMessage'
import PennyTypingIndicator from './PennyTypingIndicator'
import PennySamplePrompts from './PennySamplePrompts'
import PennyListExpandedPanel from './PennyListExpandedPanel'
import { processQueryWithAI } from '../../services/pennyAIService'
import pennyDataService from '../../services/pennyDataService'

function PennyChatDropdown() {
  const navigate = useNavigate()
  const {
    isOpen,
    closeChat,
    messages,
    addMessage,
    isTyping,
    setTyping,
    startNewConversation,
    conversations,
    loadConversation,
    showHistory,
    toggleHistory,
  } = usePennyChat()

  const [inputValue, setInputValue] = useState('')
  const [expandedList, setExpandedList] = useState(null)
  const [companyNames, setCompanyNames] = useState([])
  const [employeeNames, setEmployeeNames] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const listOpenCursorTimeoutRef = useRef(null)

  useEffect(() => {
    pennyDataService.ensureInitialized().then(() => {
      Promise.all([
        pennyDataService.getAllCompanies(),
        pennyDataService.getAllEmployees(),
      ]).then(([companies, employees]) => {
        setCompanyNames((companies || []).map(c => (c && c.company) ? String(c.company).trim() : '').filter(Boolean))
        setEmployeeNames((employees || []).map(e => (e && e.full_name) ? String(e.full_name).trim() : '').filter(Boolean).slice(0, 2500))
      }).catch(() => {})
    }).catch(() => {})
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Thinking Penny cursor while processing (only when dropdown is open)
  useEffect(() => {
    if (isOpen && isTyping) {
      document.body.classList.add('penny-thinking-cursor')
    } else {
      document.body.classList.remove('penny-thinking-cursor')
    }
    return () => document.body.classList.remove('penny-thinking-cursor')
  }, [isOpen, isTyping])

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

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const query = inputValue.trim()
    if (!query) return

    // Add user message
    addMessage({ type: 'user', content: query })
    setInputValue('')

    // Show typing indicator
    setTyping(true)

    // Build conversation history for context (if using Claude mode)
    const conversationHistory = messages.map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    try {
      // Process query - uses Claude API if enabled, otherwise pattern matching
      const response = await processQueryWithAI(query, conversationHistory)

      setTyping(false)

      // Add Penny's response
      addMessage({
        type: 'penny',
        content: response.text,
        richContent: response.richContent,
        actions: response.actions,
        suggestions: response.suggestions,
        followUp: response.followUp,
      })

      // Auto-execute navigation if specified
      if (response.actions) {
        const autoAction = response.actions.find(a => a.autoExecute && a.type === 'navigate')
        if (autoAction) {
          setTimeout(() => {
            navigate(autoAction.target)
            closeChat()
          }, 500)
        }
      }
    } catch (error) {
      console.error('Penny query error:', error)
      setTyping(false)
      addMessage({
        type: 'penny',
        content: "I'm sorry, I encountered an error. Please try asking your question in a different way.",
      })
    }
  }

  const handleSampleSelect = async (text) => {
    setInputValue(text)
    // Auto-submit after a brief delay
    setTimeout(async () => {
      addMessage({ type: 'user', content: text })
      setInputValue('')
      setTyping(true)

      try {
        const response = await processQueryWithAI(text, [])

        setTyping(false)
        addMessage({
          type: 'penny',
          content: response.text,
          richContent: response.richContent,
          actions: response.actions,
          suggestions: response.suggestions,
          followUp: response.followUp,
        })
      } catch (error) {
        console.error('Penny query error:', error)
        setTyping(false)
        addMessage({
          type: 'penny',
          content: "I'm sorry, I encountered an error. Please try again.",
        })
      }
    }, 100)
  }

  const handlePromptClick = async (promptText) => {
    addMessage({ type: 'user', content: promptText })
    setTyping(true)
    const conversationHistory = [...messages.map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content })), { role: 'user', content: promptText }]
    try {
      const response = await processQueryWithAI(promptText, conversationHistory)
      setTyping(false)
      addMessage({
        type: 'penny',
        content: response.text,
        richContent: response.richContent,
        actions: response.actions,
        suggestions: response.suggestions,
        followUp: response.followUp,
      })
    } catch (error) {
      console.error('Penny query error:', error)
      setTyping(false)
      addMessage({ type: 'penny', content: "I'm sorry, I encountered an error. Please try again." })
    }
  }

  const handleAction = async (action) => {
    if (action.type === 'navigate') {
      closeChat()
    } else if (action.type === 'suggestion') {
      handleSampleSelect(action.text)
    } else if (action.type === 'show-table' && action.data === 'outstanding') {
      const breakdownPrompt = 'Show me the outstanding balance breakdown by employee'
      addMessage({ type: 'user', content: breakdownPrompt })
      setTyping(true)
      try {
        const response = await processQueryWithAI(breakdownPrompt, [])
        setTyping(false)
        addMessage({
          type: 'penny',
          content: response.text,
          richContent: response.richContent,
          actions: response.actions,
          suggestions: response.suggestions,
          followUp: response.followUp,
        })
      } catch (error) {
        console.error('Penny query error:', error)
        setTyping(false)
        addMessage({
          type: 'penny',
          content: "I'm sorry, I encountered an error. Please try again.",
        })
      }
    } else if (action.type === 'show-table' && action.data === 'companies') {
      handleSampleSelect('List companies by adoption')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={closeChat}
      />

      {/* Dropdown Panel - positioned above Penny button in bottom-right */}
      <div
        className={`fixed bottom-24 right-6 w-[420px] max-w-[calc(100vw-2rem)] z-50 animate-slide-up ${expandedList ? 'cursor-pointer' : ''}`}
        onClick={expandedList ? () => setExpandedList(null) : undefined}
        role={expandedList ? 'button' : undefined}
        aria-label={expandedList ? 'Close full list and return to chat' : undefined}
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[calc(100vh-10rem)]">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-5 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <PennyAvatar size={32} id="dropdown-header" isWaving={messages.length === 0} />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Penny</h3>
                  <p className="text-purple-200 text-xs">Your EWA Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={startNewConversation}
                    className="text-white/70 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    New Chat
                  </button>
                )}
                <button
                  onClick={closeChat}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] bg-gray-50">
            {messages.length === 0 && !showHistory ? (
              <div>
                {/* Welcome message */}
                <div className="p-4 text-center">
                  <p className="text-gray-600 text-sm">
                    Hi! I'm Penny. Ask me anything about your EWA program.
                  </p>
                </div>
                {/* Sample prompts */}
                <PennySamplePrompts onSelect={handleSampleSelect} />
              </div>
            ) : showHistory ? (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Previous Conversations</h4>
                  <button
                    onClick={toggleHistory}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    Back
                  </button>
                </div>
                {conversations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No previous conversations</p>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-200 transition-colors"
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
              <div className="p-4 space-y-4">
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

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>

            {/* History toggle */}
            {conversations.length > 0 && !showHistory && messages.length === 0 && (
              <button
                onClick={toggleHistory}
                className="w-full mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500 hover:text-purple-600 flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Previous Conversations ({conversations.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded list panel - viewport slide-out from right */}
      {expandedList && (
        <div className="fixed inset-y-0 right-0 w-full max-w-[64rem] z-[60] animate-slide-in-right">
          <div className="absolute inset-0 bg-black/20" onClick={() => setExpandedList(null)} aria-hidden />
          <div className="absolute inset-y-0 right-0 w-full max-w-[64rem] min-w-[56rem] bg-white shadow-2xl flex flex-col">
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
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  )
}

export default PennyChatDropdown
