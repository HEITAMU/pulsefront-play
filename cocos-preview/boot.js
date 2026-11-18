import {registerBuiltinEffects} from './builtin-effects.js';
import {preloadArt} from './preload-art.js';
const status=document.querySelector('#status');
window.__smokeErrors=[];
function fail(error){const msg=error?.stack||String(error);window.__smokeErrors.push(msg);status.textContent='游戏加载失败，请刷新重试。';status.className='error';status.hidden=false;console.error(error);}
window.addEventListener('error',e=>fail(e.error||e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason));
try {
  const cc=await System.import('cc');window.cc=cc;
  cc.game.onPostSubsystemInitDelegate.add(()=>registerBuiltinEffects(cc));
  await cc.game.init({overrideSettings:{screen:{designResolution:{width:420,height:840,policy:cc.ResolutionPolicy.FIXED_WIDTH},orientation:'portrait',frameRate:60},rendering:{renderMode:2,customPipeline:false},splashScreen:{totalTime:0},profiling:{showFPS:false},assets:{preloadBundles:[],preloadAssets:[]}}});
  await preloadArt(cc);
  const {Pulsefront}=await System.import('./scripts/Pulsefront.js');
  const sceneData=await(await fetch('./Main.scene')).json();
  // Register the exact script meta id used in the deliverable scene so the real deserializer resolves it.
  cc.js._setClassId('8f5a73AOmtLlKCEpwujPXwh',Pulsefront);
  const asset=cc.deserialize(sceneData);
  cc.director.runSceneImmediate(asset.scene);
  cc.game.run();
  status.hidden=true;
  window.__smokeReady=true;
} catch(error){fail(error);}
