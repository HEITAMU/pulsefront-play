'use strict';
const canvas=wx.getSharedCanvas(),ctx=canvas.getContext('2d');let visible=false,epoch=0;
function text(value,x,y,size,color){ctx.font=size+'px sans-serif';ctx.fillStyle=color;ctx.fillText(value,x,y);}
function base(){ctx.clearRect(0,0,canvas.width,canvas.height);}
function rounded(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function portrait(image,x,y){ctx.save();ctx.beginPath();ctx.arc(x+27,y+27,27,0,Math.PI*2);ctx.clip();ctx.drawImage(image,x,y,54,54);ctx.restore();ctx.beginPath();ctx.arc(x+27,y+27,28,0,Math.PI*2);ctx.strokeStyle='#bdac76';ctx.lineWidth=2;ctx.stroke();}
wx.onMessage(message=>{
 if(message.type==='hide'){visible=false;epoch++;return;}if(message.type!=='show')return;
 visible=true;const generation=++epoch;canvas.width=message.width||656;canvas.height=message.height||640;base();text('正在获取好友成绩…',25,55,28,'#a8c5bd');
 wx.getFriendCloudStorage({keyList:[message.key],success:result=>{
  if(!visible||generation!==epoch)return;const rows=[];
  for(const person of result.data||[]){const entry=(person.KVDataList||[]).find(v=>v.key===message.key);if(!entry)continue;try{const value=JSON.parse(entry.value);const score=Number(value.wxgame.score);if(Number.isFinite(score)&&score>=0)rows.push({name:person.nickname||'微信好友',score,avatar:person.avatarUrl});}catch{}}
  rows.sort((a,b)=>b.score-a.score);base();if(!rows.length){text('今天还没有好友提交成绩',25,100,29,'#c8e6dc');text('打一局，再邀请朋友来挑战。',25,155,26,'#8caeaf');return;}
  rows.slice(0,8).forEach((row,index)=>{const y=7+index*78;const glass=ctx.createLinearGradient(0,y,0,y+68);glass.addColorStop(0,'#163d3b');glass.addColorStop(.45,'#092728');glass.addColorStop(1,'#0d3433');rounded(8,y,640,68,12);ctx.fillStyle=glass;ctx.fill();ctx.strokeStyle=index<3?'#ad985e':'#4a7063';ctx.lineWidth=1.5;ctx.stroke();text(String(index+1).padStart(2,'0'),22,y+43,25,index<3?'#ffe3a1':'#9bb9ae');ctx.fillStyle='#214c42';ctx.beginPath();ctx.arc(99,y+34,27,0,Math.PI*2);ctx.fill();text(row.name.slice(0,1),85,y+43,27,'#c4f2d3');text(row.name.slice(0,8),144,y+42,26,'#e3f4ed');ctx.textAlign='right';text(row.score.toLocaleString(),625,y+43,29,'#ffe3a1');ctx.textAlign='left';if(row.avatar){const image=wx.createImage();image.onload=()=>{if(visible&&generation===epoch)portrait(image,72,y+7);};image.src=row.avatar;}});
 },fail:()=>{if(!visible||generation!==epoch)return;base();text('好友成绩暂时未能载入',25,100,29,'#c8e6dc');text('稍后重新打开即可。',25,155,26,'#8caeaf');}});
});
