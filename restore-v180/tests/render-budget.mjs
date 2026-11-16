import assert from 'node:assert/strict';
import {Renderer} from '../renderer.mjs';
for(const lite of [false,true]){const r=Object.create(Renderer.prototype);r.fx=[];r.lite=lite;for(let i=0;i<2000;i++)r.explode(i,0,'#fff',80);assert(r.fx.length<=(lite?160:360));assert(r.fx.filter(p=>p.ring).length<=(lite?28:64));}
console.log('PASS 2000 mass-kill bursts stay within particle and ring budgets');
