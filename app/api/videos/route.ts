import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchResource, CHUNK_SECONDS } from '@/lib/cloudinary'

/** Videos a user without a paid plan may process per calendar month. */
const FREE_VIDEOS_PER_MONTH = 3
/** Longest video the free tier accepts, in seconds. */
const FREE_MAX_DURATION = 30 * 60

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, description, cloudinaryId } = await req.json()

    if (!title || !cloudinaryId) {
      return NextResponse.json(
        { error: 'Title and cloudinaryId are required' },
        { status: 400 }
      )
    }

    // Ask Cloudinary how long the video really is rather than trusting the
    // browser, so the quota below cannot be bypassed by faking a duration.
    const resource = await fetchResource(cloudinaryId)

    if (!resource) {
      return NextResponse.json(
        { error: 'That upload was not found on Cloudinary. Please try uploading again.' },
        { status: 400 }
      )
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })

    const isPaid = subscription?.status === 'active'

    // Free users get a small monthly allowance instead of a hard wall, so the
    // product is usable before billing is switched on.
    if (!isPaid) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const usedThisMonth = await prisma.video.count({
        where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
      })

      if (usedThisMonth >= FREE_VIDEOS_PER_MONTH) {
        return NextResponse.json(
          {
            error: `Free plan allows ${FREE_VIDEOS_PER_MONTH} videos per month. Upgrade for unlimited.`,
            code: 'QUOTA_EXCEEDED',
          },
          { status: 403 }
        )
      }

      if (resource.duration > FREE_MAX_DURATION) {
        return NextResponse.json(
          {
            error: `Free plan supports videos up to ${
              FREE_MAX_DURATION / 60
            } minutes. This one is ${Math.round(resource.duration / 60)} minutes.`,
            code: 'DURATION_EXCEEDED',
          },
          { status: 403 }
        )
      }
    }

    const totalChunks = Math.max(1, Math.ceil(resource.duration / CHUNK_SECONDS))

    const video = await prisma.video.create({
      data: {
        userId: session.user.id,
        title,
        description: description || null,
        url: resource.secureUrl,
        cloudinaryId: resource.publicId,
        duration: resource.duration,
        totalChunks,
        transcribedChunks: 0,
        status: 'uploaded',
      },
    })

    return NextResponse.json({ success: true, video })
  } catch (error: any) {
    console.error('Create video error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save the video' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const videos = await prisma.video.findMany({
      where: { userId: session.user.id },
      include: { clips: { orderBy: { score: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Get videos error:', error)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
