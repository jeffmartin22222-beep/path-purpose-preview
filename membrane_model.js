/* Path + Purpose — original conceptual passive-transport model. MIT-style internal ownership; no external assets. */
(function(root){
  'use strict';
  const TOTAL=100;
  const MOLECULES=['oxygen','sodium','glucose'];
  const PATHWAYS=['bilayer','channel','carrier'];
  function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
  function probability(molecule,pathway,gate){
    if(molecule==='oxygen'&&pathway==='bilayer')return 0.13;
    if(molecule==='sodium'&&pathway==='channel'&&gate==='open')return 0.085;
    if(molecule==='glucose'&&pathway==='carrier'&&gate==='open')return 0.055;
    return 0;
  }
  function initial(opts){
    if(!MOLECULES.includes(opts.molecule)||!PATHWAYS.includes(opts.pathway)||!['open','closed'].includes(opts.gate))throw Error('Invalid transport settings');
    const outside=clamp(Math.round(Number(opts.outside)),0,TOTAL);
    if(!Number.isFinite(outside))throw Error('Invalid concentration');
    return {outside,inside:TOTAL-outside,tick:0,crossIn:0,crossOut:0,history:[{tick:0,outside,inside:TOTAL-outside}],settings:{molecule:opts.molecule,pathway:opts.pathway,gate:opts.gate}};
  }
  function seeded(seed){let s=(seed>>>0)||1;return ()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};}
  function step(state,random){
    const p=probability(state.settings.molecule,state.settings.pathway,state.settings.gate);
    const oldOut=state.outside,oldIn=state.inside;
    let into=0,outof=0;
    for(let i=0;i<oldOut;i++)if(random()<p)into++;
    for(let i=0;i<oldIn;i++)if(random()<p)outof++;
    const outside=oldOut-into+outof,inside=oldIn+into-outof;
    return {...state,outside,inside,tick:state.tick+1,crossIn:state.crossIn+into,crossOut:state.crossOut+outof,history:[...state.history,{tick:state.tick+1,outside,inside,into,outof}]};
  }
  function simulate(opts,steps=24,seed=1349){let state=initial(opts),rand=seeded(seed);for(let i=0;i<steps;i++)state=step(state,rand);return state;}
  function missionEvidence(settings){
    if(settings.molecule==='oxygen'&&settings.pathway==='bilayer'&&settings.outside===80)return 'oxygen';
    if(settings.molecule==='sodium'&&settings.pathway==='channel'&&settings.gate==='open'&&settings.outside===80)return 'open';
    if(settings.molecule==='sodium'&&settings.pathway==='channel'&&settings.gate==='closed'&&settings.outside===80)return 'closed';
    if(settings.molecule==='oxygen'&&settings.pathway==='bilayer'&&settings.outside===50)return 'equilibrium';
    return null;
  }
  function summary(result){
    const {settings,outside,inside,crossIn,crossOut}=result,net=crossIn-crossOut;
    const direction=net>0?'net inward':net<0?'net outward':'no net transfer';
    const type=settings.molecule==='oxygen'?'Oxygen':settings.molecule==='sodium'?'Sodium ions':'Glucose';
    const mechanism=probability(settings.molecule,settings.pathway,settings.gate)>0;
    return `${type}: ${crossIn} moved into the cell and ${crossOut} moved out (${direction}, ${Math.abs(net)} particles). Final counts: outside ${outside}, inside ${inside}. ${mechanism?'This pathway permits passive movement in both directions.':'This pathway does not permit measurable movement in this simplified model.'}`;
  }
  const api={TOTAL,MOLECULES,PATHWAYS,probability,initial,seeded,step,simulate,missionEvidence,summary};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MembraneModel=api;
})(typeof window!=='undefined'?window:globalThis);
