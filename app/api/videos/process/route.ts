import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { aiService } from '@/lib/ai-service'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { videoId } = await req.json()

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // Get video from database
    const video = await prisma.video.findUnique({
      where: { id: videoId, userId: session.user.id }
    })

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Update video status to processing
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'processing' }
    })

    // Simulate transcript extraction (in production, use Whisper API)
    const transcript = await aiService.transcribeVideo(video.url)

    // Analyze video with AI
    const analysis = await aiService.analyzeVideo(transcript, video.duration)

    // Create clips from viral moments
    const clips = []
    for (const moment of analysis.viralMoments) {
      // Generate captions for each platform
      const clipTranscript = transcript.substring(
        Math.floor(moment.startTime * 10),
        Math.floor(moment.endTime * 10)
      )

      const platforms = ['tiktok', 'instagram', 'youtube_shorts']

      for (const platform of platforms) {
        const captions = await aiService.generateCaptions(clipTranscript, platform)
        const hashtags = await aiService.generateHashtags(clipTranscript, platform)

        const aspectRatio = platform === 'youtube_shorts' ? '9:16' :
                           platform === 'instagram' ? '1:1' : '9:16'

        const clip = await prisma.clip.create({
          data: {
            videoId: video.id,
            title: `${moment.reason} - ${platform}`,
            startTime: moment.startTime,
            endTime: moment.endTime,
            caption: captions[0],
            hashtags: hashtags,
            platform: platform,
            aspectRatio: aspectRatio,
            status: 'generated'
          }
        })

        clips.push(clip)
      }
    }

    // Update video status to completed
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'completed' }
    })

    return NextResponse.json({
      success: true,
      clipsGenerated: clips.length,
      clips: clips
    })

  } catch (error) {
    console.error('Process video error:', error)
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    )
  }
}
