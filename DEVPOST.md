# Devpost Draft

## Project name

Aegis Support

## Tagline

Gemini-powered customer support that keeps working when models, APIs, tools, and knowledge systems fail.

## Inspiration

Most AI support demos look good only when every dependency is healthy. Real support teams need agents that can survive outages, avoid hallucinating, and preserve customer trust when systems fail.

## What it does

Aegis Support is a resilient support operations console. It uses Gemini for natural responses when available, then falls back to verified playbooks when the model path or business tools fail. Judges can run failure scenarios for carrier lookup, model outage, missing policy data, and ticketing failure. The app shows trust score, customer heat, unsafe-answer prevention, recovery timeline, and a human handoff packet.

## How we built it

- React and TypeScript frontend
- Vite app with server-side development middleware
- Gemini integration through a backend `/api/gemini` route
- Server-side health check through `/api/health`
- Deterministic support playbooks for fallback behavior
- Chaos controls for dependency simulation
- Responsive operator dashboard

## What makes it different

Aegis is not just a chatbot. It shows what happens when the happy path breaks:

- Answer trust score
- Unsafe-answer prevention
- Customer heat
- Next-best-action guidance
- Auto escalation packet
- Recovery timeline
- Executive incident report export

## Challenges we ran into

The main challenge was designing a demo that still works honestly when Gemini or business APIs fail. Instead of hiding failures, Aegis makes them visible and shows how the agent protects the customer experience.

## Accomplishments

- Built a working responsive support console
- Added Gemini-backed response architecture
- Added production-style fallback behavior
- Added guided demo mode for judges
- Added handoff and incident reporting features

## What is next

- Connect real order, billing, and ticketing systems
- Add Zendesk, Intercom, and Shopify support integrations
- Store incidents and handoff packets in a database
- Add team-level analytics for AI support reliability
- Add regression tests for agent failure cases
