export const SKINS=[
 {id:'classic',name:'极光引擎',cost:0,color:'#86f4ff',secondary:'#a993ff',description:'最初的脉冲。'},
 {id:'amber',name:'黄铜唱针',cost:120,color:'#ffd18d',secondary:'#ff9c73',description:'把鼓点镀成金色。'},
 {id:'rose',name:'霓虹舞池',cost:260,color:'#ff9fcb',secondary:'#e2b0ff',description:'下一拍，继续摇摆。'},
 {id:'jade',name:'翡翠频率',cost:480,color:'#96ffd0',secondary:'#71d9ec',description:'低音流过整片星海。'},
 {id:'violet',name:'午夜蓝调',cost:760,color:'#b9a7ff',secondary:'#a6dcff',description:'留一点空间给即兴。'},
 {id:'pearl',name:'白金终曲',cost:1200,color:'#e7fff0',secondary:'#ffd790',description:'压轴登场。'}
];
export function normalizeEconomy(raw,stars={}){
 const valid=raw&&raw.version===1;const owned=['classic'];if(valid&&Array.isArray(raw.owned))for(const id of raw.owned)if(SKINS.some(s=>s.id===id)&&!owned.includes(id))owned.push(id);
 const coins=valid?Math.max(0,Math.min(999999,Math.floor(Number(raw.coins)||0))):Object.entries(stars).reduce((sum,[l,s])=>sum+70+Number(l)*2+Number(s)*5,0);
 const receipts=valid&&Array.isArray(raw.receipts)?raw.receipts.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.base)).slice(-128).map(x=>({id:x.id,base:Math.max(0,Math.min(1000,x.base)),bonus:!!x.bonus})):[];
 return{version:1,coins,owned,equipped:valid&&owned.includes(raw.equipped)?raw.equipped:'classic',receipts,revivesSpent:valid?Math.max(0,Math.floor(Number(raw.revivesSpent)||0)):0};
}
export function awardClear(economy,runId,level,stars,firstClear,kills=0){
 const existing=economy.receipts.find(r=>r.id===runId);if(existing)return existing;
 const normal=20+Math.max(1,Math.min(100,level))*2+Math.max(1,Math.min(3,stars))*5+(firstClear?50:0)+Math.min(80,Math.floor(Math.max(0,kills)/8));
 const base=Math.ceil(normal/2);
 const receipt={id:runId,base,bonus:false};economy.coins=Math.min(999999,economy.coins+base);economy.receipts.push(receipt);if(economy.receipts.length>128)economy.receipts.shift();return receipt;
}
export function awardDouble(economy,runId){const receipt=economy.receipts.find(r=>r.id===runId);if(!receipt||receipt.bonus)return false;receipt.bonus=true;economy.coins=Math.min(999999,economy.coins+receipt.base);return true;}
export function buySkin(economy,id){const skin=SKINS.find(s=>s.id===id);if(!skin)return false;if(economy.owned.includes(id)){economy.equipped=id;return true;}if(economy.coins<skin.cost)return false;economy.coins-=skin.cost;economy.owned.push(id);economy.equipped=id;return true;}
export const REVIVE_COST=60;
export function buyRevive(economy){if(economy.coins<REVIVE_COST)return false;economy.coins-=REVIVE_COST;economy.revivesSpent++;return true;}
