import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PennyAvatar from './PennyAvatar'
import { usePennyChat } from '../context/PennyChatContext'
import PennySpotlightModal from './penny/PennySpotlightModal'

// Tour steps configuration
const fullTourSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Your EWA Admin Portal! 👋',
    description: "Hi! I'm Penny, your financial wellness assistant. Let me show you around the portal so you can help your employees thrive!",
    page: '/',
    highlight: null,
    position: 'center',
  },
  {
    id: 'home-overview',
    title: 'Home Dashboard',
    description: "This is your command center! Here you'll see a quick snapshot of adoption rates, transfers, savings, and important alerts. It's the pulse of your EWA program.",
    page: '/',
    highlight: 'overview',
    position: 'right',
  },
  {
    id: 'employees',
    title: 'Employee Management',
    description: "View and manage all your enrolled employees here. You can see who's using the program, their activity levels, and individual details.",
    page: '/employees',
    highlight: null,
    position: 'right',
  },
  {
    id: 'shifts-pay',
    title: 'Shifts & Pay',
    description: "Monitor employee shifts and pay data in real-time. This is where you can see hours worked, earnings accrued, and ensure everything syncs correctly with your payroll. ⏰",
    page: '/shifts-pay',
    highlight: null,
    position: 'right',
  },
  {
    id: 'transfers',
    title: 'Transfers Dashboard',
    description: "Track all earned wage access transfers. See how employees are using their earned wages - most use it for essentials like bills, gas, and groceries!",
    page: '/transfers',
    highlight: null,
    position: 'right',
  },
  {
    id: 'savings',
    title: 'Savings Program',
    description: "This is where the magic happens! Track employee savings accounts. Fun fact: employees with savings use EWA 40% less frequently. 💰",
    page: '/savings',
    highlight: null,
    position: 'right',
  },
  {
    id: 'adoption',
    title: 'Adoption & Usage Analytics',
    description: "Deep dive into how your team engages with all features - Track, Pay, and Save. See trends, daily activity, and feature adoption over time.",
    page: '/adoption-usage',
    highlight: null,
    position: 'right',
  },
  {
    id: 'impact',
    title: 'Impact Statistics',
    description: "See the real impact of your financial wellness program. From overdraft fees avoided to employee testimonials - this is your ROI story!",
    page: '/impact-stats',
    highlight: null,
    position: 'right',
  },
  {
    id: 'reports',
    title: 'Reports & Downloads',
    description: "Generate and download detailed reports for your records, compliance, or executive presentations. Everything you need, exportable!",
    page: '/downloads',
    highlight: null,
    position: 'right',
  },
  {
    id: 'design-assets',
    title: 'Design Assets',
    description: "Grab ready-to-use marketing materials to promote your EWA program! Posters, flyers, email templates - everything to boost employee awareness and adoption. 🎨",
    page: '/designed-assets',
    highlight: null,
    position: 'right',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: "Configure your account preferences, manage notifications, and customize your admin portal experience. Everything you need to tailor the platform to your needs. ⚙️",
    page: '/settings',
    highlight: null,
    position: 'right',
  },
  {
    id: 'complete',
    title: "You're All Set! 🎉",
    description: "You've completed the tour! Remember, I'm always here in the corner if you need me. Click me anytime for tips or to retake the tour. Happy managing!",
    page: '/',
    highlight: null,
    position: 'center',
  },
]

// Page-specific immersive tours with element selectors and actions
const pageTours = {
  '/employees': [
    {
      id: 'employees-welcome',
      title: 'Welcome to Employee Management! 👋',
      description: "Let me walk you through this page. I'll highlight key features and even show you how they work!",
      page: '/employees',
      selector: null,
      action: null,
    },
    {
      id: 'employees-search',
      title: 'Search & Filter',
      description: 'Use this search bar to quickly find employees by name, department, or location. Try typing a name!',
      page: '/employees',
      selector: '[data-tour="employee-search"]',
      action: null,
    },
    {
      id: 'employees-status-filter',
      title: 'Filter by Status',
      description: 'Filter employees by their EWA status - Enrolled, Paused, Eligible, or Disabled.',
      page: '/employees',
      selector: '[data-tour="status-filter"]',
      action: null,
    },
    {
      id: 'employees-groups-btn',
      title: 'Manage Groups',
      description: "Let me open the Groups panel to show you how to organize employees into teams...",
      page: '/employees',
      selector: '[data-tour="manage-groups-btn"]',
      action: 'openGroupsModal',
    },
    {
      id: 'employees-groups-modal',
      title: 'Create & Assign Groups',
      description: 'Here you can create custom groups with colors and emojis, then assign employees. Use the tabs to switch between group management and employee assignment.',
      page: '/employees',
      selector: '[data-tour="groups-modal"]',
      action: null,
    },
    {
      id: 'employees-groups-close',
      title: 'Groups Configured! ✨',
      description: "Great! Now let me show you individual employee profiles...",
      page: '/employees',
      selector: null,
      action: 'closeGroupsModal',
    },
    {
      id: 'employees-card',
      title: 'Employee Card',
      description: "Each card shows key info at a glance. Let me open one to show you the full profile...",
      page: '/employees',
      selector: '[data-tour="employee-card"]',
      action: 'openEmployeeModal',
    },
    {
      id: 'employees-modal',
      title: 'Employee Profile Modal',
      description: 'This modal shows everything about an employee - transfers, savings, personal details, and quick actions. Use the tabs to explore different sections.',
      page: '/employees',
      selector: '[data-tour="employee-modal"]',
      action: null,
    },
    {
      id: 'employees-done',
      title: "You're an Expert! 🎉",
      description: "That's the Employees page! You now know how to search, filter, manage groups, and view employee details.",
      page: '/employees',
      selector: null,
      action: 'closeEmployeeModal',
    },
  ],
  '/transfers': [
    {
      id: 'transfers-welcome',
      title: 'Welcome to Transfers! 💸',
      description: "Let me show you how to track and analyze employee wage transfers.",
      page: '/transfers',
      selector: null,
      action: null,
    },
    {
      id: 'transfers-timefilter',
      title: 'Time Period Filter',
      description: 'Switch between Pay Cycle, Month, Quarter, and Year views. The stats will update automatically based on your selection.',
      page: '/transfers',
      selector: '[data-tour="time-filter"]',
      action: null,
    },
    {
      id: 'transfers-stats',
      title: 'Transfer Statistics',
      description: 'These cards show your key metrics - total transfers, volume, instant vs standard breakdown, and fees collected.',
      page: '/transfers',
      selector: '[data-tour="transfer-stats"]',
      action: null,
    },
    {
      id: 'transfers-outstanding',
      title: 'Outstanding Balances',
      description: 'Click here to see employees with outstanding transfer balances. Let me open it for you...',
      page: '/transfers',
      selector: '[data-tour="outstanding-balance"]',
      action: 'openOutstandingModal',
    },
    {
      id: 'transfers-outstanding-modal',
      title: 'Outstanding Balance Details',
      description: 'Here you can see which employees have unpaid balances and their expected payback dates.',
      page: '/transfers',
      selector: '[data-tour="outstanding-modal"]',
      action: null,
    },
    {
      id: 'transfers-close-outstanding',
      title: 'Moving On...',
      description: "Let me close this and show you the transfer history...",
      page: '/transfers',
      selector: null,
      action: 'closeOutstandingModal',
    },
    {
      id: 'transfers-table',
      title: 'Transfer History Table',
      description: 'This table shows all recent transfers. Click any row to see employee details.',
      page: '/transfers',
      selector: '[data-tour="transfer-table"]',
      action: null,
    },
    {
      id: 'transfers-row',
      title: 'Transfer Details',
      description: "Click any row to see the employee's full transfer history. Let me show you...",
      page: '/transfers',
      selector: '[data-tour="transfer-row"]',
      action: 'openTransferEmployeeModal',
    },
    {
      id: 'transfers-employee-modal',
      title: 'Employee Transfer History',
      description: 'Here you can see all transfers for this employee, including amounts, methods, fees, and status.',
      page: '/transfers',
      selector: '[data-tour="transfer-employee-modal"]',
      action: null,
    },
    {
      id: 'transfers-done',
      title: "Transfers Mastered! 🎉",
      description: "You now know how to analyze transfers by any time period and drill into individual employee details.",
      page: '/transfers',
      selector: null,
      action: 'closeTransferEmployeeModal',
    },
  ],
  '/shifts-pay': [
    {
      id: 'shifts-welcome',
      title: 'Welcome to Shifts & Pay! ⏰',
      description: "Let me show you how to monitor employee hours and earnings.",
      page: '/shifts-pay',
      selector: null,
      action: null,
    },
    {
      id: 'shifts-stats',
      title: 'Pay Period Overview',
      description: 'These cards show total hours worked, gross earnings, and payroll status for the current period.',
      page: '/shifts-pay',
      selector: '[data-tour="shifts-stats"]',
      action: null,
    },
    {
      id: 'shifts-table',
      title: 'Employee Hours Table',
      description: 'View detailed shift data for each employee - hours, rates, and calculated earnings.',
      page: '/shifts-pay',
      selector: '[data-tour="shifts-table"]',
      action: null,
    },
    {
      id: 'shifts-export',
      title: 'Export Data',
      description: 'Click here to download shift and pay data for your records or payroll system.',
      page: '/shifts-pay',
      selector: '[data-tour="shifts-export"]',
      action: null,
    },
    {
      id: 'shifts-done',
      title: "Shifts & Pay Complete! 🎉",
      description: "You're all set to monitor hours and earnings across your team.",
      page: '/shifts-pay',
      selector: null,
      action: null,
    },
  ],
  '/savings': [
    {
      id: 'savings-welcome',
      title: 'Welcome to Savings! 🏦',
      description: "Let me show you how to track employee savings accounts.",
      page: '/savings',
      selector: null,
      action: null,
    },
    {
      id: 'savings-stats',
      title: 'Savings Overview',
      description: 'These metrics show total savings balance, participation rate, and growth trends.',
      page: '/savings',
      selector: '[data-tour="savings-stats"]',
      action: null,
    },
    {
      id: 'savings-table',
      title: 'Individual Accounts',
      description: 'View each employee\'s savings balance, auto-save settings, and recent activity.',
      page: '/savings',
      selector: '[data-tour="savings-table"]',
      action: null,
    },
    {
      id: 'savings-export',
      title: 'Export Savings Data',
      description: 'Download savings account data in CSV format for reporting.',
      page: '/savings',
      selector: '[data-tour="savings-export"]',
      action: null,
    },
    {
      id: 'savings-done',
      title: "Savings Mastered! 🎉",
      description: "You now know how to track and analyze employee savings.",
      page: '/savings',
      selector: null,
      action: null,
    },
  ],
  '/adoption-usage': [
    {
      id: 'adoption-welcome',
      title: 'Welcome to Adoption & Usage! 📊',
      description: "Let me show you how to analyze program engagement.",
      page: '/adoption-usage',
      selector: null,
      action: null,
    },
    {
      id: 'adoption-overview',
      title: 'Adoption Metrics',
      description: 'Track how many employees have enrolled and are actively using each feature.',
      page: '/adoption-usage',
      selector: '[data-tour="adoption-stats"]',
      action: null,
    },
    {
      id: 'adoption-charts',
      title: 'Usage Trends',
      description: 'These charts show engagement patterns over time - daily, weekly, and monthly.',
      page: '/adoption-usage',
      selector: '[data-tour="adoption-charts"]',
      action: null,
    },
    {
      id: 'adoption-export',
      title: 'Export Report',
      description: 'Generate a detailed adoption report to share with stakeholders.',
      page: '/adoption-usage',
      selector: '[data-tour="adoption-export"]',
      action: null,
    },
    {
      id: 'adoption-done',
      title: "Analytics Expert! 🎉",
      description: "You're ready to track and report on program adoption.",
      page: '/adoption-usage',
      selector: null,
      action: null,
    },
  ],
  '/impact-stats': [
    {
      id: 'impact-welcome',
      title: 'Welcome to Impact Stats! 💰',
      description: "This is your ROI story. Let me show you the impact of your program.",
      page: '/impact-stats',
      selector: null,
      action: null,
    },
    {
      id: 'impact-kpis',
      title: 'Key Impact Metrics',
      description: 'These highlight the real financial impact - overdraft fees avoided, payday loans prevented, and more.',
      page: '/impact-stats',
      selector: '[data-tour="impact-stats"]',
      action: null,
    },
    {
      id: 'impact-quotes',
      title: 'Employee Stories',
      description: 'Real quotes from employees about how the program has helped them.',
      page: '/impact-stats',
      selector: '[data-tour="impact-quotes"]',
      action: null,
    },
    {
      id: 'impact-export',
      title: 'Export Testimonials',
      description: 'Download employee quotes for presentations and reports.',
      page: '/impact-stats',
      selector: '[data-tour="impact-export"]',
      action: null,
    },
    {
      id: 'impact-done',
      title: "Impact Champion! 🎉",
      description: "You know how to showcase your program's ROI.",
      page: '/impact-stats',
      selector: null,
      action: null,
    },
  ],
  '/downloads': [
    {
      id: 'downloads-welcome',
      title: 'Welcome to Downloads! 📥',
      description: "Let me show you how to generate and download reports.",
      page: '/downloads',
      selector: null,
      action: null,
    },
    {
      id: 'downloads-period',
      title: 'Select Time Period',
      description: 'Choose the time period for your reports - monthly, quarterly, or yearly.',
      page: '/downloads',
      selector: '[data-tour="download-period"]',
      action: null,
    },
    {
      id: 'downloads-reports',
      title: 'Available Reports',
      description: 'Browse all available report types - transfers, savings, reconciliation, impact, and more.',
      page: '/downloads',
      selector: '[data-tour="download-reports"]',
      action: null,
    },
    {
      id: 'downloads-format',
      title: 'Choose Format',
      description: 'Select your preferred format - PDF for presentations, CSV or Excel for data analysis.',
      page: '/downloads',
      selector: '[data-tour="download-format"]',
      action: null,
    },
    {
      id: 'downloads-bulk',
      title: 'Download All',
      description: 'Use this button to download all reports in a single ZIP file.',
      page: '/downloads',
      selector: '[data-tour="download-all"]',
      action: null,
    },
    {
      id: 'downloads-done',
      title: "Downloads Pro! 🎉",
      description: "You're ready to generate any report you need.",
      page: '/downloads',
      selector: null,
      action: null,
    },
  ],
  '/designed-assets': [
    {
      id: 'assets-welcome',
      title: 'Welcome to Design Assets! 🎨',
      description: "Here are ready-to-use marketing materials to promote your program.",
      page: '/designed-assets',
      selector: null,
      action: null,
    },
    {
      id: 'assets-library',
      title: 'Asset Library',
      description: 'Browse posters, flyers, digital assets, and email templates - all professionally designed.',
      page: '/designed-assets',
      selector: '[data-tour="assets-library"]',
      action: null,
    },
    {
      id: 'assets-preview',
      title: 'Preview & Download',
      description: 'Click any asset to preview it, then download in your preferred format.',
      page: '/designed-assets',
      selector: '[data-tour="asset-card"]',
      action: null,
    },
    {
      id: 'assets-done',
      title: "Marketing Ready! 🎉",
      description: "You've got everything you need to promote your EWA program.",
      page: '/designed-assets',
      selector: null,
      action: null,
    },
  ],
  '/settings': [
    {
      id: 'settings-welcome',
      title: 'Welcome to Settings! ⚙️',
      description: "Let me show you how to customize your admin experience.",
      page: '/settings',
      selector: null,
      action: null,
    },
    {
      id: 'settings-profile',
      title: 'Profile Settings',
      description: 'Update your personal information and notification preferences here.',
      page: '/settings',
      selector: '[data-tour="settings-profile"]',
      action: null,
    },
    {
      id: 'settings-notifications',
      title: 'Notifications',
      description: 'Control which alerts and updates you receive.',
      page: '/settings',
      selector: '[data-tour="settings-notifications"]',
      action: null,
    },
    {
      id: 'settings-done',
      title: "All Configured! 🎉",
      description: "Your settings are ready. Remember, I'm always here if you need help!",
      page: '/settings',
      selector: null,
      action: null,
    },
  ],
}

const getTourStepsForPath = (path) => pageTours[path] || fullTourSteps

// Get friendly page name for tour button
const getPageName = (path) => {
  const pageNames = {
    '/employees': 'Employees',
    '/shifts-pay': 'Shifts & Pay',
    '/transfers': 'Transfers',
    '/savings': 'Savings',
    '/adoption-usage': 'Adoption & Usage',
    '/impact-stats': 'Impact Stats',
    '/downloads': 'Reports',
    '/designed-assets': 'Design Assets',
    '/settings': 'Settings',
  }
  return pageNames[path] || 'This'
}

// Use shared PennyAvatar component (aliased as PennyRobot for backward compatibility)
const PennyRobot = PennyAvatar

// Main Tour Guide Component
function TourGuide() {
  const navigate = useNavigate()
  const location = useLocation()
  const { openChat, messages, isOpen: isChatOpen } = usePennyChat()
  const [isOpen, setIsOpen] = useState(false)
  const [isTourActive, setIsTourActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showBubble, setShowBubble] = useState(true)
  const [activeTourSteps, setActiveTourSteps] = useState(fullTourSteps)
  const [returnHomeOnEnd, setReturnHomeOnEnd] = useState(true)
  const [isPageTour, setIsPageTour] = useState(false)
  const [highlightedElement, setHighlightedElement] = useState(null)
  const [highlightRect, setHighlightRect] = useState(null)
  const [dialogPosition, setDialogPosition] = useState({ top: '50%', left: '50%' })
  const [pennyBounce, setPennyBounce] = useState(false)
  const [pennyWaving, setPennyWaving] = useState(false)
  const [pennyStanding, setPennyStanding] = useState(false)
  const [showFirstVisitOverlay, setShowFirstVisitOverlay] = useState(false)
  const [showIdleNudge, setShowIdleNudge] = useState(false)
  const [showSpotlight, setShowSpotlight] = useState(false)
  const prevPathRef = React.useRef(location.pathname)
  const idleTimerRef = React.useRef(null)

  // Penny bounce on page navigation, with wave and stand on home page
  useEffect(() => {
    if (prevPathRef.current !== location.pathname && !isTourActive) {
      setPennyBounce(true)
      const bounceTimer = setTimeout(() => {
        setPennyBounce(false)
        // On home page, after bounce, stand up and wave
        if (location.pathname === '/') {
          setPennyStanding(true)
          setPennyWaving(true)
          // Stop waving after 2 seconds but stay standing for a bit longer
          const waveTimer = setTimeout(() => {
            setPennyWaving(false)
            // Return to normal after another second
            const standTimer = setTimeout(() => {
              setPennyStanding(false)
            }, 1000)
            return () => clearTimeout(standTimer)
          }, 2000)
          return () => clearTimeout(waveTimer)
        }
      }, 600)
      prevPathRef.current = location.pathname
      return () => clearTimeout(bounceTimer)
    }
    prevPathRef.current = location.pathname
  }, [location.pathname, isTourActive])

  // Check if this is user's first visit and show welcome overlay on home page
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
    if (!hasSeenWelcome && location.pathname === '/') {
      // Show welcome overlay after a short delay
      setTimeout(() => {
        setShowFirstVisitOverlay(true)
        setShowBubble(true)
      }, 500)
    }
  }, [])

  // Dismiss first visit overlay
  const dismissFirstVisitOverlay = () => {
    setShowFirstVisitOverlay(false)
    localStorage.setItem('hasSeenWelcome', 'true')
  }

  // Hide initial bubble after some time
  useEffect(() => {
    if (showBubble && !isTourActive) {
      const timer = setTimeout(() => {
        setShowBubble(false)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [showBubble, isTourActive])

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Idle timer - show nudge after 30 seconds of no interaction
  useEffect(() => {
    // Don't run idle timer if tour is active, menu is open, or first visit overlay is showing
    if (isTourActive || isOpen || showFirstVisitOverlay || showIdleNudge) {
      return
    }

    const resetIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      setShowIdleNudge(false)

      idleTimerRef.current = setTimeout(() => {
        // Trigger bounce, wave, and show nudge message
        setPennyBounce(true)
        setTimeout(() => {
          setPennyBounce(false)
          setPennyStanding(true)
          setPennyWaving(true)
          setShowIdleNudge(true)

          // Stop waving after 2 seconds
          setTimeout(() => {
            setPennyWaving(false)
            setTimeout(() => {
              setPennyStanding(false)
            }, 1000)
          }, 2000)
        }, 600)
      }, 30000) // 30 seconds
    }

    // Set up event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

    // Initial timer start
    resetIdleTimer()

    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer, { passive: true })
    })

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer)
      })
    }
  }, [isTourActive, isOpen, showFirstVisitOverlay, showIdleNudge, location.pathname])

  // Handle element highlighting and dialog positioning for page tours
  useEffect(() => {
    if (!isTourActive || !isPageTour) {
      setHighlightedElement(null)
      setHighlightRect(null)
      return
    }

    const currentStepData = activeTourSteps[currentStep]
    if (!currentStepData) return

    // Execute action if present
    if (currentStepData.action) {
      window.dispatchEvent(new CustomEvent('tour-action', { 
        detail: { action: currentStepData.action } 
      }))
    }

    // Small delay to let any modals open before trying to find elements
    const findElementTimer = setTimeout(() => {
      if (currentStepData.selector) {
        const element = document.querySelector(currentStepData.selector)
        if (element) {
          setHighlightedElement(element)
          const rect = element.getBoundingClientRect()
          setHighlightRect(rect)
          
          // Scroll element into view if needed
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          
          // Position dialog near the element
          setTimeout(() => {
            const updatedRect = element.getBoundingClientRect()
            setHighlightRect(updatedRect)
            calculateDialogPosition(updatedRect)
          }, 300)
        } else {
          setHighlightedElement(null)
          setHighlightRect(null)
          setDialogPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
        }
      } else {
        setHighlightedElement(null)
        setHighlightRect(null)
        setDialogPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
      }
    }, currentStepData.action ? 400 : 100)

    return () => clearTimeout(findElementTimer)
  }, [isTourActive, isPageTour, currentStep, activeTourSteps])

  // Update highlight position on scroll/resize
  useEffect(() => {
    if (!highlightedElement) return

    const updatePosition = () => {
      const rect = highlightedElement.getBoundingClientRect()
      setHighlightRect(rect)
      calculateDialogPosition(rect)
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [highlightedElement])

  const calculateDialogPosition = (rect) => {
    const dialogWidth = 400
    const dialogHeight = 280
    const padding = 20
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let top, left, transform = ''

    // Prefer positioning to the right of the element
    if (rect.right + dialogWidth + padding < viewportWidth) {
      left = rect.right + padding
      top = Math.max(padding, Math.min(rect.top, viewportHeight - dialogHeight - padding))
    }
    // Try left side
    else if (rect.left - dialogWidth - padding > 0) {
      left = rect.left - dialogWidth - padding
      top = Math.max(padding, Math.min(rect.top, viewportHeight - dialogHeight - padding))
    }
    // Try below
    else if (rect.bottom + dialogHeight + padding < viewportHeight) {
      left = Math.max(padding, Math.min(rect.left, viewportWidth - dialogWidth - padding))
      top = rect.bottom + padding
    }
    // Try above
    else if (rect.top - dialogHeight - padding > 0) {
      left = Math.max(padding, Math.min(rect.left, viewportWidth - dialogWidth - padding))
      top = rect.top - dialogHeight - padding
    }
    // Default to center
    else {
      left = '50%'
      top = '50%'
      transform = 'translate(-50%, -50%)'
    }

    setDialogPosition({ 
      top: typeof top === 'number' ? `${top}px` : top, 
      left: typeof left === 'number' ? `${left}px` : left,
      transform
    })
  }

  const startFullTour = () => {
    setIsOpen(false)
    setActiveTourSteps(fullTourSteps)
    setReturnHomeOnEnd(true)
    setIsPageTour(false)
    setIsTourActive(true)
    setCurrentStep(0)
    setShowBubble(false)
    // Navigate to first step's page
    if (fullTourSteps[0].page !== location.pathname) {
      navigate(fullTourSteps[0].page)
    }
  }

  const startPageTour = (path) => {
    const steps = getTourStepsForPath(path)
    const isFullTour = steps === fullTourSteps
    setIsOpen(false)
    setActiveTourSteps(steps)
    setReturnHomeOnEnd(isFullTour)
    setIsPageTour(!isFullTour)
    setIsTourActive(true)
    setCurrentStep(0)
    setShowBubble(false)
    if (steps[0]?.page && steps[0].page !== location.pathname) {
      navigate(steps[0].page)
    }
  }

  const endTour = () => {
    // Close any open modals before ending
    window.dispatchEvent(new CustomEvent('tour-action', { 
      detail: { action: 'closeAllModals' } 
    }))
    setIsTourActive(false)
    setIsPageTour(false)
    setCurrentStep(0)
    setHighlightedElement(null)
    setHighlightRect(null)
    localStorage.setItem('hasSeenTour', 'true')
    if (returnHomeOnEnd) {
      navigate('/')
    }
  }

  const nextStep = () => {
    if (currentStep < activeTourSteps.length - 1) {
      setIsAnimating(true)
      const nextStepIndex = currentStep + 1
      const nextStepData = activeTourSteps[nextStepIndex]
      
      // Navigate if needed
      if (nextStepData.page !== location.pathname) {
        navigate(nextStepData.page)
      }
      
      setTimeout(() => {
        setCurrentStep(nextStepIndex)
        setIsAnimating(false)
      }, 300)
    } else {
      endTour()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setIsAnimating(true)
      const prevStepIndex = currentStep - 1
      const prevStepData = activeTourSteps[prevStepIndex]
      
      if (prevStepData.page !== location.pathname) {
        navigate(prevStepData.page)
      }
      
      setTimeout(() => {
        setCurrentStep(prevStepIndex)
        setIsAnimating(false)
      }, 300)
    }
  }

  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < activeTourSteps.length) {
      setIsAnimating(true)
      const stepData = activeTourSteps[stepIndex]
      
      if (stepData.page !== location.pathname) {
        navigate(stepData.page)
      }
      
      setTimeout(() => {
        setCurrentStep(stepIndex)
        setIsAnimating(false)
      }, 300)
    }
  }

  const currentStepData = activeTourSteps[currentStep] || activeTourSteps[0]

  return (
    <>
      {/* First Visit Blur Overlay - highlights Penny by blurring everything else */}
      {showFirstVisitOverlay && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md cursor-pointer transition-all duration-300"
          onClick={dismissFirstVisitOverlay}
          aria-label="Click anywhere to dismiss and explore"
        />
      )}

      {/* Floating Penny Button */}
      <div className={`fixed bottom-6 right-6 ${showFirstVisitOverlay ? 'z-50' : 'z-50'}`}>
        {/* Initial greeting bubble */}
        {showBubble && !isTourActive && !showIdleNudge && (
          <div className="absolute bottom-full right-0 mb-2 animate-bounce-slow">
            <div className={`bg-white rounded-2xl shadow-xl p-4 max-w-xs border-2 border-purple-200 relative ${showFirstVisitOverlay ? 'ring-4 ring-purple-400 ring-opacity-60 shadow-2xl' : ''}`}>
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r-2 border-b-2 border-purple-200 transform rotate-45" />
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-purple-600">Hi there, I'm Penny! 👋</span><br />
                Tap me anytime for help or a tour!
              </p>
              {showFirstVisitOverlay && (
                <p className="text-xs text-purple-500 mt-2 font-medium">Click anywhere to continue</p>
              )}
            </div>
          </div>
        )}

        {/* Idle nudge bubble - shows after 30 seconds of inactivity */}
        {showIdleNudge && !isTourActive && !isOpen && (
          <div className="absolute bottom-full right-0 mb-2 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl p-4 max-w-xs border-2 border-purple-200 relative">
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r-2 border-b-2 border-purple-200 transform rotate-45" />
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-purple-600">Need assistance? 🤔</span><br />
                Tap for a quick tour!
              </p>
            </div>
          </div>
        )}

        {/* Menu popup */}
        {isOpen && !isTourActive && (
          <div className="absolute bottom-full right-0 mb-2 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200 w-64">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3">
                <p className="text-white font-semibold">Hey! I'm Penny 👋</p>
                <p className="text-purple-200 text-xs">Your EWA Assistant</p>
              </div>
              <div className="p-3 space-y-2">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setShowSpotlight(true)
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-fuchsia-50 to-purple-50 hover:from-fuchsia-100 hover:to-purple-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💬</span>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-fuchsia-700">Ask Penny</p>
                      <p className="text-xs text-gray-500">Get instant answers</p>
                    </div>
                  </div>
                </button>
                {/* Page-specific tour button (for non-Home pages) */}
                {location.pathname !== '/' && (
                  <button
                    onClick={() => startPageTour(location.pathname)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🎯</span>
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-purple-700">
                          Tour {getPageName(location.pathname)} Page
                        </p>
                        <p className="text-xs text-gray-500">Learn about this section</p>
                      </div>
                    </div>
                  </button>
                )}
                {/* Full tour button (only on Home page) */}
                {location.pathname === '/' && (
                  <>
                    <button
                      onClick={startFullTour}
                      className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🎯</span>
                        <div>
                          <p className="font-medium text-gray-900 group-hover:text-purple-700">Take the Tour</p>
                          <p className="text-xs text-gray-500">Learn about all features</p>
                        </div>
                      </div>
                    </button>
                    <p className="text-xs text-gray-500 px-4 py-2 text-center italic">
                      On any page, click on me for a detailed tour!
                    </p>
                  </>
                )}
                <div className="px-4 py-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-gray-600">All services live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Penny Button */}
        <button
          onClick={() => {
            // If first visit overlay is showing, dismiss it and open menu in one click
            if (showFirstVisitOverlay) {
              dismissFirstVisitOverlay()
              setIsOpen(true)
              return
            }
            // Dismiss idle nudge when clicking Penny
            if (showIdleNudge) {
              setShowIdleNudge(false)
            }
            if (isTourActive) return
            // If chat has messages, open the chat instead of menu
            if (messages.length > 0) {
              openChat()
              setIsOpen(false)
              return
            }
            // Show menu on all pages
            setIsOpen(!isOpen)
          }}
          className={`relative group transition-transform hover:scale-105 ${isTourActive ? 'cursor-default' : 'cursor-pointer'} ${pennyBounce ? 'animate-penny-bounce' : ''}`}
          aria-label="Tour Guide"
        >
          <div className={`absolute inset-0 bg-purple-400 rounded-full blur-xl transition-opacity ${showFirstVisitOverlay ? 'opacity-70 animate-pulse' : isTourActive ? 'opacity-30 animate-pulse' : 'opacity-30 group-hover:opacity-50'}`} />
          <div className={`relative bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full p-2 shadow-lg border-2 transition-all duration-300 ${showFirstVisitOverlay ? 'border-purple-400 shadow-2xl shadow-purple-400/50 scale-110' : pennyStanding ? 'border-purple-200 hover:border-purple-400 scale-110' : 'border-purple-200 hover:border-purple-400'}`}>
            <PennyRobot 
              id="floating"
              isWaving={isOpen || showBubble || pennyWaving} 
              isTalking={isTourActive} 
              isStanding={pennyStanding}
              size={70} 
            />
          </div>
          {/* Notification dot */}
          {!localStorage.getItem('hasSeenTour') && !isTourActive && (
            <span className="absolute top-0 right-0 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" />
            </span>
          )}
        </button>
      </div>

      {/* Tour Overlay - Full tour (non-immersive) */}
      {isTourActive && !isPageTour && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" />
          
          {/* Tour Dialog */}
          <div 
            className={`fixed z-50 transition-all duration-300 ${
              currentStepData.position === 'center' 
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:left-auto md:right-8 md:translate-x-0'
            } ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md w-full mx-4 border border-purple-100">
              {/* Header with progress */}
              <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <PennyRobot id="dialog" size={32} isTalking={true} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Penny</p>
                      <p className="text-purple-200 text-xs">Tour Guide</p>
                    </div>
                  </div>
                  <button
                    onClick={endTour}
                    className="text-white/70 hover:text-white transition-colors p-1"
                    aria-label="Exit tour"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Progress bar */}
                <div className="flex gap-1">
                  {activeTourSteps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToStep(index)}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        index <= currentStep 
                          ? 'bg-white' 
                          : 'bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Go to step ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {currentStepData.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {currentStepData.description}
                    </p>
                  </div>
                </div>
                
                {/* Step indicator */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-4">
                    Step {currentStep + 1} of {activeTourSteps.length}
                  </p>
                  
                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        currentStep === 0
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      ← Back
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={endTour}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all"
                      >
                        Skip Tour
                      </button>
                      <button
                        onClick={nextStep}
                        className="px-6 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                      >
                        {currentStep === activeTourSteps.length - 1 ? 'Finish! 🎉' : 'Next →'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Immersive Page Tour Overlay */}
      {isTourActive && isPageTour && (
        <>
          {/* Spotlight Overlay - SVG mask for highlight cutout */}
          <svg className="fixed inset-0 w-full h-full z-40 pointer-events-none" style={{ isolation: 'isolate' }}>
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {highlightRect && (
                  <rect
                    x={highlightRect.left - 8}
                    y={highlightRect.top - 8}
                    width={highlightRect.width + 16}
                    height={highlightRect.height + 16}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.6)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Glowing border around highlighted element */}
          {highlightRect && (
            <div
              className="fixed z-40 pointer-events-none rounded-xl animate-tour-glow"
              style={{
                top: highlightRect.top - 8,
                left: highlightRect.left - 8,
                width: highlightRect.width + 16,
                height: highlightRect.height + 16,
                boxShadow: '0 0 0 4px rgba(147, 51, 234, 0.5), 0 0 20px rgba(147, 51, 234, 0.4), 0 0 40px rgba(147, 51, 234, 0.2)',
                border: '2px solid rgba(147, 51, 234, 0.8)',
              }}
            />
          )}

          {/* Click-through overlay for non-highlighted areas */}
          <div className="fixed inset-0 z-40" onClick={(e) => e.stopPropagation()} />

          {/* Tour Dialog - positioned near highlighted element */}
          <div 
            className={`fixed z-50 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
            style={{
              top: dialogPosition.top,
              left: dialogPosition.left,
              transform: dialogPosition.transform || 'none',
              maxWidth: '400px',
              width: 'calc(100vw - 40px)',
            }}
          >
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
              {/* Header with progress */}
              <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-5 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <PennyRobot id="page-dialog" size={24} isTalking={true} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Penny</p>
                      <p className="text-purple-200 text-[10px]">Page Tour</p>
                    </div>
                  </div>
                  <button
                    onClick={endTour}
                    className="text-white/70 hover:text-white transition-colors p-1"
                    aria-label="Exit tour"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Progress bar */}
                <div className="flex gap-0.5">
                  {activeTourSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        index <= currentStep 
                          ? 'bg-white' 
                          : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {currentStepData.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {currentStepData.description}
                </p>
                
                {/* Navigation */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {currentStep + 1} / {activeTourSteps.length}
                  </span>
                  
                  <div className="flex gap-2">
                    {currentStep > 0 && (
                      <button
                        onClick={prevStep}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
                      >
                        ← Back
                      </button>
                    )}
                    <button
                      onClick={endTour}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all"
                    >
                      Skip
                    </button>
                    <button
                      onClick={nextStep}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
                    >
                      {currentStep === activeTourSteps.length - 1 ? 'Done! 🎉' : 'Next →'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes penny-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-12px) scale(1.05); }
          50% { transform: translateY(0) scale(1); }
          75% { transform: translateY(-6px) scale(1.02); }
        }
        @keyframes tour-glow {
          0%, 100% { 
            box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.5), 0 0 20px rgba(147, 51, 234, 0.4), 0 0 40px rgba(147, 51, 234, 0.2);
          }
          50% { 
            box-shadow: 0 0 0 6px rgba(147, 51, 234, 0.6), 0 0 30px rgba(147, 51, 234, 0.5), 0 0 60px rgba(147, 51, 234, 0.3);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-penny-bounce {
          animation: penny-bounce 0.6s ease-out;
        }
        .animate-tour-glow {
          animation: tour-glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Penny Spotlight Modal */}
      <PennySpotlightModal
        isOpen={showSpotlight}
        onClose={() => setShowSpotlight(false)}
      />
    </>
  )
}

export default TourGuide
