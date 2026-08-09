import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCloudinaryConfig, signParams } from '@/lib/cloudinary'

/**
 * Hands the browser a short-lived signature so it can upload a video straight
 * to Cloudinary. The video bytes never touch Vercel, which is what lets us
 * accept files far larger than a serverless function could ever receive.
 *
 * Only signed-in users get a signature, so a stranger cannot burn through the
 * Cloudinary quota.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()

    const timestamp = Math.floor(Date.now() / 1000)
    const folder = `clipforge/${session.user.id}`

    // Only the params Cloudinary actually signs — the file itself is not signed.
    const signature = signParams({ folder, timestamp }, apiSecret)

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    })
  } catch (error: any) {
    console.error('Cloudinary sign error:', error)
    return NextResponse.json(
      { error: error?.message || 'Could not prepare the upload' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
