'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Upload, Video, Scissors, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'
import ClipCard, { ClipData } from '@/components/ClipCard'

interface VideoData {
  id: string
  title: string
  duration: number
  status: string
  errorMessage: string | null
  createdAt: string
  clips: ClipData[]
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [videos, setVideos] = useState<VideoData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openVideoId, setOpenVideoId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadVideos()
    }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadVideos() {
    try {
      const response = await fetch('/api/videos')
      const data = await response.json()

      if (response.ok) {
        const list: VideoData[] = data.videos || []
        setVideos(list)
        // Open the newest finished video so clips are visible straight away.
        const firstDone = list.find((v) => v.status === 'completed' && v.clips.length > 0)
        if (firstDone) setOpenVideoId((current) => current ?? firstDone.id)
      } else {
        toast.error(data?.error || 'Failed to load videos')
      }
    } catch {
      toast.error('Failed to load videos')
    } finally {
      setIsLoading(false)
    }
  }

  const totalClips = videos.reduce((sum, v) => sum + (v.clips?.length || 0), 0)
  const thisMonth = videos.filter((v) => {
    const created = new Date(v.createdAt)
    const now = new Date()
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#05070C' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  const openVideo = videos.find((v) => v.id === openVideoId)

  return (
    <div className="min-h-screen" style={{ background: '#05070C' }}>
      <header className="border-b" style={{ background: '#0A0D12', borderColor: '#161D2B' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: '#38BDF8' }}>ClipForge AI</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 hidden sm:inline">{session?.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-4 py-2 rounded-pill text-sm transition-all hover:opacity-90"
              style={{ background: '#161D2B', color: '#ffffff' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard icon={<Video className="w-6 h-6" style={{ color: '#38BDF8' }} />} label="Total Videos" value={videos.length} />
          <StatCard icon={<Scissors className="w-6 h-6" style={{ color: '#6EE7B7' }} />} label="Clips Generated" value={totalClips} />
          <StatCard icon={<TrendingUp className="w-6 h-6" style={{ color: '#38BDF8' }} />} label="This Month" value={thisMonth} />
        </div>

        <div
          className="mb-8 p-8 rounded-lg text-center"
          style={{ background: '#0F131C' }}
        >
          <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: '#38BDF8' }} />
          <h2 className="text-xl font-bold mb-2 text-white">
            {videos.length === 0 ? 'Upload your first video' : 'Turn another video into clips'}
          </h2>
          <p className="text-gray-400 mb-6">
            AI finds your best moments and cuts them for TikTok, Reels and Shorts
          </p>
          <button
            onClick={() => router.push('/upload')}
            className="px-6 py-3 rounded-pill font-medium transition-all hover:opacity-90"
            style={{ background: '#38BDF8', color: '#05070C' }}
          >
            Upload video
          </button>
        </div>

        {videos.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Your videos</h2>
              <button
                onClick={loadVideos}
                className="p-2 rounded-full transition-all hover:opacity-80"
                style={{ background: '#161D2B' }}
                aria-label="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setOpenVideoId(video.id === openVideoId ? null : video.id)}
                  className="p-4 rounded-lg text-left transition-all hover:opacity-90"
                  style={{
                    background: '#0F131C',
                    border: video.id === openVideoId ? '1px solid #38BDF8' : '1px solid #161D2B',
                  }}
                >
                  <h3 className="font-semibold mb-2 text-white line-clamp-2">{video.title}</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {video.clips?.length || 0} clips · {Math.round(video.duration / 60)} min
                  </p>

                  <span
                    className={`px-3 py-1 rounded-pill text-xs ${
                      video.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : video.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {video.status}
                  </span>

                  {video.status === 'failed' && video.errorMessage && (
                    <p className="flex items-start gap-1.5 mt-3 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                      {video.errorMessage}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {openVideo && openVideo.clips.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-1 text-white">Clips from “{openVideo.title}”</h2>
                <p className="text-sm text-gray-400 mb-5">
                  Sorted by how likely the AI thinks each one is to perform
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {openVideo.clips.map((clip) => (
                    <ClipCard key={clip.id} clip={clip} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-6 rounded-lg" style={{ background: '#0F131C' }}>
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full" style={{ background: '#161D2B' }}>{icon}</div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  )
}
