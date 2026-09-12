import UploadZone from '@/components/UploadZone'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-amber-950/30 border border-amber-800 rounded-full px-4 py-1.5 text-amber-400 text-sm font-medium mb-6">
          <span>🔥💧</span>
          <span>Powered by IICRC S-500 · S-700 (2025) + Claude AI</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          Audit your estimate<br />
          <span className="text-amber-400">before the carrier does</span>
        </h1>

        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Upload your Xactimate PDF. ClaimForge reads it against S-500 (water) and S-700 (fire/smoke), flags missing line items,
          weak F9 notes, and common denial triggers — then gives you ready-to-paste F9 language.
        </p>
      </div>

      {/* Upload Zone */}
      <UploadZone />

      {/* Trust Signals */}
      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
        <div className="text-center">
          <div className="text-2xl mb-2">📋</div>
          <div className="text-gray-300 font-medium text-sm">S-500 + S-700 Baked In</div>
          <div className="text-gray-600 text-xs mt-1">Water audits use S-500; fire/smoke use S-700 (2025)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-2">⚡</div>
          <div className="text-gray-300 font-medium text-sm">~60 Second Audit</div>
          <div className="text-gray-600 text-xs mt-1">Claude reads the full estimate instantly</div>
        </div>
        <div className="text-center">
          <div className="text-2xl mb-2">📝</div>
          <div className="text-gray-300 font-medium text-sm">Ready-to-Paste F9 Notes</div>
          <div className="text-gray-600 text-xs mt-1">No writing — copy and paste into Xactimate</div>
        </div>
      </div>
    </div>
  )
}
