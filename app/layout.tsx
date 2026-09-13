import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClaimForge — Xactimate Estimate Auditor',
  description: 'AI-powered Xactimate estimate audit tool for restoration contractors. Catch gaps before the carrier does.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔥</text></svg>",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen antialiased`}>
        {/* Top Nav */}
        <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-14">
              <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="text-2xl">🔥</span>
                <span className="text-xl font-bold text-white">
                  Claim<span className="text-amber-400">Forge</span>
                </span>
              </a>
              <div className="ml-4 text-gray-600 text-sm hidden sm:block">
                Xactimate Estimate Auditor
              </div>
              <nav className="ml-6 flex items-center gap-4">
                <a href="/audits" className="text-gray-400 hover:text-gray-200 text-sm transition-colors">History</a>
              </nav>
              <div className="ml-auto text-xs text-gray-600 hidden md:block">
                Patriot Water Mitigation Specialists / Restore Medics USA
              </div>
            </div>
          </div>
        </nav>

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
