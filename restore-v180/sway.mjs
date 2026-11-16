// A turn is confirmed after 7% of button radius of return travel.
// Judge its recorded apex time, not the later confirmation event.
export class SwayGesture {
 reset(x=0,time=0){this.origin=x;this.extreme=x;this.time=time;this.direction=0;this.lastSide=0;}
 constructor(){this.reset();}
 move(x,time){
  if(!this.direction){if(Math.abs(x-this.origin)<.18)return null;this.direction=Math.sign(x-this.origin);this.extreme=x;this.time=time;return null;}
  if((x-this.extreme)*this.direction>0){this.extreme=x;this.time=time;return null;}
  if((this.extreme-x)*this.direction<.07)return null;
  const side=this.direction,peak={side,time:this.time,x:this.extreme};
  const valid=side*this.extreme>=.28&&Math.abs(this.extreme-this.origin)>=.55&&side!==this.lastSide;
  this.origin=this.extreme;this.direction=-side;this.extreme=x;this.time=time;
  if(!valid)return null;this.lastSide=side;return peak;
 }
}
