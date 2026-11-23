import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
export function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
export function compile(source, target, format, enginePath = null) {
  let count = 0;
  for (const file of walk(source).filter(f=>f.endsWith('.ts'))) {
    const rel = path.relative(source,file).replace(/\.ts$/,'.js'), output = path.join(target,rel);
    const result = ts.transpileModule(fs.readFileSync(file,'utf8'), {fileName:file, reportDiagnostics:true, compilerOptions:{module: format === 'system' ? ts.ModuleKind.System : ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2019, experimentalDecorators:true, useDefineForClassFields:false}});
    const errors = result.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error);
    if(errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors,{getCanonicalFileName:f=>f,getCurrentDirectory:()=>process.cwd(),getNewLine:()=> '\n'}));
    let code=result.outputText;
    if(format==='system') code=code.replace(/(["'])(\.\.?\/[^"']+)\1/g, (all,q,p)=>q+(p.endsWith('.js')?p:p+'.js')+q);
    else if(enginePath) {let p=path.relative(path.dirname(output),enginePath).replaceAll('\\','/');if(!p.startsWith('.'))p='./'+p;code=code.replaceAll('require("cc")','require('+JSON.stringify(p)+')');}
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,code);count++;
  }
  return count;
}
