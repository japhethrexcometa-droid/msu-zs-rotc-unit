import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Fires a PostHog $pageview event on every React Router route change.
 * Uses window.posthog (loaded via HTML snippet in index.html).
 */
export default function PostHogPageTracker() {
  const location = useLocation()

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).posthog) {
      ;(window as any).posthog.capture('$pageview', {
        $current_url: window.location.href,
      })
    }
  }, [location.pathname])

  return null
}
