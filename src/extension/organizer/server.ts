import type { NodeCG } from "nodecg/types/server"
import Uuid from "pure-uuid"
import { emptyOrganizer, reduce, Organizer, Command } from "./engine"
import { setupDiscordApi } from "./discord-api"

export function setupOrganizer(nodecg: NodeCG): void {
  const organizer=nodecg.Replicant<Organizer>("Organizer",{defaultValue:emptyOrganizer()})
  const players=nodecg.Replicant<any>("Players")
  const scoreboard=nodecg.Replicant<any>("Scoreboard",{defaultValue:{scores:[{player_id:"",score:0},{player_id:"",score:0}],overrides:[{should_override:false,override:{}},{should_override:false,override:{}}]}})
  const bracket=nodecg.Replicant<any>("Bracket",{defaultValue:{stage:0,side:0,custom_progress:"",custom_progress_enabled:false}})
  setupDiscordApi(nodecg,organizer)
  const shareRouter=nodecg.Router()
  shareRouter.get("/api/v1/events/:id",(req:any,res:any)=>{
    const event=(organizer.value&&organizer.value.events||[]).find((item:any)=>item.id===req.params.id)
    if(!event){res.status(404).json({error:"Tournament not found."});return}
    res.set("Cache-Control","no-store")
    const names:Record<string,string>={}
    event.entrants.forEach((entrant:any)=>{names[entrant.id]=entrant.name})
    res.json({
      id:event.id,name:event.name,venue:event.venue,date:event.date,format:event.format,champion:names[event.champion]||"",ended:!!event.ended,
      matches:event.matches.map((match:any)=>({
        id:match.id,label:match.label,section:match.section,round:match.round,status:match.status,
        players:match.players.map((player:string)=>names[player]||"To be decided"),scores:match.scores,winner:names[match.winner]||"",ft:match.ft
      }))
    })
  })
  nodecg.mount("/runback-share",shareRouter)
  nodecg.listenFor("organizer:command",(command:Command,ack:any)=>{
    try {
      const previous:Organizer=JSON.parse(JSON.stringify(organizer.value!))
      const next=reduce(previous,command,new Uuid(4).format(),new Date().toISOString())
      organizer.value=next
      const event=next.events.find(e=>e.id===command.eventId)
      if(command.action==="deleteEvent") {
        const removed=previous.events.find(e=>e.id===command.eventId)
        if(removed&&removed.streamMatch) {
          scoreboard.value={scores:[{player_id:"",score:0},{player_id:"",score:0}],overrides:[{should_override:false,override:{}},{should_override:false,override:{}}]}
          bracket.value={stage:0,side:0,custom_progress:"",custom_progress_enabled:false}
        }
      }
      if(event && event.streamMatch && ["stream","score","report","swapSides"].includes(command.action)) {
        const m=event.matches.find(m=>m.id===event.streamMatch)!
        if(command.action==="stream" || (command.data&&command.data.matchId===m.id)) {
          const roster={...players.value}
          m.players.forEach(id=>{
            const p=event.entrants.find(p=>p.id===id)!
            roster[id]={id,name:p.name,gamertag:p.name,team:p.team,country:p.country,gamertag_latin:"",gamertag_latin_generated:"",twitter:"",api_ids:{}}
          })
          players.value=roster
          scoreboard.value={scores:m.players.map((id,i)=>({player_id:id,score:m.scores[i]})),overrides:m.players.map(()=>({should_override:false,override:{}}))}
          bracket.value={stage:m.section==="Finals"?13:0,side:m.section==="Finals"?(m.resetOf?6:4):0,custom_progress:`${m.section} · ${m.label} · FT${m.ft}`,custom_progress_enabled:true}
        }
      }
      if(command.action==="undo" && event && !event.streamMatch) {
        const old=previous.events.find(e=>e.id===event.id)
        if(old&&old.streamMatch) {
          scoreboard.value={scores:[{player_id:"",score:0},{player_id:"",score:0}],overrides:[{should_override:false,override:{}},{should_override:false,override:{}}]}
          bracket.value={stage:0,side:0,custom_progress:"",custom_progress_enabled:false}
        }
      }
      if(ack&&!ack.handled)ack(null,{revision:next.revision,eventId:["create","restore"].includes(command.action)?next.events[next.events.length-1].id:command.eventId})
    } catch(error) {if(ack&&!ack.handled)ack((error as Error).message)}
  })
}
