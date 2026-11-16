import assert from 'node:assert/strict';
import {Soundtrack} from '../audio.mjs';
import {getTrack} from '../music.mjs';
import {arrangementFor} from '../arrangement.mjs';
for(let level=1;level<=100;level++){
 const s=new Soundtrack(),events=[];s.track=getTrack(level);const a=arrangementFor(level,s.track.bpm);s.origin=0;s.ctx={currentTime:a.duration-5};s.running=true;s.music={gain:{value:.74,cancelScheduledValues:t=>events.push(['cancel',t]),setValueAtTime:(v,t)=>events.push(['value',v,t]),linearRampToValueAtTime:(v,t)=>events.push(['ramp',v,t])}};
 assert.equal(s.musicLevel(a.duration-5),s.musicVolume);assert.ok(Math.abs(s.musicLevel(a.duration-2.5)-s.musicVolume*.5)<1e-9);assert.equal(s.musicLevel(a.duration),0);s.applyMusicEnvelope();assert.ok(events.some(e=>e[0]==='ramp'&&e[1]===0&&e[2]===a.duration));assert.equal(typeof s.pluck,'undefined');
 s.ctx.currentTime=a.duration;s.finish();assert.equal(s.endingAt,a.duration);assert.ok(events.some(e=>e[0]==='value'&&e[1]===0&&e[2]===a.duration));clearTimeout(s.endTimer);
}
console.log('PASS all100 final-five-second fades, silent settlement, no guitar ending, resume envelope');
