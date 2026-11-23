import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { compile, walk } from './compile.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'), repo=path.resolve(root,'../..');
const runtime=path.join(root,'runtime'), web=path.join(root,'build/web-mobile'), wx=path.join(root,'build/wechatgame');
if(!fs.existsSync(path.join(runtime,'web/engine/cc.js')))throw new Error('Missing bundled Cocos 3.8.8 runtime. See README.');
for(const [from,to] of [['web',web],['wechat',wx]]){fs.rmSync(to,{recursive:true,force:true});fs.cpSync(path.join(runtime,from),to,{recursive:true});}
const hash = crypto.createHash('sha256');for(const p of walk(path.join(root,'assets/scripts')).filter(f=>f.endsWith('.ts')).sort())hash.update(fs.readFileSync(p));const sha=hash.digest('hex');
const webModules='scripts-'+sha.slice(0,12);
fs.writeFileSync(path.join(web,'boot.js'),fs.readFileSync(path.join(web,'boot.js'),'utf8').replace('./scripts/Pulsefront.js','./'+webModules+'/Pulsefront.js'));
compile(path.join(root,'assets/scripts'),path.join(web,webModules),'system');compile(path.join(root,'assets/scripts'),path.join(wx,'scripts'),'commonjs',path.join(wx,'engine/cc.js'));
const manifest=[];const template=JSON.parse(fs.readFileSync(path.join(root,'tools/image-meta-template.json'),'utf8'));
for(const name of ['deep-space','cannon','enemies','ui-panel','ui-button','ui-icons']){
 const file=path.join(root,'assets/resources/art',name+'.png'),data=fs.readFileSync(file);const width=data.readUInt32BE(16),height=data.readUInt32BE(20),hex=crypto.createHash('sha256').update('pulsefront-v2:'+name).digest('hex').slice(0,32);const uuid=hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
 const meta=JSON.parse(JSON.stringify(template).replaceAll(template.uuid,uuid).replaceAll('drone',name));Object.assign(meta.subMetas.f9941.userData,{width,height,rawWidth:width,rawHeight:height});fs.writeFileSync(file+'.meta',JSON.stringify(meta,null,2));
 for(const [dir,relative] of [[web,'art'],[wx,'subpackages/artwork/art']]){fs.mkdirSync(path.join(dir,relative),{recursive:true});fs.copyFileSync(file,path.join(dir,relative,name+'.png'));}
 const revision=crypto.createHash('sha256').update(data).digest('hex').slice(0,12);
 manifest.push({revision,name:'art/'+name,url:'art/'+name+'.png',uuid,width,height,resourcePath:'art/'+name+'/spriteFrame'});
}
fs.writeFileSync(path.join(web,'art-manifest.json'),JSON.stringify(manifest.map(a=>({...a,url:a.url+'?v='+a.revision}))));fs.writeFileSync(path.join(wx,'bootstrap/art-manifest.js'),'module.exports='+JSON.stringify(manifest.map(a=>({...a,url:'subpackages/artwork/'+a.url})))+';');
fs.copyFileSync(path.join(root,'assets/Main.scene'),path.join(web,'Main.scene'));
fs.writeFileSync(path.join(wx,'bootstrap/scene-data.js'),'module.exports='+fs.readFileSync(path.join(root,'assets/Main.scene'),'utf8')+';');
const info={version:'2.1.0-cocos-touch.1',engine:'Cocos Engine 3.8.8',sourceSha256:sha,creatorEditorExport:false,buildSystem:'TypeScript + retained official 3.8.8 runtime; Creator project included',wechatDeviceVerified:false,appId:'wx43da24c6ac1e5a12',rewardedAdConfigured:true};
for(const dir of [web,wx])fs.writeFileSync(path.join(dir,'BUILD-INFO.json'),JSON.stringify(info,null,2));
const src=path.join(root,'assets/scripts');for(const p of walk(src).filter(f=>f.endsWith('.ts'))){if(fs.existsSync(p+'.meta'))continue;const hex=crypto.createHash('sha256').update(path.relative(root,p)).digest('hex').slice(0,32),uuid=hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);fs.writeFileSync(p+'.meta',JSON.stringify({ver:'4.0.23',importer:'typescript',imported:true,uuid,files:[],subMetas:{},userData:{}},null,2));}
console.log(JSON.stringify({web,wechat:wx,sourceSha256:sha,modules:walk(src).filter(f=>f.endsWith('.ts')).length}));
