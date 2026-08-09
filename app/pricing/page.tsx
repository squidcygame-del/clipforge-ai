'use client'

import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import toast from 'react-hot-toast'

type Plan = {
  name: string
  price: number
  priceId?: string
  plan: string
  features: string[]
  popular?: boolean
}

const plans: Plan[] = [
  {
    name: 'Basic',
    price: 29,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC,
    plan: 'basic',
    features: [
      '10 videos per month',
      '50 AI-generated clips',
      'Auto captions',
      'Basic hashtag suggestions',
      '720p export quality',
    ]
  },
  {
    name: 'Pro',
    price: 79,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    plan: 'pro',
    features: [
      '50 videos per month',
      '300 AI-generated clips',
      'Advanced AI analysis',
      'Smart hashtag optimization',
      '1080p export quality',
      'Priority processing',
      'Custom branding',
    ],
    popular: true
  },
  {
    name: 'Enterprise',
    price: 199,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
    plan: 'enterprise',
    features: [
      'Unlimited videos',
      'Unlimited clips',
      'White-label solution',
      'API access',
      '4K export quality',
      'Dedicated support',
      'Custom AI training',
      'Team collaboration',
    ]
  }
]

export default function PricingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleSubscribe = async (priceId: string, plan: string) => {
    if (!session) {
      router.push('/login')
      return
    }

    setIsLoading(plan)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, plan })
      })

      const data = await response.json()

      if (response.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to create checkout session')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#05070C' }}>
      {/* Header */}
      <header className="border-b" style={{ background: '#0A0D12', borderColor: '#161D2B' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold cursor-pointer" style={{ color: '#38BDF8' }} onClick={() => router.push('/')}>
            ClipForge AI
          </h1>
          <div className="flex items-center gap-4">
            {session ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 rounded-pill text-sm transition-all hover:opacity-90"
                style={{ background: '#38BDF8', color: '#05070C' }}
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 rounded-pill text-sm transition-all hover:opacity-90"
                style={{ background: '#161D2B', color: '#ffffff' }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-white">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-400">Choose the perfect plan for your content creation needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="p-8 rounded-lg relative"
              style={{
                background: '#0F131C',
                border: plan.popular ? '2px solid #38BDF8' : '1px solid #161D2B',
              }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 rounded-pill text-sm font-medium"
                     style={{ background: '#38BDF8', color: '#05070C' }}>
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-400">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#6EE7B7' }} />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.priceId || '', plan.plan)}
                disabled={isLoading === plan.plan}
                className={`w-full py-3 rounded-pill font-medium transition-all hover:opacity-90 ${
                  plan.popular ? '' : 'border'
                }`}
                style={plan.popular ?
                  { background: '#38BDF8', color: '#05070C' } :
                  { background: '#161D2B', borderColor: '#1E2636', color: '#ffffff' }
                }
              >
                {isLoading === plan.plan ? 'Loading...' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-400">All plans include 14-day money-back guarantee</p>
        </div>
      </div>
    </div>
  )
}
