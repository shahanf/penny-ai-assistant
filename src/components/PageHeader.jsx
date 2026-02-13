import React from 'react'
import PennySearchBar from './penny/PennySearchBar'

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-sm sm:text-base text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          <PennySearchBar />
        </div>
      </div>
      {children}
    </div>
  )
}

export default PageHeader
