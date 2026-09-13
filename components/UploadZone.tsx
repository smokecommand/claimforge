'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type LossType = 'water' | 'fire+smoke' | 'water+fire+smoke'

const CARRIERS = [
  'Not Specified',
  'State Farm',
  'Allstate',
  'Farmers',
  'USAA',
  'Citizens',
  'Liberty Mutual',
  'Nationwide',
  'Travelers',
  'Auto-Owners',
  'Erie',
  'Other',
]

function getFileType(file: File): 'pdf' | 'esx' | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.esx')) return 'esx'
  return null
}

export default function UploadZone() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<'pdf' | 'esx' | null>(null)
  const [jobName, setJobName] = useState('')
  const [claimNumber, setClaimNumber] = useState('')
  const [lossType, setLossType] = useState<LossType>('fire+smoke')
  const [carrier, setCarrier] = useState('Not Specified')
  const [jobNotes, setJobNotes] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateAndSetFile = (file: File) => {
    const type = getFileType(file)
    if (!type) {
      setError('Only PDF and ESX files are accepted')
      return
    }
    setSelectedFile(file)
    setFileType(type)
    setError(null)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      validateAndSetFile(file)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSetFile(file)
    }
  }, [])

  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a PDF or ESX file')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress('Preparing upload...')

    try {
      // Step 1: Get signed upload URL + create audit record
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          lossType,
          jobName: jobName.trim() || undefined,
          claimNumber: claimNumber.trim() || undefined,
          carrier: carrier !== 'Not Specified' ? carrier : undefined,
          jobNotes: jobNotes.trim() || undefined,
        }),
      })

      const presignData = await presignRes.json()
      if (!presignRes.ok) throw new Error(presignData.error || 'Failed to prepare upload')

      const { auditId, filePath, token } = presignData

      // Step 2: Upload file directly to Supabase Storage (no Vercel size limit)
      setUploadProgress(`Uploading ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB...`)
      const { error: uploadError } = await supabaseBrowser.storage
        .from('claimforge-pdfs')
        .uploadToSignedUrl(filePath, token, selectedFile, {
          contentType: fileType === 'pdf' ? 'application/pdf' : 'application/zip',
        })

      if (uploadError) throw new Error(uploadError.message || 'File upload failed')

      // Step 3: Kick off the audit
      setUploadProgress('Starting audit...')
      const startRes = await fetch('/api/upload/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId }),
      })

      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error || 'Failed to start audit')

      router.push(`/audit/${auditId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setUploadProgress(null)
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-amber-400 bg-amber-950/20'
            : selectedFile
              ? 'border-emerald-600 bg-emerald-950/10'
              : 'border-gray-700 bg-gray-900/50 hover:border-amber-600 hover:bg-amber-950/10'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.esx,application/pdf,application/zip"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {selectedFile ? (
          <div className="space-y-2">
            <div className="text-4xl">{fileType === 'esx' ? '📦' : '📄'}</div>
            <div className="text-emerald-400 font-medium text-lg">{selectedFile.name}</div>
            <div className="flex items-center justify-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                  fileType === 'esx'
                    ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800'
                    : 'text-gray-400 bg-gray-800 border-gray-700'
                }`}
              >
                {fileType?.toUpperCase()}
              </span>
              <span className="text-gray-400 text-sm">{formatFileSize(selectedFile.size)}</span>
            </div>
            {!isUploading && (
              <div className="text-gray-500 text-xs mt-2">Click to change file</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-5xl">📋</div>
            <div className="text-gray-200 font-medium text-lg">Drop your Xactimate PDF or ESX file here</div>
            <div className="text-gray-500 text-sm">or click to browse</div>
            <div className="text-gray-600 text-xs">PDF or ESX files up to 50MB</div>
          </div>
        )}
      </div>

      {/* Metadata Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            Job Name <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="text"
            value={jobName}
            onChange={(e) => setJobName(e.target.value)}
            placeholder="e.g. Smith Residence"
            disabled={isUploading}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">
            Claim # <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="text"
            value={claimNumber}
            onChange={(e) => setClaimNumber(e.target.value)}
            placeholder="e.g. CLM-2026-00123"
            disabled={isUploading}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 text-sm"
          />
        </div>
      </div>

      {/* Loss Type */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Loss Type</label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: 'water', label: '💧 Water', desc: 'Water only' },
            { value: 'fire+smoke', label: '🔥 Fire + Smoke', desc: 'Fire/smoke loss' },
            { value: 'water+fire+smoke', label: '🌊🔥 Water + Fire', desc: 'Combined loss' },
          ] as const).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLossType(option.value)}
              disabled={isUploading}
              className={`
                p-3 rounded-lg border text-center transition-all duration-150 disabled:opacity-50
                ${lossType === option.value
                  ? 'border-amber-500 bg-amber-950/30 text-amber-300'
                  : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-600'
                }
              `}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Carrier Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">
          Carrier <span className="text-gray-600">(optional)</span>
        </label>
        <select
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          disabled={isUploading}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 text-sm"
        >
          {CARRIERS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Job Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">
          Estimator Notes <span className="text-gray-600">(optional)</span>
        </label>
        <textarea
          value={jobNotes}
          onChange={(e) => setJobNotes(e.target.value)}
          placeholder="e.g. Cat 3 loss, fire suppression water used, PVC pipes burned in kitchen, homeowner has 2 dogs..."
          disabled={isUploading}
          rows={3}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 text-sm resize-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-800 text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!selectedFile || isUploading}
        className={`
          w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200
          ${selectedFile && !isUploading
            ? 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer shadow-lg shadow-amber-900/30'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }
        `}
      >
        {isUploading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {uploadProgress || 'Uploading...'}
          </span>
        ) : (
          '🔍 Run Audit'
        )}
      </button>

      <p className="text-center text-xs text-gray-600">
        Audit runs against ANSI/IICRC S-500 (Water) · S-700 (2025, Fire/Smoke) · NADCA ACR-2021 · OSHA 29 CFR 1910
      </p>
    </div>
  )
}
