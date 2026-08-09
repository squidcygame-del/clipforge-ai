# ClipForge AI - Complete Setup & Installation Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Database Configuration](#database-configuration)
4. [Environment Variables](#environment-variables)
5. [API Keys Setup](#api-keys-setup)
6. [Local Development](#local-development)
7. [Deployment to Vercel](#deployment-to-vercel)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

Before starting, make sure you have:
- Node.js 18+ installed ([Download](https://nodejs.org))
- PostgreSQL database (local or cloud)
- Git installed
- A code editor (VS Code recommended)

---

## 📦 Project Setup

### Step 1: Create Project Structure

```bash
# Create a new directory for your project
mkdir clipforge-ai
cd clipforge-ai

# Initialize npm project (this will create package.json)
npm init -y
```

### Step 2: Copy All Project Files

Create this exact folder structure:

```
clipforge-ai/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts      (copy from auth-route.ts)
│   │   │   └── register/
│   │   │       └── route.ts      (copy from register-route.ts)
│   │   ├── stripe/
│   │   │   ├── checkout/
│   │   │   │   └── route.ts      (copy from checkout-route.ts)
│   │   │   └── webhook/
│   │   │       └── route.ts      (copy from webhook-route.ts)
│   │   ├── videos/
│   │   │   ├── route.ts          (copy from videos-route.ts)
│   │   │   └── process/
│   │   │       └── route.ts      (copy from process-video-route.ts)
│   ├── dashboard/
│   │   └── page.tsx              (copy from dashboard-page.tsx)
│   ├── login/
│   │   └── page.tsx              (copy from login-page.tsx)
│   ├── register/
│   │   └── page.tsx              (copy from register-page.tsx)
│   ├── pricing/
│   │   └── page.tsx              (copy from pricing-page.tsx)
│   ├── layout.tsx                (create this - see below)
│   └── page.tsx                  (copy from home-page.tsx)
├── lib/
│   ├── prisma.ts                 (copy from lib-prisma.ts)
│   ├── stripe.ts                 (copy from lib-stripe.ts)
│   └── ai-service.ts             (copy from ai-service.ts)
├── prisma/
│   └── schema.prisma             (copy from schema.prisma)
├── public/
├── .env                          (copy from .env.example)
├── .env.example
├── .gitignore
├── globals.css
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

### Step 3: Create app/layout.tsx

Create `app/layout.tsx`:

```typescript
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { getServerSession } from 'next-auth'
import SessionProvider from '@/components/SessionProvider'
import { authOptions } from './api/auth/[...nextauth]/route'

export const metadata = {
  title: 'ClipForge AI - AI-Powered Content Repurposing',
  description: 'Turn long videos into viral short clips automatically',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>
          {children}
          <Toaster position="top-right" />
        </SessionProvider>
      </body>
    </html>
  )
}
```

### Step 4: Create components/SessionProvider.tsx

Create `components/SessionProvider.tsx`:

```typescript
'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export default function SessionProvider({ children, session }: any) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  )
}
```

### Step 5: Install Dependencies

```bash
npm install
```

---

## 🗄️ Database Configuration

### Option 1: Local PostgreSQL

1. Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)

2. Create a new database:
```sql
CREATE DATABASE clipforge;
```

3. Your DATABASE_URL will be:
```
postgresql://postgres:your_password@localhost:5432/clipforge
```

### Option 2: Cloud Database (Recommended)

Use a free PostgreSQL database from one of these providers:

**Neon (Recommended - Free tier)**
1. Go to [neon.tech](https://neon.tech)
2. Sign up and create a new project
3. Copy the connection string

**Supabase (Free tier)**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database → Connection string
4. Copy the connection string

**Railway (Free trial)**
1. Go to [railway.app](https://railway.app)
2. Create a new PostgreSQL database
3. Copy the connection string

---

## 🔐 Environment Variables

### Step 1: Copy .env.example to .env

```bash
cp .env.example .env
```

### Step 2: Fill in Database URL

```env
DATABASE_URL="your_postgresql_connection_string_here"
```

---

## 🔑 API Keys Setup

### 1. NextAuth Secret

Generate a secure random string:

```bash
openssl rand -base64 32
```

Add to `.env`:
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="paste_generated_secret_here"
```

### 2. Google OAuth (For Google Sign-in)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.vercel.app/api/auth/callback/google`
7. Copy Client ID and Client Secret

Add to `.env`:
```env
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

### 3. Stripe (For Payments)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create an account or sign in
3. Get your API keys from "Developers" → "API keys"
4. Copy "Secret key" and "Publishable key"

Add to `.env`:
```env
STRIPE_SECRET_KEY="sk_test_your_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key"
```

### 4. Create Stripe Products

1. In Stripe Dashboard, go to "Products"
2. Click "Add product"
3. Create three products:

**Basic Plan**
- Name: ClipForge Basic
- Price: $29/month
- Copy the Price ID (starts with `price_`)

**Pro Plan**
- Name: ClipForge Pro
- Price: $79/month
- Copy the Price ID

**Enterprise Plan**
- Name: ClipForge Enterprise
- Price: $199/month
- Copy the Price ID

Add to `.env`:
```env
STRIPE_PRICE_BASIC="price_xxxxx"
STRIPE_PRICE_PRO="price_xxxxx"
STRIPE_PRICE_ENTERPRISE="price_xxxxx"
```

### 5. Stripe Webhook

1. Install Stripe CLI: [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Run:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
3. Copy the webhook secret (starts with `whsec_`)

Add to `.env`:
```env
STRIPE_WEBHOOK_SECRET="whsec_xxxxx"
```

### 6. OpenAI API (For AI Features)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or sign in
3. Go to "API keys" → "Create new secret key"
4. Copy the key

Add to `.env`:
```env
OPENAI_API_KEY="sk-xxxxx"
```

---

## 💻 Local Development

### Step 1: Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

### Step 2: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Step 3: Test the Application

1. Go to `http://localhost:3000`
2. Click "Get Started" → Create an account
3. Go to Pricing and select a plan
4. Use Stripe test card: `4242 4242 4242 4242` (any future date, any CVC)
5. After payment, upload a video in the dashboard

---

## 🚀 Deployment to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin your_github_repo_url
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Step 3: Add Environment Variables

In Vercel dashboard, go to "Settings" → "Environment Variables"

Add ALL variables from your `.env` file:
- DATABASE_URL
- NEXTAUTH_URL (change to `https://your-app.vercel.app`)
- NEXTAUTH_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_BASIC
- STRIPE_PRICE_PRO
- STRIPE_PRICE_ENTERPRISE
- OPENAI_API_KEY

### Step 4: Run Database Migration

In Vercel dashboard terminal:
```bash
npx prisma migrate deploy
```

### Step 5: Update Stripe Webhook

1. Go to Stripe Dashboard → "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Endpoint URL: `https://your-app.vercel.app/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
5. Copy the webhook secret and update in Vercel environment variables

### Step 6: Update Google OAuth

Add your Vercel URL to Google OAuth authorized redirect URIs:
```
https://your-app.vercel.app/api/auth/callback/google
```

---

## 🐛 Troubleshooting

### Database Connection Issues

**Error: "Can't reach database server"**
- Check if DATABASE_URL is correct
- For local PostgreSQL, make sure it's running
- For cloud databases, check if IP is whitelisted

**Fix:**
```bash
# Test database connection
npx prisma db pull
```

### NextAuth Errors

**Error: "NEXTAUTH_SECRET is not defined"**
- Make sure you generated and added NEXTAUTH_SECRET to .env

**Fix:**
```bash
openssl rand -base64 32
# Copy output to .env
```

### Stripe Webhook Issues

**Error: "No signatures found matching the expected signature"**
- Webhook secret is wrong or missing

**Fix:**
1. For local development, restart `stripe listen`
2. For production, create new webhook endpoint

### OpenAI API Errors

**Error: "Insufficient quota"**
- Your OpenAI account needs to add payment method
- Go to platform.openai.com → Billing → Add payment

### Build Errors

**Error: "Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Prisma Errors

**Error: "Prisma Client is not generated"**
```bash
npx prisma generate
npm run dev
```

---

## 📞 Next Steps

1. **Test all features**: Registration, Login, Payment, Video Upload
2. **Customize branding**: Update colors in `tailwind.config.js`
3. **Add video storage**: Integrate AWS S3 or Cloudinary for video hosting
4. **Implement actual video processing**: Add FFmpeg for real clip generation
5. **Add email notifications**: Use SendGrid or Resend
6. **Monitor errors**: Add Sentry for error tracking

---

## 💡 Pro Tips

1. **Use test mode for Stripe** until ready for production
2. **Monitor OpenAI costs** - GPT-4 can be expensive
3. **Add rate limiting** to prevent API abuse
4. **Backup your database** regularly
5. **Use environment-specific .env files**: `.env.local`, `.env.production`

---

## 🎉 Success!

Your ClipForge AI SaaS is now live! Users can:
✅ Sign up with email or Google
✅ Subscribe to plans via Stripe
✅ Upload videos (ready for AI processing integration)
✅ Generate AI captions and hashtags

**Revenue Potential:**
- 100 users × $79/month = $7,900/month
- 500 users × $79/month = $39,500/month
- 1,000 users × $79/month = $79,000/month

Start marketing to content creators, podcasters, and influencers! 🚀
