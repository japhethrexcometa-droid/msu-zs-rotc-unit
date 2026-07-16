import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import './index.css'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
  })
}

if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'always',
    capture_pageview: true,
    capture_pageleave: true,
    defaults: '2026-05-30',
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000)
    },
    mutations: {
      retry: 1
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PostHogProvider client={posthog}>
            <App />
          </PostHogProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#2d5a3d',
                color: '#e8f5e9',
                border: '1px solid #3d6b4a'
              },
              duration: 3000
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

