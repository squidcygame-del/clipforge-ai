import Stripe from 'stripe'

/**
 * Same idea as the OpenAI client: build lazily so `next build`
 * never crashes when STRIPE_SECRET_KEY is missing.
 */
let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error(
        'STRIPE_SECRET_KEY is not set. Add it in your Vercel project settings under Environment Variables.'
      )
    }
    stripeClient = new Stripe(key, {
      apiVersion: '2024-06-20',
      typescript: true,
    })
  }
  return stripeClient
}

export const PLANS = {
  basic: {
    name: 'Basic',
    price: 29,
    priceId: process.env.STRIPE_PRICE_BASIC || '',
    features: [
      '10 videos per month',
      '50 AI-generated clips',
      'Auto captions',
      'Basic hashtag suggestions',
      '720p export quality',
    ],
    limits: { videos: 10, clips: 50 },
  },
  pro: {
    name: 'Pro',
    price: 79,
    priceId: process.env.STRIPE_PRICE_PRO || '',
    features: [
      '50 videos per month',
      '300 AI-generated clips',
      'Advanced AI analysis',
      'Smart hashtag optimization',
      '1080p export quality',
      'Priority processing',
      'Custom branding',
    ],
    limits: { videos: 50, clips: 300 },
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
    features: [
      'Unlimited videos',
      'Unlimited clips',
      'White-label solution',
      'API access',
      '4K export quality',
      'Dedicated support',
      'Custom AI training',
      'Team collaboration',
    ],
    limits: { videos: -1, clips: -1 },
  },
}
