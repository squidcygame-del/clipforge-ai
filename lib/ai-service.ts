import OpenAI from 'openai'
import { audioChunkUrl, CHUNK_SECONDS } from '@/lib/cloudinary'

/**
 * The OpenAI client is created LAZILY (only on the first real request).
 * If it were created at the top of this file it would also run during
 * `next build`, and the build would crash when OPENAI_API_KEY is not set.
 */
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is not set. Add it in your Vercel project settings under Environment Variables.'
      )
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

/**
 * Thrown when Cloudinary is still building the audio track. It is not a
 * failure — the caller should simply ask again in a few seconds.
 */
export class NotReadyError extends Error {
  constructor(message = 'Cloudinary is still preparing the audio. Retrying shortly.') {
    super(message)
    this.name = 'NotReadyError'
  }
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

/**
 * Transcribes one 5-minute slice of the video.
 *
 * We pull the audio as mp3 straight from Cloudinary rather than downloading the
 * whole video, which keeps each request small enough to finish inside a
 * serverless function's time limit. Whisper detects the language on its own, so
 * Urdu, English and mixed speech all work without any extra setting.
 */
export async function transcribeChunk(
  cloudinaryId: string,
  chunkIndex: number
): Promise<TranscriptSegment[]> {
  const url = audioChunkUrl(cloudinaryId, chunkIndex)

  const audioRes = await fetch(url, { cache: 'no-store' })

  // 423 Locked means the derived audio file is still being generated.
  if (audioRes.status === 423) {
    throw new NotReadyError()
  }

  if (!audioRes.ok) {
    throw new Error(
      `Could not read the audio track from Cloudinary (HTTP ${audioRes.status}). ` +
        'The file may not contain audio.'
    )
  }

  const buffer = Buffer.from(await audioRes.arrayBuffer())

  // A tiny body means we asked for a slice past the end of the video.
  if (buffer.byteLength < 1024) {
    return []
  }

  // Node 18+ (which Vercel runs) has File and Blob built in, so we hand Whisper
  // a plain File rather than relying on an SDK helper.
  const file = new File([buffer], `chunk-${chunkIndex}.mp3`, { type: 'audio/mpeg' })

  const result: any = await getOpenAI().audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  })

  const offset = chunkIndex * CHUNK_SECONDS
  const segments: any[] = Array.isArray(result?.segments) ? result.segments : []

  // Shift every timestamp by where this chunk sits in the full video, so the
  // numbers stay correct once all the chunks are stitched together.
  return segments
    .map((s) => ({
      start: Number(s.start || 0) + offset,
      end: Number(s.end || 0) + offset,
      text: String(s.text || '').trim(),
    }))
    .filter((s) => s.text.length > 0)
}

/** Renders segments as text the model can read, with seconds it can copy verbatim. */
export function formatTranscript(segments: TranscriptSegment[]): string {
  return segments.map((s) => `[${s.start.toFixed(1)}s] ${s.text}`).join('\n')
}

export interface ViralMoment {
  startTime: number
  endTime: number
  title: string
  reason: string
  score: number
  caption: string
  hashtags: string[]
}

export interface VideoAnalysis {
  suggestedTitle: string
  moments: ViralMoment[]
}

/** Keeps the prompt inside the model's context window on very long videos. */
const MAX_TRANSCRIPT_CHARS = 90_000

/**
 * One GPT-4o call produces the moments AND their captions AND their hashtags.
 *
 * The earlier version made a separate call per clip per platform — thirty
 * requests for one video, which no serverless function could finish in time and
 * which cost roughly fifteen times as much.
 */
export async function analyzeTranscript(
  transcript: string,
  duration: number
): Promise<VideoAnalysis> {
  const trimmed =
    transcript.length > MAX_TRANSCRIPT_CHARS
      ? transcript.slice(0, MAX_TRANSCRIPT_CHARS) + '\n[transcript truncated]'
      : transcript

  const prompt = `You are given a timestamped transcript of a ${Math.round(
    duration
  )} second video. Each line starts with the second at which it was spoken.

Find the 5 moments that would perform best as standalone short-form videos.
A strong moment has: a hook in its first three seconds, one complete idea, and a
natural ending. Prefer surprising claims, strong opinions, specific numbers,
emotional beats and concrete tips. Avoid intros, outros and rambling.

Rules you must follow exactly:
- startTime and endTime are in SECONDS and must come from the timestamps shown.
- Every clip must be between 15 and 60 seconds long.
- endTime must be greater than startTime, and never beyond ${Math.round(duration)}.
- Moments must not overlap each other.
- Write the caption in the same language the speaker uses in that moment.
- score is 1 to 10, where 10 means near-certain to perform well.

Transcript:
${trimmed}

Reply with JSON exactly in this shape:
{
  "suggestedTitle": "a catchy title for the whole video",
  "moments": [
    {
      "startTime": 45,
      "endTime": 78,
      "title": "short label for this clip",
      "reason": "why this moment will hold attention",
      "score": 8.5,
      "caption": "a ready-to-post caption with a hook in the first line",
      "hashtags": ["#example", "#tags"]
    }
  ]
}`

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert short-form video editor. You pick moments that stop the scroll, ' +
          'and you only ever reply with valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  })

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}')
  const rawMoments: any[] = Array.isArray(parsed?.moments) ? parsed.moments : []

  // The model usually obeys the rules, but never trust it with numbers that are
  // about to become video timestamps — clamp everything into a valid range.
  const moments: ViralMoment[] = rawMoments
    .map((m) => {
      const start = Math.max(0, Number(m?.startTime) || 0)
      let end = Number(m?.endTime) || start + 30

      if (end > duration) end = duration
      if (end - start < 5) end = Math.min(duration, start + 30)
      if (end - start > 90) end = start + 90

      return {
        startTime: Math.round(start * 10) / 10,
        endTime: Math.round(end * 10) / 10,
        title: String(m?.title || 'Untitled clip').slice(0, 120),
        reason: String(m?.reason || ''),
        score: Math.min(10, Math.max(0, Number(m?.score) || 0)),
        caption: String(m?.caption || ''),
        hashtags: Array.isArray(m?.hashtags)
          ? m.hashtags
              .map((h: any) => String(h).trim())
              .filter(Boolean)
              .map((h: string) => (h.startsWith('#') ? h : `#${h}`))
              .slice(0, 15)
          : [],
      }
    })
    .filter((m) => m.endTime > m.startTime)
    .sort((a, b) => b.score - a.score)

  return {
    suggestedTitle: String(parsed?.suggestedTitle || '').slice(0, 200),
    moments,
  }
}
