import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export const PLANS = {
  basic: {
    name: 'Basic',
    price: 29,
    priceId: process.env.STRIPE_PRICE_BASIC!,
    features: [
      '10 videos per month',
      '50 AI-generated clips',
      'Auto captions',
      'Basic hashtag suggestions',
      '720p export quality',
    ],
    limits: {
      videos: 10,
      clips: 50,
    }
  },
  pro: {
    name: 'Pro',
    price: 79,
    priceId: process.env.STRIPE_PRICE_PRO!,
    features: [
      '50 videos per month',
      '300 AI-generated clips',
      'Advanced AI analysis',
      'Smart hashtag optimization',
      '1080p export quality',
      'Priority processing',
      'Custom branding',
    ],
    limits: {
      videos: 50,
      clips: 300,
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 199,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE!,
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
    limits: {
      videos: -1, // unlimited
      clips: -1,
    }
  }
}
