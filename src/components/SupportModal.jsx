import { useState, useEffect, useRef } from 'react'

// Sample conversation data
const recentConversations = [
  {
    id: 1,
    subject: 'Bulk employee enrollment assistance',
    preview: 'We\'ve processed the CSV upload and 47 employees are now pending verification...',
    agent: { name: 'Sarah Mitchell', avatar: 'SM', role: 'Senior Success Manager' },
    source: 'chat',
    timestamp: '2 hours ago',
    unread: true,
    priority: 'normal',
  },
  {
    id: 2,
    subject: 'RE: Integration sync error resolution',
    preview: 'The webhook configuration has been updated. Please test the sync again and let us know...',
    agent: { name: 'David Chen', avatar: 'DC', role: 'Technical Specialist' },
    source: 'email',
    timestamp: 'Yesterday',
    unread: false,
    priority: 'normal',
  },
  {
    id: 3,
    subject: 'Monthly ROI report customization',
    preview: 'I\'ve attached the custom report template with the additional metrics you requested...',
    agent: { name: 'Emily Rodriguez', avatar: 'ER', role: 'Account Executive' },
    source: 'email',
    timestamp: '3 days ago',
    unread: false,
    priority: 'normal',
  },
  {
    id: 4,
    subject: 'API rate limit increase request',
    preview: 'Your request has been approved! The new rate limit of 10,000 requests/hour is now active...',
    agent: { name: 'Michael Park', avatar: 'MP', role: 'Technical Specialist' },
    source: 'chat',
    timestamp: '5 days ago',
    unread: false,
    priority: 'normal',
  },
]

// Sample tickets data
const supportTickets = [
  {
    id: 'TKT-2847',
    title: 'Employee unable to complete enrollment',
    description: 'SSN verification failing for new hires from January batch',
    status: 'in-progress',
    priority: 'high',
    created: 'Jan 30, 2026',
    updated: '2 hours ago',
    affectedEmployees: [
      { name: 'Jessica Wong', id: 'EMP-089', department: 'Engineering' },
      { name: 'Robert Martinez', id: 'EMP-092', department: 'Operations' },
      { name: 'Amanda Lee', id: 'EMP-095', department: 'Customer Service' },
    ],
    assignee: { name: 'Sarah Mitchell', avatar: 'SM' },
  },
  {
    id: 'TKT-2843',
    title: 'Payroll sync delay investigation',
    description: 'January 28th payroll data not reflecting for overnight shifts',
    status: 'pending',
    priority: 'medium',
    created: 'Jan 28, 2026',
    updated: '1 day ago',
    affectedEmployees: [
      { name: 'Carlos Hernandez', id: 'EMP-034', department: 'Warehouse' },
      { name: 'Lisa Thompson', id: 'EMP-056', department: 'Warehouse' },
    ],
    assignee: { name: 'David Chen', avatar: 'DC' },
  },
  {
    id: 'TKT-2839',
    title: 'Custom report generation request',
    description: 'Quarterly adoption metrics with department breakdown',
    status: 'resolved',
    priority: 'low',
    created: 'Jan 25, 2026',
    updated: '3 days ago',
    affectedEmployees: [],
    assignee: { name: 'Emily Rodriguez', avatar: 'ER' },
  },
]

// Live chat messages
const initialMessages = [
  {
    id: 1,
    type: 'system',
    content: 'Welcome to Priority Support! As a valued enterprise partner, you\'re connected to our dedicated success team.',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: 2,
    type: 'agent',
    agent: { name: 'Sarah Mitchell', avatar: 'SM', role: 'Senior Success Manager' },
    content: 'Hi there! 👋 I\'m Sarah, your dedicated Success Manager. How can I help you today?',
    timestamp: new Date(Date.now() - 30000),
  },
]

function SupportModal({ isOpen, onClose }) {
  const [activeView, setActiveView] = useState('chat') // 'chat', 'conversations', 'tickets'
  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && activeView === 'chat') {
      inputRef.current?.focus()
    }
  }, [isOpen, activeView])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    }
    setMessages([...messages, newMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate agent response
    setTimeout(() => {
      setIsTyping(false)
      const agentResponse = {
        id: messages.length + 2,
        type: 'agent',
        agent: { name: 'Sarah Mitchell', avatar: 'SM', role: 'Senior Success Manager' },
        content: getAgentResponse(inputValue),
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, agentResponse])
    }, 1500 + Math.random() * 1000)
  }

  const getAgentResponse = (userMessage) => {
    const lowerMsg = userMessage.toLowerCase()
    if (lowerMsg.includes('employee') || lowerMsg.includes('enrollment')) {
      return "I'd be happy to help with employee enrollment! I can see your account has 2,643 eligible employees. Would you like me to pull up the enrollment dashboard or help troubleshoot a specific employee's status?"
    }
    if (lowerMsg.includes('report') || lowerMsg.includes('data')) {
      return "Great question! I can help you generate custom reports. We have adoption metrics, transfer analytics, and ROI reports available. Which type of report interests you most?"
    }
    if (lowerMsg.includes('integration') || lowerMsg.includes('sync') || lowerMsg.includes('api')) {
      return "I understand integration issues can be frustrating. I'm checking your sync status now... Your last successful sync was 2 hours ago. Would you like me to investigate any specific data discrepancies?"
    }
    if (lowerMsg.includes('ticket') || lowerMsg.includes('issue')) {
      return "I can help you create a new support ticket or check on existing ones. You currently have 2 active tickets being worked on. Would you like me to provide an update on either of those?"
    }
    return "Thanks for reaching out! I'm here to help with anything related to your EWA platform - employee management, reports, integrations, or any questions you have. What would you like to explore?"
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusStyles = (status) => {
    const styles = {
      'in-progress': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'In Progress' },
      'pending': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Pending' },
      'resolved': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Resolved' },
    }
    return styles[status] || styles['pending']
  }

  const getPriorityStyles = (priority) => {
    const styles = {
      'high': { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' },
      'medium': { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🟡' },
      'low': { bg: 'bg-gray-100', text: 'text-gray-600', icon: '⚪' },
    }
    return styles[priority] || styles['medium']
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-5xl h-[85vh] mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
        
        {/* Premium Header with Gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
          
          <div className="relative px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Premium Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full border border-white/30">
                <span className="text-lg">⭐</span>
                <span className="text-white text-sm font-semibold">Priority Support</span>
              </div>
              
              <div className="h-6 w-px bg-white/30" />
              
              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
                </span>
                <span className="text-white/90 text-sm">Your team is online</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Response Time Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white/90 text-sm font-medium">Avg response: &lt;2 min</span>
              </div>

              {/* Close Button */}
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="relative px-6 flex gap-1">
            {[
              { id: 'chat', label: 'Live Chat', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', badge: null },
              { id: 'conversations', label: 'Recent', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', badge: recentConversations.filter(c => c.unread).length || null },
              { id: 'tickets', label: 'Tickets', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', badge: supportTickets.filter(t => t.status !== 'resolved').length || null },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveView(tab.id)
                  setSelectedConversation(null)
                  setSelectedTicket(null)
                }}
                className={`relative flex items-center gap-2 px-4 py-3 rounded-t-xl font-medium text-sm transition-all ${
                  activeView === tab.id
                    ? 'bg-white text-gray-900 shadow-lg'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                {tab.label}
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${
                    activeView === tab.id ? 'bg-purple-100 text-purple-700' : 'bg-white/20 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          
          {/* Live Chat View */}
          {activeView === 'chat' && (
            <div className="h-full flex flex-col">
              {/* Dedicated Agent Banner */}
              <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-50 border-b border-purple-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-200">
                        SM
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Sarah Mitchell</h3>
                      <p className="text-sm text-gray-500">Senior Success Manager</p>
                      <p className="text-xs text-purple-600 font-medium">Your dedicated support contact</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Schedule Call
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.type === 'system' ? (
                      <div className="max-w-xl mx-auto text-center">
                        <p className="text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                          {message.content}
                        </p>
                      </div>
                    ) : message.type === 'agent' ? (
                      <div className="flex items-end gap-3 max-w-[70%]">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                          {message.agent.avatar}
                        </div>
                        <div>
                          <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-gray-100">
                            <p className="text-gray-800">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 ml-1">{formatTime(message.timestamp)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end gap-3 max-w-[70%]">
                        <div>
                          <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-2xl rounded-br-none px-4 py-3 shadow-md">
                            <p>{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 text-right mr-1">{formatTime(message.timestamp)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex items-end gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      SM
                    </div>
                    <div className="bg-white rounded-2xl rounded-bl-none px-4 py-3 shadow-sm border border-gray-100">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              <div className="px-6 py-3 bg-white border-t border-gray-100">
                <div className="flex gap-2 flex-wrap">
                  {['Employee enrollment help', 'Generate report', 'Check integration status', 'Create support ticket'].map((action) => (
                    <button
                      key={action}
                      onClick={() => setInputValue(action)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Area */}
              <div className="px-6 py-4 bg-white border-t border-gray-200">
                <div className="flex items-end gap-3">
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      rows={1}
                      className="w-full px-4 py-3 bg-gray-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    className="p-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Conversations View */}
          {activeView === 'conversations' && (
            <div className="h-full flex">
              {/* Conversations List */}
              <div className={`${selectedConversation ? 'w-2/5' : 'w-full'} border-r border-gray-200 overflow-y-auto`}>
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0">
                  <div className="relative">
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {recentConversations.map((convo) => (
                    <button
                      key={convo.id}
                      onClick={() => setSelectedConversation(convo)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedConversation?.id === convo.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white font-bold">
                            {convo.agent.avatar}
                          </div>
                          <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            convo.source === 'chat' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {convo.source === 'chat' ? '💬' : '✉️'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-medium text-gray-900 truncate ${convo.unread ? 'font-semibold' : ''}`}>
                              {convo.subject}
                            </p>
                            {convo.unread && (
                              <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-0.5">{convo.preview}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-400">{convo.agent.name}</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs text-gray-400">{convo.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation Detail */}
              {selectedConversation && (
                <div className="flex-1 flex flex-col bg-white">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            selectedConversation.source === 'chat' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {selectedConversation.source === 'chat' ? '💬 Chat' : '✉️ Email'}
                          </span>
                          <span className="text-xs text-gray-400">{selectedConversation.timestamp}</span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedConversation.subject}</h2>
                      </div>
                      <button 
                        onClick={() => setSelectedConversation(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {selectedConversation.agent.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{selectedConversation.agent.name}</span>
                          <span className="text-sm text-gray-500">{selectedConversation.agent.role}</span>
                        </div>
                        <div className="mt-3 prose prose-sm text-gray-600">
                          <p>{selectedConversation.preview}</p>
                          <p className="mt-4">We're committed to ensuring your team has a seamless experience with the platform. Please don't hesitate to reach out if you have any questions or need further assistance.</p>
                          <p className="mt-4">Best regards,<br />{selectedConversation.agent.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setActiveView('chat')}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                      >
                        Continue in Chat
                      </button>
                      <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-white transition-colors">
                        Reply via Email
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tickets View */}
          {activeView === 'tickets' && (
            <div className="h-full flex">
              {/* Tickets List */}
              <div className={`${selectedTicket ? 'w-2/5' : 'w-full'} border-r border-gray-200 overflow-y-auto`}>
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Support Tickets</h3>
                    <button className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Ticket
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {['All', 'Active', 'Resolved'].map((filter) => (
                      <button
                        key={filter}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          filter === 'All' 
                            ? 'bg-gray-900 text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {supportTickets.map((ticket) => {
                    const statusStyles = getStatusStyles(ticket.status)
                    const priorityStyles = getPriorityStyles(ticket.priority)
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          selectedTicket?.id === ticket.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-400">{ticket.id}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles.bg} ${statusStyles.text}`}>
                                {statusStyles.label}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900 truncate">{ticket.title}</p>
                            <p className="text-sm text-gray-500 truncate mt-0.5">{ticket.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-400">Updated {ticket.updated}</span>
                              {ticket.affectedEmployees.length > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                  </svg>
                                  {ticket.affectedEmployees.length} affected
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-lg">{priorityStyles.icon}</span>
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold">
                              {ticket.assignee.avatar}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Ticket Detail */}
              {selectedTicket && (
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-mono text-gray-400">{selectedTicket.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(selectedTicket.status).bg} ${getStatusStyles(selectedTicket.status).text}`}>
                            {getStatusStyles(selectedTicket.status).label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityStyles(selectedTicket.priority).bg} ${getPriorityStyles(selectedTicket.priority).text}`}>
                            {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)} Priority
                          </span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedTicket.title}</h2>
                        <p className="text-gray-500 mt-1">{selectedTicket.description}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedTicket(null)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Ticket Meta */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold">
                            {selectedTicket.assignee.avatar}
                          </div>
                          <span className="font-medium text-gray-900">{selectedTicket.assignee.name}</span>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Timeline</p>
                        <p className="text-sm text-gray-900">Created: {selectedTicket.created}</p>
                        <p className="text-sm text-gray-600">Updated: {selectedTicket.updated}</p>
                      </div>
                    </div>

                    {/* Affected Employees */}
                    {selectedTicket.affectedEmployees.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                          Affected Employees ({selectedTicket.affectedEmployees.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedTicket.affectedEmployees.map((emp) => (
                            <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-bold">
                                  {emp.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{emp.name}</p>
                                  <p className="text-xs text-gray-500">{emp.id} • {emp.department}</p>
                                </div>
                              </div>
                              <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activity Timeline */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity Timeline</h4>
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">Ticket updated by <span className="font-medium">{selectedTicket.assignee.name}</span></p>
                            <p className="text-xs text-gray-500">{selectedTicket.updated}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">Ticket assigned to support team</p>
                            <p className="text-xs text-gray-500">{selectedTicket.created}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-gray-900">Ticket created by <span className="font-medium">Admin User</span></p>
                            <p className="text-xs text-gray-500">{selectedTicket.created}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setActiveView('chat')}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                      >
                        Discuss in Chat
                      </button>
                      <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-white transition-colors">
                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Quick Stats */}
        <div className="px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Account Manager:</span>
              <span className="text-white text-sm font-medium">Sarah Mitchell</span>
            </div>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">Support Tier:</span>
              <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">ENTERPRISE</span>
            </div>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">SLA:</span>
              <span className="text-emerald-400 text-sm font-medium">99.9% ✓</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>24/7 Phone: 1-800-EWA-HELP</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportModal
