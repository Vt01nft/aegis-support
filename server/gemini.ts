import { GoogleGenAI } from '@google/genai'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type GenerateSupportAnswerInput = {
  question: string
  deterministicAnswer: string
  route: string
  activeFailures: string[]
}

function classifyGeminiError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)

  try {
    const parsed = JSON.parse(raw) as { error?: { status?: string; message?: string } }
    const status = parsed.error?.status
    const message = parsed.error?.message || ''

    if (status === 'RESOURCE_EXHAUSTED') return 'quota_exhausted'
    if (status === 'INVALID_ARGUMENT' && message.toLowerCase().includes('api key')) return 'invalid_key'
  } catch {
    if (raw.toLowerCase().includes('quota')) return 'quota_exhausted'
    if (raw.toLowerCase().includes('api key')) return 'invalid_key'
  }

  return 'provider_error'
}

function readLocalEnv(name: string) {
  const envPath = resolve(process.cwd(), '.env')

  if (!existsSync(envPath)) {
    return undefined
  }

  const line = readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((entry) => entry.trim().replace(/^\uFEFF/, ''))
    .find((entry) => entry.startsWith(`${name}=`))

  return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, '')
}

function getServerEnv(name: string) {
  return process.env[name] || readLocalEnv(name)
}

export async function generateSupportAnswer({
  question,
  deterministicAnswer,
  route,
  activeFailures,
}: GenerateSupportAnswerInput) {
  const apiKey = getServerEnv('GEMINI_API_KEY')
  const model = getServerEnv('GEMINI_MODEL') || 'gemini-2.5-flash'

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const ai = new GoogleGenAI({ apiKey })
  const activeFailureText = activeFailures.length > 0 ? activeFailures.join(', ') : 'none'

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are Aegis Support, a resilient customer support agent.

Return a concise customer-facing answer only. Do not mention internal implementation details unless it helps the customer understand a temporary limitation.

Rules:
- Never invent order status, refund status, policy terms, or ticket IDs.
- If trusted data is unavailable, say what can still be done.
- Keep the answer under 80 words.
- Preserve the meaning of the verified fallback answer.

Customer question:
${question}

Current route:
${route}

Active failures:
${activeFailureText}

Verified fallback answer:
${deterministicAnswer}`,
          },
        ],
      },
    ],
    config: {
      temperature: 0.25,
      maxOutputTokens: 180,
    },
  })

  const text = response.text?.trim()

  if (!text) {
    throw new Error('Gemini returned an empty response')
  }

  return {
    text,
    model,
  }
}

export async function checkGeminiHealth() {
  const apiKey = getServerEnv('GEMINI_API_KEY')
  const model = getServerEnv('GEMINI_MODEL') || 'gemini-2.5-flash'

  if (!apiKey) {
    return {
      ok: false,
      model,
      status: 'missing_key',
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    await ai.models.generateContent({
      model,
      contents: 'Reply with the single word ready.',
      config: {
        temperature: 0,
        maxOutputTokens: 8,
      },
    })

    return {
      ok: true,
      model,
      status: 'connected',
    }
  } catch (error) {
    return {
      ok: false,
      model,
      status: classifyGeminiError(error),
    }
  }
}
