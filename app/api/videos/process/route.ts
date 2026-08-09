import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  transcribeChunk,
  formatTranscript,
  analyzeTranscript,
  NotReadyError,
  RetryableError,
} from '@/lib/ai-service'
import { clipUrl, clipThumbnailUrl, AspectRatio } from '@/lib/cloudinary'

/**
 * Advances one video by exactly ONE step, then returns.
 *
 * This is the heart of the design. A serverless function cannot run for the
 * several minutes a full transcription takes, so instead of one long job the
 * browser calls this endpoint repeatedly and each call does a single small piece
 * of work: transcribe the next 2-minute chunk, or run the analysis, or finish.
 * Progress lives in the database, so a dropped connection just resumes.
 */

const PLATFORMS: { name: string; aspectRatio: AspectRatio }[] = [
  { name: 'tiktok', aspectRatio: '9:16' },
  { name: 'instagram', aspectRatio: '9:16' },
  { name: 'youtube_shorts', aspectRatio: '9:16' },
]

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { videoId } = await req.json()

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    const video = await prisma.video.findFirst({
      where: { id: videoId, userId: session.user.id },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    if (!video.cloudinaryId) {
      return NextResponse.json(
        { error: 'This video has no Cloudinary file attached. Please upload it again.' },
        { status: 400 }
      )
    }

    if (video.status === 'completed') {
      const clipCount = await prisma.clip.count({ where: { videoId: video.id } })
      return NextResponse.json({ done: true, status: 'completed', clipCount, progress: 100 })
    }

    // ---- Step 1: transcribe the next chunk of audio -------------------------
    if (video.transcribedChunks < video.totalChunks) {
      const index = video.transcribedChunks

      let segments
      try {
        segments = await transcribeChunk(video.cloudinaryId, index)
      } catch (error) {
        // Cloudinary still rendering, or a passing network problem. Neither is
        // fatal — report progress unchanged and let the browser ask again.
        if (error instanceof NotReadyError || error instanceof RetryableError) {
          return NextResponse.json({
            done: false,
            status: 'transcribing',
            retry: true,
            message: (error as Error).message,
            progress: transcribeProgress(video.transcribedChunks, video.totalChunks),
          })
        }
        throw error
      }

      const existing = video.transcript ? video.transcript + '\n' : ''
      const addition = formatTranscript(segments)

      await prisma.video.update({
        where: { id: video.id },
        data: {
          transcript: existing + addition,
          transcribedChunks: index + 1,
          status: 'transcribing',
        },
      })

      const doneChunks = index + 1

      return NextResponse.json({
        done: false,
        status: doneChunks < video.totalChunks ? 'transcribing' : 'analyzing',
        step: `Transcribed ${doneChunks} of ${video.totalChunks} parts`,
        progress: transcribeProgress(doneChunks, video.totalChunks),
      })
    }

    // ---- Step 2: one AI call for moments, captions and hashtags -------------
    if (!video.transcript || video.transcript.trim().length < 40) {
      await prisma.video.update({
        where: { id: video.id },
        data: {
          status: 'failed',
          errorMessage:
            'No speech was found in this video, so there is nothing to build clips from.',
        },
      })

      return NextResponse.json(
        { error: 'No speech was found in this video.', done: true, status: 'failed' },
        { status: 422 }
      )
    }

    let analysis
    try {
      analysis = await analyzeTranscript(video.transcript, video.duration)
    } catch (error) {
      if (error instanceof RetryableError) {
        return NextResponse.json({
          done: false,
          status: 'analyzing',
          retry: true,
          message: (error as Error).message,
          progress: 85,
        })
      }
      throw error
    }

    if (analysis.moments.length === 0) {
      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'failed', errorMessage: 'The AI could not find a usable moment.' },
      })

      return NextResponse.json(
        { error: 'No strong moments were found in this video.', done: true, status: 'failed' },
        { status: 422 }
      )
    }

    // Rebuild from scratch so a retry cannot leave duplicate clips behind.
    await prisma.clip.deleteMany({ where: { videoId: video.id } })

    const rows = analysis.moments.flatMap((moment) =>
      PLATFORMS.map((platform) => ({
        videoId: video.id,
        title: moment.title,
        startTime: moment.startTime,
        endTime: moment.endTime,
        caption: moment.caption,
        hashtags: moment.hashtags,
        platform: platform.name,
        aspectRatio: platform.aspectRatio,
        score: moment.score,
        reason: moment.reason,
        // Cloudinary renders these on first view — nothing to encode here.
        url: clipUrl(video.cloudinaryId!, moment.startTime, moment.endTime, platform.aspectRatio),
        thumbnail: clipThumbnailUrl(video.cloudinaryId!, moment.startTime, platform.aspectRatio),
        status: 'generated',
      }))
    )

    await prisma.clip.createMany({ data: rows })

    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: 'completed',
        errorMessage: null,
        title: analysis.suggestedTitle || video.title,
      },
    })

    return NextResponse.json({
      done: true,
      status: 'completed',
      clipCount: rows.length,
      momentCount: analysis.moments.length,
      progress: 100,
    })
  } catch (error: any) {
    console.error('Process video error:', error)

    // Record the reason on the video so the dashboard can show it later.
    try {
      const body = await req.clone().json()
      if (body?.videoId) {
        await prisma.video.update({
          where: { id: body.videoId },
          data: { status: 'failed', errorMessage: String(error?.message || 'Unknown error') },
        })
      }
    } catch {
      // Nothing more we can do here.
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to process the video', done: true, status: 'failed' },
      { status: 500 }
    )
  }
}

/** Transcription is the slow part, so it owns the first 80% of the bar. */
function transcribeProgress(done: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((done / total) * 80)
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
