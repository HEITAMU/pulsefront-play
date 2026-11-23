import {registerBuiltinEffects} from './builtin-effects.js?v=v2r1';
import {preloadArt} from './preload-art.js?v=v2r1';
const status=document.querySelector('#status');
window.__smokeErrors=[];
const stages={
  'context-probe':'检查图形支持','engine-module':'载入引擎','engine-init':'初始化引擎',
  'materials':'初始化画面材质','pipeline':'初始化渲染管线','resources':'载入图片资源',
  'controller':'载入游戏脚本','scene-data':'读取主场景','scene-deserialize':'解析主场景',
  'scene-run':'启动游戏场景','first-frame':'准备首帧','running':'运行游戏'
};
function fail(error){
  const msg=error?.stack||String(error);
  if(window.__smokeErrors.length<10)window.__smokeErrors.push(msg);
  console.error('[Pulsefront startup]',window.__smokeStage,error);
  if(window.__smokeFailed)return;
  window.__smokeFailed=true;
  const stage=window.__smokeStage||'engine-module';
  const detail={version:'2.0.0',build:new URL(import.meta.url).searchParams.get('v')||'development',stage,
    error:String(error?.message||error),stack:msg,webgl:window.__pulsefrontWebGL||null,userAgent:navigator.userAgent};
  window.__pulsefrontDiagnostic=detail;
  status.replaceChildren();status.className='error';status.hidden=false;
  const add=(tag,value)=>{const element=document.createElement(tag);element.textContent=value;status.appendChild(element);return element;};
  add('strong',error?.code==='NO_WEBGL'?'当前浏览器无法启动游戏画面':'游戏启动失败');
  add('p','阶段：'+(stages[stage]||stage)+' · 2.0');
  add('p',error?.code==='NO_WEBGL'?'当前浏览器没有提供 WebGL 图形支持，请换用支持 WebGL 的浏览器。':String(error?.message||error).slice(0,220));
  const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');
  summary.textContent='查看错误详情';pre.textContent=JSON.stringify(detail,null,2);details.append(summary,pre);status.appendChild(details);
  const copy=add('button','复制诊断');copy.type='button';
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(detail,null,2));copy.textContent='已复制';}catch{details.open=true;copy.textContent='请长按详情复制';}});
  try{window.cc?.game?.pause();}catch{}
}
window.addEventListener('error',e=>fail(e.error||e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason));
function probeWebGL(){
  const result={};
  // Use separate temporary canvases. Never lock the actual game canvas to a
  // different context, and release probes before the Cocos device is created.
  for(const name of ['webgl2','webgl','experimental-webgl']){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=2;
    const item=result[name]={supported:false};
    canvas.addEventListener('webglcontextcreationerror',event=>{item.creationError=event.statusMessage||'Context creation failed';});
    let gl;
    try{
      gl=canvas.getContext(name,{alpha:false,antialias:true,depth:true,stencil:true,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'default',failIfMajorPerformanceCaveat:false});
      item.supported=!!gl;
      if(gl){item.version=gl.getParameter(gl.VERSION);item.renderer=gl.getParameter(gl.RENDERER);}
      else{
        const fallback=document.createElement('canvas');fallback.width=fallback.height=2;
        const defaultContext=fallback.getContext(name);item.supportedWithDefaults=!!defaultContext;
        try{defaultContext?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}fallback.width=fallback.height=0;
      }
    }catch(error){item.error=String(error);}
    finally{try{gl?.getExtension('WEBGL_lose_context')?.loseContext();}catch{}canvas.width=canvas.height=0;}
  }
  window.__pulsefrontWebGL=result;console.info('[Pulsefront WebGL probe]',JSON.stringify(result));
  if(!result.webgl2.supported&&!result.webgl.supported){const error=new Error('No usable WebGL context: '+JSON.stringify(result));error.code='NO_WEBGL';throw error;}
}
async function start(){
try {
  window.__smokeStage='context-probe';probeWebGL();
  window.__smokeStage='engine-module';
  const cc=await System.import('cc');window.cc=cc;
  cc.game.onPostSubsystemInitDelegate.add(async()=>{window.__smokeStage='materials';await registerBuiltinEffects(cc);window.__smokeStage='pipeline';});
  window.__smokeStage='engine-init';
  await cc.game.init({overrideSettings:{screen:{designResolution:{width:420,height:840,policy:cc.ResolutionPolicy.FIXED_WIDTH},orientation:'portrait',frameRate:60},rendering:{renderMode:2,customPipeline:false},splashScreen:{totalTime:0},profiling:{showFPS:false},assets:{preloadBundles:[],preloadAssets:[]}}});
  window.__smokeStage='resources';await preloadArt(cc);
  window.__smokeStage='controller';
  const {Pulsefront}=await System.import('./scripts/Pulsefront.js?v=v2r1');
  window.__smokeStage='scene-data';
  const sceneResponse=await fetch('./Main.scene?v=v2r1');if(!sceneResponse.ok)throw new Error('主场景读取失败：HTTP '+sceneResponse.status);
  const sceneData=await sceneResponse.json();
  // Register the exact script meta id used in the deliverable scene so the real deserializer resolves it.
  cc.js._setClassId('8f5a73AOmtLlKCEpwujPXwh',Pulsefront);
  window.__smokeStage='scene-deserialize';
  const asset=cc.deserialize(sceneData);
  if(!asset?.scene)throw new Error('主场景解析结果缺少 scene');
  window.__smokeStage='scene-run';
  cc.director.runSceneImmediate(asset.scene);
  window.__smokeStage='first-frame';
  cc.director.once(cc.Director.EVENT_AFTER_DRAW,()=>{if(!window.__smokeFailed){status.hidden=true;window.__smokeStage='running';window.__smokeReady=true;}});
  cc.game.run();
} catch(error){fail(error);}
}
start();
