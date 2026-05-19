# Aegis Support Memory

This file captures durable project context for future Codex sessions.

## Current Project

- Name: Aegis Support
- Local path: `C:\Aegis support`
- Live app: `https://aegis-support-six.vercel.app`
- GitHub repo: `https://github.com/Vt01nft/aegis-support`
- Vercel project: `promptforge/aegis-support`
- Sponsor target: `TrueFoundry: Resilient Agents`

## Product Summary

Aegis Support is a Gemini-powered resilient customer support agent. It demonstrates what happens when support dependencies fail: model outage, carrier/order API failure, missing policy data, malformed tool output, slow tools, and ticketing failure.

## Differentiators

- Guided demo
- Gemini primary response path
- Deterministic fallback playbooks
- Trust score
- Unsafe-answer prevention
- Customer heat
- Recovery timeline
- Human handoff packet
- Executive incident report export/copy

## Submission Assets

- Devpost copy: `DEVPOST.md`
- Submission brief: `SUBMISSION.md`
- Gallery images: `devpost-gallery/*.png`

## Operational Notes

- `.env` is local only and must not be committed.
- Vercel production has `GEMINI_API_KEY` and `GEMINI_MODEL`.
- Verify production with:

```powershell
Invoke-WebRequest -UseBasicParsing https://aegis-support-six.vercel.app/api/health
```

Expected healthy result:

```json
{"ok":true,"model":"gemini-2.5-flash","status":"connected"}
```
