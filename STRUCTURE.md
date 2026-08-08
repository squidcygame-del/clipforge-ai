# Directory Structure Guide

Create this exact folder structure in your project:

```
clipforge-ai/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts
│   │   │   └── register/
│   │   │       └── route.ts
│   │   ├── stripe/
│   │   │   ├── checkout/
│   │   │   │   └── route.ts
│   │   │   └── webhook/
│   │   │       └── route.ts
│   │   └── videos/
│   │       ├── route.ts
│   │       └── process/
│   │           └── route.ts
│   ├── dashboard/
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── pricing/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx
├── components/
│   └── SessionProvider.tsx
├── lib/
│   ├── prisma.ts
│   ├── stripe.ts
│   └── ai-service.ts
├── prisma/
│   └── schema.prisma
├── public/
├── .env
├── .env.example
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

## File Mapping

Copy these files to their correct locations:

| Generated File | Destination Path |
|---------------|------------------|
| auth-route.ts | app/api/auth/[...nextauth]/route.ts |
| register-route.ts | app/api/auth/register/route.ts |
| checkout-route.ts | app/api/stripe/checkout/route.ts |
| webhook-route.ts | app/api/stripe/webhook/route.ts |
| videos-route.ts | app/api/videos/route.ts |
| process-video-route.ts | app/api/videos/process/route.ts |
| dashboard-page.tsx | app/dashboard/page.tsx |
| login-page.tsx | app/login/page.tsx |
| register-page.tsx | app/register/page.tsx |
| pricing-page.tsx | app/pricing/page.tsx |
| home-page.tsx | app/page.tsx |
| globals.css | app/globals.css |
| lib-prisma.ts | lib/prisma.ts |
| lib-stripe.ts | lib/stripe.ts |
| ai-service.ts | lib/ai-service.ts |
| schema.prisma | prisma/schema.prisma |

## Quick Setup Commands

```bash
# Create all directories at once
mkdir -p app/api/auth/\[...nextauth\] app/api/auth/register app/api/stripe/checkout app/api/stripe/webhook app/api/videos/process app/dashboard app/login app/register app/pricing components lib prisma public

# Copy files (adjust paths based on where you downloaded them)
cp auth-route.ts app/api/auth/[...nextauth]/route.ts
cp register-route.ts app/api/auth/register/route.ts
cp checkout-route.ts app/api/stripe/checkout/route.ts
cp webhook-route.ts app/api/stripe/webhook/route.ts
cp videos-route.ts app/api/videos/route.ts
cp process-video-route.ts app/api/videos/process/route.ts
cp dashboard-page.tsx app/dashboard/page.tsx
cp login-page.tsx app/login/page.tsx
cp register-page.tsx app/register/page.tsx
cp pricing-page.tsx app/pricing/page.tsx
cp home-page.tsx app/page.tsx
cp globals.css app/globals.css
cp lib-prisma.ts lib/prisma.ts
cp lib-stripe.ts lib/stripe.ts
cp ai-service.ts lib/ai-service.ts
cp schema.prisma prisma/schema.prisma
```

## Additional Required Files

You'll need to create these two files manually:

### 1. app/layout.tsx

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

### 2. components/SessionProvider.tsx

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
