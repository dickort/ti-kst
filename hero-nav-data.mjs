// Service grouping follows TI (2).pdf; coordinates are in the original AMG
// source space: driver +X, front +Z. No unlisted services are invented here.
export const ease = t => { t = Math.min(1, Math.max(0, t)); return t*t*t*(t*(t*6-15)+10); };
export const shortest = (a,b) => a + Math.atan2(Math.sin(b-a), Math.cos(b-a));
export const group = (id,label,anchor,view,services,extra={}) => ({id,label,anchor,view,services,...extra});
export const VIEWS = {
  home: {eye:[0,1.28,4.65],target:[0,.43,0]},
  preserve: {eye:[3.45,1.65,3.75],target:[0,.44,.22]},
  restore: {eye:[3.95,1.72,2.8],target:[0,.46,.04]},
  tune: {eye:[3.75,1.40,3.2],target:[0,.44,.08]},
  front: {eye:[1.92,1.15,3.06],target:[.08,.49,1.15]},
  hood: {eye:[1.36,1.81,2.55],target:[.06,.65,.96]},
  glass: {eye:[1.7,1.51,1.93],target:[.02,.80,.37]},
  grille: {eye:[.97,.76,2.66],target:[0,.36,1.55]},
  arch: {eye:[2.16,.57,1.89],target:[.55,.29,1.02]},
  fender: {eye:[2.07,1.01,1.82],target:[.59,.54,.99]},
  bumper: {eye:[1.51,.68,2.51],target:[.42,.27,1.48]},
  sideglass: {eye:[2.28,1.29,.38],target:[.46,.74,-.03]},
  wheel: {eye:[2.0,.51,1.86],target:[.57,.27,1.02]},
  handle: {eye:[2.50,1.01,.64],target:[.56,.56,.18]},
  cabin: {eye:[2.40,1.20,-.08],target:[.14,.48,.13]},
  seat: {eye:[1.99,1.15,-.55],target:[.21,.50,-.03]},
  steering: {eye:[2.01,1.21,.14],target:[.26,.62,.31]},
  door: {eye:[1.88,1.11,-1.01],target:[.95,.45,.36]},
  ambient: {eye:[2.09,1.15,.01],target:[.08,.62,.29]}
};
export const MAP = {
 preserve: {
  label:'Сохранить', index:'01', anchor:[.44,.63,1.04],
  intro:'Выберите, какую часть автомобиля защитить.',
  zones:[
   group('ppf','Плёнка на кузов',[.49,.60,1.03],'front',['ppf']),
   group('coating','Уход за покрытием',[.06,.67,.95],'hood',['protective-polish','protective-coating']),
   group('windshield','Защита стекла',[0,.80,.37],'glass',['windshield-film']),
   group('mesh','Сетка радиатора',[0,.38,1.62],'grille',['radiator-mesh']),
   group('anticor','Арки и защита',[.63,.28,1.03],'arch',['anticorrosion'])
  ], cabin:[]
 },
 restore: {
  label:'Восстановить', index:'02', anchor:[-.45,.57,.03],
  intro:'Кузов, стекло или салон — перейдите к нужной детали.',
  zones:[
   group('care','Мойка и полировка',[.08,.67,.91],'hood',['detailing-wash','body-polish']),
   group('pdr','Вмятины · PDR',[.62,.52,.99],'fender',['pdr']),
   group('paintwork','Окрас и сколы',[.42,.27,1.5],'bumper',['paint','chips']),
   group('glassrepair','Ремонт стекла',[0,.80,.39],'glass',['glass-repair']),
   group('cabin','Салон',[.58,.59,.20],'cabin',[],{interior:true})
  ],
  cabin:[
   group('clean','Химчистка',[.26,.40,-.09],'seat',['interior-clean']),
   group('leather','Кожа сиденья',[.38,.52,-.10],'seat',['leather']),
   group('plastic','Пластик',[.46,.47,.13],'door',['plastic'],{onDoor:true})
  ]
 },
 tune: {
  label:'Тюнинг', index:'03', anchor:[.63,.28,-1.03],
  intro:'Стиль, комфорт и оснащение. Выберите зону автомобиля.',
  zones:[
   group('blackpack','Антихром',[0,.40,1.60],'grille',['anti-chrome'],{effect:'chrome'}),
   group('tinting','Тонировка',[.53,.75,.07],'sideglass',['tint'],{effect:'tint'}),
   group('wheels','Кованые диски',[.64,.27,1.01],'wheel',['forged-wheels']),
   group('closers','Доводчики дверей',[.61,.56,.20],'handle',['closers'],{closer:true}),
   group('cabin','Интерьер и комфорт',[.58,.59,.20],'cabin',[],{interior:true})
  ],
  cabin:[
   group('steering','Перешив руля',[.25,.62,.30],'steering',['steering']),
   group('trim','Обивка салона',[.28,.48,-.11],'seat',['interior-trim']),
   group('sound','Шумоизоляция',[.46,.42,.14],'door',['soundproof'],{onDoor:true}),
   group('ambient','Подсветка',[.10,.62,.33],'ambient',['ambient'],{effect:'ambient'})
  ]
 }
};
export const UNSHOWN_TUNING = ['alarm','steps','dashcam','towbar','suspension'];
export function resolveZone(direction,id,interior=false) {
 return (interior ? MAP[direction]?.cabin : MAP[direction]?.zones)?.find(z=>z.id===id) || null;
}
export function serviceNote(slug) {
 if (slug==='forged-wheels') return 'Колесо модели обозначает зону услуги. Дизайн и совместимость дисков подбираются отдельно.';
 if (slug==='soundproof') return 'Точка показывает зону работ. Слои материала под обшивкой в этой модели не демонстрируются.';
 if (slug==='anticorrosion') return 'В кадре показана арка. Состав обработки днища и арок уточняется для автомобиля.';
 return '';
}
// Deterministic callout lanes. Their hit targets never collide as the car turns.
export function calloutLayout(count,{left,right,top,bottom},compact=false,sizes=null) {
 if(sizes?.length===count&&count){
  const gap=12,width=right-left,height=bottom-top;
  const columns=[0,1].map(col=>Math.max(...sizes.filter((_,i)=>i%2===col).map(s=>s.w),0));
  const twoColumns=columns[0]+columns[1]+gap<=width;
  const rows=Math.ceil(count/(twoColumns?2:1));
  const rowHeights=Array.from({length:rows},(_,row)=>Math.max(...sizes.filter((_,i)=>Math.floor(i/(twoColumns?2:1))===row).map(s=>s.h)));
  const used=rowHeights.reduce((a,b)=>a+b,0),spacing=Math.max(gap,(height-used)/rows);
  const total=used+spacing*(rows-1);let y=top+Math.max(0,(height-total)/2);
  const centers=rowHeights.map(h=>{const center=y+h/2;y+=h+spacing;return center;});
  const layout=sizes.map((s,i)=>({
   x:twoColumns?(i%2===0?left+columns[0]/2+(width-columns[0]-columns[1]-gap)/4:right-columns[1]/2-(width-columns[0]-columns[1]-gap)/4):(left+right)/2,
   y:centers[Math.floor(i/(twoColumns?2:1))]
  }));
  // Font swaps and live viewport changes can alter intrinsic pill widths
  // between two frames. Clamp the measured box itself, not only its anchor.
  return layout.map((position,i)=>{
   const halfW=sizes[i].w/2,halfH=sizes[i].h/2;
   const minX=left+halfW,maxX=right-halfW,minY=top+halfH,maxY=bottom-halfH;
   return {
    x:minX<=maxX?Math.min(maxX,Math.max(minX,position.x)):(left+right)/2,
    y:minY<=maxY?Math.min(maxY,Math.max(minY,position.y)):(top+bottom)/2
   };
  });
 }
 const result=[], columns=compact ? 2 : 2;
 const rows=Math.ceil(count/columns), width=right-left;
 for(let i=0;i<count;i++) {
  const col=i%2,row=Math.floor(i/2);
  result.push({x:left+width*(col===0?.16:.84),y:top+(bottom-top)*(rows===1?.5:(row+.5)/rows)});
 }
 return result;
}
