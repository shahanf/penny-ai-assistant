import { useState, useEffect } from 'react'
import PennySearchBar from '../components/penny/PennySearchBar'

// Marketing materials
const marketingMaterials = {
  flyers: [
    {
      id: 'flyer-1',
      name: 'EWA Launch Announcement',
      description: 'Introduce your team to the new Earned Wage Access benefit',
      thumbnail: '📢',
      category: 'Launch',
      formats: ['PDF', 'PNG'],
      colors: ['from-purple-500', 'to-fuchsia-500'],
    },
    {
      id: 'flyer-2',
      name: 'How It Works Guide',
      description: 'Simple step-by-step guide for employees to get started',
      thumbnail: '📱',
      category: 'Educational',
      formats: ['PDF', 'PNG'],
      colors: ['from-blue-500', 'to-cyan-500'],
    },
    {
      id: 'flyer-3',
      name: 'Save Feature Spotlight',
      description: 'Promote the savings feature and financial wellness',
      thumbnail: '💰',
      category: 'Feature',
      formats: ['PDF', 'PNG'],
      colors: ['from-emerald-500', 'to-green-500'],
    },
    {
      id: 'flyer-4',
      name: 'Financial Wellness Tips',
      description: 'Share budgeting tips and responsible EWA usage',
      thumbnail: '💡',
      category: 'Educational',
      formats: ['PDF', 'PNG'],
      colors: ['from-amber-500', 'to-orange-500'],
    },
  ],
  posters: [
    {
      id: 'poster-1',
      name: 'Break Room Poster',
      description: 'Large format poster for high-visibility areas (18x24")',
      thumbnail: '🖼️',
      size: '18x24"',
      formats: ['PDF', 'PNG'],
      colors: ['from-violet-500', 'to-purple-600'],
    },
    {
      id: 'poster-2',
      name: 'Bulletin Board Flyer',
      description: 'Letter-sized poster for bulletin boards (8.5x11")',
      thumbnail: '📋',
      size: '8.5x11"',
      formats: ['PDF', 'PNG'],
      colors: ['from-rose-500', 'to-pink-600'],
    },
    {
      id: 'poster-3',
      name: 'Digital Display Banner',
      description: 'Widescreen banner for TV displays (1920x1080)',
      thumbnail: '🖥️',
      size: '1920x1080',
      formats: ['PNG', 'JPG'],
      colors: ['from-indigo-500', 'to-blue-600'],
    },
    {
      id: 'poster-4',
      name: 'Table Tent Card',
      description: 'Foldable table display for cafeterias (4x6")',
      thumbnail: '🎴',
      size: '4x6"',
      formats: ['PDF'],
      colors: ['from-teal-500', 'to-emerald-600'],
    },
  ],
  newsletters: [
    {
      id: 'newsletter-1',
      name: 'Welcome Email Template',
      description: 'Onboarding email to introduce new employees to EWA',
      thumbnail: '✉️',
      type: 'Email',
      formats: ['HTML', 'PDF'],
      colors: ['from-purple-600', 'to-indigo-600'],
    },
    {
      id: 'newsletter-2',
      name: 'Monthly Benefits Digest',
      description: 'Monthly newsletter highlighting EWA stats and tips',
      thumbnail: '📰',
      type: 'Newsletter',
      formats: ['HTML', 'PDF'],
      colors: ['from-cyan-500', 'to-blue-600'],
    },
    {
      id: 'newsletter-3',
      name: 'Savings Milestone Celebration',
      description: 'Celebrate team savings achievements and milestones',
      thumbnail: '🎉',
      type: 'Email',
      formats: ['HTML', 'PDF'],
      colors: ['from-green-500', 'to-emerald-600'],
    },
    {
      id: 'newsletter-4',
      name: 'Year-End Benefits Summary',
      description: 'Annual recap of EWA program impact and highlights',
      thumbnail: '📊',
      type: 'Newsletter',
      formats: ['HTML', 'PDF'],
      colors: ['from-amber-500', 'to-yellow-500'],
    },
  ],
}

function MarketingCard({ item, type }) {
  const [showFormats, setShowFormats] = useState(false)

  const handleDownload = (format) => {
    alert(`Downloading ${item.name} as ${format}`)
    setShowFormats(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group">
      {/* Thumbnail Preview */}
      <div className={`h-24 sm:h-32 bg-gradient-to-br ${item.colors[0]} ${item.colors[1]} flex items-center justify-center relative`}>
        <span className="text-4xl sm:text-5xl">{item.thumbnail}</span>
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
          <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-medium text-gray-700">
            {type === 'posters' ? item.size : type === 'newsletters' ? item.type : item.category}
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base truncate">{item.name}</h4>
        <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 line-clamp-2">{item.description}</p>
        
        {/* Download Options */}
        <div className="relative">
          <button
            onClick={() => setShowFormats(!showFormats)}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
            <svg className={`w-4 h-4 transition-transform ${showFormats ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showFormats && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
              {item.formats.map((format) => (
                <button
                  key={format}
                  onClick={() => handleDownload(format)}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Download as {format}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DesignedAssets() {
  const [activeMarketingTab, setActiveMarketingTab] = useState('flyers')

  const marketingTabs = [
    { id: 'flyers', name: 'Digital Flyers', icon: '📄', count: marketingMaterials.flyers.length },
    { id: 'posters', name: 'Posters', icon: '🖼️', count: marketingMaterials.posters.length },
    { id: 'newsletters', name: 'Newsletters', icon: '📰', count: marketingMaterials.newsletters.length },
  ]

  // Tour action listener
  useEffect(() => {
    const handleTourAction = (e) => {
      const { action } = e.detail
      if (action === 'closeAllModals') {
        // No modals to close on this page
      }
    }
    
    window.addEventListener('tour-action', handleTourAction)
    return () => window.removeEventListener('tour-action', handleTourAction)
  }, [])

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-purple-100/70 min-h-screen">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Designed Assets</h2>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-2 sm:mt-1 sm:ml-14 md:ml-16">
          <p className="text-sm sm:text-base text-gray-600">Flyers, posters, and marketing materials for your team</p>
          <div className="w-full sm:w-auto">
            <PennySearchBar />
          </div>
        </div>
      </div>

      {/* Marketing Materials Section */}
      <div>
        <div className="mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-lg sm:text-xl">🎨</span>
            Marketing Materials
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Promote your EWA benefit with professionally designed materials</p>
        </div>

        {/* Marketing Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" data-tour="assets-library">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {marketingTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMarketingTab(tab.id)}
                className={`flex-1 min-w-[100px] px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors relative ${
                  activeMarketingTab === tab.id
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <span className="hidden sm:inline">{tab.icon}</span>
                  <span className="truncate">{tab.name}</span>
                  <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${
                    activeMarketingTab === tab.id
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </div>
                {activeMarketingTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6" data-tour="asset-card">
              {marketingMaterials[activeMarketingTab].map((item) => (
                <MarketingCard key={item.id} item={item} type={activeMarketingTab} />
              ))}
            </div>
          </div>

          {/* Custom Request Banner */}
          <div className="border-t border-gray-200 bg-gradient-to-r from-purple-50 to-fuchsia-50 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Need Custom Materials?</h4>
                  <p className="text-xs sm:text-sm text-gray-600">Request branded materials with your company logo and colors</p>
                </div>
              </div>
              <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                Request Custom Design
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tips Section */}
      <div className="mt-6 sm:mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-amber-900 mb-2 text-sm sm:text-base">💡 Pro Tips for Promoting EWA</h4>
            <ul className="text-xs sm:text-sm text-amber-800 space-y-1">
              <li>• Post flyers in break rooms, time clocks, and high-traffic areas</li>
              <li>• Include EWA info in new employee onboarding packets</li>
              <li>• Share monthly newsletters via email to keep employees engaged</li>
              <li>• Use digital displays in lobbies to rotate promotional content</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesignedAssets
