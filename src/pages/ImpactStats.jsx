import { useEffect } from 'react'
import PennySearchBar from '../components/penny/PennySearchBar'

const quotes = [
  { id: 1, employee: 'Sarah Johnson', department: 'Operations', date: '2024-01-28', quote: "Being able to access my wages early helped me avoid a $35 overdraft fee. That's money back in my pocket!" },
  { id: 2, employee: 'Michael Chen', department: 'Warehouse', date: '2024-01-27', quote: "I used to stress about bills between paychecks. Not anymore. EWA gives me control over my finances." },
  { id: 3, employee: 'Emily Rodriguez', department: 'Customer Service', date: '2024-01-26', quote: "The savings feature helped me build an emergency fund for the first time in my life." },
  { id: 4, employee: 'James Wilson', department: 'Logistics', date: '2024-01-25', quote: "I was able to pay for my son's school supplies without taking out a payday loan. Thank you!" },
  { id: 5, employee: 'Ashley Martinez', department: 'HR', date: '2024-01-24', quote: "Financial stress was affecting my work. Since using EWA, I feel more focused and productive." },
  { id: 6, employee: 'David Thompson', department: 'IT', date: '2024-01-23', quote: "I love that I can see exactly how much I've earned in real-time. It keeps me motivated." },
  { id: 7, employee: 'Jessica Brown', department: 'Marketing', date: '2024-01-22', quote: "The app is so easy to use. I transferred funds in seconds when I needed them." },
  { id: 8, employee: 'Christopher Lee', department: 'Sales', date: '2024-01-21', quote: "EWA helped me cover an unexpected medical bill without going into debt." },
  { id: 9, employee: 'Amanda Garcia', department: 'Finance', date: '2024-01-20', quote: "I've recommended this to all my coworkers. It's the best benefit our company offers." },
  { id: 10, employee: 'Daniel Harris', department: 'Operations', date: '2024-01-19', quote: "No more choosing between gas and groceries at the end of the month." },
  { id: 11, employee: 'Stephanie White', department: 'Warehouse', date: '2024-01-18', quote: "I paid off my credit card debt faster because I stopped relying on high-interest advances." },
  { id: 12, employee: 'Kevin Anderson', department: 'Customer Service', date: '2024-01-17', quote: "The budgeting tools helped me realize where my money was going." },
  { id: 13, employee: 'Nicole Taylor', department: 'Logistics', date: '2024-01-16', quote: "I feel more valued as an employee knowing my company cares about my financial wellness." },
  { id: 14, employee: 'Brandon Thomas', department: 'HR', date: '2024-01-15', quote: "This benefit helped me recruit top talent. Candidates love hearing about EWA access." },
  { id: 15, employee: 'Rachel Jackson', department: 'IT', date: '2024-01-14', quote: "I've saved over $500 in fees this year alone by using EWA instead of payday loans." },
  { id: 16, employee: 'Tyler Moore', department: 'Marketing', date: '2024-01-13', quote: "Being able to access my money when I need it just makes sense. Why did we wait so long?" },
  { id: 17, employee: 'Megan Clark', department: 'Sales', date: '2024-01-12', quote: "The automatic savings feature helped me save for a vacation I never thought I could afford." },
  { id: 18, employee: 'Justin Lewis', department: 'Finance', date: '2024-01-11', quote: "I used to live paycheck to paycheck. Now I have a cushion and peace of mind." },
  { id: 19, employee: 'Lauren Walker', department: 'Operations', date: '2024-01-10', quote: "EWA is more than a benefit—it's financial freedom." },
  { id: 20, employee: 'Ryan Hall', department: 'Warehouse', date: '2024-01-09', quote: "I told my family about this and they're jealous their employers don't offer it!" },
]

const satisfactionData = {
  overall: { score: 4.7, responses: 892, distribution: [2, 3, 8, 22, 65] },
  easeOfUse: { score: 4.8, responses: 856, distribution: [1, 2, 5, 18, 74] },
  financialWellbeing: { score: 4.5, responses: 834, distribution: [3, 4, 10, 25, 58] },
  recommendation: { score: 4.6, responses: 867, distribution: [2, 3, 9, 20, 66] },
  support: { score: 4.4, responses: 712, distribution: [2, 5, 12, 28, 53] },
}

function StarRating({ score }) {
  const fullStars = Math.floor(score)
  const hasHalfStar = score % 1 >= 0.5
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < fullStars ? 'text-yellow-400' : i === fullStars && hasHalfStar ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function SatisfactionChart({ title, data }) {
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-400', 'bg-green-500']
  const labels = ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars']
  const maxPercent = Math.max(...data.distribution)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4">
        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{title}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-bold text-gray-900">{data.score}</span>
          <StarRating score={data.score} />
        </div>
      </div>
      <div className="space-y-2">
        {data.distribution.map((percent, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-12">{labels[index]}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full ${colors[index]} transition-all duration-500`}
                style={{ width: `${(percent / maxPercent) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600 w-8">{percent}%</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">{data.responses} responses</p>
    </div>
  )
}

function ImpactStats() {
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
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Impact Stats</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-1">
          <p className="text-sm sm:text-base text-gray-600">Track and analyze your organization's EWA program impact.</p>
          <div className="w-full sm:w-auto">
            <PennySearchBar />
          </div>
        </div>
      </div>

      {/* Summary Cards - Horizontal scroll on mobile */}
      <div className="flex md:grid md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 overflow-x-auto pb-2 md:pb-0 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0" data-tour="impact-stats">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[200px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Quotes</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">247</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[200px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Avg. Satisfaction</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">4.6/5</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[200px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Would Recommend</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">94%</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[200px] md:min-w-0 flex-shrink-0 md:flex-shrink">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Survey Response Rate</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">72%</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Satisfaction Charts */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Employee Satisfaction Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <SatisfactionChart title="Overall Satisfaction" data={satisfactionData.overall} />
          <SatisfactionChart title="Ease of Use" data={satisfactionData.easeOfUse} />
          <SatisfactionChart title="Financial Wellbeing Impact" data={satisfactionData.financialWellbeing} />
          <SatisfactionChart title="Likelihood to Recommend" data={satisfactionData.recommendation} />
          <SatisfactionChart title="Customer Support" data={satisfactionData.support} />
          <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl shadow-sm p-4 sm:p-6 text-white flex flex-col justify-center">
            <div className="text-center">
              <p className="text-purple-100 text-xs sm:text-sm">Net Promoter Score</p>
              <p className="text-4xl sm:text-5xl font-bold mt-2">+72</p>
              <p className="text-purple-200 text-xs sm:text-sm mt-2">Excellent</p>
              <div className="mt-3 sm:mt-4 flex justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <div className="w-2 h-2 rounded-full bg-green-400 ring-2 ring-white"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quotes Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" data-tour="impact-quotes">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Employee Quotes</h3>
              <p className="text-xs sm:text-sm text-gray-500">Recent feedback from your team</p>
            </div>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors w-full sm:w-auto" data-tour="impact-export">
              Export Quotes
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {quotes.map((quote) => (
              <div key={quote.id} className="bg-gray-50 rounded-xl p-4 sm:p-5 hover:bg-gray-100 transition-colors">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs sm:text-sm font-medium text-purple-600">
                      {quote.employee.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{quote.employee}</p>
                        <p className="text-xs text-gray-500">{quote.department} • {quote.date}</p>
                      </div>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">"{quote.quote}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <p className="text-xs sm:text-sm text-gray-600">Showing 1 to 20 of 247 quotes</p>
            <div className="flex items-center gap-1 sm:gap-2">
              <button className="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50" disabled>
                Prev
              </button>
              <button className="px-2 sm:px-3 py-1 bg-purple-600 text-white rounded text-xs sm:text-sm">1</button>
              <button className="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm text-gray-600 hover:bg-gray-100">2</button>
              <button className="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm text-gray-600 hover:bg-gray-100">3</button>
              <button className="px-2 sm:px-3 py-1 border border-gray-300 rounded text-xs sm:text-sm text-gray-600 hover:bg-gray-100">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImpactStats
