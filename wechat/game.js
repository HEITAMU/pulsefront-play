const config = require('./config.js');
const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
const canvas = wx.createCanvas();
GameGlobal.canvas = canvas;
// Core rendering uses only canvas creation, not browser DOM.
GameGlobal.document = {createElement: function(type) {if(type !== 'canvas') throw new Error('Canvas only');return wx.createCanvas();}};
GameGlobal.window = {devicePixelRatio:info.pixelRatio || 1, AudioContext:wx.createWebAudioContext ? function(){return wx.createWebAudioContext();} : null};
const context = canvas.getContext('2d');
const proto = Object.getPrototypeOf(context);
if(!proto.roundRect) proto.roundRect = function(x,y,w,h,r){r=Math.min(Number(r)||0,w/2,h/2);this.moveTo(x+r,y);this.lineTo(x+w-r,y);this.arcTo(x+w,y,x+w,y+r,r);this.lineTo(x+w,y+h-r);this.arcTo(x+w,y+h,x+w-r,y+h,r);this.lineTo(x+r,y+h);this.arcTo(x,y+h,x,y+h-r,r);this.lineTo(x,y+r);this.arcTo(x,y,x+r,y,r);this.closePath();return this;};
const {WechatGame} = require('./bundle.js');
const game = new WechatGame(wx, canvas, config);
GameGlobal.pulsefront = game;
function frame(time){game.frame(time);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
