import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { title, description, url, duration, thumbnail } = await req.json()

    if (!title || !url || !duration) {
      return NextResponse.json(
        { error: 'Title, URL, and duration are required' },
        { status: 400 }
      )
    }

    // Check user's subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id }
    })

    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Active subscription required' },
        { status: 403 }
      )
    }

    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: session.user.id,
        title,
        description,
        url,
        duration,
        thumbnail,
        status: 'processing'
      }
    })

    return NextResponse.json({
      success: true,
      video
    })

  } catch (error) {
    console.error('Upload video error:', error)
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const videos = await prisma.video.findMany({
      where: { userId: session.user.id },
      include: {
        clips: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ videos })

  } catch (error) {
    console.error('Get videos error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
}
