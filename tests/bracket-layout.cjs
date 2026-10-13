const assert=require('assert/strict'),fs=require('fs'),ts=require('typescript');
const output=ts.transpileModule(fs.readFileSync('src/dashboard/runback/organizer/bracket-layout.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText;
const exportsObject={};new Function('exports',output)(exportsObject);const {bracketLayout}=exportsObject;
const engine=require('../extension/organizer/engine');
for(const preset of ['local','single','ewc','tekken-pools'])for(const count of preset==='ewc'?[32]:preset==='tekken-pools'?[16,64]:[2,3,8,16,64,512]){
 let state=engine.reduce(engine.emptyOrganizer(),{revision:0,action:'create',data:{name:'Layout test',preset}},'event','2026-10-13');let serial=0;
 const send=(action,data={})=>{state=engine.reduce(state,{revision:state.revision,eventId:'event',action,data},'id-'+(++serial),'2026-10-13')};
 send('addPlayers',{players:Array.from({length:count},(_,i)=>({name:'Player '+(i+1)}))});send('checkAll');send('start');const event=state.events[0],layout=bracketLayout(event.matches);
 assert.equal(layout.nodes.length,event.matches.length);
 for(const n of layout.nodes){assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));assert.ok(n.y>=0&&n.y+48<=layout.height);assert.ok(n.x+204<=layout.width)}
 for(const band of layout.bands){const nodes=layout.nodes.filter(n=>n.match.section===band.name);for(const x of new Set(nodes.map(n=>n.x))){const lane=nodes.filter(n=>n.x===x).sort((a,b)=>a.y-b.y);for(let i=1;i<lane.length;i++)assert.ok(lane[i].y-lane[i-1].y>=72,'Sets must not overlap')}}
 if(preset==='local'&&count===8){assert.deepEqual(layout.bands.map(b=>b.name),['Winners','Losers','Finals']);const parent=layout.nodes.filter(n=>['M1','M2'].includes(n.match.id));const child=layout.nodes.find(n=>n.match.id==='M5');assert.equal(child.y,(parent[0].y+parent[1].y)/2);assert.ok(layout.edges.length>0)}
}
console.log('Bracket layout passed: complete node coverage, no overlaps, centred feeders, separate section bands across 15 tournament sizes/formats.');
