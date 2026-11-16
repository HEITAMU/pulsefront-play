import assert from 'node:assert/strict';
import {Battle,MODULES,directionalWeight} from './legacy-battle.mjs';
assert.equal(MODULES.length,12);assert.equal(new Set(MODULES.map(m=>m.id)).size,12);
function arena(modules=[],level=1){const b=new Battle(level,{modules,width:390,height:844,seed:42});b.spawnClock=1e9;return b;}
function enemy(b,type='tank',dx=0){return b.spawn(type,0,{x:b.cx+dx,y:b.cy-220});}
{
 const b=arena(['echo']);const e=enemy(b);e.hp=e.maxHp=1000;b.shoot(.3);assert.ok(b.waves[0].echo);let n=0;while(b.waves[0]&&!b.waves[0].returning&&n++<200)b.step(1/60);assert.ok(b.waves[0].returning);const hp=e.hp;while(b.waves.length&&n++<400)b.step(1/60);assert.ok(e.hp<hp,'return wave strikes again');
}
{
 const b=arena(['prism','focus','pierce']);b.weapon='laser';for(const dx of [-90,0,90]){const e=enemy(b,'tank',dx);e.hp=e.maxHp=1000;}b.shoot(.3);assert.equal(b.beams.length,7);const shield=enemy(b,'shield',-30);const hp=shield.hp;b.damage(shield,10,false,'laser');assert.equal(shield.hp,hp-10);assert.ok(shield.guard>0);
}
{
 const b=arena(['chain']);const a=enemy(b,'drone'),e=enemy(b,'drone',20);a.hp=1;e.hp=1;b.damage(a,100);assert.ok(e.hp<=0,'standalone chain triggers explosion');assert.equal(b.kills,2);
 const g=arena(['vortex']);enemy(g);g.shots=3;g.shoot(.3);assert.equal(g.wells.length,1,'standalone vortex creates gravity');
}
{
 const b=arena();const shield=enemy(b,'shield');const target=enemy(b,'tank');target.y-=60;const hp=target.hp;b.damage(target,10,false,'wave');assert.equal(target.hp,hp-5.5);b.damage(shield,100,false,'laser');assert.equal(shield.guard,0);
 const h=arena();const healer=enemy(h,'healer');const patient=enemy(h,'tank',15);patient.hp=1;for(let i=0;i<100;i++)h.step(1/60);assert.ok(patient.hp>1);assert.ok(healer.hp>0);
}
{
 for(const weapon of ['laser','wave']){const base=arena(),aimed=arena();for(const b of [base,aimed]){b.weapon=weapon;for(const dx of [-90,0,90]){const e=enemy(b,'tank',dx);e.hp=e.maxHp=1000;e.speed=0;}}aimed.aim={x:90,y:-220};base.shoot(.3);aimed.shoot(.3);if(weapon==='laser'){assert.deepEqual(aimed.beams.slice(0,base.beams.length),base.beams,'all automatic beams preserved');assert.equal(aimed.beams.length,base.beams.length+1);assert.ok(aimed.beams.at(-1).directional);}else{assert.deepEqual(aimed.bolts,base.bolts,'automatic bolt targets preserved');base.bolts=[];aimed.bolts=[];for(let i=0;i<50;i++){base.step(1/60);aimed.step(1/60);}}assert.equal(aimed.enemies[0].hp,base.enemies[0].hp,'opposite direction unchanged');assert.ok(aimed.enemies[2].hp<base.enemies[2].hp,'selected direction gains actual damage');}
 assert.equal(directionalWeight(-1,-1),1);assert.ok(Math.abs(directionalWeight(-.65,-1)-.5)<1e-10);assert.equal(directionalWeight(0,-1),0);
}
{
 const events=[];const b=new Battle(1,{emit:(type,d)=>events.push([type,d])});b.spawnClock=1e9;b.finisher='gravity';b.energy=100;b.t=.2;b.shoot(.3);b.step(.01);assert.equal(b.overdrive,0);b.t=b.beatDuration-.005;b.step(.01);assert.ok(b.overdrive>0);assert.equal(b.wells.length,1);assert.ok(events.some(([type,d])=>type==='finisher'&&d.kind==='gravity'));const well=b.wells[0];const e=b.spawn('tank',0,{x:well.x+100,y:well.y});e.speed=0;e.hp=e.maxHp=1000;for(let i=0;i<250;i++)b.step(1/60);assert.equal(events.filter(([type])=>type==='gravityBurst').length,1);assert.ok(e.hp<1000,'gravity expiry deals damage');assert.ok(Math.hypot(e.x-well.x,e.y-well.y)<15,'finisher gathers targets');b.step(.05);assert.equal(events.filter(([type])=>type==='gravityBurst').length,1);
}
{const b=arena();b.aim={x:1,y:-.1};b.weapon='laser';b.shoot(.3);assert.equal(b.beams.length,6);assert.ok(b.beams.at(-1).ex>b.beams.at(-1).x,'additional thick laser follows selected side');assert.ok(b.beams[0].ex<b.beams[0].x,'automatic spread still covers other side');}
for(const level of [10,20,30]){const b=arena([],level);b.t=b.c.duration*.45+.01;b.step(.01);const bosses=b.enemies.filter(e=>e.boss);assert.equal(bosses.length,level===20?2:1);assert.equal(bosses[0].bossKind,level/10-1);if(level===30){bosses[0].attack=0;b.step(.01);assert.ok(b.enemies.some(e=>e.type==='shield'));}}
console.log('PASS 12 modules, returning wave, refraction, standalone chain/vortex, shield/repair, additive directional fire and smooth wave taper, beat finisher and three boss behaviors');
