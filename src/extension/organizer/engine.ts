// Pure tournament engine. The NodeCG extension owns writes; dashboards send commands.
import { Operations, emptyOperations, operate } from './operations'
export type Format = "double" | "single" | "groups" | "pools"
export interface Entrant { id: string; name: string; team: string; country: string; checked: boolean; discordId?: string }
export interface Source { kind: "player" | "winner" | "loser" | "pool"; id: string; place?: number }
export interface Match {
  id: string; label: string; section: string; round: number; sources: Source[];
  players: string[]; status: "waiting" | "ready" | "playing" | "done" | "bye" | "skipped";
  scores: number[]; winner: string; loser: string; ft: number; station: string;
  eliminates: boolean; tier: number; resetOf?: string; reason: string;
}
export interface Event {
  operations?: Operations;
  id: string; name: string; venue: string; date: string; preset: string;
  format: Format; ft: number; finalFt: number; longSets: "finals" | "top4" | "top8";
  poolCount?: number; poolAdvance?: number; finalFormat?: "double" | "single";
  stations: string[]; entrants: Entrant[]; matches: Match[]; started: boolean;
  ended?: boolean; endedAt?: string;
  champion: string; streamMatch: string; checklist: Record<string, boolean>;
  history: Array<{ at: string; text: string }>; results: string[];
}
export interface Organizer { version: number; revision: number; events: Event[] }
export interface Command { revision: number; action: string; eventId?: string; data?: any }
export interface Preset { id: string; title: string; tag: string; format: Format; ft: number; finalFt: number; longSets: "finals" | "top4" | "top8"; summary: string; source: string; sourceLabel: string; notes: string }
export const PRESETS: Preset[] = [
  {id:"local",title:"Local weekly",tag:"START SIMPLE",format:"double",ft:2,finalFt:3,longSets:"finals",summary:"Two losses to exit. First to 2, then first to 3 for the final three matches.",source:"",sourceLabel:"Runback community default",notes:"A practical local-event default. Edit the rules before starting."},
  {id:"evo",title:"EVO-style open bracket",tag:"OPEN EVENT",format:"double",ft:2,finalFt:3,longSets:"finals",summary:"Double elimination with longer winners, losers and grand finals.",source:"https://evo.gg/rules/",sourceLabel:"EVO general rules · checked 3 Oct 2026",notes:"Based on EVO general rules. Individual games and editions may override them. This app uses one continuous bracket, not EVO's separate pool phases."},
  {id:"japan",title:"EVO Japan 2026",tag:"TOP 8 FINALS",format:"double",ft:2,finalFt:3,longSets:"top8",summary:"First to 2 before Top 8; first to 3 throughout Top 8.",source:"https://www.evojapan.gg/en/rules/tk8",sourceLabel:"EVO Japan 2026 · TEKKEN 8 rules",notes:"PS5, default tournament settings, 3 rounds to win a game. Winner keeps character; random stage each game. Review the full source for controller and conduct rules."},
  {id:"ceo",title:"CEO 2026",tag:"MAJOR EVENT",format:"double",ft:2,finalFt:3,longSets:"top8",summary:"Double elimination; Top 8 sets extend to first to 3.",source:"https://ceogaming.org/tournament/t8/",sourceLabel:"CEO 2026 · TEKKEN 8 rules",notes:"Keep the selected player sides. Winner keeps character; random stage each game. The original rules include coaching limits; the app does not enforce those."},
  {id:"twt",title:"TWT 2026 Dojo-style",tag:"COMMUNITY CIRCUIT",format:"double",ft:2,finalFt:3,longSets:"top4",summary:"First to 3 for winners final, losers semifinal, losers final and grand final.",source:"https://www.bandainamcoent.com/legal/community-events/official-rules-twt",sourceLabel:"TWT 2026 official rules · section 4",notes:"Top 8 first-to-3 can be selected instead before play starts. This preset does not register or certify your event with the Tekken World Tour."},
  {id:"ewc",title:"EWC 2025-inspired",tag:"32-PLAYER INVITATIONAL",format:"groups",ft:2,finalFt:5,longSets:"top8",summary:"32 → 16 → 8. Two GSL group stages, then first-to-5 single elimination.",source:"https://navi.gg/en/tournaments/esports-world-cup-2025-tekken-8/news",sourceLabel:"NAVI's EWC 2025 event format report",notes:"The stage sizes and set lengths follow the published format. Initial seeds use Runback's snake distribution; crossover pairing is fixed. This is a format template, not a replay of official draws or results. No third-place playoff."},
  {id:"single",title:"Quick knockout",tag:"SHORT SESSION",format:"single",ft:2,finalFt:3,longSets:"finals",summary:"One loss to exit. A compact bracket when time is limited.",source:"",sourceLabel:"Runback custom format",notes:"Single elimination with first-to-3 final. This is not an EVO or TWT ruleset."},
  {id:"tekken-pools",title:"Pools → double elimination",tag:"TEKKEN EVENT DAY",format:"pools",ft:2,finalFt:3,longSets:"top8",summary:"Players start in balanced round-robin pools. The top two from every pool advance into a double-elimination finals bracket.",source:"",sourceLabel:"Runback pool format",notes:"Pool sizes are balanced automatically at about 6–8 players. You can adjust pool count and how many advance before starting."},
]
export const emptyOrganizer = (): Organizer => ({version:1,revision:0,events:[]})
const check = (condition: any, message: string): void => { if (!condition) throw new Error(message) }
const text = (value: any, limit = 100): string => String(value == null ? "" : value).trim().slice(0,limit)
const p = (id: string): Source => ({kind:"player",id})
const w = (m: Match): Source => ({kind:"winner",id:m.id})
const l = (m: Match): Source => ({kind:"loser",id:m.id})
const poolKey = (index:number):string => index<26?String.fromCharCode(65+index):`${String.fromCharCode(64+Math.floor(index/26))}${String.fromCharCode(65+index%26)}`
export function seedOrder(size: number): number[] {
  let order = [1,2]
  while (order.length < size) { const total=order.length*2+1; order=order.reduce<number[]>((a,n)=>a.concat(n,total-n),[]) }
  return order
}
export function buildBracket(e: Event): Match[] {
  const entrants=e.entrants.filter(x=>x.checked)
  check(entrants.length>=(e.format==="pools"?4:2) && entrants.length<=512,e.format==="pools"?"Check in at least 4 players to run pools.":"Check in between 2 and 512 players before starting.")
  check(e.format!=="groups" || entrants.length===32,"The EWC-inspired format needs exactly 32 checked-in players.")
  const matches: Match[]=[]
  const add=(label: string,section: string,round: number,sources: Source[],ft: number,eliminates=false,tier=0): Match=>{
    const m: Match={id:`M${matches.length+1}`,label,section,round,sources,players:[],status:"waiting",scores:[0,0],winner:"",loser:"",ft,station:"",eliminates,tier,reason:""}
    matches.push(m); return m
  }
  const single=(sources: Source[],section: string,ft: number,baseTier: number): Match=>{
    let current=sources, round=1
    while(current.length>1) {
      const count=current.length/2
      const label=count===1?"Grand final":count===2?"Semifinals":count===4?"Quarterfinals":`Round ${round}`
      const next: Source[]=[]
      for(let i=0;i<count;i++) next.push(w(add(label,section,round,current.slice(i*2,i*2+2),count===1?e.finalFt:ft,true,baseTier+round)))
      current=next; round++
    }
    return matches.find(m=>m.id===current[0].id)!
  }
  const double=(sources: Source[],entrantCount:number,sectionPrefix=""):void=>{
    const size=Math.pow(2,Math.ceil(Math.log2(sources.length)))
    const seeded=seedOrder(size).map(n=>sources[n-1]||p(""))
    const k=Math.log2(size), winners: Match[][]=[]
    let current=seeded
    const section=(name:string):string=>sectionPrefix?`${sectionPrefix} · ${name}`:name
    for(let r=0;r<k;r++){
      const row:Match[]=[]
      const ft=(r===k-1||(e.longSets==="top8"&&(r>=k-2||entrantCount<=8)))?e.finalFt:e.ft
      const label=r===k-1?"Winners final":r===k-2?"Winners semifinals":`Winners round ${r+1}`
      for(let i=0;i<current.length/2;i++)row.push(add(label,section("Winners"),r+1,current.slice(i*2,i*2+2),ft))
      winners.push(row);current=row.map(w)
    }
    let lower:Source[]=[]
    if(size===2)lower=[l(winners[0][0])]
    else{
      let lr=0
      const losersRow=(sourcesByMatch:Source[][]):Source[]=>{
        const remaining=sourcesByMatch.length*(lr%2===0?3:2)
        const long=remaining===2||(e.longSets==="top4"&&remaining<=3)||(e.longSets==="top8"&&remaining<=6)
        const label=remaining===2?"Losers final":remaining===3?"Losers semifinal":`Losers round ${lr+1}`
        const row=sourcesByMatch.map(s=>w(add(label,section("Losers"),lr+1,s,long?e.finalFt:e.ft,true,lr+1)))
        lr++;return row
      }
      lower=losersRow(Array.from({length:size/4},(_,i)=>[l(winners[0][i*2]),l(winners[0][i*2+1])]))
      for(let r=1;r<k;r++){
        lower=losersRow(lower.map((s,i)=>[s,l(winners[r][lower.length>1?i^1:i])]))
        if(r<k-1)lower=losersRow(Array.from({length:lower.length/2},(_,i)=>lower.slice(i*2,i*2+2)))
      }
    }
    const final=add("Grand final",section("Finals"),1,[w(winners[k-1][0]),lower[0]],e.finalFt,false,100)
    const reset=add("Grand final reset",section("Finals"),2,[w(final),l(final)],e.finalFt,true,101);reset.resetOf=final.id
  }
  if(e.format==="pools"){
    const requestedPools=Number(e.poolCount)||Math.max(2,Math.ceil(entrants.length/8))
    check(requestedPools>=2,"Choose at least 2 pools, or leave the setting at automatic.")
    const poolCount=Math.min(entrants.length,requestedPools)
    const advance=Math.max(1,Math.min(4,Number(e.poolAdvance)||2))
    check(poolCount>=2,"Pools need at least 2 groups. Reduce the number of pools or add more players.")
    check(Math.ceil(entrants.length/poolCount)>=2,"Each pool needs at least 2 players.")
    check(poolCount*advance>=2&&poolCount*advance<=entrants.length,"The selected number advancing from each pool must produce at least 2 finals players and cannot exceed your entrants.")
    const pools:string[][]=Array.from({length:poolCount},()=>[])
    entrants.forEach((entrant,i)=>{const row=Math.floor(i/poolCount),slot=i%poolCount;pools[row%2===0?slot:poolCount-1-slot].push(entrant.id)})
    pools.forEach((ids,index)=>{
      const pool=poolKey(index),players=ids.slice()
      if(players.length%2)players.push("")
      for(let round=0;round<players.length-1;round++){
        for(let i=0;i<players.length/2;i++){
          const a=players[i],b=players[players.length-1-i]
          if(a&&b)add(`Pool ${pool} · Round ${round+1}`,`Pool ${pool}`,round+1,[p(a),p(b)],e.ft)
        }
        players.splice(1,0,players.pop()!)
      }
    })
    const qualifiers:Source[]=pools.flatMap((_,index)=>Array.from({length:advance},(__,place)=>({kind:"pool" as const,id:poolKey(index),place:place+1})))
    if(e.finalFormat==="single")single(qualifiers,"Finals · Knockout",e.finalFt,50)
    else double(qualifiers,qualifiers.length,"Finals")
  } else if(e.format==="groups") {
    const gsl=(sources: Source[],section: string,tier: number): Source[]=>{
      const a=add("Opening match 1",section,1,[sources[0],sources[3]],e.ft)
      const b=add("Opening match 2",section,1,[sources[1],sources[2]],e.ft)
      const upper=add("Qualification match",section,2,[w(a),w(b)],e.ft)
      const lower=add("Elimination match",section,2,[l(a),l(b)],e.ft,true,tier)
      const decider=add("Deciding match",section,3,[l(upper),w(lower)],e.ft,true,tier+1)
      return [w(upper),w(decider)]
    }
    const groups: Source[][]=Array.from({length:8},()=>[])
    entrants.forEach((x,i)=>groups[Math.floor(i/8)%2===0?i%8:7-i%8].push(p(x.id)))
    const first=groups.map((g,i)=>gsl(g,`Phase 1 · Group ${String.fromCharCode(65+i)}`,10))
    const second: Source[][]=[]
    for(let i=0;i<4;i++) second.push(gsl([first[i*2][0],first[i*2+1][0],first[6-i*2][1],first[7-i*2][1]],`Phase 2 · Group ${String.fromCharCode(65+i)}`,20))
    single([second[0][0],second[3][1],second[1][0],second[2][1],second[2][0],second[1][1],second[3][0],second[0][1]],"Playoffs",e.finalFt,30)
  } else {
    const size=Math.pow(2,Math.ceil(Math.log2(entrants.length)))
    const sources=seedOrder(size).map(n=>p(entrants[n-1]?entrants[n-1].id:""))
    if(e.format==="single") single(sources,"Knockout",e.ft,0)
    else {
      const k=Math.log2(size), winners: Match[][]=[]
      let current=sources
      for(let r=0;r<k;r++) {
        const row: Match[]=[]
        const ft=(r===k-1 || (e.longSets==="top8" && (r>=k-2 || entrants.length<=8)))?e.finalFt:e.ft
        const label=r===k-1?"Winners final":r===k-2?"Winners semifinals":`Winners round ${r+1}`
        for(let i=0;i<current.length/2;i++) row.push(add(label,"Winners",r+1,current.slice(i*2,i*2+2),ft))
        winners.push(row);current=row.map(w)
      }
      let lower: Source[]=[]
      if(size===2) lower=[l(winners[0][0])]
      else {
        let lr=0
        const losersRow=(sourcesByMatch: Source[][]): Source[]=>{
          const remaining=sourcesByMatch.length*(lr%2===0?3:2)
          const long=remaining===2 || (e.longSets==="top4" && remaining<=3) || (e.longSets==="top8" && remaining<=6)
          const label=remaining===2?"Losers final":remaining===3?"Losers semifinal":`Losers round ${lr+1}`
          const row=sourcesByMatch.map(s=>w(add(label,"Losers",lr+1,s,long?e.finalFt:e.ft,true,lr+1)))
          lr++;return row
        }
        lower=losersRow(Array.from({length:size/4},(_,i)=>[l(winners[0][i*2]),l(winners[0][i*2+1])]))
        for(let r=1;r<k;r++) {
          lower=losersRow(lower.map((s,i)=>[s,l(winners[r][lower.length>1?i^1:i])]))
          if(r<k-1) lower=losersRow(Array.from({length:lower.length/2},(_,i)=>lower.slice(i*2,i*2+2)))
        }
      }
      const final=add("Grand final","Finals",1,[w(winners[k-1][0]),lower[0]],e.finalFt,false,100)
      const reset=add("Grand final reset","Finals",2,[w(final),l(final)],e.finalFt,true,101)
      reset.resetOf=final.id
    }
  }
  return matches
}
function poolPlacements(e:Event,pool:string):Array<{id:string;wins:number;gameDiff:number;seed:number}>{
  const matches=e.matches.filter(m=>m.section===`Pool ${pool}`)
  const ids=Array.from(new Set(matches.flatMap(m=>m.players.filter(Boolean))))
  const stats=ids.map(id=>({id,wins:0,gameDiff:0,seed:e.entrants.findIndex(p=>p.id===id)}))
  matches.filter(m=>m.status==="done").forEach(m=>{
    const winner=stats.find(p=>p.id===m.winner),loser=stats.find(p=>p.id===m.loser)
    if(winner)winner.wins++
    const a=stats.find(p=>p.id===m.players[0]),b=stats.find(p=>p.id===m.players[1])
    if(a&&b){a.gameDiff+=(m.scores[0]||0)-(m.scores[1]||0);b.gameDiff+=(m.scores[1]||0)-(m.scores[0]||0)}
    void loser
  })
  return stats.sort((a,b)=>b.wins-a.wins||b.gameDiff-a.gameDiff||a.seed-b.seed)
}
export function resolve(e: Event): void {
  const index: Record<string,Match>={};e.matches.forEach(m=>index[m.id]=m)
  for(const m of e.matches) {
    if(["done","bye","skipped"].includes(m.status)) continue
    if(m.resetOf) {
      const gf=index[m.resetOf]
      if(gf.status!=="done") continue
      if(gf.winner===gf.players[0]) {m.status="skipped";e.champion=gf.winner;continue}
    }
    let ready=true
    const players=m.sources.map(s=>{
      if(s.kind==="player")return s.id
      if(s.kind==="pool"){
        const poolMatches=e.matches.filter(match=>match.section===`Pool ${s.id}`)
        if(!poolMatches.length||poolMatches.some(match=>!['done','bye'].includes(match.status))){ready=false;return ""}
        return poolPlacements(e,s.id)[(s.place||1)-1]?.id||""
      }
      const source=index[s.id]
      if(!source || !["done","bye"].includes(source.status)) {ready=false;return ""}
      return s.kind==="winner"?source.winner:source.loser
    })
    if(!ready)continue
    m.players=players
    if(players.filter(Boolean).length<2) {m.status="bye";m.winner=players.find(Boolean)||"";m.loser="";continue}
    if(m.status!=="playing")m.status="ready"
  }
  const last=e.matches[e.matches.length-1]
  if(last && last.status==="done")e.champion=last.winner
}
export function standings(e: Event): Array<{id:string;place:number;wins:number;losses:number}> {
  if(!e.champion)return []
  const buckets: Record<number,string[]>={}
  e.matches.filter(m=>m.status==="done" && m.loser && (m.eliminates || (m.section==="Finals" && e.champion===m.winner))).forEach(m=>{
    if(!buckets[m.tier])buckets[m.tier]=[]
    buckets[m.tier].push(m.loser)
  })
  const ordered=[{id:e.champion,place:1}];let rank=2
  Object.keys(buckets).map(Number).sort((a,b)=>b-a).forEach(t=>{
    const ids=buckets[t].filter(id=>!ordered.some(x=>x.id===id))
    ids.forEach(id=>ordered.push({id,place:rank}));rank+=ids.length
  })
  if(e.format==="pools"){
    const count=Math.max(2,Number(e.poolCount)||Math.ceil(e.entrants.filter(p=>p.checked).length/8))
    const poolRanks=Array.from({length:count},(_,i)=>poolKey(i)).flatMap(pool=>poolPlacements(e,pool).map((entrant,rank)=>({id:entrant.id,rank:rank+1,seed:entrant.seed})))
    poolRanks.filter(p=>!ordered.some(x=>x.id===p.id)).sort((a,b)=>a.rank-b.rank||a.seed-b.seed).forEach(p=>ordered.push({id:p.id,place:ordered.length+1}))
  }
  return ordered.map(x=>({...x,wins:e.matches.filter(m=>m.status==="done" && m.winner===x.id).length,losses:e.matches.filter(m=>m.status==="done" && m.loser===x.id).length}))
}
function settings(e: Event,d: any): void {
  e.name=text(d.name)||e.name;e.venue=text(d.venue);e.date=text(d.date,30)
  if(d.format!==undefined) {check(["double","single","groups","pools"].includes(d.format),"Choose a supported format.");e.format=d.format}
  if(d.poolCount!==undefined){check(Number.isInteger(d.poolCount)&&d.poolCount>=0&&d.poolCount<=64,"Pool count must be automatic or between 2 and 64.");e.poolCount=d.poolCount}
  if(d.poolAdvance!==undefined){check(Number.isInteger(d.poolAdvance)&&d.poolAdvance>=1&&d.poolAdvance<=4,"Choose between 1 and 4 players advancing from each pool.");e.poolAdvance=d.poolAdvance}
  if(d.finalFormat!==undefined){check(["double","single"].includes(d.finalFormat),"Choose single or double elimination for finals.");e.finalFormat=d.finalFormat}
  for(const key of ["ft","finalFt"] as const) if(d[key]!==undefined) {check(Number.isInteger(d[key])&&d[key]>=1&&d[key]<=9,"Set length must be between 1 and 9 games.");e[key]=d[key]}
  if(d.longSets!==undefined){check(["finals","top4","top8"].includes(d.longSets),"Choose when longer sets begin.");e.longSets=d.longSets}
  if(d.stations!==undefined) {
    check(Array.isArray(d.stations)&&d.stations.length>=1&&d.stations.length<=64,"Add between 1 and 64 stations.")
    const stations=d.stations.map((s:any)=>text(s,40));check(stations.every(Boolean)&&new Set(stations).size===stations.length,"Station names must be unique and non-empty.")
    if(e.operations)check(e.operations.unavailable.every(s=>stations.includes(s))&&e.operations.sessions.filter(s=>s.status!=='done').every(s=>s.stations.every(x=>stations.includes(x))),"Reopen maintenance stations and remove their planned schedule blocks before removing stations.")
    e.stations=stations
  }
}
export function reduce(state: Organizer, command: Command, id: string, at: string): Organizer {
  check(command && command.revision===state.revision,"Another operator saved a change. Review the latest view and try again.")
  const next: Organizer=JSON.parse(JSON.stringify(state));const d=command.data||{}
  if(command.action==="restore") {
    check(next.events.length<100,"This workspace holds up to 100 events.")
    check(d.runbackOrganizer===1 && d.event,"Choose a Runback organizer backup.")
    next.events.push(restoreEvent(d.event,id,at))
  } else if(command.action==="create") {
    check(next.events.length<100,"Export older events before adding more. This workspace holds up to 100 events.")
    const preset=PRESETS.find(p=>p.id===d.preset)||PRESETS[0]
    const e: Event={id,name:text(d.name)||"Untitled tournament",venue:"",date:"",preset:preset.id,format:preset.format,ft:preset.ft,finalFt:preset.finalFt,longSets:preset.longSets,poolCount:0,poolAdvance:2,finalFormat:"double",stations:["Stream","Station 2","Station 3","Station 4"],entrants:[],matches:[],started:false,ended:false,champion:"",streamMatch:"",checklist:{},history:[],results:[]}
    settings(e,{...d,format:preset.format,ft:preset.ft,finalFt:preset.finalFt,longSets:preset.longSets})
    e.history.push({at,text:"Tournament created"});next.events.push(e)
  } else if(command.action==="deleteEvent") {
    check(typeof command.eventId==="string" && next.events.some(e=>e.id===command.eventId),"Select a tournament to delete.")
    next.events=next.events.filter(e=>e.id!==command.eventId)
  } else {
    const e=next.events.find(e=>e.id===command.eventId);check(e,"Select a tournament.")
    const event=e!; let log=command.action
    const draft=()=>check(!event.started,"The bracket is locked. Create another tournament to change entrants or format.")
    check(!event.ended || command.action==="resumeEvent","This tournament has ended. Resume it before making changes.")
    if(command.action==="endEvent") {
      check(!event.ended,"This tournament has already ended.")
      event.ended=true;event.endedAt=at
      event.matches.forEach(m=>{if(m.status==="playing"){m.status="ready";m.station=""}})
      log="Tournament ended by organizer"
    } else if(command.action==="resumeEvent") {
      check(event.ended,"This tournament is already active.")
      event.ended=false;event.endedAt=undefined;log="Tournament resumed by organizer"
    } else if(command.action.startsWith('ops:')) {log=operate(next,event,command.action.slice(4),d,id,at)}
    else if(command.action==="settings") {draft();settings(event,d);log="Event settings updated"}
    else if(command.action==="addPlayers") {
      draft();check(Array.isArray(d.players)&&d.players.length>0,"Add at least one player.")
      check(event.entrants.length+d.players.length<=512,"This event supports up to 512 entrants.")
      const names=new Set(event.entrants.map(p=>p.name.toLocaleLowerCase()))
      d.players.forEach((input:any,i:number)=>{
        const name=text(input.name,64);check(name,"Every player needs a name.");check(!names.has(name.toLocaleLowerCase()),`Duplicate name: ${name}. Use a distinguishing tag.`);names.add(name.toLocaleLowerCase())
        const country=text(input.country,2).toUpperCase();check(!country||/^[A-Z]{2}$/.test(country),"Country must be a two-letter code, such as PK.")
        const discordId=text(input.discordId,20);check(!discordId||/^\d{17,20}$/.test(discordId),"Discord ID must be a 17–20 digit user ID.")
        check(!discordId||!event.entrants.some(p=>p.discordId===discordId)&&!d.players.slice(0,i).some((p:any)=>text(p.discordId,20)===discordId),"A Discord account can only be linked to one entrant per event.")
        event.entrants.push({id:`${id}-${i}`,name,team:text(input.team,30),country,checked:false,discordId})
      });log=`Added ${d.players.length} players`
    } else if(command.action==="editPlayer") {
      draft();const player=event.entrants.find(p=>p.id===d.playerId);check(player,"Player not found.")
      const name=text(d.name,64),country=text(d.country,2).toUpperCase(),discordId=text(d.discordId,20)
      check(name,"A player name is required.");check(!event.entrants.some(p=>p.id!==d.playerId&&p.name.toLocaleLowerCase()===name.toLocaleLowerCase()),"That player name is already registered.")
      check(!country||/^[A-Z]{2}$/.test(country),"Country must be a two-letter code.")
      check(!discordId||/^\d{17,20}$/.test(discordId),"Discord ID must be a 17–20 digit user ID.")
      check(!discordId||!event.entrants.some(p=>p.id!==d.playerId&&p.discordId===discordId),"That Discord account is already linked to another player.")
      player!.name=name;player!.team=text(d.team,30);player!.country=country;player!.discordId=discordId;log=`Updated player ${name}`
    } else if(command.action==="linkDiscord") {
      const name=text(d.name,64),discordId=text(d.discordId,20)
      check(/^\d{17,20}$/.test(discordId),"Invalid Discord account ID.")
      const player=event.entrants.find(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase());check(player,"Player not found. Use the player's exact tournament tag.")
      check(!event.entrants.some(p=>p.id!==player!.id&&p.discordId===discordId),"That Discord account is already linked to another player.")
      check(!player!.discordId||player!.discordId===discordId,"This player already has a linked Discord account. Ask an organizer to update it.")
      player!.discordId=discordId;log=`Discord account linked to ${player!.name}`
    } else if(command.action==="checkin") {draft();const player=event.entrants.find(p=>p.id===d.playerId);check(player,"Player not found.");player!.checked=!!d.checked;log=`${player!.name}: ${d.checked?"checked in":"check-in removed"}`}
    else if(command.action==="checkAll") {draft();event.entrants.forEach(p=>p.checked=true);log="All entrants checked in"}
    else if(command.action==="removePlayer") {draft();check(event.entrants.some(p=>p.id===d.playerId),"Player not found.");event.entrants=event.entrants.filter(p=>p.id!==d.playerId);log="Entrant removed"}
    else if(command.action==="seed") {
      draft();const i=event.entrants.findIndex(p=>p.id===d.playerId);const target=Number(d.position)-1
      check(i>=0&&Number.isInteger(target)&&target>=0&&target<event.entrants.length,"Enter a valid seed position.")
      event.entrants.splice(target,0,event.entrants.splice(i,1)[0]);log="Seeding updated"
    } else if(command.action==="start") {draft();event.matches=buildBracket(event);event.started=true;resolve(event);log=`Bracket generated for ${event.entrants.filter(p=>p.checked).length} players`}
    else if(command.action==="checklist") {const key=text(d.key,80);check(["rules","controllers","stations","stream","backup"].includes(key),"Unknown checklist item.");event.checklist[key]=!!d.value;log="Setup checklist updated"}
    else if(command.action==="undo") {
      const lastId=event.results[event.results.length-1];check(lastId,"No result to undo.")
      const affected=new Set<string>([lastId]);event.matches.forEach(m=>{if(m.sources.some(s=>s.kind!=="player"&&affected.has(s.id)))affected.add(m.id)})
      check(!event.matches.some(m=>affected.has(m.id)&&m.id!==lastId&&m.status==="playing"),"Release downstream matches from their stations before undoing this result.")
      event.matches.forEach(m=>{if(affected.has(m.id)){m.status="waiting";m.winner="";m.loser="";m.players=[];m.scores=[0,0];m.reason="";m.station=""}})
      event.results.pop();event.champion="";if(affected.has(event.streamMatch))event.streamMatch="";resolve(event);log=`Undid result ${lastId}`
    } else {
      const match=event.matches.find(m=>m.id===d.matchId);check(match,"Match not found.");const m=match!
      if(command.action==="swapSides") {
        check(["ready","playing"].includes(m.status),"Only a ready or playing match can switch P1/P2 sides.")
        check(m.players.length===2&&m.players[0]&&m.players[1],"Both players must be known before switching sides.")
        m.players.reverse()
        m.scores=[m.scores[1]||0,m.scores[0]||0]
        log=`${m.id}: switched P1/P2 sides`
      } else if(command.action==="assign") {
        check(["ready","playing"].includes(m.status),"This match is not ready.")
        const station=text(d.station,40);check(event.stations.includes(station),"Choose a station.")
        check(!next.events.some(x=>x.operations&&x.operations.unavailable.includes(station)),"Station is offline for maintenance. Reopen it in Operations first.")
        check(!next.events.some(other=>other.matches.some(x=>(other.id!==event.id || x.id!==m.id)&&x.status==="playing"&&x.station===station)),"Station is occupied in this workspace.")
        check(!event.matches.some(x=>x.id!==m.id&&x.status==="playing"&&x.players.some(p=>m.players.includes(p))),"A player is already playing another match.")
        m.station=station;m.status="playing"
        event.operations=event.operations||emptyOperations()
        if(!event.operations.calls[m.id])event.operations.calls[m.id]=new Date(Date.parse(at)+5*60000).toISOString()
        log=`${m.id} called to ${station}`
      } else if(command.action==="release") {check(m.status==="playing","Match is not on a station.");m.status="ready";m.station="";log=`${m.id} returned to queue`}
      else if(command.action==="stream") {check(["ready","playing"].includes(m.status),"Only a ready or playing match can go to stream.");next.events.forEach(x=>x.streamMatch="");event.streamMatch=m.id;log=`${m.id} sent to OBS`}
      else if(command.action==="score" || command.action==="report") {
        check(["ready","playing"].includes(m.status),"Only a ready or playing match can be scored.")
        const scores=d.scores;check(Array.isArray(scores)&&scores.length===2&&scores.every((n:any)=>Number.isInteger(n)&&n>=0&&n<=m.ft),`Scores must be whole numbers from 0 to ${m.ft}.`)
        check(!(scores[0]===m.ft&&scores[1]===m.ft),"Both players cannot win the set.")
        m.scores=scores.slice()
        if(command.action==="report") {
          const forfeit=d.forfeit===0||d.forfeit===1
          check(forfeit || Math.max(...scores)===m.ft,"The winner must reach the required games, or record a forfeit.")
          const winner=forfeit?1-d.forfeit:(scores[0]>scores[1]?0:1)
          m.winner=m.players[winner];m.loser=m.players[1-winner];m.reason=forfeit?text(d.reason,160):""
          check(!forfeit||m.reason,"Add a reason for the forfeit.")
          m.status="done";event.results.push(m.id);resolve(event);log=`${m.id}: ${m.reason?"forfeit — "+m.reason:scores.join("–")}`
        } else log=`${m.id} score updated`
      } else throw new Error("Unknown tournament command.")
    }
    event.history.unshift({at,text:log});event.history=event.history.slice(0,300)
  }
  next.revision++;return next
}

// Rebuild and replay validated results instead of trusting an imported bracket graph.
export function restoreEvent(raw:any,id:string,at:string):Event {
  check(raw && Array.isArray(raw.entrants) && raw.entrants.length<=512,"Invalid entrant list in backup.")
  let state=reduce(emptyOrganizer(),{revision:0,action:"create",data:{name:text(raw.name)+" (restored)",preset:raw.preset}},id,at)
  const act=(action:string,data:any={})=>{state=reduce(state,{revision:state.revision,action,eventId:id,data},id+"-import",at)}
  act("settings",{...raw,name:text(raw.name,88)+" (restored)"})
  if(raw.entrants.length)act("addPlayers",{players:raw.entrants})
  check(raw.entrants.every((p:any)=>p&&typeof p.id==="string"&&typeof p.checked==="boolean"),"Invalid player data in backup.")
  check(new Set(raw.entrants.map((p:any)=>p.id)).size===raw.entrants.length,"Duplicate player IDs in backup.")
  state.events[0].entrants.forEach((p,i)=>p.checked=raw.entrants[i].checked)
  if(raw.started) {
    act("start")
    check(Array.isArray(raw.results)&&raw.results.length<=1024&&new Set(raw.results).size===raw.results.length,"Invalid result history in backup.")
    check(Array.isArray(raw.matches)&&raw.matches.length<=2048,"Invalid match list in backup.")
    for(const matchId of raw.results) {
      const m=raw.matches.find((m:any)=>m.id===matchId);check(m,"Missing match in backup.")
      const current=state.events[0].matches.find(m=>m.id===matchId);check(current,"Unknown match in backup.")
      let forfeit=-1
      if(m.reason){const idx=raw.entrants.findIndex((p:any)=>p.id===m.loser);check(idx>=0,"Invalid forfeit in backup.");forfeit=current!.players.indexOf(state.events[0].entrants[idx].id);check(forfeit>=0,"Invalid forfeit player.")}
      act("report",{matchId,scores:m.scores,forfeit,reason:m.reason})
    }
    for(const m of raw.matches.filter((m:any)=>m.status==="ready"||m.status==="playing")) {
      const current=state.events[0].matches.find(x=>x.id===m.id)
      if(current&&current.status==="ready")act("score",{matchId:m.id,scores:m.scores})
    }
  }
  if(raw.operations) {
    check(Array.isArray(raw.operations.sessions)&&raw.operations.sessions.length<=100&&Array.isArray(raw.operations.issues)&&raw.operations.issues.length<=300,'Invalid operations backup.')
    let serial=0
    for(const s of raw.operations.sessions){state=reduce(state,{revision:state.revision,action:'ops:sessionAdd',eventId:id,data:{...s,stations:[]}},`${id}-session-${serial++}`,at);const current=state.events[0].operations!.sessions.slice(-1)[0];check(['planned','live','done'].includes(s.status),'Invalid session status.');current.status=s.status==='done'?'done':'planned'}
    for(const i of raw.operations.issues.slice().reverse()){state=reduce(state,{revision:state.revision,action:'ops:issueAdd',eventId:id,data:i},`${id}-issue-${serial++}`,at);check(typeof i.resolved==='boolean','Invalid issue status.');state.events[0].operations!.issues[0].resolved=i.resolved}
    // Operational calls, station maintenance and stream plans are intentionally not resumed.
  }
  const event=state.events[0];event.ended=!!raw.ended;event.endedAt=event.ended?text(raw.endedAt,40):undefined;event.history=[{at,text:"Backup restored as a separate event. Schedule and notes restored; live blocks reset to planned. Station reservations, maintenance, player calls and stream plan cleared. Reassign stations before play."}]
  return event
}
