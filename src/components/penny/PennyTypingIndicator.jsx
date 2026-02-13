import React from 'react'
import PennyAvatar from '../PennyAvatar'

function PennyTypingIndicator() {
  return (
    <div className="flex items-end gap-3 max-w-[80%]">
      <div className="flex-shrink-0">
        <PennyAvatar size={32} id="typing" isThinking={true} />
      </div>
      <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

export default PennyTypingIndicator
