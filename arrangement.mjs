export function arrangementFor(level,bpm){const bar=240/bpm,target=64+14*(level-1)/99,bars=Math.ceil(target/bar);return{duration:bars*bar,spawnEnd:bars*bar-2,buildStart:Math.floor(bars*.42)*bar,climaxStart:Math.floor(bars*.54)*bar,climaxEnd:bars*bar-5,outroStart:bars*bar-5};}
export function sectionAt(t,a){return t<a.buildStart?'groove':t<a.climaxStart?'build':t<a.climaxEnd?'climax':'outro';}
