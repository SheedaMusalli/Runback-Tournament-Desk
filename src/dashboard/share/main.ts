import "./share.css"

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
    if (bracket) bracket.innerHTML = renderColumns(filtered)
  }))
  const bracket = document.getElementById("bracket")
  if (bracket) bracket.scrollLeft = scrollLeft
}

function renderColumns(matches: PublicMatch[]): string {
  const groups: { key: string; section: string; round: number; label: string; matches: PublicMatch[] }[] = []
  matches.forEach((match) => {
    const key = `${match.section}/${match.round}`
    let group = groups.find((item) => item.key === key)
    if (!group) {
      group = { key, section: match.section, round: match.round, label: match.label, matches: [] }
      groups.push(group)
    }
    group.matches.push(match)
  })
  if (!groups.length) return `<div class="empty">No matches are available in this section yet.</div>`
  return groups.map((group) => `<section class="round-column"><header class="round-heading"><div><b>${safe(group.section)}</b><span>${safe(group.label)}</span></div><small>${group.matches.length} ${group.matches.length === 1 ? "set" : "sets"}</small></header>
    ${group.matches.map((match) => `<article class="match ${safe(match.status)}"><header><span>${safe(match.id)} · ${safe(match.label)}</span><b>FT${match.ft}</b></header>
      ${[0, 1].map((i) => `<div class="player ${match.winner && match.players[i] === match.winner ? "winner" : ""}"><span class="side side-${i}">P${i + 1}</span><span class="player-name">${safe(match.players[i] || "To be decided")}</span><b>${match.status === "bye" ? "—" : Number(match.scores[i] || 0)}</b></div>`).join("")}
      <footer><span class="status status-${safe(match.status)}">${safe(match.status === "ready" ? "Ready" : match.status === "playing" ? "In progress" : match.status === "done" ? "Complete" : match.status === "bye" ? "Bye" : "Waiting")}</span><span>First to ${match.ft}</span></footer></article>`).join("")}</section>`).join("")
}

async function refresh(): Promise<void> {
  if (!eventId) {
    app.innerHTML = `<main class="message"><b>Missing tournament link.</b><span>Ask the organizer for the current live bracket URL.</span></main>`
    return
  }
  try {
    const response = await fetch(`/runback-share/api/v1/events/${encodeURIComponent(eventId)}`, { cache: "no-store" })
    if (!response.ok) throw new Error(response.status === 404 ? "Tournament not found. Check the shared link." : "Runback is not reachable right now.")
    render(await response.json() as PublicEvent)
  } catch (error) {
    app.innerHTML = `<main class="message"><b>Bracket unavailable.</b><span>${safe((error as Error).message || "Try again later.")}</span><button id="retry">Try again</button></main>`
    document.getElementById("retry")?.addEventListener("click", () => { void refresh() })
  }
}

void refresh()
window.setInterval(() => { void refresh() }, 5000)
