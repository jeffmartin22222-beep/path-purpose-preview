/* Integrated standalone lesson UI; model logic lives in membrane_model.js for testability. */
let labRunToken=0;
const labMissions=[['oxygen','O₂ through lipids · outside 80'],['open','Na⁺ through open channel · outside 80'],['closed','Na⁺ through closed channel · outside 80'],['equilibrium','O₂ at 50/50 · dynamic equilibrium']];
function labSettings(){return state.labControls||{molecule:'oxygen',pathway:'bilayer',gate:'open',outside:80};}
function membraneLabHTML(){
 const c=labSettings(),earned=state.labEvidence||{};
 const options=(values,selected)=>values.map(([v,t])=>`<option value="${v}" ${selected===v?'selected':''}>${t}</option>`).join('');
 return `<h2 style="margin:0 0 8px">Membrane transport lab</h2><p class="mem-tutorial">Change a variable, predict what happens, and run the model. Unlike a route quiz, particles can move <b>both directions</b> and the concentration difference changes.</p><div class="mem-lab"><div><div class="mem-controls"><label>Molecule<select id="labMolecule" onchange="labSet('molecule',this.value)">${options([['oxygen','Oxygen (O₂)'],['sodium','Sodium ion (Na⁺)'],['glucose','Glucose']],c.molecule)}</select></label><label>Membrane route<select id="labPathway" onchange="labSet('pathway',this.value)">${options([['bilayer','Lipid bilayer'],['channel','Sodium channel'],['carrier','Glucose carrier']],c.pathway)}</select></label><label>Protein gate (for proteins only)<select id="labGate" onchange="labSet('gate',this.value)">${options([['open','Open / available'],['closed','Closed / unavailable']],c.gate)}</select></label><label>Outside at start<select id="labOutside" onchange="labSet('outside',Number(this.value))">${options([[80,'80 outside / 20 inside'],[50,'50 outside / 50 inside'],[20,'20 outside / 80 inside']],c.outside)}</select></label><label class="wide-control">Predict net change<select id="labPrediction" onchange="labSet('prediction',this.value)">${options([['none','Choose a prediction'],['in','Mostly into cell'],['out','Mostly out of cell'],['balanced','Little or no net movement'],['blocked','Blocked by this route']],c.prediction||'none')}</select></label></div><button class="primary wide mem-run" id="labRun" onclick="labRun()">Run 24 model steps</button><div class="mem-evidence" aria-label="Choose a suggested experiment">${labMissions.map(([id,label])=>`<button type="button" class="${earned[id]?'earned':''}" onclick="labPreset('${id}')">${earned[id]?'✓':'○'} ${label}</button>`).join('')}</div></div><div><canvas id="labCanvas" class="mem-stage" width="680" height="270" role="img" aria-label="Molecules on either side of a selective cell membrane. Numeric results and descriptions appear below."></canvas><div class="mem-stat-row"><span id="labOutsideCount">Outside: ${c.outside}</span><span id="labInsideCount">Inside: ${100-c.outside}</span><span id="labNetCount">Net: —</span></div><canvas id="labGraph" class="mem-graph" width="680" height="110" role="img" aria-label="Line graph of outside and inside molecule counts over time; numeric results are also reported below."></canvas><div class="mem-summary" id="labResult" role="status" aria-live="polite">${state.labLast?.summary||'Choose your settings and make a prediction. This is a conceptual probability model, not a laboratory measurement.'}</div></div></div><p class="mem-subtle">Science note: passive transport does not require ATP. A concentration gradient produces net flow, but molecules still move both directions at equilibrium. This model omits membrane voltage, metabolism and active pumps.</p>`;
}
function labPreset(id){
 const presets={oxygen:{molecule:'oxygen',pathway:'bilayer',gate:'open',outside:80},open:{molecule:'sodium',pathway:'channel',gate:'open',outside:80},closed:{molecule:'sodium',pathway:'channel',gate:'closed',outside:80},equilibrium:{molecule:'oxygen',pathway:'bilayer',gate:'open',outside:50}};
 if(!presets[id])return;
 labRunToken++;state.labControls={...presets[id],prediction:'none'};state.labLast=null;save();render();
}
function labSet(key,value){
 labRunToken++;
 state.labControls={...labSettings(),[key]:value};
 if(key!=='prediction')state.labControls.prediction='none';
 state.labLast=null;
 save();render();
}
function labInit(){
 if(state.page!==4)return;
 const c=labSettings();
 const last=state.labLast?.model;
 const view=last&&JSON.stringify(last.settings)===JSON.stringify({molecule:c.molecule,pathway:c.pathway,gate:c.gate})?last:MembraneModel.initial(c);
 labDraw(view);labGraph(view);
}
function labRun(){
 const c=labSettings();if(!c.prediction||c.prediction==='none'){
  const out=document.getElementById('labResult');if(out)out.textContent='Make a prediction before running your trial.';return;
 }
 const seed=9811+(state.labHistory||[]).length*419;
 let model=MembraneModel.initial(c),rand=MembraneModel.seeded(seed),steps=0;
 const token=++labRunToken,btn=document.getElementById('labRun');if(btn)btn.disabled=true;
 const finish=()=>{
  const mission=MembraneModel.missionEvidence(c),net=model.crossIn-model.crossOut;
  const permitted=MembraneModel.probability(c.molecule,c.pathway,c.gate)>0;
  const expected=!permitted?'blocked':c.outside===50?'balanced':c.outside>50?'in':'out';
  const accuracy=c.prediction===expected?'Your prediction matched the expected mechanism.':'Your prediction did not match the expected mechanism. Review the evidence and try another setup.';
  const evidence=MembraneModel.summary(model);
  state.labEvidence=state.labEvidence||{};if(mission)state.labEvidence[mission]=true;
  state.labHistory=[...(state.labHistory||[]),{settings:{...c},mission,finalOutside:model.outside,finalInside:model.inside,crossIn:model.crossIn,crossOut:model.crossOut,net}].slice(-24);
  state.labLast={summary:`${accuracy} ${evidence}`,model};
  if(labMissions.every(([id])=>state.labEvidence[id]))state.done[4]=true;
  save();render();
 };
 const tick=()=>{
  if(token!==labRunToken||state.page!==4)return;
  model=MembraneModel.step(model,rand);steps++;
  labDraw(model);labGraph(model);
  const o=document.getElementById('labOutsideCount'),i=document.getElementById('labInsideCount'),n=document.getElementById('labNetCount');
  if(o)o.textContent='Outside: '+model.outside;if(i)i.textContent='Inside: '+model.inside;if(n)n.textContent='Net inward: '+(model.crossIn-model.crossOut);
  if(steps>=24){finish();return;}
  setTimeout(tick,window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:75);
 };
 tick();
}
function labDraw(model){
 const canvas=document.getElementById('labCanvas');if(!canvas)return;const g=canvas.getContext('2d');if(!g)return;
 const W=canvas.width,H=canvas.height,mid=W/2;g.clearRect(0,0,W,H);
 g.fillStyle='#092f42';g.fillRect(0,0,mid-16,H);g.fillStyle='#10374c';g.fillRect(mid+16,0,mid-16,H);
 // Original schematic of bilayer: heads and hydrophobic tails.
 for(let y=14;y<H-10;y+=23){g.fillStyle='#78e0dd';g.beginPath();g.arc(mid-13,y,6,0,Math.PI*2);g.arc(mid+13,y,6,0,Math.PI*2);g.fill();g.strokeStyle='#b1b567';g.lineWidth=2;g.beginPath();g.moveTo(mid-8,y);g.lineTo(mid-2,y+6);g.moveTo(mid+8,y);g.lineTo(mid+2,y+6);g.stroke();}
 const c=model.settings,permitted=MembraneModel.probability(c.molecule,c.pathway,c.gate)>0;
 if(c.pathway!=='bilayer'){
  g.fillStyle=c.pathway==='channel'?'#ad91f7':'#f7b978';g.fillRect(mid-27,H/2-45,54,90);
  g.fillStyle=permitted?'#123548':'#5a3042';g.fillRect(mid-10,H/2-40,20,80);
  if(!permitted){g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(mid-11,H/2-10);g.lineTo(mid+11,H/2+10);g.moveTo(mid+11,H/2-10);g.lineTo(mid-11,H/2+10);g.stroke();}
 }
 const dotColor=c.molecule==='oxygen'?'#9af3ff':c.molecule==='sodium'?'#ffd07a':'#cfb0ff';
 function dots(count,left){
  for(let j=0;j<count;j++){
   // Deterministic spatial arrangement with small nonperiodic offsets; count changes are real model outputs.
   const xx=((j*47+13)%275)+(left?23:mid+36),yy=((j*83+17)%225)+19;
   g.fillStyle=dotColor;g.beginPath();g.arc(xx,yy,c.molecule==='glucose'?4.5:3.5,0,Math.PI*2);g.fill();
  }
 }
 dots(model.outside,true);dots(model.inside,false);
 g.font='bold 17px system-ui';g.fillStyle='#e7f8ff';g.fillText('OUTSIDE',18,22);g.fillText('CYTOPLASM',mid+40,22);
 g.font='13px system-ui';g.fillStyle='#b7d7e7';g.fillText('Model step '+model.tick,18,H-12);
}
function labGraph(model){
 const canvas=document.getElementById('labGraph');if(!canvas)return;const g=canvas.getContext('2d');if(!g)return;
 const W=canvas.width,H=canvas.height;g.clearRect(0,0,W,H);g.fillStyle='#09273b';g.fillRect(0,0,W,H);
 g.strokeStyle='#315a70';g.lineWidth=1;for(let k=1;k<4;k++){g.beginPath();g.moveTo(24,k*H/4);g.lineTo(W-18,k*H/4);g.stroke();}
 for(const [key,color] of [['outside','#71e3e0'],['inside','#f7b978']]){
  g.beginPath();g.strokeStyle=color;g.lineWidth=3;
  model.history.forEach((p,j)=>{const x=24+p.tick/24*(W-45),y=H-12-p[key]/100*(H-24);if(j===0)g.moveTo(x,y);else g.lineTo(x,y);});g.stroke();
 }
 g.font='13px system-ui';g.fillStyle='#71e3e0';g.fillText('Outside',35,17);g.fillStyle='#f7b978';g.fillText('Inside',120,17);
}
