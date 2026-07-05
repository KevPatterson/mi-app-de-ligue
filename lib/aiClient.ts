import OpenAI from 'openai'

type ChatMessage = { role: string; content: any }

const OPENAI_KEY = process.env.OPENAI_API_KEY
const GEMINI_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'models/text-bison-001'

async function callOpenAIChat(messages: ChatMessage[], opts: { model?: string; temperature?: number; max_tokens?: number }) {
  const client = new OpenAI({ apiKey: OPENAI_KEY })
  return await client.chat.completions.create({
    model: opts.model || 'gpt-4o-mini',
    messages: messages as any,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens ?? 512,
  })
}

async function callGemini(messages: ChatMessage[], opts: { model?: string; temperature?: number; max_tokens?: number }) {
  if (!GEMINI_KEY) throw new Error('No GEMINI_API_KEY configured')

  // Convert messages to a single prompt text
  const promptText = messages
    .map((m) => {
      if (typeof m.content === 'string') return `${m.role.toUpperCase()}: ${m.content}`
      try {
        return `${m.role.toUpperCase()}: ${JSON.stringify(m.content)}`
      } catch {
        return `${m.role.toUpperCase()}: [UNPARSEABLE CONTENT]`
      }
    })
    .join('\n')

  const url = `https://generativelanguage.googleapis.com/v1beta2/${opts.model || GEMINI_MODEL}:generate?key=${GEMINI_KEY}`

  const body = {
    prompt: { text: promptText },
    temperature: opts.temperature ?? 0.7,
    maxOutputTokens: opts.max_tokens ?? 512,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Gemini API error: ${res.status} ${txt}`)
  }

  const data = await res.json()
  // Expecting response.candidates[0].output or candidates[0].content
  const text = data?.candidates?.[0]?.output || data?.candidates?.[0]?.content || data?.output
  if (!text) throw new Error('No text returned from Gemini')

  return { choices: [{ message: { content: text } }] }
}

export async function generateChatCompletion(messages: ChatMessage[], opts: { model?: string; temperature?: number; max_tokens?: number } = {}) {
  // Prefer OpenAI if configured
  if (OPENAI_KEY) {
    try {
      return await callOpenAIChat(messages, opts)
    } catch (err) {
      console.error('OpenAI call failed, falling back to Gemini:', err)
    }
  }

  // Fallback to Gemini
  if (GEMINI_KEY) {
    return await callGemini(messages, opts)
  }

  throw new Error('No AI provider configured')
}

export async function moderateImageIfAvailable(imageBase64: string) {
  if (!OPENAI_KEY) {
    console.warn('OpenAI key not configured; skipping image moderation')
    return { flagged: false }
  }

  try {
    const client = new OpenAI({ apiKey: OPENAI_KEY })
    const modResponse = await client.moderations.create({
      model: 'omni-moderation-latest',
      input: [
        {
          type: 'image_url',
          image_url: { url: imageBase64 },
        } as unknown as string,
      ] as unknown as string[],
    })

    return { flagged: modResponse.results?.[0]?.flagged ?? false }
  } catch (err) {
    console.error('Moderation call failed:', err)
    return { flagged: false }
  }
}

export type { ChatMessage }
