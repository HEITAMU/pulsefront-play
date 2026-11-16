export const UPGRADES=[{id:'power',name:'主炮火力',text:'每级主炮伤害 +12%',max:15},{id:'rate',name:'主炮射速',text:'每级射速 +5%，最高 +50%',max:10},{id:'support',name:'追加攻击',text:'每级追加攻击伤害 +15%',max:15}];
export function normalizeGrowth(raw){const g={};for(const u of UPGRADES)g[u.id]=Math.max(0,Math.min(u.max,Math.floor(Number(raw?.[u.id])||0)));return g;}
export function upgradeCost(g,id){return 60+g[id]*35;}
export function buyUpgrade(g,e,id){const u=UPGRADES.find(u=>u.id===id);if(!u||g[id]>=u.max||e.coins<upgradeCost(g,id))return false;e.coins-=upgradeCost(g,id);g[id]++;return true;}
export function salvage(e,runId,kills){const id=runId+'-salvage',old=e.receipts.find(r=>r.id===id);if(old)return 0;const base=Math.min(80,Math.floor(kills/8));e.receipts.push({id,base,bonus:true});e.receipts=e.receipts.slice(-128);e.coins=Math.min(999999,e.coins+base);return base;}
