import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'

export const authOptions: NextAuthConfig = {
  providers: [],
  session: { strategy: 'database' },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        ;(session.user as unknown as Record<string, unknown>).id = user.id
        ;(session.user as unknown as Record<string, unknown>).role = (user as unknown as Record<string, unknown>).role || 'USER'
      }
      return session
    },
  },
}

export const { handlers, auth } = NextAuth(authOptions)
