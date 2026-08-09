import crypto from 'crypto'

/**
 * Cloudinary does three jobs for us:
 *   1. Stores the original video (the browser uploads straight to Cloudinary,
 *      so the file never passes through Vercel's 4.5 MB request limit).
 *   2. Extracts audio as small .mp3 chunks that we feed to Whisper.
 *   3. Cuts the finished vertical clips on-the-fly, purely via URL parameters —
 *      no FFmpeg, no long-running server job.
 *
 * Every value is read lazily so a missing env var can never crash `next build`.
 */

/**
 * How many seconds of audio we send to Whisper in one request.
 *
 * Kept deliberately short. Every step must finish inside the serverless time
 * limit, and the very first chunk also pays for Cloudinary generating the audio
 * track from scratch, which is the slowest moment in the whole pipeline.
 */
export const CHUNK_SECONDS = 120 // 2 minutes

export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
}

export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and ' +
        'CLOUDINARY_API_SECRET in your Vercel project settings under Environment Variables.'
    )
  }

  return { cloudName, apiKey, apiSecret }
}

/** True when Cloudinary env vars exist. Never throws — safe to call anywhere. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  )
}

/**
 * Cloudinary's signature: sort the params alphabetically, join them as
 * `key=value&key=value`, append the API secret, then SHA-1 the whole string.
 */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  return crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')
}

function deliveryBase(cloudName: string): string {
  return `https://res.cloudinary.com/${cloudName}/video/upload`
}

/**
 * URL for one slice of the video's audio track, delivered as mp3.
 *
 * The transformations matter as much as the trim:
 *   ac_mono    — one channel instead of two
 *   af_16000   — 16 kHz, which is exactly what Whisper listens at anyway
 *   br_32k     — 32 kbps, plenty for speech
 *
 * Together these turn a ~2 MB/minute stereo file into ~0.24 MB/minute. Smaller
 * files are quicker for Cloudinary to render, quicker to download, and quicker
 * to forward to Whisper — which is what keeps each step inside the time limit.
 */
export function audioChunkUrl(publicId: string, chunkIndex: number): string {
  const { cloudName } = getCloudinaryConfig()
  const start = chunkIndex * CHUNK_SECONDS
  const end = start + CHUNK_SECONDS

  return `${deliveryBase(cloudName)}/so_${start},eo_${end}/ac_mono,af_16000,br_32k/${publicId}.mp3`
}

export type AspectRatio = '9:16' | '1:1' | '16:9'

const DIMENSIONS: Record<AspectRatio, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '1:1': { w: 1080, h: 1080 },
  '16:9': { w: 1920, h: 1080 },
}

/**
 * The finished clip: trimmed to the moment, cropped to the platform's shape.
 * `g_auto` tells Cloudinary to keep the interesting part of the frame in view
 * when it crops a wide video down to vertical.
 */
export function clipUrl(
  publicId: string,
  startTime: number,
  endTime: number,
  aspectRatio: AspectRatio = '9:16'
): string {
  const { cloudName } = getCloudinaryConfig()
  const { w, h } = DIMENSIONS[aspectRatio] || DIMENSIONS['9:16']
  const start = Math.max(0, Math.round(startTime * 10) / 10)
  const end = Math.max(start + 1, Math.round(endTime * 10) / 10)

  return `${deliveryBase(cloudName)}/so_${start},eo_${end}/c_fill,g_auto,w_${w},h_${h}/${publicId}.mp4`
}

/** Same crop as the clip, but a single still frame for the preview card. */
export function clipThumbnailUrl(
  publicId: string,
  startTime: number,
  aspectRatio: AspectRatio = '9:16'
): string {
  const { cloudName } = getCloudinaryConfig()
  const { w, h } = DIMENSIONS[aspectRatio] || DIMENSIONS['9:16']
  const start = Math.max(0, Math.round(startTime * 10) / 10)

  return `${deliveryBase(cloudName)}/so_${start}/c_fill,g_auto,w_${w},h_${h}/${publicId}.jpg`
}

/** Adds the flag that makes a browser download the file instead of playing it. */
export function asDownloadUrl(url: string): string {
  return url.replace('/upload/', '/upload/fl_attachment/')
}

export interface CloudinaryResource {
  publicId: string
  duration: number
  bytes: number
  format: string
  secureUrl: string
}

/**
 * Ask Cloudinary directly what it stored. We use this instead of trusting the
 * duration the browser sends us, so nobody can claim a 2-hour video is 5 seconds
 * long to slip past the free-tier limit.
 */
export async function fetchResource(publicId: string): Promise<CloudinaryResource | null> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig()
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/video/upload/${encodeURIComponent(
      publicId
    )}`,
    { headers: { Authorization: `Basic ${auth}` }, cache: 'no-store' }
  )

  if (!res.ok) return null

  const data: any = await res.json()

  return {
    publicId: data.public_id,
    duration: Math.round(Number(data.duration) || 0),
    bytes: Number(data.bytes) || 0,
    format: String(data.format || ''),
    secureUrl: String(data.secure_url || ''),
  }
}
