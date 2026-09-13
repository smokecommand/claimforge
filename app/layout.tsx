import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import { createSupabaseServerClient } from '@/lib/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClaimForge — Xactimate Estimate Auditor',
  description: 'AI-powered Xactimate estimate audit tool for restoration contractors. Catch gaps before the carrier does.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔥</text></svg>",
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Try to get user email for NavBar; ignore errors (e.g. on login page before session exists)
  let userEmail: string | null = null
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    userEmail = user?.email ?? null
  } catch {
    // not authenticated — login page will handle redirect
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen antialiased`}>
        <NavBar userEmail={userEmail} />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-xs text-gray-600">
              ClaimForge — Auditing against ANSI/IICRC S-700 (2025) · NADCA ACR-2021 · OSHA 29 CFR 1910
              <br />
              <span className="text-gray-700">Patriot Water Mitigation Specialists / Restore Medics USA</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
