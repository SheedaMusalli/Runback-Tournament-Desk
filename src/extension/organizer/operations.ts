import type { Event, Organizer } from './engine'
export interface Session {id:string;title:string;start:string;minutes:number;stations:string[];owner:string;status:'planned'|'live'|'done'}
export interface Incident {id:string;at:string;title:string;owner:string;matchId:string;resolved:boolean}
export interface Operations {sessions:Session[];issues:Incident[];unavailable:string[];rundown:string[];calls:Record<string,string>}
export const emptyOperations=():Operations=>({sessions:[],issues:[],unavailable:[],rundown:[],calls:{}})
const check=(ok:any,message:string)=>{if(!ok)throw new Error(message)}
const clean=(v:any,n=100)=>String(v==null?'':v).trim().slice(0,n)
export function operate(state:Organizer,e:Event,action:string,d:any,id:string,at:string):string {
  const o=e.operations||(e.operations=emptyOperations())
  if(action.startsWith('rundown'))o.rundown=o.rundown.filter(id=>e.matches.some(m=>m.id===id&&['ready','playing'].includes(m.status)))
  if(action==='sessionAdd') {
    check(o.sessions.length<100,'Maximum 100 schedule blocks per event.')
    const title=clean(d.title),owner=clean(d.owner,60),start=clean(d.start,40),minutes=Number(d.minutes)
    check(title,'Name this schedule block.');check(Number.isFinite(Date.parse(start)) && /T.*(Z|[+-]\d\d:\d\d)$/.test(start),'Choose a valid start time with a timezone.')
    check(Number.isInteger(minutes)&&minutes>=5&&minutes<=1440,'Duration must be 5–1440 minutes.')
    check(Array.isArray(d.stations)&&d.stations.length<=64&&new Set(d.stations).size===d.stations.length&&d.stations.every((s:any)=>e.stations.includes(s)),'Choose valid stations.')
    const end=Date.parse(start)+minutes*60000
    check(!state.events.some(other=>(other.operations||emptyOperations()).sessions.some(s=>s.status!=='done'&&d.stations.some((x:string)=>s.stations.includes(x))&&Date.parse(start)<Date.parse(s.start)+s.minutes*60000&&end>Date.parse(s.start))),'A station is already scheduled during this time, possibly in another event.')
    o.sessions.push({id,title,owner,start:new Date(start).toISOString(),minutes,stations:d.stations.slice(),status:'planned'});return `Scheduled ${title}`
  }
  if(action==='sessionStatus'||action==='sessionRemove') {
    const s=o.sessions.find(s=>s.id===d.id);check(s,'Schedule block not found.')
    if(action==='sessionRemove'){check(s!.status==='planned','Only a planned block can be removed.');o.sessions=o.sessions.filter(s=>s.id!==d.id);return `Removed schedule block ${s!.title}`}
    check((s!.status==='planned'&&d.status==='live')||(s!.status==='live'&&d.status==='done'),'Schedule blocks move from planned to live to done.')
    s!.status=d.status;return `${s!.title}: ${d.status}`
  }
  if(action==='stationAvailability') {
    const station=clean(d.station,40);check(e.stations.includes(station),'Choose a station.')
    check(typeof d.unavailable==='boolean','Choose a station status.')
    check(!d.unavailable||!state.events.some(x=>x.matches.some(m=>m.status==='playing'&&m.station===station)),'Release the active match before taking this station offline.')
    // Physical stations are shared: clear old marks, then store the new mark on this event.
    state.events.forEach(x=>{if(x.operations)x.operations.unavailable=x.operations.unavailable.filter(s=>s!==station)})
    if(d.unavailable)o.unavailable.push(station)
    return `${station}: ${d.unavailable?'maintenance':'available'}`
  }
  if(action==='issueAdd') {
    check(o.issues.length<300,'Export your backup before recording more than 300 issues.')
    const title=clean(d.title,500),owner=clean(d.owner,60),matchId=clean(d.matchId,20)
    check(title,'Describe the issue.');check(!matchId||e.matches.some(m=>m.id===matchId),'Unknown match.')
    o.issues.unshift({id,at,title,owner,matchId,resolved:false});return 'Organizer note added'
  }
  if(action==='issueResolve'){const issue=o.issues.find(i=>i.id===d.id);check(issue,'Issue not found.');check(typeof d.resolved==='boolean','Choose an issue status.');issue!.resolved=d.resolved;return d.resolved?'Issue resolved':'Issue reopened'}
  const m=e.matches.find(m=>m.id===d.matchId);check(m,'Match not found.')
  if(action==='rundownRemove'){o.rundown=o.rundown.filter(x=>x!==m!.id);return `${m!.id} removed from stream plan`}
  check(['ready','playing'].includes(m!.status),'Choose a ready or playing match.')
  if(action==='rundownAdd'){check(!o.rundown.includes(m!.id),'Match is already in the stream plan.');o.rundown.push(m!.id);return `${m!.id} added to stream plan`}
  if(action==='rundownUp'){const i=o.rundown.indexOf(m!.id);check(i>0,'Match is already first or is not queued.');o.rundown.splice(i-1,0,o.rundown.splice(i,1)[0]);return 'Stream order updated'}
  if(action==='callStart'){check(Number.isInteger(d.minutes)&&d.minutes>=1&&d.minutes<=30,'Call window must be 1–30 minutes.');o.calls[m!.id]=new Date(Date.parse(at)+d.minutes*60000).toISOString();return `${m!.id}: ${d.minutes}-minute player call started`}
  if(action==='callClear'){delete o.calls[m!.id];return `${m!.id}: player call cleared`}
  throw new Error('Unknown operations command.')
}
