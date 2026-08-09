import OpenAI from 'openai'

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

export interface ViralMoment {
  startTime: number
  endTime: number
  reason: string
  score: number
}

export interface VideoAnalysis {
  viralMoments: ViralMoment[]
  suggestedTitle: string
  hashtags: string[]
  captions: string[]
}

export class AIService {
  /** Analyze a video transcript and detect viral moments */
  async analyzeVideo(transcript: string, duration: number): Promise<VideoAnalysis> {
    try {
      const prompt = `Analyze this video transcript and identify the top 5 most engaging moments that would work well as short-form content (15-60 seconds). Consider:
- Hook/attention-grabbing statements
- Emotional peaks
- Surprising revelations
- Actionable tips
- Quotable moments

Transcript: ${transcript}
Video duration: ${duration} seconds

Return a JSON response with this structure:
{
  "viralMoments": [
    { "startTime": 45, "endTime": 75, "reason": "Strong hook with surprising statistic", "score": 9.2 }
  ],
  "suggestedTitle": "Catchy title for the video",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "captions": ["Caption option 1", "Caption option 2"]
}`

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert social media content strategist specializing in viral short-form content. Analyze videos and identify the most engaging moments.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })

      const result = JSON.parse(response.choices[0].message.content || '{}')
      return result as VideoAnalysis
    } catch (error) {
      console.error('AI analysis error:', error)
      throw new Error('Failed to analyze video')
    }
  }

  /** Generate captions for a specific clip */
  async generateCaptions(clipTranscript: string, platform: string): Promise<string[]> {
    try {
      const platformContext: Record<string, string> = {
        tiktok: 'TikTok (casual, trendy, uses slang)',
        instagram: 'Instagram Reels (aesthetic, aspirational)',
        youtube_shorts: 'YouTube Shorts (informative, value-driven)',
      }

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Generate 3 engaging captions for ${
              platformContext[platform] || platform
            }. Each should be optimized for maximum engagement.`,
          },
          {
            role: 'user',
            content: `Clip content: ${clipTranscript}\n\nReturn JSON: {"captions": ["caption1", "caption2", "caption3"]}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      })

      const result = JSON.parse(response.choices[0].message.content || '{"captions":[]}')
      return result.captions as string[]
    } catch (error) {
      console.error('Caption generation error:', error)
      return ['Check out this amazing moment!']
    }
  }

  /** Generate optimized hashtags */
  async generateHashtags(content: string, platform: string): Promise<string[]> {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Generate 10-15 trending hashtags for ${platform}. Mix popular, niche, and long-tail hashtags.`,
          },
          {
            role: 'user',
            content: `Content: ${content}\n\nReturn JSON: {"hashtags": ["#hashtag1", "#hashtag2"]}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })

      const result = JSON.parse(response.choices[0].message.content || '{"hashtags":[]}')
      return result.hashtags as string[]
    } catch (error) {
      console.error('Hashtag generation error:', error)
      return ['#viral', '#trending', '#fyp']
    }
  }

  /** Placeholder transcription — swap in OpenAI Whisper for production */
  async transcribeVideo(audioUrl: string): Promise<string> {
    return `This is a sample transcript for ${audioUrl}. In production, integrate the OpenAI Whisper API for real transcription.`
  }
}

export const aiService = new AIService()
