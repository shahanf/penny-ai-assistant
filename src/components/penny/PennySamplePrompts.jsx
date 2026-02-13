import React, { useState, useEffect } from 'react'
import { getRotatingExampleQuestions, PENNY_EXAMPLE_ROTATE_MS } from '../../constants/pennyExampleQuestions'
import pennyDataService from '../../services/pennyDataService'

function PennySamplePrompts({ onSelect }) {
  const [rotationIndex, setRotationIndex] = useState(0)
  const [randomExampleEmployeeName, setRandomExampleEmployeeName] = useState(null)
  const [randomExampleCompanyName, setRandomExampleCompanyName] = useState(null)
  const [randomExamplePartnershipName, setRandomExamplePartnershipName] = useState(null)
  useEffect(() => {
    const interval = setInterval(() => setRotationIndex(prev => prev + 1), PENNY_EXAMPLE_ROTATE_MS)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    Promise.all([
      pennyDataService.getRandomEmployeeName(),
      pennyDataService.getRandomCompanyName(),
      pennyDataService.getRandomPartnershipName(),
    ]).then(([employeeName, companyName, partnershipName]) => {
      if (employeeName) setRandomExampleEmployeeName(employeeName)
      if (companyName) setRandomExampleCompanyName(companyName)
      if (partnershipName) setRandomExamplePartnershipName(partnershipName)
    })
  }, [])

  const prompts = getRotatingExampleQuestions(rotationIndex, randomExampleEmployeeName, randomExampleCompanyName, randomExamplePartnershipName)
  return (
    <div className="p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Try asking
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, idx) => (
          <button
            key={`${rotationIndex}-${idx}-${prompt.text}`}
            onClick={() => onSelect(prompt.text)}
            className="
              inline-flex items-center gap-2 px-3 py-2
              bg-gray-50 hover:bg-purple-50
              border border-gray-200 hover:border-purple-200
              rounded-full text-sm text-gray-700 hover:text-purple-700
              transition-colors duration-150
              text-left
            "
          >
            <span className="text-base">{prompt.icon}</span>
            <span className="line-clamp-1">{prompt.displayText ?? prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default PennySamplePrompts
