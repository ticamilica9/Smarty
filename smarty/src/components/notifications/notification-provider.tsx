'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

interface Notification {
  type: string
  title: string
  message?: string
  link?: string
  metadata?: Record<string, unknown>
}

/**
 * NotificationProvider connects to the SSE endpoint and displays
 * real-time notifications as toast popups.
 *
 * Place this inside a TRPCProvider + SessionProvider in the root layout.
 */
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // Create EventSource connection to the SSE endpoint.
    // EventSource auto-reconnects on connection loss.
    const eventSource = new EventSource('/api/sse')

    eventSource.addEventListener('connected', () => {
      // Connection established — nothing to do yet
    })

    eventSource.addEventListener('notification', (event: MessageEvent) => {
      try {
        const notification: Notification = JSON.parse(event.data)

        const action = notification.link
          ? {
              label: 'Vezi',
              onClick: () => {
                window.location.href = notification.link!
              },
            }
          : undefined

        toast(notification.title, {
          description: notification.message,
          action,
          duration: 6000,
        })
      } catch {
        // Ignore malformed notification payloads
      }
    })

    eventSource.onerror = () => {
      // EventSource will automatically attempt to reconnect
    }

    return () => {
      eventSource.close()
    }
  }, [])

  return <>{children}</>
}
