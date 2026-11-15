// Freeze v1.6 encounter behavior for regression tests; new rhythm trials are tested separately.
import {Battle as Base} from '../engine.mjs';
export * from '../engine.mjs';
export class Battle extends Base{constructor(level,options={}){super(level,{...options,rhythm:false});}}
