import { compile } from './compile.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const target=path.resolve('.test-build');fs.rmSync(target,{recursive:true,force:true});compile(path.resolve('assets/scripts'),target,'commonjs');
const r=spawnSync(process.execPath,['tests/regression.cjs'],{stdio:'inherit'});process.exitCode=r.status;
