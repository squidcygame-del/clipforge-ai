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
    openaiClient = new OpenAI({
      apiKey,
      // Fail fast and let the browser retry, rather than sitting on a stalled
      // socket until the whole serverless function is killed.
      timeout: 25_000,
      maxRetries: 1,
    })
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

/** A transient failure. Worth retrying; not worth showing the user as fatal. */
export class RetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetryableError'
  }
}

/**
 * Cloudinary rejected the delivery URL itself — a bad transformation parameter,
 * not a bad video. Retrying the same URL would fail identically, so the caller
 * falls back to a simpler URL instead.
 */
export class BadTransformError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BadTransformError'
  }
}

/**
 * Turns an OpenAI SDK failure into something a person can act on.
 *
 * The SDK reports every network-level problem as the single opaque string
 * "Connection error.", which tells the user nothing about what to fix, so we
 * separate out the cases that have real, different answers.
 */
function translateOpenAIError(error: any): Error {
  const status = error?.status ?? error?.response?.status
  const code = error?.code ?? error?.error?.code

  if (status === 401) {
    return new Error(
      'OpenAI rejected the API key. Check OPENAI_API_KEY in Vercel, then redeploy.'
    )
  }

  if (status === 429 || code === 'insufficient_quota') {
    if (code === 'insufficient_quota') {
      return new Error(
        'Your OpenAI account has no credit left. Add a payment method and some balance at ' +
          'platform.openai.com under Settings, Billing.'
      )
    }
    return new RetryableError('OpenAI is rate limiting us. Waiting a moment before retrying.')
  }

  if (status === 400 && /file|audio|format/i.test(String(error?.message))) {
    return new Error('OpenAI could not read this audio. The video may have no sound track.')
  }

  // APIConnectionError, timeouts, aborted sockets — all transient.
  const name = String(error?.name || '')
  if (
    name === 'APIConnectionError' ||
    name === 'APIConnectionTimeoutError' ||
    name === 'AbortError' ||
    /connection error|timeout|fetch failed|socket/i.test(String(error?.message))
  ) {
    return new RetryableError('Could not reach OpenAI just now. Retrying.')
  }

  if (status >= 500) {
    return new RetryableError('OpenAI had a server error. Retrying.')
  }

  return new Error(error?.message || 'OpenAI request failed')
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

/**
 * Downloads one audio chunk from Cloudinary.
 *
 * Returns null when the slice is past the end of the video. Throws
 * NotReadyError while Cloudinary is still rendering, and RetryableError for
 * passing network trouble.
 */
async function fetchAudioChunk(
  cloudinaryId: string,
  chunkIndex: number,
  plain: boolean
): Promise<{ buffer: Buffer } | null> {
  const url = audioChunkUrl(cloudinaryId, chunkIndex, plain)

  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new NotReadyError('Cloudinary is still preparing the audio. Retrying.')
    }
    throw new RetryableError('Could not reach Cloudinary just now. Retrying.')
  }

  // 423 Locked means the derived audio file is still being generated.
  if (res.status === 423) throw new NotReadyError()

  // Past the end of the video — nothing left to transcribe.
  if (res.status === 404) return null

  if (!res.ok) {
    // Cloudinary explains itself in this header. Without it a rejected
    // transformation looks identical to a video that has no sound.
    const reason = res.headers.get('x-cld-error') || ''
    throw new BadTransformError(
      `Cloudinary refused the audio request (HTTP ${res.status})` +
        (reason ? `: ${reason}` : '')
    )
  }

  const buffer = Buffer.from(await res.arrayBuffer())

  // A tiny body means we asked for a slice past the end of the video.
  if (buffer.byteLength < 1024) return null

  return { buffer }
}

/**
 * Transcribes one 2-minute slice of the video.
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
  let chunk: { buffer: Buffer } | null

  try {
    chunk = await fetchAudioChunk(cloudinaryId, chunkIndex, false)
  } catch (error) {
    if (!(error instanceof BadTransformError)) throw error

    // The tuned URL was rejected. Rather than failing the whole video, ask
    // again for a plain trim with no audio parameters. Bigger file, same words.
    console.warn('Tuned audio URL rejected, falling back to plain:', (error as Error).message)
    chunk = await fetchAudioChunk(cloudinaryId, chunkIndex, true)
  }

  if (!chunk) return []

  // Node 18+ (which Vercel runs) has File and Blob built in, so we hand Whisper
  // a plain File rather than relying on an SDK helper.
  const file = new File([chunk.buffer], `chunk-${chunkIndex}.mp3`, { type: 'audio/mpeg' })

  let result: any
  try {
    result = await getOpenAI().audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })
  } catch (error) {
    throw translateOpenAIError(error)
  }

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

  let response
  try {
    response = await getOpenAI().chat.completions.create({
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
  } catch (error) {
    throw translateOpenAIError(error)
  }

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
