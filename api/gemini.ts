import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateSupportAnswer } from '../server/gemini'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const result = await generateSupportAnswer(request.body)
    response.status(200).json(result)
  } catch {
    response.status(500).json({
      error: 'Gemini request failed',
    })
  }
}
