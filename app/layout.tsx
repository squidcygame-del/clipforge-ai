import './globals.css'
import { Toaster } from 'react-hot-toast'
import { getServerSession } from 'next-auth'
import SessionProvider from '@/components/SessionProvider'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'ClipForge AI - AI-Powered Content Repurposing',
  description: 'Turn long videos into viral short clips automatically',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    // Database or auth env vars not configured yet — render as a signed-out visitor.
    console.error('getServerSession failed:', error)
  }

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
