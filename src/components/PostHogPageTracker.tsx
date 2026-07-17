import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import posthog from 'posthog-js'

/**
 * Fires a PostHog $pageview event on every React Router route change.
 * React SPAs never reload the page, so PostHog's automatic capture only
 * fires once. This component manually tracks every navigation.
 */
export default function PostHogPageTracker() {
  const location = useLocation()

  useEffect(() => {
    posthog.capture('$pageview', {
      $current_url: window.location.href,
    })
  }, [location.pathname])

  return null
}
