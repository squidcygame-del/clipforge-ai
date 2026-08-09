'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Upload, Video, Scissors, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [videos, setVideos] = useState([])
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalClips: 0,
    thisMonth: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      loadVideos()
    }
  }, [status])

  const loadVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      const data = await response.json()

      if (response.ok) {
        setVideos(data.videos)
        calculateStats(data.videos)
      }
    } catch (error) {
      toast.error('Failed to load videos')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (videoList: any[]) => {
    const totalClips = videoList.reduce((sum, v) => sum + (v.clips?.length || 0), 0)
    const thisMonth = videoList.filter(v => {
      const created = new Date(v.createdAt)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length

    setStats({
      totalVideos: videoList.length,
      totalClips,
      thisMonth
    })
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#05070C' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#05070C' }}>
      {/* Header */}
      <header className="border-b" style={{ background: '#0A0D12', borderColor: '#161D2B' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: '#38BDF8' }}>ClipForge AI</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{session?.user?.name}</span>
            <button
              onClick={() => router.push('/api/auth/signout')}
              className="px-4 py-2 rounded-pill text-sm transition-all hover:opacity-90"
              style={{ background: '#161D2B', color: '#ffffff' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6 rounded-lg" style={{ background: '#0F131C' }}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full" style={{ background: '#161D2B' }}>
                <Video className="w-6 h-6" style={{ color: '#38BDF8' }} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Videos</p>
                <p className="text-3xl font-bold text-white">{stats.totalVideos}</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg" style={{ background: '#0F131C' }}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full" style={{ background: '#161D2B' }}>
                <Scissors className="w-6 h-6" style={{ color: '#6EE7B7' }} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Clips Generated</p>
                <p className="text-3xl font-bold text-white">{stats.totalClips}</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-lg" style={{ background: '#0F131C' }}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full" style={{ background: '#161D2B' }}>
                <TrendingUp className="w-6 h-6" style={{ color: '#38BDF8' }} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">This Month</p>
                <p className="text-3xl font-bold text-white">{stats.thisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="mb-8 p-8 rounded-lg text-center" style={{ background: '#0F131C' }}>
          <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: '#38BDF8' }} />
          <h2 className="text-xl font-bold mb-2 text-white">Upload Your First Video</h2>
          <p className="text-gray-400 mb-6">AI will analyze it and generate viral clips automatically</p>
          <button
            onClick={() => router.push('/upload')}
            className="px-6 py-3 rounded-pill font-medium transition-all hover:opacity-90"
            style={{ background: '#38BDF8', color: '#05070C' }}
          >
            Upload Video
          </button>
        </div>

        {/* Videos List */}
        {videos.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-white">Your Videos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video: any) => (
                <div key={video.id} className="p-4 rounded-lg" style={{ background: '#0F131C' }}>
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt={video.title} className="w-full h-40 object-cover rounded-lg mb-4" />
                  )}
                  <h3 className="font-semibold mb-2 text-white">{video.title}</h3>
                  <p className="text-sm text-gray-400 mb-4">{video.clips?.length || 0} clips generated</p>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-pill text-xs ${
                      video.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      video.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {video.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
