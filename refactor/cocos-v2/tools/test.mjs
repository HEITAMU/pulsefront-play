import { compile } from './compile.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const target=path.resolve('.test-build');fs.rmSync(target,{recursive:true,force:true});compile(path.resolve('assets/scripts'),target,'commonjs');
for(const suite of ['tests/regression.cjs','tests/runtime.cjs']){const r=spawnSync(process.execPath,[suite],{stdio:'inherit'});if(r.status!==0){process.exitCode=r.status||1;break;}}
