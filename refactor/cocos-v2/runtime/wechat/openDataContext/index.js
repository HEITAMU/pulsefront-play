'use strict';
const canvas=wx.getSharedCanvas(),ctx=canvas.getContext('2d');let visible=false,epoch=0;
function text(value,x,y,size,color){ctx.font=size+'px sans-serif';ctx.fillStyle=color;ctx.fillText(value,x,y);}
function base(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#09262b';ctx.fillRect(0,0,canvas.width,canvas.height);}
wx.onMessage(message=>{
 if(message.type==='hide'){visible=false;epoch++;return;}if(message.type!=='show')return;
 visible=true;const generation=++epoch;canvas.width=message.width||656;canvas.height=message.height||640;base();text('正在获取好友成绩…',25,55,28,'#a8c5bd');
 wx.getFriendCloudStorage({keyList:[message.key],success:result=>{
  if(!visible||generation!==epoch)return;const rows=[];
  for(const person of result.data||[]){const entry=(person.KVDataList||[]).find(v=>v.key===message.key);if(!entry)continue;try{const value=JSON.parse(entry.value);const score=Number(value.wxgame.score);if(Number.isFinite(score)&&score>=0)rows.push({name:person.nickname||'微信好友',score,avatar:person.avatarUrl});}catch{}}
  rows.sort((a,b)=>b.score-a.score);base();if(!rows.length){text('今天还没有好友提交成绩',25,100,29,'#c8e6dc');text('打一局，再邀请朋友来挑战。',25,155,26,'#8caeaf');return;}
  rows.slice(0,8).forEach((row,index)=>{const y=35+index*75;text(String(index+1).padStart(2,'0'),15,y+28,27,index<3?'#ffe3a1':'#8caeaf');text(row.name.slice(0,10),80,y+28,27,'#e3f4ed');ctx.textAlign='right';text(row.score.toLocaleString(),630,y+28,29,'#83f5d6');ctx.textAlign='left';ctx.strokeStyle='#244e4d';ctx.beginPath();ctx.moveTo(10,y+54);ctx.lineTo(640,y+54);ctx.stroke();});
 },fail:()=>{if(!visible||generation!==epoch)return;base();text('好友成绩暂时未能载入',25,100,29,'#c8e6dc');text('稍后重新打开即可。',25,155,26,'#8caeaf');}});
});
