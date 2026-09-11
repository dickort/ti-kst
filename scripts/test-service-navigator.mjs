import assert from 'node:assert/strict';
import {MAP,VIEWS,ease,shortest,calloutLayout} from '../hero-nav-data.mjs';
import {services} from '../_site/hero-service-catalog.mjs';
import fs from 'node:fs';
assert.deepEqual(Object.keys(MAP),['preserve','restore','tune']);
assert.equal(ease(0),0);assert.equal(ease(1),1);assert.equal(ease(.5),.5);
for(let i=1;i<=100;i++)assert(ease(i/100)>=ease((i-1)/100));
assert(Math.abs(shortest(Math.PI-.1,-Math.PI+.1)-(Math.PI+.1))<1e-9);
let count=0;
for(const d of Object.values(MAP)){
 assert.equal(d.zones.length,5);
 assert(new Set(d.zones.map(z=>z.id)).size===d.zones.length);
 for(const z of [...d.zones,...d.cabin]){
  assert(VIEWS[z.view]);assert(z.anchor.every(Number.isFinite));
  for(const slug of z.services){assert(services[slug],`Unknown service ${slug}`);count++;}
 }
}
for(const width of [390,820,1440,1920]){
 const compact=width<820;
 const box={left:compact?20:24,right:compact?width-20:width-Math.min(386,width*.30)-40,top:30,bottom:compact?260:550};
 const list=calloutLayout(5,box,compact);
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
  assert(Math.abs(list[i].x-list[j].x)>=(compact?44:200)||Math.abs(list[i].y-list[j].y)>=44,'Callout overlap');
 }
}
const labelSets=[
 {count:3,sizes:[{w:123,h:47},{w:145,h:47},{w:105,h:47}]},
 {count:5,sizes:[{w:142,h:47},{w:176,h:47},{w:154,h:47},{w:181,h:47},{w:190,h:47}]}
];
for(const width of [820,1024,1440,1920])for(const set of labelSets){
 const panelLeft=width-Math.min(386,width*.30)-24;
 const box=set.count===3?{left:Math.min(width*.60,540),right:width-22,top:38,bottom:700}:{left:24,right:panelLeft-18,top:38,bottom:700};
 const list=calloutLayout(set.count,box,false,set.sizes);
 const rects=list.map((point,i)=>({left:point.x-set.sizes[i].w/2,right:point.x+set.sizes[i].w/2,top:point.y-set.sizes[i].h/2,bottom:point.y+set.sizes[i].h/2}));
 for(const rect of rects)assert(rect.left>=box.left-1&&rect.right<=box.right+1&&rect.top>=box.top-1&&rect.bottom<=box.bottom+1,`Measured label outside ${width}px layout`);
 for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){const a=rects[i],b=rects[j];assert(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`Measured labels overlap at ${width}px`);}
}
const app=fs.readFileSync('_site/app.js','utf8');
assert(!app.includes('new THREE.')&&!app.includes('setAnimationLoop'));
const html=fs.readFileSync('_site/index.html','utf8');assert(!html.includes('src="./premium-car.js'));
assert(html.includes('hero-service-navigator.bundle.js'));
console.log(`PASS: 3 directions, 15 exterior zones, ${count} service mappings, cabin gating, layout lanes, single renderer.`);
