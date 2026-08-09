'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, Zap, TrendingUp, Clock } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen" style={{ background: '#05070C' }}>
      {/* Header */}
      <header className="border-b" style={{ background: '#0A0D12', borderColor: '#161D2B' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: '#38BDF8' }}>ClipForge AI</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/pricing')}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 rounded-pill text-sm transition-all hover:opacity-90"
              style={{ background: '#161D2B', color: '#ffffff' }}
            >
              Sign in
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-4 py-2 rounded-pill text-sm transition-all hover:opacity-90"
              style={{ background: '#38BDF8', color: '#05070C' }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl font-bold mb-6 text-white leading-tight">
          Turn Long Videos Into<br />
          <span style={{ color: '#38BDF8' }}>Viral Short Clips</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          AI-powered platform that automatically detects viral moments, generates clips, captions, and hashtags for TikTok, Instagram, and YouTube Shorts
        </p>
        <button
          onClick={() => router.push('/register')}
          className="px-8 py-4 rounded-pill text-lg font-medium transition-all hover:opacity-90 inline-flex items-center gap-2"
          style={{ background: '#38BDF8', color: '#05070C' }}
        >
          <Sparkles className="w-5 h-5" />
          Start Creating for Free
        </button>
        <p className="text-sm text-gray-500 mt-4">No credit card required • 14-day free trial</p>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-white">Why ClipForge AI?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-lg" style={{ background: '#0F131C' }}>
            <div className="p-3 rounded-full w-fit mb-4" style={{ background: '#161D2B' }}>
              <Zap className="w-6 h-6" style={{ color: '#38BDF8' }} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">AI-Powered Analysis</h3>
            <p className="text-gray-400">Advanced AI detects the most engaging moments in your videos automatically</p>
          </div>

          <div className="p-6 rounded-lg" style={{ background: '#0F131C' }}>
            <div className="p-3 rounded-full w-fit mb-4" style={{ background: '#161D2B' }}>
              <Clock className="w-6 h-6" style={{ color: '#6EE7B7' }} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Save 10+ Hours Weekly</h3>
            <p className="text-gray-400">Stop spending hours manually editing. Generate clips in minutes</p>
          </div>

          <div className="p-6 rounded-lg" style={{ background: '#0F131C' }}>
            <div className="p-3 rounded-full w-fit mb-4" style={{ background: '#161D2B' }}>
              <TrendingUp className="w-6 h-6" style={{ color: '#38BDF8' }} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Viral Optimization</h3>
            <p className="text-gray-400">AI-generated captions and hashtags optimized for each platform</p>
          </div>

          <div className="p-6 rounded-lg" style={{ background: '#0F131C' }}>
            <div className="p-3 rounded-full w-fit mb-4" style={{ background: '#161D2B' }}>
              <Sparkles className="w-6 h-6" style={{ color: '#6EE7B7' }} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Multi-Platform</h3>
            <p className="text-gray-400">Perfect clips for TikTok, Instagram Reels, and YouTube Shorts</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-white">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold" style={{ background: '#38BDF8', color: '#05070C' }}>
              1
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Upload Your Video</h3>
            <p className="text-gray-400">Upload your long-form content from podcasts, webinars, or YouTube videos</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold" style={{ background: '#38BDF8', color: '#05070C' }}>
              2
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">AI Analyzes & Creates</h3>
            <p className="text-gray-400">Our AI finds viral moments and generates clips with captions and hashtags</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold" style={{ background: '#38BDF8', color: '#05070C' }}>
              3
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Export & Share</h3>
            <p className="text-gray-400">Download your clips and post directly to all your social platforms</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="p-12 rounded-lg" style={{ background: '#0F131C' }}>
          <h2 className="text-4xl font-bold mb-4 text-white">Ready to Go Viral?</h2>
          <p className="text-xl text-gray-400 mb-8">Join thousands of creators who are saving time and growing faster</p>
          <button
            onClick={() => router.push('/register')}
            className="px-8 py-4 rounded-pill text-lg font-medium transition-all hover:opacity-90"
            style={{ background: '#38BDF8', color: '#05070C' }}
          >
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16" style={{ background: '#0A0D12', borderColor: '#161D2B' }}>
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-400">
          <p>&copy; 2026 ClipForge AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
