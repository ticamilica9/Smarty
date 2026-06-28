import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import EmailProvider from 'next-auth/providers/email'
import Credentials from 'next-auth/providers/credentials'

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
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    newUser: '/inregistrare',
  },
  providers: [
    // DEMO: Credentials provider for testing without real auth
    Credentials({
      name: 'Demo Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string }

        // Admin account
        if (email === 'admin@smarty.ro' && password === 'admin123') {
          return {
            id: 'admin-1',
            name: 'Admin Smarty',
            email: 'admin@smarty.ro',
            image: null,
            role: 'ADMIN',
          }
        }

        // Demo user accounts
        const demoUsers: Record<string, { id: string; name: string; role: string }> = {
          'ana@email.com': { id: 'user-1', name: 'Ana Popescu', role: 'USER' },
          'maria@email.com': { id: 'user-2', name: 'Maria Ionescu', role: 'USER' },
          'elena@email.com': { id: 'user-3', name: 'Elena Vasile', role: 'USER' },
        }

        if (demoUsers[email] && password === 'demo123') {
          return {
            id: demoUsers[email].id,
            name: demoUsers[email].name,
            email,
            image: null,
            role: demoUsers[email].role,
          }
        }

        // Any email with demo123 works (creates a generic demo user)
        if (password === 'demo123') {
          return {
            id: `demo-${Date.now()}`,
            name: email.split('@')[0],
            email,
            image: null,
            role: 'USER',
          }
        }

        return null
      },
    }),

    // Real providers (conditional on env vars being set)
    ...(process.env.EMAIL_SERVER
      ? [
          EmailProvider({
            server: process.env.EMAIL_SERVER,
            from: process.env.EMAIL_FROM || 'noreply@smarty.ro',
          }),
        ]
      : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'USER'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) || 'USER'
      }
      return session
    },
  },
}

export const { handlers, auth } = NextAuth(authOptions)
