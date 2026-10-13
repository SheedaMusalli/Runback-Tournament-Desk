import type { NodeCG } from "nodecg/types/server"
import { timingSafeEqual } from "crypto"
import Uuid from "pure-uuid"
import { Organizer, Command, reduce } from "./engine"

const BOT_ACTIONS = new Set(["linkDiscord", "checkin", "report", "ops:callStart", "ops:issueAdd"])

export function setupDiscordApi(nodecg: NodeCG, organizer: any): void {
  const secret = String(nodecg.bundleConfig && nodecg.bundleConfig.discordApiSecret || "")
  const router = nodecg.Router()
  const authorize = (req: any, res: any, next: any): void => {
    const raw = String(req.headers.authorization || "")
    const supplied = raw.startsWith("Bearer ") ? raw.slice(7) : ""
    const a = Buffer.from(secret)
    const b = Buffer.from(supplied)
    if (a.length < 32 || a.length !== b.length || !timingSafeEqual(a, b)) {
      res.status(secret.length < 32 ? 503 : 401).json({ error: secret.length < 32 ? "Runback Discord bridge is not configured." : "Unauthorized." })
      return
    }
    next()
  }
  router.get("/api/v1/health", authorize, (_req: any, res: any) => res.json({ ok: true, version: 1 }))
  router.get("/api/v1/state", authorize, (_req: any, res: any) => res.json(JSON.parse(JSON.stringify(organizer.value || { version: 1, revision: 0, events: [] }))))
  router.post("/api/v1/command", authorize, (req: any, res: any) => {
    try {
      const command = req.body as Command
      if (!command || !BOT_ACTIONS.has(command.action)) throw new Error("This action is not available through Discord.")
      const previous: Organizer = JSON.parse(JSON.stringify(organizer.value!))
      const next = reduce(previous, command, new Uuid(4).format(), new Date().toISOString())
      organizer.value = next
      res.json({ ok: true, revision: next.revision, state: next })
    } catch (error) {
      res.status(400).json({ error: (error as Error).message || "Command failed." })
    }
  })
  nodecg.mount("/runback-discord", router)
  nodecg.log.info(secret.length >= 32 ? "Discord bridge mounted on the local Runback server." : "Discord bridge is disabled; configure discordApiSecret in cfg/runback.json to enable it.")
}
