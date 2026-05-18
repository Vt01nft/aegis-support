import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { checkGeminiHealth, generateSupportAnswer } from './server/gemini'

function readRequestBody(request: import('node:http').IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk
    })

    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (error) {
        reject(error)
      }
    })

    request.on('error', reject)
  })
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      {
        name: 'aegis-gemini-dev-api',
        configureServer(server) {
          server.middlewares.use('/api/health', async (request, response) => {
            if (request.method !== 'GET') {
              response.statusCode = 405
              response.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            const result = await checkGeminiHealth()
            response.setHeader('Content-Type', 'application/json')
            response.end(JSON.stringify(result))
          })

          server.middlewares.use('/api/gemini', async (request, response) => {
            if (request.method !== 'POST') {
              response.statusCode = 405
              response.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            try {
              const body = await readRequestBody(request)
              const result = await generateSupportAnswer({
                question: String(body.question ?? ''),
                deterministicAnswer: String(body.deterministicAnswer ?? ''),
                route: String(body.route ?? ''),
                activeFailures: Array.isArray(body.activeFailures)
                  ? body.activeFailures.map(String)
                  : [],
              })

              response.setHeader('Content-Type', 'application/json')
              response.end(JSON.stringify(result))
            } catch {
              response.statusCode = 500
              response.setHeader('Content-Type', 'application/json')
              response.end(
                JSON.stringify({
                  error: 'Gemini request failed',
                }),
              )
            }
          })
        },
      },
    ],
  }
})
