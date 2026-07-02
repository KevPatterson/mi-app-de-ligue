import { NextResponse, type NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Rate limiting: Map to store IP request counts
// In production, use Upstash Redis or similar persistent store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_REQUESTS = 5
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  // Clean up old records
  if (record && now > record.resetTime) {
    rateLimitMap.delete(ip)
    return { allowed: true }
  }

  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true }
  }

  if (record.count >= RATE_LIMIT_REQUESTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { allowed: false, retryAfter }
  }

  record.count += 1
  return { allowed: true }
}

interface ImageContent {
  type: 'image_url'
  image_url: {
    url: string
    detail: 'low' | 'high'
  }
}

interface TextContent {
  type: 'text'
  text: string
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const ip = getClientIP(request)
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 60),
          },
        }
      )
    }

    // Parse request body
    const { imageBase64 } = await request.json()

    // Validate imageBase64
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid imageBase64' },
        { status: 400 }
      )
    }

    // Validate base64 format
    const base64Regex = /^data:image\/(jpeg|png|webp);base64,/
    if (!base64Regex.test(imageBase64)) {
      return NextResponse.json(
        { error: 'Invalid image format. Must be data:image/[type];base64,...' },
        { status: 400 }
      )
    }

    // Run moderation on image using omni-moderation-latest
    let isFlagged = false
    try {
      const moderationResponse = await openai.moderations.create({
        model: 'omni-moderation-latest',
        input: [
          {
            type: 'image_url',
            image_url: {
              url: imageBase64,
            },
          } as unknown as string,
        ] as unknown as string[],
      })

      isFlagged = moderationResponse.results[0]?.flagged ?? false
    } catch (moderationError) {
      console.error('Moderation check failed:', moderationError)
      // Log but don't block on moderation failure; proceed with generation
      // This is intentional to avoid false negatives blocking legitimate requests
    }

    if (isFlagged) {
      return NextResponse.json(
        { error: 'Contenido no permitido' },
        { status: 422 }
      )
    }

    // Generate rizz lines using gpt-4o-mini with vision
    const systemPrompt = `You are a creative, respectful flirt assistant. Generate exactly 5 clever, original, and charming pickup lines based on SPECIFIC visual details in the image provided.

RULES:
- Focus on concrete visible objects, clothing, activities, environment, style, pets, accessories, etc.
- NEVER make assumptions about age, ethnicity, body type, or make invasive comments.
- Keep lines witty, humorous, and respectful—never vulgar or inappropriate.
- Each line should be unique and reference something different from the image.
- Return ONLY valid JSON with no markdown, code blocks, or extra text.

Format your response as valid JSON: { "lines": ["line1", "line2", "line3", "line4", "line5"] }`

    const imageContent: ImageContent = {
      type: 'image_url',
      image_url: {
        url: imageBase64,
        detail: 'low',
      },
    }

    const textContent: TextContent = {
      type: 'text',
      text: 'Generate 5 creative, respectful pickup lines based on the visual details in this image.',
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [imageContent, textContent],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 500,
    })

    // Extract and parse response
    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 500 }
      )
    }

    let parsedResponse: { lines: string[] }
    try {
      parsedResponse = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText, parseError)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Validate response structure
    if (
      !Array.isArray(parsedResponse.lines) ||
      parsedResponse.lines.length < 5 ||
      !parsedResponse.lines.every((line) => typeof line === 'string')
    ) {
      console.error('Invalid AI response structure:', parsedResponse)
      return NextResponse.json(
        { error: 'AI response did not meet requirements' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      rizzLines: parsedResponse.lines,
    })
  } catch (error) {
    console.error('Error in generate-rizz-from-image:', error)

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 400) {
        return NextResponse.json(
          { error: 'Invalid image or request format' },
          { status: 400 }
        )
      }
      if (error.status === 401 || error.status === 403) {
        return NextResponse.json(
          { error: 'API authentication failed' },
          { status: 500 }
        )
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      if (error.status === 413) {
        return NextResponse.json(
          { error: 'Image size too large for processing' },
          { status: 413 }
        )
      }

      return NextResponse.json(
        { error: `OpenAI API error: ${error.message}` },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
