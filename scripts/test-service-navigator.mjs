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
const app=fs.readFileSync('_site/app.js','utf8');
assert(!app.includes('new THREE.')&&!app.includes('setAnimationLoop'));
const html=fs.readFileSync('_site/index.html','utf8');assert(!html.includes('src="./premium-car.js'));
assert(html.includes('hero-service-navigator.bundle.js'));
console.log(`PASS: 3 directions, 15 exterior zones, ${count} service mappings, cabin gating, layout lanes, single renderer.`);
