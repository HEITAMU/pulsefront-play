const fs=require('fs'),path=require('path');
const {Audio}=require('../.test-build/core/Audio');const {getTrack,stepTime}=require('../.test-build/core/music');
const rate=44100,seconds=32*60/108,samples=Math.ceil(rate*seconds),mix=new Float32Array(samples);const audio=new Audio();
audio.ctx={sampleRate:rate,createBuffer:(channels,n)=>{const data=new Float32Array(n);return {getChannelData:()=>data};}};
const track=getTrack(1),cache=new Map();
for(const e of track.events){const offset=Math.round(stepTime(track,e.step)*rate);if(offset>=samples)break;const key=audio.key(e);if(!cache.has(key))cache.set(key,audio.sample(e).getChannelData(0));const b=cache.get(key),gain=Math.min(1,e.velocity||1)*.55*.6;for(let i=0;i<b.length&&offset+i<samples;i++)mix[offset+i]+=b[i]*gain;}
const data=Buffer.alloc(samples*2);let peak=0;for(let i=0;i<samples;i++){const fade=Math.min(1,(samples-i)/2205);peak=Math.max(peak,Math.abs(mix[i]));data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,mix[i]*fade))*32767),i*2);}
const wav=Buffer.alloc(44);wav.write('RIFF');wav.writeUInt32LE(36+data.length,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(data.length,40);
const output=process.argv[2];fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,Buffer.concat([wav,data]));console.log(JSON.stringify({output,seconds,peak,bpm:108,source:'same PCM synthesis and score as the game'}));
