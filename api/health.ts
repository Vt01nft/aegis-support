import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkGeminiHealth } from '../server/gemini'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  const result = await checkGeminiHealth()
  response.status(200).json(result)
}
