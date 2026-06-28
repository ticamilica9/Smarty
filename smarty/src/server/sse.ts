import Redis from 'ioredis'

let publisher: Redis | null = null

function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6381'
}

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 2000)
      },
    })
    publisher.on('error', (err) => {
      console.error('Redis publisher error:', err)
    })
  }
  return publisher
}

export type NotificationType = 'OFFER_RECEIVED' | 'RFQ_OFFER_RECEIVED' | (string & {})

export interface Notification {
  type: NotificationType
  title: string
  message?: string
  link?: string
  metadata?: Record<string, unknown>
}

/**
 * Publish a notification to a user's Redis channel.
 * The user's SSE connection will pick it up and push it to the browser.
 * This is fire-and-forget -- errors are logged but not thrown to the caller.
 */
export async function sendNotification(
  userId: string,
  notification: Notification,
): Promise<void> {
  try {
    const redis = getPublisher()
    const payload = JSON.stringify(notification)
    await redis.publish(`user:${userId}:notifications`, payload)
  } catch (err) {
    console.error('Failed to send notification:', err)
  }
}

/**
 * Subscribe to a user's notification channel and invoke `onMessage` for each
 * notification received. Returns an unsubscribe function.
 *
 * Each call creates a dedicated Redis subscriber connection (required because
 * Redis pub/sub is stateful per connection).
 */
export function subscribeToNotifications(userId: string): {
  subscribe: (onMessage: (notification: Notification) => void) => () => void
} {
  const subscriber = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null
      return Math.min(times * 200, 2000)
    },
  })
  const channel = `user:${userId}:notifications`

  subscriber.on('error', (err) => {
    console.error('Redis subscriber error:', err)
  })

  return {
    subscribe(onMessage) {
      subscriber.subscribe(channel, (err) => {
        if (err) {
          console.error('Redis subscribe error:', err)
        }
      })

      subscriber.on('message', (_channel, message) => {
        if (_channel === channel) {
          try {
            const notification = JSON.parse(message) as Notification
            onMessage(notification)
          } catch {
            console.error('Failed to parse SSE notification message:', message)
          }
        }
      })

      return () => {
        try {
          subscriber.unsubscribe(channel)
          subscriber.quit()
        } catch {
          // Ignore cleanup errors
        }
      }
    },
  }
}
