import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Bot,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Copy,
  Clock3,
  Database,
  Download,
  FileCheck2,
  Gauge,
  GitBranch,
  LifeBuoy,
  MessageSquare,
  Play,
  PlugZap,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TicketCheck,
  TrendingUp,
  User,
  WifiOff,
} from 'lucide-react'
import './App.css'

type FailureKey =
  | 'primaryModel'
  | 'backupModel'
  | 'knowledgeBase'
  | 'orderApi'
  | 'ticketApi'
  | 'slowTools'
  | 'malformedTool'

type Role = 'agent' | 'customer'
type Severity = 'healthy' | 'degraded' | 'critical'

type Message = {
  id: number
  role: Role
  text: string
  route?: string
  severity?: Severity
}

type Incident = {
  id: number
  label: string
  detail: string
  fallback: string
  severity: Severity
}

type GeminiResult = {
  text: string
  model: string
}

type Scenario = {
  title: string
  goal: string
  prompt: string
  failures: FailureKey[]
}

type HealthStatus = {
  ok: boolean
  model: string
  status: 'connected' | 'missing_key' | 'invalid_key' | 'quota_exhausted' | 'provider_error'
}

const failureLabels: Record<FailureKey, { title: string; detail: string }> = {
  primaryModel: {
    title: 'Primary model outage',
    detail: 'Main LLM times out or returns provider errors.',
  },
  backupModel: {
    title: 'Backup model outage',
    detail: 'Secondary model is also unavailable.',
  },
  knowledgeBase: {
    title: 'Knowledge base down',
    detail: 'Policy retrieval and help center search fail.',
  },
  orderApi: {
    title: 'Order API failing',
    detail: 'Live shipment lookup returns an error.',
  },
  ticketApi: {
    title: 'Ticket API failing',
    detail: 'Escalation and ticket creation cannot complete.',
  },
  slowTools: {
    title: 'Slow tool calls',
    detail: 'External tools exceed the response budget.',
  },
  malformedTool: {
    title: 'Bad tool response',
    detail: 'Tool output is incomplete or malformed.',
  },
}

const policyAnswers = {
  return:
    'Items can be returned within 30 days when they are unused and in original packaging. Because you mentioned damage, I can create a return case and attach photos before a replacement decision.',
  refund:
    'Duplicate charges should be reviewed against the payment reference before any promise is made. I can collect the charge ID, flag it as billing risk, and route it to payments support.',
  warranty:
    'Most devices include a one year limited warranty. Accidental damage is excluded, but the agent can check eligibility and prepare a replacement review.',
}

const starterMessages: Message[] = [
  {
    id: 1,
    role: 'agent',
    text: 'Case SUP-5821 is open. I can help with orders, returns, refunds, warranty, or escalation while the resilience layer protects the conversation.',
    route: 'Production guardrails active',
    severity: 'healthy',
  },
]

const sampleQuestions = [
  'Where is my order ORD-1042?',
  'How do I return a damaged item?',
  'I was charged twice. What should I do?',
  'What is the warranty policy?',
  'Escalate this to a human agent.',
]

const scenarios: Scenario[] = [
  {
    title: 'Carrier lookup outage',
    goal: 'Show that the agent does not invent shipment status.',
    prompt: 'Where is my order ORD-1042?',
    failures: ['orderApi'],
  },
  {
    title: 'Model provider outage',
    goal: 'Prove routing from primary model to backup model.',
    prompt: 'How do I return a damaged item?',
    failures: ['primaryModel'],
  },
  {
    title: 'No trusted policy data',
    goal: 'Demonstrate anti-hallucination behavior.',
    prompt: 'What is the warranty policy?',
    failures: ['knowledgeBase'],
  },
  {
    title: 'Total escalation failure',
    goal: 'Queue a retry packet when ticketing is down.',
    prompt: 'Escalate this to a human agent.',
    failures: ['ticketApi', 'slowTools'],
  },
]

const demoPauseMs = 650

const businessImpact = {
  healthy: 'Customer receives a verified answer with no interruption.',
  degraded: 'Customer is protected from a bad answer while the case stays moving.',
  critical: 'Aegis preserves the case context for human recovery instead of losing the session.',
}

const initialFailures: Record<FailureKey, boolean> = {
  primaryModel: false,
  backupModel: false,
  knowledgeBase: false,
  orderApi: false,
  ticketApi: false,
  slowTools: false,
  malformedTool: false,
}

let nextId = 20

function detectIntent(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes('order') || lower.includes('ord-')) return 'order'
  if (lower.includes('return') || lower.includes('damaged')) return 'return'
  if (lower.includes('refund') || lower.includes('charged') || lower.includes('twice')) return 'refund'
  if (lower.includes('warranty')) return 'warranty'
  if (lower.includes('human') || lower.includes('escalate') || lower.includes('ticket')) return 'escalate'
  return 'general'
}

function buildFailureMap(activeKeys: FailureKey[]) {
  return activeKeys.reduce<Record<FailureKey, boolean>>(
    (map, key) => ({ ...map, [key]: true }),
    { ...initialFailures },
  )
}

function buildResponse(
  text: string,
  failures: Record<FailureKey, boolean>,
): { message: Message; incidents: Incident[] } {
  const intent = detectIntent(text)
  const incidents: Incident[] = []
  const modelRoute = failures.primaryModel
    ? failures.backupModel
      ? 'Verified playbook'
      : 'Backup model'
    : 'Primary model'

  if (failures.primaryModel) {
    incidents.push({
      id: nextId++,
      label: 'Primary model failed',
      detail: 'The request was routed away from the main LLM before the customer saw an error.',
      fallback: failures.backupModel ? 'Used verified playbook response' : 'Used backup model',
      severity: failures.backupModel ? 'critical' : 'degraded',
    })
  }

  if (failures.slowTools) {
    incidents.push({
      id: nextId++,
      label: 'Tool latency threshold crossed',
      detail: 'The tool layer exceeded the 900 ms response budget.',
      fallback: 'Returned a bounded answer and logged the slow dependency',
      severity: 'degraded',
    })
  }

  if (failures.malformedTool) {
    incidents.push({
      id: nextId++,
      label: 'Malformed tool output blocked',
      detail: 'A tool returned missing fields and was excluded from the final answer.',
      fallback: 'Asked for confirmation before taking action',
      severity: 'degraded',
    })
  }

  if (intent === 'order') {
    if (failures.orderApi || failures.malformedTool) {
      incidents.push({
        id: nextId++,
        label: 'Order lookup unavailable',
        detail: 'Live order data could not be verified.',
        fallback: failures.ticketApi
          ? 'Collected details for manual follow up'
          : 'Prepared a priority ticket with order context',
        severity: failures.ticketApi ? 'critical' : 'degraded',
      })

      return {
        message: {
          id: nextId++,
          role: 'agent',
          text: failures.ticketApi
            ? 'I cannot verify live order status right now, and ticket creation is also unavailable. I will capture the order ID, email, and issue summary so a human agent can follow up when service returns.'
            : 'Live order lookup is temporarily unavailable, so I will not guess. I can create a priority ticket with your order ID and ask fulfillment to confirm status by email.',
          route: `${modelRoute} plus order fallback`,
          severity: failures.ticketApi ? 'critical' : 'degraded',
        },
        incidents,
      }
    }

    return {
      message: {
        id: nextId++,
        role: 'agent',
        text: 'Order ORD-1042 is in transit and is scheduled to arrive tomorrow by 7 PM. I can notify you if the carrier posts a delay.',
        route: `${modelRoute} plus order API`,
        severity: failures.primaryModel ? 'degraded' : 'healthy',
      },
      incidents,
    }
  }

  if (intent === 'escalate') {
    if (failures.ticketApi) {
      incidents.push({
        id: nextId++,
        label: 'Escalation service failed',
        detail: 'The ticket API did not accept the escalation request.',
        fallback: 'Created a local escalation packet for retry',
        severity: 'critical',
      })
      return {
        message: {
          id: nextId++,
          role: 'agent',
          text: 'I cannot create the ticket through the support system right now. I saved the escalation details locally for retry and can give you a reference summary to share with support.',
          route: `${modelRoute} plus local queue`,
          severity: 'critical',
        },
        incidents,
      }
    }

    return {
      message: {
        id: nextId++,
        role: 'agent',
        text: 'I created ticket SUP-5821 and marked it for human review. A specialist should reply within 2 business hours.',
        route: `${modelRoute} plus ticket API`,
        severity: failures.primaryModel ? 'degraded' : 'healthy',
      },
      incidents,
    }
  }

  if (intent === 'return' || intent === 'refund' || intent === 'warranty') {
    if (failures.knowledgeBase) {
      incidents.push({
        id: nextId++,
        label: 'Knowledge retrieval unavailable',
        detail: 'The agent could not access approved policy content.',
        fallback: failures.ticketApi ? 'Gave safe next step only' : 'Offered escalation without policy claims',
        severity: failures.ticketApi ? 'critical' : 'degraded',
      })

      return {
        message: {
          id: nextId++,
          role: 'agent',
          text: failures.ticketApi
            ? 'I cannot access the verified policy library right now, so I will avoid giving a policy answer that may be wrong. Share the order ID and I will prepare the details for manual review.'
            : 'The verified policy library is temporarily unavailable, so I will not invent an answer. I can create a ticket for a support specialist to confirm the exact policy for your case.',
          route: `${modelRoute} plus policy guardrail`,
          severity: failures.ticketApi ? 'critical' : 'degraded',
        },
        incidents,
      }
    }

    return {
      message: {
        id: nextId++,
        role: 'agent',
        text: policyAnswers[intent],
        route: `${modelRoute} plus knowledge base`,
        severity: failures.primaryModel ? 'degraded' : 'healthy',
      },
      incidents,
    }
  }

  return {
    message: {
      id: nextId++,
      role: 'agent',
      text:
        failures.primaryModel && failures.backupModel
          ? 'I can still help with order status, returns, refunds, warranty, and escalation using verified support playbooks. Which one do you need?'
          : 'I can help with order status, returns, refunds, warranty questions, or escalation to a human specialist.',
      route: modelRoute,
      severity: failures.primaryModel && failures.backupModel ? 'degraded' : 'healthy',
    },
    incidents,
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function requestGeminiAnswer(
  question: string,
  deterministicMessage: Message,
  failures: Record<FailureKey, boolean>,
) {
  const activeFailures = Object.entries(failures)
    .filter(([, isActive]) => isActive)
    .map(([key]) => failureLabels[key as FailureKey].title)

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      deterministicAnswer: deterministicMessage.text,
      route: deterministicMessage.route,
      activeFailures,
    }),
  })

  if (!response.ok) {
    throw new Error('Gemini request failed')
  }

  return (await response.json()) as GeminiResult
}

async function requestGeminiHealth() {
  const response = await fetch('/api/health')

  if (!response.ok) {
    throw new Error('Health check failed')
  }

  return (await response.json()) as HealthStatus
}

function App() {
  const [messages, setMessages] = useState<Message[]>(starterMessages)
  const [failures, setFailures] = useState<Record<FailureKey, boolean>>(initialFailures)
  const [input, setInput] = useState('')
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [isResponding, setIsResponding] = useState(false)
  const [isDemoRunning, setIsDemoRunning] = useState(false)
  const [demoStep, setDemoStep] = useState<number | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [copyStatus, setCopyStatus] = useState('Copy packet')

  const activeFailures = Object.entries(failures).filter(([, value]) => value)
  const degradedCount = incidents.filter((incident) => incident.severity === 'degraded').length
  const criticalCount = incidents.filter((incident) => incident.severity === 'critical').length
  const healthyAnswers = messages.filter(
    (message) => message.role === 'agent' && message.severity === 'healthy',
  ).length
  const protectedSessions = criticalCount + degradedCount

  const systemStatus = useMemo(() => {
    if (criticalCount > 0 || (failures.primaryModel && failures.backupModel)) return 'critical'
    if (activeFailures.length > 0) return 'degraded'
    return 'healthy'
  }, [activeFailures.length, criticalCount, failures.primaryModel, failures.backupModel])

  const statusLabel =
    systemStatus === 'healthy' ? 'Healthy' : systemStatus === 'degraded' ? 'Degraded' : 'Critical'
  const trustScore = Math.max(42, 98 - activeFailures.length * 11 - criticalCount * 8)
  const customerHeat = criticalCount > 0 ? 'High' : activeFailures.length > 0 ? 'Watch' : 'Calm'
  const unsafeAnswerPrevented = incidents.some((incident) =>
    ['Order lookup unavailable', 'Knowledge retrieval unavailable', 'Malformed tool output blocked'].includes(
      incident.label,
    ),
  )
  const nextBestAction =
    systemStatus === 'critical'
      ? 'Hand off with local retry packet and incident summary'
      : activeFailures.some(([key]) => key === 'orderApi')
        ? 'Offer priority fulfillment ticket without guessing status'
        : activeFailures.some(([key]) => key === 'knowledgeBase')
          ? 'Escalate policy question instead of answering from memory'
          : 'Continue Gemini response with verified tool checks'
  const escalationPacket = [
    'Case: SUP-5821',
    'Customer: Maya Chen',
    'Order: ORD-1042',
    `State: ${statusLabel}`,
    `Next action: ${nextBestAction}`,
  ]
  const executiveReport = [
    'Aegis Support Incident Report',
    `Status: ${statusLabel}`,
    `Gemini: ${health?.ok ? `Connected (${health.model})` : health?.status === 'missing_key' ? 'Missing API key' : health?.status === 'quota_exhausted' ? 'Quota exhausted' : health?.status === 'invalid_key' ? 'Invalid key' : 'Provider error'}`,
    `Answer trust score: ${trustScore}%`,
    `Customer heat: ${customerHeat}`,
    `Unsafe answer prevented: ${unsafeAnswerPrevented ? 'Yes' : 'Monitoring'}`,
    `Recoveries logged: ${incidents.length}`,
    `Protected sessions: ${protectedSessions}`,
    '',
    'Escalation packet:',
    ...escalationPacket.map((item) => `- ${item}`),
    '',
    'Recent recovery events:',
    ...(incidents.length > 0
      ? incidents.slice(0, 5).map((incident) => `- ${incident.label}: ${incident.fallback}`)
      : ['- No recovery events yet']),
  ].join('\n')

  useEffect(() => {
    requestGeminiHealth()
      .then(setHealth)
      .catch(() => {
        setHealth({
          ok: false,
          model: 'gemini-2.5-flash',
          status: 'provider_error',
        })
      })
  }, [])

  async function askQuestion(question: string, overrideFailures = failures) {
    const customerMessage: Message = {
      id: nextId++,
      role: 'customer',
      text: question,
    }
    const result = buildResponse(question, overrideFailures)
    setMessages((current) => [...current, customerMessage, result.message])
    setIncidents((current) => [...result.incidents, ...current].slice(0, 8))

    if (overrideFailures.primaryModel) {
      return
    }

    setIsResponding(true)

    try {
      const gemini = await requestGeminiAnswer(question, result.message, overrideFailures)

      setMessages((current) =>
        current.map((message) =>
          message.id === result.message.id
            ? {
                ...message,
                text: gemini.text,
                route: `${gemini.model} plus ${result.message.route?.replace('Primary model plus ', '') ?? 'support guardrails'}`,
              }
            : message,
        ),
      )
    } catch {
      const fallbackIncident: Incident = {
        id: nextId++,
        label: 'Gemini request failed',
        detail: 'The primary Gemini route could not complete.',
        fallback: 'Served the verified deterministic support answer',
        severity: 'degraded',
      }
      setIncidents((current) => [fallbackIncident, ...current].slice(0, 8))
      setMessages((current) =>
        current.map((message) =>
          message.id === result.message.id
            ? {
                ...message,
                route: `Verified fallback plus ${result.message.route?.replace('Primary model plus ', '') ?? 'support guardrails'}`,
                severity: message.severity === 'healthy' ? 'degraded' : message.severity,
              }
            : message,
        ),
      )
    } finally {
      setIsResponding(false)
    }
  }

  function runScenario(scenario: Scenario) {
    const scenarioFailures = buildFailureMap(scenario.failures)
    setFailures(scenarioFailures)
    askQuestion(scenario.prompt, scenarioFailures)
  }

  async function runGuidedDemo() {
    setIsDemoRunning(true)
    setFailures(initialFailures)
    setMessages(starterMessages)
    setIncidents([])
    setInput('')
    await wait(250)

    for (const [index, scenario] of scenarios.entries()) {
      const scenarioFailures = buildFailureMap(scenario.failures)
      setDemoStep(index)
      setFailures(scenarioFailures)
      await askQuestion(scenario.prompt, scenarioFailures)
      await wait(demoPauseMs)
    }

    setDemoStep(null)
    setIsDemoRunning(false)
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = input.trim()
    if (!value) return
    askQuestion(value)
    setInput('')
  }

  function toggleFailure(key: FailureKey) {
    setFailures((current) => ({ ...current, [key]: !current[key] }))
  }

  function resetDemo() {
    setFailures(initialFailures)
    setMessages(starterMessages)
    setIncidents([])
    setInput('')
    setDemoStep(null)
    setIsDemoRunning(false)
  }

  async function copyHandoffPacket() {
    await navigator.clipboard.writeText(executiveReport)
    setCopyStatus('Copied')
    window.setTimeout(() => setCopyStatus('Copy packet'), 1400)
  }

  function downloadIncidentReport() {
    const blob = new Blob([executiveReport], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'aegis-support-incident-report.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <header className="hero-panel">
        <nav className="product-nav" aria-label="Product navigation">
          <div className="brand-lockup">
            <span className="brand-mark">
              <ShieldCheck size={18} />
            </span>
            <span>Aegis Support</span>
          </div>
        </nav>

        <div className="hero-editorial">
          <div>
            <p className="eyebrow">DevNetwork AI + ML Hackathon 2026</p>
            <h1>Support systems break. Aegis keeps the customer whole.</h1>
          </div>
          <p>
            Gemini answers when the path is healthy. Aegis takes over when models, APIs,
            knowledge bases, and escalation systems start to fracture.
          </p>
        </div>

        <section className="hero-showcase" aria-label="Aegis product preview">
          <div className="showcase-nav" aria-label="Showcase navigation">
            <span className="active">Home</span>
            <span>Failure Map</span>
            <span>Guardrails</span>
            <span>Reports</span>
            <button type="button" onClick={runGuidedDemo} disabled={isResponding || isDemoRunning}>
              {isDemoRunning ? 'Running' : 'Run Demo'}
            </button>
          </div>

          <div className="showcase-copy">
            <p className="eyebrow">Prevent support collapse</p>
            <h2>AI support that fails gracefully.</h2>
            <p>
              The customer never sees raw outages. Aegis routes, validates, explains,
              and prepares a human handoff when live systems cannot be trusted.
            </p>
            <div className="showcase-actions">
              <button type="button" onClick={runGuidedDemo} disabled={isResponding || isDemoRunning}>
                <Play size={16} />
                Guided demo
              </button>
              <button type="button" onClick={downloadIncidentReport}>
                <Download size={16} />
                Export report
              </button>
            </div>
          </div>

          <div className="fracture-field" aria-hidden="true">
            <span className="fragment fragment-one" />
            <span className="fragment fragment-two" />
            <span className="fragment fragment-three" />
            <span className="fragment fragment-four" />
            <span className="trace trace-one" />
            <span className="trace trace-two" />
            <span className="trace trace-three" />
          </div>

          <div className="floating-console" aria-label="Live support preview">
            <div className="console-head">
              <div>
                <strong>Aegis_Runtime</strong>
                <span>Case SUP-5821</span>
              </div>
              <div className={`status-dot ${systemStatus}`} />
            </div>
            <div className="console-lines">
              <span>carrier_api_error</span>
              <span>policy_guardrail_active</span>
              <span>handoff_packet_ready</span>
            </div>
            <div className="console-message customer">Where is my order ORD-1042?</div>
            <div className="console-message agent">
              I will not guess. Live order lookup is unavailable, so I prepared a priority ticket.
            </div>
          </div>

          <aside className="case-card showcase-card" aria-label="Active customer case">
            <div className={`status-pill ${systemStatus}`}>
              {systemStatus === 'healthy' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
              <span>{statusLabel}</span>
            </div>
            <div>
              <p className="eyebrow">Active case</p>
              <h2>SUP-5821 | Delivery risk</h2>
            </div>
            <dl className="case-facts">
              <div>
                <dt>Trust</dt>
                <dd>{trustScore}%</dd>
              </div>
              <div>
                <dt>Heat</dt>
                <dd>{customerHeat}</dd>
              </div>
              <div>
                <dt>Unsafe answer</dt>
                <dd>{unsafeAnswerPrevented ? 'Blocked' : 'Watched'}</dd>
              </div>
              <div>
                <dt>Gemini</dt>
                <dd>{health?.ok ? 'Live' : 'Fallback'}</dd>
              </div>
            </dl>
          </aside>

          <div className="showcase-stats" aria-label="Hero resilience stats">
            <div>
              <strong>{trustScore}</strong>
              <span>Answer trust</span>
            </div>
            <div>
              <strong>{incidents.length}</strong>
              <span>Recoveries</span>
            </div>
            <div>
              <strong>{protectedSessions}</strong>
              <span>Sessions protected</span>
            </div>
          </div>
        </section>

        <div className="proof-row hero-proof" aria-label="Resilience proof points">
          <span>
            <GitBranch size={16} />
            Multi-route fallback
          </span>
          <span>
            <FileCheck2 size={16} />
            Verified policy answers
          </span>
          <span>
            <Activity size={16} />
            {health?.ok ? 'Gemini connected' : 'Gemini fallback ready'}
          </span>
        </div>
      </header>

      <section className="metrics-grid" aria-label="Resilience metrics">
        <article>
          <ShieldCheck size={22} />
          <div>
            <strong>{healthyAnswers}</strong>
            <span>verified answers</span>
          </div>
        </article>
        <article>
          <PlugZap size={22} />
          <div>
            <strong>{incidents.length}</strong>
            <span>recoveries logged</span>
          </div>
        </article>
        <article>
          <WifiOff size={22} />
          <div>
            <strong>{activeFailures.length}</strong>
            <span>active failures</span>
          </div>
        </article>
        <article>
          <TicketCheck size={22} />
          <div>
            <strong>{protectedSessions}</strong>
            <span>protected sessions</span>
          </div>
        </article>
      </section>

      <section className="scenario-panel" aria-label="Judge demo scenarios">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Judge demo</p>
            <h2>One-click resilience scenarios</h2>
          </div>
          <button className="guided-button" type="button" onClick={runGuidedDemo} disabled={isResponding || isDemoRunning}>
            {isDemoRunning ? <Activity size={17} /> : <Play size={17} />}
            {isDemoRunning ? 'Running demo' : 'Run guided demo'}
          </button>
        </div>
        <div className="scenario-grid">
          {scenarios.map((scenario, index) => (
            <button
              key={scenario.title}
              className={`scenario-card ${demoStep === index ? 'active' : ''}`}
              type="button"
              onClick={() => runScenario(scenario)}
              disabled={isResponding || isDemoRunning}
            >
              <strong>{scenario.title}</strong>
              <span>{scenario.goal}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="story-grid" aria-label="Submission story">
        <article>
          <Target size={22} />
          <div>
            <p className="eyebrow">Why this can win</p>
            <h2>It solves the production gap in AI support.</h2>
            <p>
              The demo does not just answer questions. It proves the agent can protect customers
              when model calls, knowledge retrieval, order lookup, and escalation systems fail.
            </p>
          </div>
        </article>
        <article>
          <CircleDot size={22} />
          <div>
            <p className="eyebrow">Technical edge</p>
            <h2>Gemini first, deterministic guardrails always.</h2>
            <p>
              Gemini handles natural responses, while verified playbooks, tool validation, and
              incident logging keep the experience reliable when live dependencies break.
            </p>
          </div>
        </article>
      </section>

      <section className="hook-grid" aria-label="Aegis differentiated features">
        <article className="hook-card trust">
          <div className="hook-heading">
            <Gauge size={22} />
            <span>Answer trust score</span>
          </div>
          <strong>{trustScore}%</strong>
          <p>Falls as dependencies break, so operators can see when an answer is becoming risky.</p>
        </article>
        <article className="hook-card">
          <div className="hook-heading">
            <BrainCircuit size={22} />
            <span>Next best action</span>
          </div>
          <strong>{nextBestAction}</strong>
          <p>Aegis recommends the safest operational move, not only a chat reply.</p>
        </article>
        <article className="hook-card">
          <div className="hook-heading">
            <ShieldAlert size={22} />
            <span>Unsafe answer prevented</span>
          </div>
          <strong>{unsafeAnswerPrevented ? 'Yes' : 'Monitoring'}</strong>
          <p>
            Detects when the agent should stop, disclose uncertainty, and avoid inventing order or policy data.
          </p>
        </article>
        <article className="hook-card">
          <div className="hook-heading">
            <TrendingUp size={22} />
            <span>Customer heat</span>
          </div>
          <strong>{customerHeat}</strong>
          <p>{businessImpact[systemStatus]}</p>
        </article>
      </section>

      <section className="report-panel" aria-label="Executive incident report">
        <div className="panel-heading compact">
          <div>
            <p className="eyebrow">Executive report</p>
            <h2>Board-ready incident summary</h2>
          </div>
          <div className="report-actions">
            <button type="button" onClick={copyHandoffPacket}>
              <Copy size={16} />
              {copyStatus}
            </button>
            <button type="button" onClick={downloadIncidentReport}>
              <Download size={16} />
              Export report
            </button>
          </div>
        </div>
        <div className="report-grid">
          <div>
            <span>Gemini status</span>
            <strong>
              {health?.ok
                ? 'Connected'
                : health?.status === 'missing_key'
                  ? 'Missing key'
                  : health?.status === 'quota_exhausted'
                    ? 'Quota fallback'
                    : health?.status === 'invalid_key'
                      ? 'Invalid key'
                      : 'Fallback active'}
            </strong>
          </div>
          <div>
            <span>Business impact</span>
            <strong>{businessImpact[systemStatus]}</strong>
          </div>
          <div>
            <span>Evidence</span>
            <strong>{incidents.length > 0 ? `${incidents.length} recovery events logged` : 'No incidents yet'}</strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <section className="chat-panel" aria-label="Customer support chat">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Customer view</p>
              <h2>Support conversation</h2>
            </div>
            <MessageSquare size={22} />
          </div>

          <div className="case-strip" aria-label="Current routing policy">
            <div>
              <span>Routing</span>
              <strong>{failures.primaryModel ? 'Fallback path' : 'Gemini primary'}</strong>
            </div>
            <div>
              <span>Data trust</span>
              <strong>{failures.knowledgeBase ? 'Policy guarded' : 'Verified KB'}</strong>
            </div>
            <div>
              <span>Handoff</span>
              <strong>{failures.ticketApi ? 'Retry queue' : 'Ticket API'}</strong>
            </div>
          </div>

          <div className="quick-prompts">
            {sampleQuestions.map((question) => (
              <button key={question} type="button" onClick={() => askQuestion(question)} disabled={isResponding}>
                {question}
              </button>
            ))}
          </div>

          <div className="messages">
            {messages.map((message) => (
              <div className={`message ${message.role}`} key={message.id}>
                <div className="avatar">{message.role === 'agent' ? <Bot size={18} /> : <User size={18} />}</div>
                <div>
                  <p>{message.text}</p>
                  {message.route ? <span className={`route ${message.severity}`}>{message.route}</span> : null}
                </div>
              </div>
            ))}
          </div>

          <form className="composer" onSubmit={onSubmit}>
            <input
              aria-label="Ask support question"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about an order, return, refund, warranty, or escalation"
              disabled={isResponding}
            />
            <button type="submit" aria-label="Send message" disabled={isResponding}>
              {isResponding ? <Activity size={18} /> : <Send size={18} />}
            </button>
          </form>
        </section>

        <aside className="side-panel" aria-label="Resilience controls and telemetry">
          <section className="control-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Chaos controls</p>
                <h2>Dependency failures</h2>
              </div>
              <SlidersHorizontal size={22} />
            </div>
            <div className="toggle-list">
              {(Object.keys(failureLabels) as FailureKey[]).map((key) => (
                <label className="toggle-row" key={key}>
                  <input
                    type="checkbox"
                    checked={failures[key]}
                    onChange={() => toggleFailure(key)}
                  />
                  <span className="switch" aria-hidden="true" />
                  <span>
                    <strong>{failureLabels[key].title}</strong>
                    <small>{failureLabels[key].detail}</small>
                  </span>
                </label>
              ))}
            </div>
            <button className="reset-button" type="button" onClick={resetDemo}>
              <RotateCcw size={17} />
              Reset demo
            </button>
          </section>

          <section className="resilience-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Resilience policy</p>
                <h2>Runtime protections</h2>
              </div>
              <Database size={21} />
            </div>
            <div className="protection-list">
              <span>Timeout budget: 900 ms</span>
              <span>Tool schema validation: on</span>
              <span>Policy hallucination guard: on</span>
              <span>Escalation retry queue: on</span>
            </div>
          </section>

          <section className="handoff-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Human handoff</p>
                <h2>Auto escalation packet</h2>
              </div>
              <ClipboardCheck size={21} />
            </div>
            <div className="packet-list">
              {escalationPacket.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>

          <section className="timeline-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Operator view</p>
                <h2>Recovery timeline</h2>
              </div>
              <BarChart3 size={22} />
            </div>
            <div className="timeline">
              {incidents.length === 0 ? (
                <div className="empty-state">
                  <LifeBuoy size={24} />
                  <p>Run a scenario or trigger a failure to see recovery decisions.</p>
                </div>
              ) : (
                incidents.map((incident) => (
                  <article className={`incident ${incident.severity}`} key={incident.id}>
                    <Clock3 size={17} />
                    <div>
                      <strong>{incident.label}</strong>
                      <p>{incident.detail}</p>
                      <span>{incident.fallback}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
