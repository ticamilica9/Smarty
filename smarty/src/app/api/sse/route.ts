import { auth } from '@/server/auth'
import { subscribeToNotifications } from '@/server/sse'

/**
 * SSE endpoint — streams real-time notifications to authenticated users.
 * Each connection spawns a Redis subscriber and keeps the connection alive
 * with periodic keepalive comments. Cleanup happens on disconnect.
 */
export async function GET(req: Request) {
  const session = await auth()

  if (!session?.user) {
    return new Response('Neautorizat', { status: 401 })
  }

  const userId = session.user.id

  const stream = new ReadableStream({
    start(controller) {
      // Signal that the connection is established
      controller.enqueue(
        new TextEncoder().encode('event: connected\ndata: {}\n\n'),
      )

      // Subscribe to the user's notification channel
      const sub = subscribeToNotifications(userId)
      const unsubscribe = sub.subscribe((notification) => {
        const data = JSON.stringify(notification)
        controller.enqueue(
          new TextEncoder().encode(
            `event: notification\ndata: ${data}\n\n`,
          ),
        )
      })

      // Send a keepalive comment every 30 seconds to prevent proxy timeouts
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepalive)
        }
      }, 30000)

      // Clean up when the client disconnects
      req.signal.addEventListener('abort', () => {
        clearInterval(keepalive)
        unsubscribe()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
