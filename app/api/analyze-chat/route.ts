import { NextResponse, type NextRequest } from 'next/server'
import { generateChatCompletion, moderateImageIfAvailable, type ChatMessage } from '../../../lib/aiClient'

// Rate limiting: Map to store IP request counts (in-memory). Use Upstash/Redis in prod.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_REQUESTS = 5
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

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

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
      )
    }

    const { imageBase64, tone } = await request.json()

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid imageBase64' }, { status: 400 })
    }

    const base64Regex = /^data:image\/(jpeg|png|webp);base64,/
    if (!base64Regex.test(imageBase64)) {
      return NextResponse.json(
        { error: 'Invalid image format. Must be data:image/[type];base64,...' },
        { status: 400 }
      )
    }

    // Moderation check using omni-moderation-latest. If flagged, refuse.
    try {
      const mod = await moderateImageIfAvailable(imageBase64)
      if (mod.flagged) return NextResponse.json({ error: 'Contenido no permitido' }, { status: 422 })
    } catch (moderationErr) {
      console.error('Moderation error:', moderationErr)
    }

    // Build system prompt with strict safety instructions
    const systemPrompt = `You are a respectful conversation coach (wingman-style) whose job is to help the user continue a dating/chat conversation.

INSTRUCTIONS:
- First, briefly summarize (1-2 lines) the visible context from the screenshot: who said what and the tone. This summary is for internal context and should be concise.
- Then, produce exactly 3 suggested replies that continue the conversation naturally, tailored to the last message in the screenshot and adapted to the requested tone.
- Tones: "casual", "flirty", "funny". Default to "casual" if not provided.
- NEVER assume age, ethnicity, or other sensitive attributes. If you detect signals that the other person may be a minor, or signs of discomfort, rejection, sexual explicitness, harassment, or coercion, DO NOT produce suggested replies. Instead set needs_review=true and provide a short review_reason.
- Do NOT provide manipulative tactics (negs, gaslighting, tests), pressure, or instructions to coerce. Explicitly avoid these.
- Output ONLY valid JSON with no markdown, no extra commentary.

RESPONSE FORMAT:
{ "context_summary": "...", "suggestions": ["...","...","..."], "needs_review": false, "review_reason": null }
`

    const userContent = `Analyze the image (chat screenshot) and follow the system instructions. Tone: ${
      tone === 'flirty' || tone === 'funny' ? tone : 'casual'
    }`

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: imageBase64 } },
          { type: 'text', text: userContent }
        ] }
      ]

      const completion = await generateChatCompletion(messages, { model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 800 })

      const raw = completion.choices?.[0]?.message?.content
      if (!raw) {
        return NextResponse.json({ error: 'No response from AI model' }, { status: 500 })
      }

      let parsed: { context_summary: string; suggestions: string[]; needs_review: boolean; review_reason?: string }
      try {
        parsed = JSON.parse(raw)
      } catch (parseErr) {
        console.error('Failed to parse AI response:', raw, parseErr)
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      }

      if (typeof parsed.context_summary !== 'string' || !Array.isArray(parsed.suggestions)) {
        return NextResponse.json({ error: 'AI response did not meet requirements' }, { status: 500 })
      }

      if (parsed.needs_review) {
        return NextResponse.json({
          context_summary: parsed.context_summary,
          suggestions: [],
          needs_review: true,
          review_reason: parsed.review_reason || 'Content requires manual review',
        })
      }

      // Ensure exactly 3 suggestions
      const suggestions = parsed.suggestions.slice(0, 3)
      if (suggestions.length < 3) {
        return NextResponse.json({ error: 'AI did not return 3 suggestions' }, { status: 500 })
      }

      return NextResponse.json({ context_summary: parsed.context_summary, suggestions, needs_review: false })
    } catch (openaiErr: unknown) {
      console.error('OpenAI error:', openaiErr)
      // If error has status, handle common cases
      // As OpenAI SDK typings may vary, provide generic handling
      return NextResponse.json({ error: 'OpenAI API error' }, { status: 502 })
    }
  } catch (err) {
    console.error('Unexpected error in analyze-chat:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
