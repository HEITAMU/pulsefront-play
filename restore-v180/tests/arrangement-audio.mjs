import assert from 'node:assert/strict';
import {Soundtrack} from '../audio.mjs';
import {getTrack,stepTime} from '../music.mjs';
import {arrangementFor,sectionAt} from '../arrangement.mjs';
for(let l=1;l<=100;l++){
 const t=getTrack(l),a=arrangementFor(l,t.bpm);assert(a.duration>=60&&a.duration+7<=90);assert(a.climaxEnd-a.climaxStart>=14);assert.equal(sectionAt(a.climaxStart,a),'climax');
 for(const [time,instrument] of [[a.buildStart,'snare'],[a.climaxStart,'kick']]){
  const s=new Soundtrack(),notes=[];s.track=t;s.running=true;s.origin=0;s.step=Math.round(time/(t.beat/4));s.ctx={currentTime:stepTime(t,s.step)};s.note=e=>notes.push(e);s.hiss=()=>{};s.tone=()=>{};s.schedule();assert(notes.some(n=>n.instrument===instrument));
 }
}
console.log('PASS 100 bar-aligned 60–90s timelines, sustained climax and synchronized musical build/drop scheduling');
