'use client'

import { useState } from 'react'
import { Copy, Download, Check, Play } from 'lucide-react'
import toast from 'react-hot-toast'

export interface ClipData {
  id: string
  title: string
  startTime: number
  endTime: number
  caption: string | null
  hashtags: string[]
  platform: string
  url: string | null
  thumbnail: string | null
  score: number
  reason: string | null
}

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Reels',
  youtube_shorts: 'Shorts',
}

function seconds(n: number): string {
  const m = Math.floor(n / 60)
  const s = Math.round(n % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function ClipCard({ clip }: { clip: ClipData }) {
  const [playing, setPlaying] = useState(false)
  const [copied, setCopied] = useState(false)

  const fullCaption = [clip.caption || '', clip.hashtags.join(' ')].filter(Boolean).join('\n\n')

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(fullCaption)
      setCopied(true)
      toast.success('Caption copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — please select the text manually')
    }
  }

  // Cloudinary renders the cut on first request, so the download link is just
  // the same URL with a flag that tells the browser to save it.
  const downloadUrl = clip.url ? clip.url.replace('/upload/', '/upload/fl_attachment/') : null

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0F131C' }}>
      <div className="relative bg-black" style={{ aspectRatio: '9 / 16' }}>
        {playing && clip.url ? (
          <video
            src={clip.url}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="w-full h-full relative group"
            aria-label={`Play ${clip.title}`}
          >
            {clip.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={clip.thumbnail} alt="" className="w-full h-full object-cover" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-all">
              <span
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: '#38BDF8' }}
              >
                <Play className="w-6 h-6 ml-1" style={{ color: '#05070C' }} fill="#05070C" />
              </span>
            </span>
          </button>
        )}

        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded-pill text-xs font-medium"
          style={{ background: 'rgba(5,7,12,0.85)', color: '#38BDF8' }}
        >
          {PLATFORM_LABELS[clip.platform] || clip.platform}
        </span>

        <span
          className="absolute top-3 right-3 px-2.5 py-1 rounded-pill text-xs font-semibold"
          style={{ background: 'rgba(5,7,12,0.85)', color: '#6EE7B7' }}
        >
          {clip.score.toFixed(1)}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2">{clip.title}</h3>
        <p className="text-xs text-gray-500 mb-3">
          {seconds(clip.startTime)} – {seconds(clip.endTime)} ·{' '}
          {Math.round(clip.endTime - clip.startTime)}s
        </p>

        {clip.caption && (
          <p className="text-sm text-gray-300 mb-2 line-clamp-3 whitespace-pre-line">
            {clip.caption}
          </p>
        )}

        {clip.hashtags.length > 0 && (
          <p className="text-xs mb-4 line-clamp-2" style={{ color: '#38BDF8' }}>
            {clip.hashtags.join(' ')}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={copyCaption}
            className="flex-1 px-3 py-2 rounded-pill text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:opacity-80"
            style={{ background: '#161D2B', color: '#ffffff' }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Caption'}
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              className="flex-1 px-3 py-2 rounded-pill text-xs font-medium flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
              style={{ background: '#38BDF8', color: '#05070C' }}
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
