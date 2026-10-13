import "./share.css"
import "../runback/organizer/bracket-tree.css"
import { bracketLayout } from "../runback/organizer/bracket-layout"

interface PublicMatch {
  id: string
  label: string
  section: string
  round: number
  status: string
  players: string[]
  scores: number[]
  winner: string
  ft: number
  sources?: Array<{ kind: string; id: string; place?: number }>
}

interface PublicEvent {
  id: string
  name: string
  venue: string
  date: string
  format: string
  champion: string
  ended: boolean
  matches: PublicMatch[]
}

const app = document.getElementById("App")!
const eventId = new URLSearchParams(window.location.search).get("event") || ""
const htmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }
const safe = (value: string): string => String(value || "").replace(/[&<>"']/g, (character) => htmlEntities[character])
let selectedSection = ""

function render(event: PublicEvent): void {
  const scrollTop = document.getElementById("bracket")?.scrollTop || 0
  const scrollLeft = document.getElementById("bracket")?.scrollLeft || 0
  const matches = event.matches.filter((m) => m.status !== "skipped")
  const sections = Array.from(new Set(matches.map((m) => m.section)))
  const complete = matches.filter((m) => m.status === "done").length
  app.innerHTML = `<main class="share-shell">
    <header class="share-top"><a class="brand" href="#">RUNBACK<span>.</span></a><span class="live ${event.ended ? "ended" : ""}"><i></i> ${event.ended ? "TOURNAMENT ENDED" : "LIVE BRACKET"}</span></header>
    <section class="hero"><div><span class="eyebrow">TEKKEN 8 · TOURNAMENT BRACKET</span><h1>${safe(event.name)}</h1><p>${safe([event.venue, event.date].filter(Boolean).join(" · ") || "Tournament in progress")}</p></div><div class="progress"><b>${complete}<small> / ${matches.length}</small></b><span>SETS COMPLETE</span></div></section>
    ${event.champion ? `<section class="champion"><span>🏆 TOURNAMENT CHAMPION</span><b>${safe(event.champion)}</b></section>` : ""}
    <nav class="section-tabs" aria-label="Bracket sections"><button class="${selectedSection ? "" : "selected"}" data-section="">All sections</button>${sections.map((section) => `<button class="${section === selectedSection ? "selected" : ""}" data-section="${safe(section)}">${safe(section)}</button>`).join("")}</nav>
    <div class="bracket" id="bracket">${renderColumns(selectedSection ? matches.filter((m) => m.section === selectedSection) : matches)}</div>
    <footer>Live updates every 5 seconds · Powered by Runback Tournament Desk</footer>
  </main>`
  app.querySelectorAll<HTMLButtonElement>(".section-tabs button").forEach((button) => button.addEventListener("click", () => {
    selectedSection = button.dataset.section || ""
    app.querySelectorAll(".section-tabs button").forEach((item) => item.classList.remove("selected"))
    button.classList.add("selected")
    const filtered = button.dataset.section ? matches.filter((m) => m.section === button.dataset.section) : matches
    const bracket = document.getElementById("bracket")
    if (bracket) {
      bracket.innerHTML = renderColumns(filtered)
    }
  }))
  const bracket = document.getElementById("bracket")
  if (bracket) { bracket.scrollLeft = scrollLeft; bracket.scrollTop = scrollTop }
}

function renderColumns(matches:PublicMatch[]):string {
  if(!matches.length)return '<div class="empty">No matches are available in this section yet.</div>'
  const layout=bracketLayout(matches)
  const bands=layout.bands.map(b=>`<section class="tree-band" style="top:${b.top}px;width:${layout.width}px;height:${b.height}px"><div class="tree-band-label">${safe(b.name)}<span>${b.count} sets</span></div>${b.rounds.map(r=>`<header class="tree-round" style="left:${r.x}px"><b>${safe(r.label)}</b><span>Best of ${r.ft*2-1}</span></header>`).join('')}</section>`).join('')
  const nodes=layout.nodes.map(n=>{const m=n.match;return `<article class="tree-set ${safe(m.status)}" style="left:${n.x}px;top:${n.y}px"><span class="tree-id">${safe(m.id)}</span>${[0,1].map(i=>{const source=(m.sources||[])[i];const pending=source&&source.kind!=='player'?(source.kind==='pool'?`Pool ${source.id} · #${source.place||1}`:`${source.kind==='winner'?'Winner':'Loser'} of ${source.id}`):'Bye';return `<span class="tree-player ${m.winner&&m.winner===m.players[i]?'won':''} ${!m.players[i]?'pending':''}"><span class="tree-seed"></span><span class="tree-name" title="${safe(m.players[i]||pending)}">${safe(m.players[i]||pending)}</span><strong>${['waiting','skipped','bye'].includes(m.status)?'–':Number(m.scores[i]||0)}</strong></span>`}).join('')}${m.status==='playing'?'<span class="tree-live">● In progress</span>':''}</article>`}).join('')
  return `<div class="tree-canvas" style="width:${layout.width}px;height:${layout.height}px">${bands}<svg class="tree-lines" width="${layout.width}" height="${layout.height}" aria-hidden="true">${layout.edges.map(d=>`<path d="${d}"/>`).join('')}</svg>${nodes}</div>`
}

async function refresh(): Promise<void> {
  if (!eventId) {
    app.innerHTML = `<main class="message"><b>Missing tournament link.</b><span>Ask the organizer for the current live bracket URL.</span></main>`
    return
  }
  try {
    const endpoint = new URL(`/runback-share/api/v1/events/${encodeURIComponent(eventId)}`, window.location.origin)
    const response = await fetch(endpoint.toString(), { cache: "no-store", credentials: "same-origin" })
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string }
      if (response.status === 404) throw new Error("Tournament not found. Check the shared link.")
      throw new Error(body.error ? `${body.error} (HTTP ${response.status})` : `Runback returned HTTP ${response.status} ${response.statusText}.`)
    }
    render(await response.json() as PublicEvent)
  } catch (error) {
    const reason = error instanceof TypeError ? "Cannot connect to Runback. Open the Runback app and keep it running, then reload this page." : ((error as Error).message || "Try again later.")
    app.innerHTML = `<main class="message"><b>Bracket unavailable.</b><span>${safe(reason)}</span><button id="retry">Try again</button></main>`
    document.getElementById("retry")?.addEventListener("click", () => { void refresh() })
  }
}

void refresh()
window.setInterval(() => { void refresh() }, 5000)
