'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { UploadCloud, Film, Sparkles, AlertCircle, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

type Stage = 'idle' | 'uploading' | 'saving' | 'processing' | 'done' | 'error'

const MAX_BYTES = 500 * 1024 * 1024 // Cloudinary's free tier tops out around here

export default function UploadPage() {
  const { status } = useSession()
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [percent, setPercent] = useState(0)
  const [stepLabel, setStepLabel] = useState('')
  const [errorText, setErrorText] = useState('')
  const [dragging, setDragging] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const cancelled = useRef(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => () => { cancelled.current = true }, [])

  const busy = stage === 'uploading' || stage === 'saving' || stage === 'processing'

  function chooseFile(next: File | null) {
    if (!next) return

    if (!next.type.startsWith('video/')) {
      toast.error('Please choose a video file')
      return
    }
    if (next.size > MAX_BYTES) {
      toast.error('That file is over 500 MB. Try a shorter video.')
      return
    }

    setFile(next)
    if (!title) setTitle(next.name.replace(/\.[^.]+$/, ''))
  }

  /** Uploads straight to Cloudinary so the file never passes through our server. */
  function uploadToCloudinary(signed: any, video: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const form = new FormData()
      form.append('file', video)
      form.append('api_key', signed.apiKey)
      form.append('timestamp', String(signed.timestamp))
      form.append('signature', signed.signature)
      form.append('folder', signed.folder)

      const xhr = new XMLHttpRequest()
      xhr.open('POST', signed.uploadUrl)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setPercent(Math.round((e.loaded / e.total) * 100))
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300 && data.public_id) {
            resolve(data.public_id as string)
          } else {
            reject(new Error(data?.error?.message || 'Cloudinary rejected the upload'))
          }
        } catch {
          reject(new Error('Cloudinary sent back a response we could not read'))
        }
      }

      xhr.onerror = () => reject(new Error('Network error while uploading'))
      xhr.send(form)
    })
  }

  /**
   * Calls the process endpoint over and over. Each call does one small step, so
   * no single request can hit the serverless time limit.
   */
  async function runPipeline(videoId: string) {
    setStage('processing')
    setPercent(0)
    setStepLabel('Listening to your video')

    for (let guard = 0; guard < 400; guard++) {
      if (cancelled.current) return

      const res = await fetch('/api/videos/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      })

      const data = await res.json()

      if (!res.ok && !data?.retry) {
        throw new Error(data?.error || 'Processing failed')
      }

      if (typeof data.progress === 'number') setPercent(data.progress)
      if (data.step) setStepLabel(data.step)
      if (data.message) setStepLabel(data.message)

      if (data.done) {
        setPercent(100)
        setStage('done')
        toast.success(`${data.clipCount || 0} clips ready`)
        setTimeout(() => router.push('/dashboard'), 1200)
        return
      }

      if (data.status === 'analyzing') setStepLabel('Finding your best moments')

      // A short pause keeps us well clear of any rate limit.
      await new Promise((r) => setTimeout(r, data.retry ? 4000 : 700))
    }

    throw new Error('This video is taking unusually long. Check the dashboard in a few minutes.')
  }

  async function handleStart() {
    if (!file || !title.trim()) {
      toast.error('Add a video and a title first')
      return
    }

    cancelled.current = false
    setErrorText('')

    try {
      setStage('uploading')
      setPercent(0)
      setStepLabel('Uploading to secure storage')

      const signRes = await fetch('/api/cloudinary/sign', { method: 'POST' })
      const signed = await signRes.json()
      if (!signRes.ok) throw new Error(signed?.error || 'Could not start the upload')

      const publicId = await uploadToCloudinary(signed, file)

      setStage('saving')
      setStepLabel('Checking your video')

      const saveRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), cloudinaryId: publicId }),
      })

      const saved = await saveRes.json()
      if (!saveRes.ok) throw new Error(saved?.error || 'Could not save the video')

      await runPipeline(saved.video.id)
    } catch (error: any) {
      setStage('error')
      setErrorText(error?.message || 'Something went wrong')
      toast.error(error?.message || 'Something went wrong')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#05070C' }}>
        <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#05070C' }}>
      <header className="border-b" style={{ background: '#0A0D12', borderColor: '#161D2B' }}>
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-full transition-all hover:opacity-80"
            style={{ background: '#161D2B' }}
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-xl font-bold" style={{ color: '#38BDF8' }}>New video</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Drop zone */}
        {!busy && stage !== 'done' && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                chooseFile(e.dataTransfer.files?.[0] || null)
              }}
              onClick={() => inputRef.current?.click()}
              className="rounded-2xl p-12 text-center cursor-pointer transition-all"
              style={{
                background: '#0F131C',
                border: `2px dashed ${dragging ? '#38BDF8' : '#161D2B'}`,
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => chooseFile(e.target.files?.[0] || null)}
              />

              {file ? (
                <>
                  <Film className="w-12 h-12 mx-auto mb-4" style={{ color: '#6EE7B7' }} />
                  <p className="text-white font-medium mb-1">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(1)} MB — click to choose a different file
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 mx-auto mb-4" style={{ color: '#38BDF8' }} />
                  <p className="text-white font-medium mb-1">Drop your video here</p>
                  <p className="text-sm text-gray-400">or click to browse — up to 500 MB</p>
                </>
              )}
            </div>

            <label className="block mt-6 mb-2 text-sm text-gray-400">Video title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is this video about?"
              className="w-full px-4 py-3 rounded-lg text-white outline-none focus:ring-2"
              style={{ background: '#0F131C', border: '1px solid #161D2B' }}
            />

            <button
              onClick={handleStart}
              disabled={!file || !title.trim()}
              className="w-full mt-6 px-6 py-4 rounded-pill font-semibold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: '#38BDF8', color: '#05070C' }}
            >
              <Sparkles className="w-5 h-5" />
              Generate clips
            </button>

            <p className="text-center text-xs text-gray-500 mt-4">
              Free plan: 3 videos per month, up to 30 minutes each
            </p>
          </>
        )}

        {/* Progress */}
        {busy && (
          <div className="rounded-2xl p-10 text-center" style={{ background: '#0F131C' }}>
            <div
              className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-6"
              style={{ borderColor: '#38BDF8', borderTopColor: 'transparent' }}
            />

            <p className="text-white font-medium mb-2">{stepLabel}</p>
            <p className="text-sm text-gray-400 mb-6">
              {stage === 'uploading'
                ? 'Keep this tab open while the file uploads'
                : 'This can take a few minutes for longer videos'}
            </p>

            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#161D2B' }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${percent}%`, background: '#38BDF8' }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-3">{percent}%</p>
          </div>
        )}

        {/* Done */}
        {stage === 'done' && (
          <div className="rounded-2xl p-10 text-center" style={{ background: '#0F131C' }}>
            <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: '#6EE7B7' }} />
            <p className="text-white font-medium mb-2">Your clips are ready</p>
            <p className="text-sm text-gray-400">Taking you to the dashboard</p>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <div className="rounded-2xl p-8" style={{ background: '#0F131C', border: '1px solid #7F1D1D' }}>
            <div className="flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#F87171' }} />
              <div>
                <p className="text-white font-medium mb-1">That did not work</p>
                <p className="text-sm text-gray-400">{errorText}</p>
              </div>
            </div>
            <button
              onClick={() => { setStage('idle'); setPercent(0); setErrorText('') }}
              className="px-6 py-3 rounded-pill font-medium transition-all hover:opacity-90"
              style={{ background: '#161D2B', color: '#ffffff' }}
            >
              Try again
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
