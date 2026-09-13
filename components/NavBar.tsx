'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

interface NavBarProps {
  userEmail?: string | null
}

export default function NavBar({ userEmail }: NavBarProps) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await supabaseBrowser.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🔥</span>
            <span className="text-xl font-bold text-white">
              Claim<span className="text-amber-400">Forge</span>
            </span>
          </a>

          {/* Nav Links */}
          <nav className="ml-6 flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-gray-200 text-sm transition-colors">
              Home
            </a>
            <a href="/audits" className="text-gray-400 hover:text-gray-200 text-sm transition-colors">
              History
            </a>
          </nav>

          {/* Right: user info + sign out */}
          <div className="ml-auto flex items-center gap-3">
            {userEmail && (
              <span className="text-xs text-gray-500 hidden sm:block">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
