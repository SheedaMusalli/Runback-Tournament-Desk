export interface BracketSet {id:string;label:string;section:string;round:number;ft:number;sources?:Array<{kind:string;id:string}>}
export function bracketLayout<T extends BracketSet>(matches:T[]) {
  const width=204,gap=42,step=width+gap,rowHeight=48,rowGap=24,topPadding=96
  const nodes:Array<{match:T;x:number;y:number}>=[],edges:string[]=[]
  const bands:Array<{name:string;top:number;height:number;count:number;rounds:Array<{key:number;x:number;label:string;ft:number}>}>=[]
  let top=0,maxWidth=600
  const sections=Array.from(new Set(matches.map(m=>m.section)))
  sections.forEach(section=>{
    const sets=matches.filter(m=>m.section===section)
    const rounds=Array.from(new Set(sets.map(m=>m.round))).sort((a,b)=>a-b)
    const positioned=new Map<string,{x:number;y:number}>()
    let bottom=top+topPadding+rowHeight
    const headings=rounds.map((round,column)=>{
      const current=sets.filter(m=>m.round===round),x=34+column*step
      let previous=-Infinity
      current.forEach((match,index)=>{
        // Centre a set between its feeder sets, keeping separate bracket bands.
        const parents=(match.sources||[]).filter(s=>s.kind==='winner'||s.kind==='loser').map(s=>positioned.get(s.id)).filter(Boolean) as Array<{x:number;y:number}>
        let y=parents.length?parents.reduce((sum,p)=>sum+p.y,0)/parents.length:top+topPadding+index*(rowHeight+rowGap)
        y=Math.max(y,previous+rowHeight+rowGap);previous=y
        nodes.push({match,x,y});positioned.set(match.id,{x,y});bottom=Math.max(bottom,y+rowHeight)
        parents.forEach(parent=>{const start=parent.x+width,end=x,mid=(start+end)/2;edges.push(`M ${start} ${parent.y+24} H ${mid} V ${y+24} H ${end}`)})
      })
      return {key:round,x,label:section==='Winners'&&rounds.length-column<=3?['Winners Final','Winners Semi-Final','Winners Quarter-Final'][rounds.length-column-1]:current[0].label,ft:current[0].ft}
    })
    const height=bottom-top+48
    bands.push({name:section,top,height,count:sets.length,rounds:headings})
    top+=height;maxWidth=Math.max(maxWidth,rounds.length*step+26)
  })
  return {nodes,edges,bands,width:maxWidth,height:Math.max(top,200)}
}
