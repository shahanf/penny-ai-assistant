import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'

// Initial state
const initialState = {
  isOpen: false,
  messages: [],
  conversations: [],
  currentConversationId: null,
  isTyping: false,
  showHistory: false,
}

// Action types
const ACTIONS = {
  OPEN_CHAT: 'OPEN_CHAT',
  CLOSE_CHAT: 'CLOSE_CHAT',
  TOGGLE_CHAT: 'TOGGLE_CHAT',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_TYPING: 'SET_TYPING',
  START_NEW_CONVERSATION: 'START_NEW_CONVERSATION',
  LOAD_CONVERSATION: 'LOAD_CONVERSATION',
  SAVE_CONVERSATION: 'SAVE_CONVERSATION',
  LOAD_HISTORY: 'LOAD_HISTORY',
  TOGGLE_HISTORY: 'TOGGLE_HISTORY',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES',
}

// Reducer
function pennyChatReducer(state, action) {
  switch (action.type) {
    case ACTIONS.OPEN_CHAT:
      return { ...state, isOpen: true }

    case ACTIONS.CLOSE_CHAT:
      return { ...state, isOpen: false, showHistory: false }

    case ACTIONS.TOGGLE_CHAT:
      return { ...state, isOpen: !state.isOpen, showHistory: false }

    case ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
      }

    case ACTIONS.SET_TYPING:
      return { ...state, isTyping: action.payload }

    case ACTIONS.START_NEW_CONVERSATION:
      const newConversationId = Date.now().toString()
      // Save current conversation if it has messages
      let updatedConversations = [...state.conversations]
      if (state.messages.length > 0 && state.currentConversationId) {
        const existingIndex = updatedConversations.findIndex(c => c.id === state.currentConversationId)
        const conversationData = {
          id: state.currentConversationId,
          messages: state.messages,
          timestamp: new Date().toISOString(),
          preview: state.messages[0]?.content?.slice(0, 50) || 'New conversation',
        }
        if (existingIndex >= 0) {
          updatedConversations[existingIndex] = conversationData
        } else {
          updatedConversations = [conversationData, ...updatedConversations]
        }
      }
      return {
        ...state,
        messages: [],
        currentConversationId: newConversationId,
        conversations: updatedConversations.slice(0, 20), // Keep last 20 conversations
        showHistory: false,
      }

    case ACTIONS.LOAD_CONVERSATION:
      const conversation = state.conversations.find(c => c.id === action.payload)
      if (conversation) {
        return {
          ...state,
          messages: conversation.messages,
          currentConversationId: conversation.id,
          showHistory: false,
        }
      }
      return state

    case ACTIONS.SAVE_CONVERSATION:
      if (state.messages.length === 0) return state
      const saveConversations = [...state.conversations]
      const saveIndex = saveConversations.findIndex(c => c.id === state.currentConversationId)
      const saveData = {
        id: state.currentConversationId || Date.now().toString(),
        messages: state.messages,
        timestamp: new Date().toISOString(),
        preview: state.messages[0]?.content?.slice(0, 50) || 'Conversation',
      }
      if (saveIndex >= 0) {
        saveConversations[saveIndex] = saveData
      } else {
        saveConversations.unshift(saveData)
      }
      return {
        ...state,
        conversations: saveConversations.slice(0, 20),
        currentConversationId: saveData.id,
      }

    case ACTIONS.LOAD_HISTORY:
      return { ...state, conversations: action.payload }

    case ACTIONS.TOGGLE_HISTORY:
      return { ...state, showHistory: !state.showHistory }

    case ACTIONS.CLEAR_MESSAGES:
      return { ...state, messages: [], currentConversationId: null }

    default:
      return state
  }
}

// Create context
const PennyChatContext = createContext(null)

// Provider component
export function PennyChatProvider({ children }) {
  const [state, dispatch] = useReducer(pennyChatReducer, initialState)

  // No localStorage persistence - data privacy
  // Conversations are session-only and cleared on refresh

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && state.isOpen) {
        dispatch({ type: ACTIONS.CLOSE_CHAT })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isOpen])

  // Action creators
  const openChat = useCallback(() => {
    dispatch({ type: ACTIONS.OPEN_CHAT })
  }, [])

  const closeChat = useCallback(() => {
    // Save current conversation before closing
    dispatch({ type: ACTIONS.SAVE_CONVERSATION })
    dispatch({ type: ACTIONS.CLOSE_CHAT })
  }, [])

  const toggleChat = useCallback(() => {
    if (state.isOpen) {
      dispatch({ type: ACTIONS.SAVE_CONVERSATION })
    }
    dispatch({ type: ACTIONS.TOGGLE_CHAT })
  }, [state.isOpen])

  const addMessage = useCallback((message) => {
    dispatch({
      type: ACTIONS.ADD_MESSAGE,
      payload: {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...message,
      },
    })
  }, [])

  const setTyping = useCallback((isTyping) => {
    dispatch({ type: ACTIONS.SET_TYPING, payload: isTyping })
  }, [])

  const startNewConversation = useCallback(() => {
    dispatch({ type: ACTIONS.START_NEW_CONVERSATION })
  }, [])

  const loadConversation = useCallback((conversationId) => {
    dispatch({ type: ACTIONS.LOAD_CONVERSATION, payload: conversationId })
  }, [])

  const toggleHistory = useCallback(() => {
    dispatch({ type: ACTIONS.TOGGLE_HISTORY })
  }, [])

  const value = {
    ...state,
    openChat,
    closeChat,
    toggleChat,
    addMessage,
    setTyping,
    startNewConversation,
    loadConversation,
    toggleHistory,
  }

  return (
    <PennyChatContext.Provider value={value}>
      {children}
    </PennyChatContext.Provider>
  )
}

// Custom hook
export function usePennyChat() {
  const context = useContext(PennyChatContext)
  if (!context) {
    throw new Error('usePennyChat must be used within a PennyChatProvider')
  }
  return context
}

export default PennyChatContext
