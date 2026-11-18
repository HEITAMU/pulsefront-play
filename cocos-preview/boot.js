import {registerBuiltinEffects} from './builtin-effects.js?v=5c8bccdeaafa8f53';
import {preloadArt} from './preload-art.js?v=5c8bccdeaafa8f53';
const status=document.querySelector('#status');
window.__smokeErrors=[];
function fail(error){const msg=error?.stack||String(error);window.__smokeErrors.push(msg);status.textContent=error?.code==='NO_WEBGL'?'当前浏览器无法提供游戏所需的图形功能，请使用支持 WebGL 的浏览器打开。':'游戏加载失败，请刷新重试。';status.className='error';status.hidden=false;console.error(error);}
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
try {
  window.__smokeStage='context-probe';probeWebGL();
  window.__smokeStage='engine-module';
  const cc=await System.import('cc');window.cc=cc;
  cc.game.onPostSubsystemInitDelegate.add(()=>registerBuiltinEffects(cc));
  window.__smokeStage='engine-init';
  await cc.game.init({overrideSettings:{screen:{designResolution:{width:420,height:840,policy:cc.ResolutionPolicy.FIXED_WIDTH},orientation:'portrait',frameRate:60},rendering:{renderMode:2,customPipeline:false},splashScreen:{totalTime:0},profiling:{showFPS:false},assets:{preloadBundles:[],preloadAssets:[]}}});
  window.__smokeStage='resources';await preloadArt(cc);
  window.__smokeStage='scene';
  const {Pulsefront}=await System.import('./scripts/Pulsefront.js?v=5c8bccdeaafa8f53');
  const sceneData=await(await fetch('./Main.scene?v=5c8bccdeaafa8f53')).json();
  // Register the exact script meta id used in the deliverable scene so the real deserializer resolves it.
  cc.js._setClassId('8f5a73AOmtLlKCEpwujPXwh',Pulsefront);
  const asset=cc.deserialize(sceneData);
  cc.director.runSceneImmediate(asset.scene);
  cc.game.run();
  status.hidden=true;
  window.__smokeStage='running';
  window.__smokeReady=true;
} catch(error){fail(error);}
