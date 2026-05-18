# Aegis Support

Aegis Support is a resilient customer support agent prototype for the DevNetwork AI + ML Hackathon 2026.

The app demonstrates a support assistant that keeps helping customers when its model layer, knowledge base, order API, ticketing API, or tool responses fail. It is built as an interactive operations console so judges can run failure scenarios and immediately see fallback decisions.

## Why it matters

Most AI support demos assume every service works. Real support teams need agents that degrade gracefully, avoid hallucinating when trusted data is unavailable, and record what happened for operators.

Aegis Support focuses on production behavior:

- Use Gemini as the primary response model
- Route from primary model to backup model or verified playbook
- Refuse to invent policy answers when the knowledge base is unavailable
- Fall back from live order lookup to a priority support ticket
- Queue escalation details when the ticket API fails
- Log each recovery in an operator timeline
- Show business metrics for protected sessions and active failures
- Give judges one-click demo scenarios for outage, policy, and escalation failures
- Generate a board-ready incident report
- Copy or export the human handoff packet
- Show Gemini health without exposing API keys

## Demo flow

Fast path:

1. Click `Run guided demo`
2. Watch Aegis step through carrier lookup, model provider, policy retrieval, and escalation failures
3. Review the recovery timeline, active failures, and protected sessions

Manual path:

1. Click `Carrier lookup outage`
2. Confirm the agent refuses to invent shipment status
3. Click `Model provider outage`
4. Confirm routing from primary model to backup model
5. Click `No trusted policy data`
6. Confirm the anti-hallucination guardrail response
7. Click `Total escalation failure`
8. Review the recovery timeline

## Local development

Create a local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Set `GEMINI_API_KEY` in `.env`. Without a key, the app still runs and shows the verified fallback path.

```bash
npm install
npm run dev
```

The local Vite server exposes `/api/gemini` as a server-side route, so the Gemini key is never sent to the browser.

## Submission assets

- `SUBMISSION.md`: pitch, judging fit, and demo script
- `DEVPOST.md`: draft Devpost copy
- `vercel.json`: Vercel deployment configuration

## Build checks

```bash
npm run lint
npm run build
```
