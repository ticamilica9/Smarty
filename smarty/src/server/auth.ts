import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
    }
  }
}

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  pages: {
    signIn: '/login',
    newUser: '/inregistrare',
  },
  providers: [
    ...(process.env.EMAIL_SERVER
      ? [
          EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM || 'noreply@smarty.ro',
          }),
        ]
      : []),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        ;(session.user as unknown as Record<string, unknown>).id = user.id
        ;(session.user as unknown as Record<string, unknown>).role =
          (user as unknown as Record<string, unknown>).role || 'USER'
      }
      return session
    },
  },
}

export const { handlers, auth } = NextAuth(authOptions)
