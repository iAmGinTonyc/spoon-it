/* Механики. Почти всё перенесено из первого прототипа, новое отмечено комментариями */
const nearFire=()=>{const p=me();return fires.some(f=>dist2(f,p)<11)};
const atBase=()=>{const p=me();return dist2(BASE,p)<12};
const nearCook=()=>{const p=me();return fires.some(f=>dist2(f,p)<4.5)||dist2(POT,p)<3.4};
const nearMonster=()=>!S.onBoat&&dist2(MOUTH,S)<6.5;
const inHouse=()=>{if(S.onBoat)return false;const l=houseL(S.x,S.z);return Math.abs(l.x)<4.6&&Math.abs(l.z)<3.7};
const nearestMap=(r)=>{let best=null,bd=r;for(const m of activeMaps()){const d=dist2(m,S.boat);if(d<bd){bd=d;best=m}}return best};

/* ---------- сообщения ---------- */
function toast(t){const d=document.createElement('div');d.textContent=t;$('toast').appendChild(d);
  setTimeout(()=>d.remove(),5500);while($('toast').children.length>5)$('toast').firstChild.remove()}
function gainXP(v,why){S.xp+=v;if(why)toast(`+${Math.round(v)} опыта: ${why}`)}
function firstTime(key,xp,why){if(!S.firsts[key]){S.firsts[key]=true;gainXP(xp,why)}}
function eat(kind){
  kind=kind||['food','angler','ray','pike','eel','perch','herring','berries','fish'].find(k=>S[k]>0);
  if(!kind||S[kind]<=0){toast('Нечего есть');return}
  const f=FOODS[kind];S[kind]--;S.sat=Math.min(100,S.sat+f.sat);if(f.buff)S.buff=180;blip(520,.12);toast(`Съел: ${f.name.toLowerCase()}`);
  if(S.inCave)S.hp=Math.min(hpMax(),S.hp+(f.heal||1));
  if(S.attacking&&S.sat>=CFG.fed){endAttack('Ты поел, и демоны отступили');S.darkT=0}
}
const held=()=>S.hot[S.sel];
function itemInfo(id){
  if(!id)return{name:'',short:'',count:0};
  if(TOOLS[id])return{name:TOOLS[id].name,short:id===S.tool?`${fmtL(S.water)} л`:`${fmtL(TOOLS[id].cap*Math.pow(1.45,S.up[id].vol)*(S.up[id].dual?2:1))} л`,count:S.have[id]?1:0};
  if(id==='axe')return{name:'Топор',short:'',count:S.axe?1:0};
  if(id==='holy')return{name:'Святая вода',short:String(S.holy),count:S.holy};
  if(id==='hose')return{name:'Шланг',short:'',count:1};
  if(id==='wood')return{name:'Дрова',short:String(S.wood),count:S.wood};
  if(id==='tmap')return{name:'Карта сокровищ',short:String(S.tmap),count:S.tmap};
  if(id==='lantern')return{name:'Фонарь',short:(S.lanternOn?'вкл ':'выкл ')+Math.round(S.lantern)+'%',count:S.have.lantern?1:0};
  if(id==='skates')return{name:'Ролики',short:S.skates.on?'надеты':'сняты',count:1};
  return{name:FOODS[id].name,short:String(S[id]),count:S[id]};
}
function selectSlot(i){S.sel=i;const h=S.hot[i];if(TOOLS[h]&&S.have[h]&&h!==S.tool){S.tool=h;S.water=Math.min(S.water,toolCap())}}
function hotAdd(id,select=false,force=false){
  let i=S.hot.indexOf(id);
  if(i<0){i=S.hot.indexOf(null);
    /* важный предмет вытесняет еду со слота, сам предмет остаётся в инвентаре */
    if(i<0&&force)i=S.hot.findIndex(h=>!TOOLS[h]&&h!=='axe'&&h!=='hose');
    if(i<0)return false;S.hot[i]=id}
  if(select)selectSlot(i);
  return true;
}
function cellsFree(it,x,y,w,h){
  if(x<0||y<0||x+w>GW||y+h>GH)return false;
  return !S.inv.some(o=>o!==it&&x<o.x+o.w&&x+w>o.x&&y<o.y+o.h&&y+h>o.y);
}
function invFind(w,h){
  for(const[a,b]of[[w,h],[h,w]])for(let y=0;y<GH;y++)for(let x=0;x<GW;x++)if(cellsFree(null,x,y,a,b))return{x,y,w:a,h:b};
  return null;
}
function invAdd(id){
  if(S.inv.some(o=>o.id===id))return true;
  const[w,h]=SHAPES[id],pos=invFind(w,h);if(!pos)return false;
  S.inv.push({id,...pos});return true;
}
function invRemove(id){S.inv=S.inv.filter(o=>o.id!==id);S.hot=S.hot.map(h=>h===id?null:h)}
/* дрова лежат стопками: новая клетка занимается, когда предыдущая набрала свой предел */
const woodCells=()=>S.inv.filter(o=>o.id==='wood').length;
function addWoodCell(){const pos=invFind(1,1);if(!pos)return false;S.inv.push({id:'wood',...pos});return true}
function syncWood(){
  const need=Math.ceil(S.wood/CFG.woodStack);
  while(woodCells()<need&&addWoodCell());
  while(woodCells()>need){const i=S.inv.map(o=>o.id).lastIndexOf('wood');S.inv.splice(i,1);if(!woodCells())S.hot=S.hot.map(h=>h==='wood'?null:h)}
  const cap=woodCells()*CFG.woodStack;if(S.wood>cap)S.wood=cap;
}
function woodIn(it){const list=S.inv.filter(o=>o.id==='wood'),i=list.indexOf(it);return Math.min(CFG.woodStack,Math.max(0,S.wood-i*CFG.woodStack))}
/* стопки сами занимают и освобождают клетку */
function invSync(){
  syncWood();
  const stacks=['berries','fish','food','holy','tmap','herring','perch','pike','eel','ray','angler'];
  for(const id of stacks)if(S[id]<=0&&S.inv.some(o=>o.id===id))invRemove(id);
  for(const id of stacks)if(S[id]>0&&!S.inv.some(o=>o.id===id)&&invAdd(id)&&id!=='wood'&&id!=='tmap'&&!FISH[id])hotAdd(id);
}
function gain(id,n=1){
  if(id==='wood'){
    while(Math.ceil((S.wood+n)/CFG.woodStack)>woodCells()&&addWoodCell());
    const take=Math.min(n,woodCells()*CFG.woodStack-S.wood);
    if(take<=0){toast('Нет места для дров: нужна свободная клетка');return false}
    S.wood+=take;if(take<n)toast('Часть дров не поместилась');return true;
  }
  if(!S.inv.some(o=>o.id===id)&&!invAdd(id)){toast('Нет места в инвентаре');return false}
  S[id]+=n;return true;
}
function openChest(){
  S.chestOpen=true;S.have.spoon=true;S.have.lantern=true;S.berries+=3;S.fish+=2;blip(500,.25,'triangle',.08);
  invAdd('spoon');invAdd('lantern');invAdd('berries');invAdd('fish');
  hotAdd('spoon',true);hotAdd('lantern');hotAdd('berries');hotAdd('fish');
  toast('В сундуке: ложка, фонарь, ягоды и рыба. Они уже на панели снизу');
}
function toggleLantern(){
  if(!S.have.lantern)return toast('Фонарь лежит в сундуке дома');
  if(!S.lanternOn&&S.lantern<=0)return toast('Фонарь разряжен: заряди его, C');
  S.lanternOn=!S.lanternOn;blip(S.lanternOn?620:320,.08,'square',.04);
}
function toggleSkates(){
  if(!S.skates.made)return toast('Ролики делаются на верстаке');
  if(S.onBoat||S.car.on)return;
  S.skates.on=!S.skates.on;blip(500,.08,'triangle',.05);toast(S.skates.on?'Ролики надеты: быстрее по земле':'Ролики сняты');
}
function chargeLantern(){
  if(!S.have.lantern)return toast('Фонарь лежит в сундуке дома');
  if(S.lantern>=100)return toast('Фонарь полный');
  if(S.shilver<CFG.lanternPrice)return toast(`Нужно ${CFG.lanternPrice} shilver`);
  S.shilver-=CFG.lanternPrice;S.lantern=Math.min(100,S.lantern+CFG.lanternStep);blip(700,.1);
}
function toggleStash(){
  const key=S.onBoat?'boat':(atBase()?'base':null);
  if(!key)return toast('Тайник есть только на базе и в лодке');
  if(S.shilver>0){S.stash[key]+=S.shilver;S.shilver=0;toast(key==='boat'?'Shilver в лодке':'Shilver на полке на базе')}
  else if(S.stash[key]>0){S.shilver=S.stash[key];S.stash[key]=0;toast('Забрал shilver')}
}
function useHoly(){
  if(S.holy<=0)return toast('Святой воды нет');
  S.holy--;S.blessedDay=S.day;if(S.attacking)endAttack('Святая вода обезвредила демонов до утра');else toast('Святая вода: этой ночью демоны не тронут');
}
function buildFire(){
  if(S.onBoat)return toast('Костёр разводят на суше');
  if(S.wood<CFG.firePrice)return toast(`Нужно ${CFG.firePrice} дров`);
  S.wood-=CFG.firePrice;addFire(S.x+S.fx*2,S.z+S.fz*2);toast('Костёр горит');
}
/* вода, до которой можно дотянуться: с лодки сразу, с берега в пределах 4,5 м */
function waterReach(){
  const p=me();
  if(S.onBoat||groundH(p.x,p.z)<S.seaY-.15)return{x:p.x,z:p.z};
  for(const r of[1.5,3,4.5])for(let i=0;i<12;i++){
    const a=i/12*6.283,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
    if(groundH(x,z)<S.seaY-.15)return{x,z};
  }
  return null;
}
function primaryAction(){
  const a=getPrimary();
  if(a)a.fn();else if(TOOLS[held()])scoopStart();
}
function chop(t){
  if(S.chopT>0)return;S.chopT=.7*Math.pow(.8,S.up.axe.grip);t.hp--;
  S.woodFrac+=1+S.up.axe.sharp*.5;const w=Math.floor(S.woodFrac);S.woodFrac-=w;if(w>0&&!gain('wood',w))S.woodFrac+=w;
  S.pourT=.15;blip(150,.09,'square',.05);t.shake=1;if(t.hp<=0)fellTree(t);
}
function scoopStart(){
  if(S.mode!=='play'||S.ui||S.scoopT>0)return;
  const w=waterReach();
  if(!w)return;
  if(!S.have[S.tool]){toast('Нечем черпать: ложка в сундуке дома');return}
  if(hotAt(w.x,w.z)){toast('Кипяток: монстр такое не пьёт. Черпай за кольцом пара');return}
  if(S.water>=toolCap()-1e-6)return toast('Тара полная');
  S.scoopT=toolScoop();blip(240,.1,'sine',.05);
}
function hoseAction(){
  const h=S.hose,rest=h.burn>0?`качает ещё ${Math.ceil(h.burn)} с, `:'';
  if(S.wood>0)return{label:`Подбросить дрова: ${rest}R забрать шланг`,fn(){S.wood--;h.burn+=CFG.hoseBurn;blip(140,.12,'square',.05)}};
  return{label:`Шланг: ${rest}дрова заставят его качать сам, R забрать`,fn(){}};
}
/* ---------- ночь ---------- */
const darkLimit=()=>CFG.darkLimit+S.sk.dark*3;
function endAttack(msg){S.attacking=false;S.bleeding=false;if(msg)toast(msg)}
function steal(){
  const order=[['water','воду'],['wood','дрова'],['berries','ягоды'],['fish','рыбу'],['food','еду'],['finds','находки'],['shilver','shilver']];
  for(const[k,n]of order){
    if(S[k]>0){const v=k==='water'?S[k]:Math.max(1,Math.ceil(S[k]*.25));S[k]=Math.max(0,S[k]-v);toast(`Демоны унесли ${n}`);blip(110,.2,'sawtooth',.05);return true}
  }
  return false;
}
function updateNight(dt){
  const night=isNight(),nf=fires.some(f=>!f.base&&dist2(f,me())<11),ab=atBase(),safe=nf||(ab&&!S.thirsty);
  const lanternOn=S.lanternOn&&S.lantern>0;
  S.safe=safe;S.lit=lanternOn||safe;
  if(!night){if(S.attacking)endAttack('Рассвет: демоны улетели');S.darkT=0;return}
  S.darkT=S.lit?0:S.darkT+dt;
  const blessed=S.blessedDay===S.day;
  if(!S.attacking&&!blessed&&!safe&&(S.darkT>=darkLimit()||S.sat<CFG.hungry)){
    S.attacking=true;S.bleeding=false;S.stealT=.6;toast('С неба падают демоны');
  }
  if(!S.attacking)return;
  if(safe)return endAttack('Ты в безопасности');
  if(!S.bleeding){
    S.stealT-=dt;
    if(S.stealT<=0){S.stealT=CFG.stealEvery;if(!steal()){S.bleeding=true;toast('Лута нет: потекла кровь')}}
    return;
  }
  const L=levelL(),nightCap=CFG.nightCapShare*L,maxDebt=S.level>0?L:0;
  const add=nightCap/CFG.bleedSeconds*dt;
  if(S.debt+add>maxDebt||S.nightBlood+add>nightCap)return faint();
  S.debt+=add;S.nightBlood+=add;
}
function newDay(){S.day++;S.t=0;S.pouredToday=false;S.nightBlood=0}
function updateClock(dt){
  const was=isNight();S.t+=dt;
  if(!was&&isNight()){
    if(!S.pouredToday&&!S.thirsty){S.thirsty=true;toast('За день зверюшка не выпила ни капли: свет щели потускнел, база не защищает')}
    toast('Наступила ночь: монстр платит вдвое больше');
  }
  if(S.t>=CFG.dayLen+CFG.nightLen){newDay();gainXP(10,'ты пережил ночь')}
}
function applyBlueprint(i){
  const L=LEVELS[i];
  if(L.tool)S.bp[L.tool]=true;
  if(L.bp==='Шланг')S.bp.hose=true;
  if(L.bp==='Тачка')S.tachka=true;
}
function craft(t){
  const[sh,w]=TOOLS[t].craft;
  if(S.shilver<sh||S.wood<w)return;
  if(!invAdd(t))return toast('Нет места в инвентаре: освободи клетки');
  S.shilver-=sh;S.wood-=w;S.have[t]=true;S.tool=t;S.water=0;blip(760,.2,'triangle',.08);
  {const old=S.hot.findIndex(h=>TOOLS[h]&&h!==t);if(S.hot.indexOf(t)<0&&S.hot.indexOf(null)<0&&old>=0)S.hot[old]=t;hotAdd(t,true)}
  toast(`Готово: ${TOOLS[t].name.toLowerCase()}`);firstTime('craft',10,'первая своя тара');
}
function craftHose(){
  if(S.shilver<CFG.hoseCost||S.wood<CFG.hoseCraftWood)return;
  if(!invAdd('hose'))return toast('Нет места в инвентаре: шлангу нужно 3 клетки подряд');
  S.shilver-=CFG.hoseCost;S.wood-=CFG.hoseCraftWood;S.hose.made=true;hotAdd('hose',false,true);blip(760,.2,'triangle',.08);toast('Шланг готов: он в инвентаре');
}
function placeHose(){
  const h=S.hose;
  h.x=S.x+S.fx*1.8;h.z=S.z+S.fz*1.8;h.placed=true;invRemove('hose');layHose();blip(300,.2,'triangle',.07);
  toast('Шланг поставлен: вливай в него воду. С дровами он качает сам, если рядом вода');
}
function takeHose(){
  const h=S.hose;
  if(!invAdd('hose'))return toast('Нет места в инвентаре: шлангу нужно 3 клетки подряд');
  h.placed=false;h.burn=0;layHose();hotAdd('hose',false,true);toast('Шланг снова в инвентаре');
}
function hoseWater(){
  const h=S.hose;
  if(groundH(h.x,h.z)<S.seaY-.15&&!hotAt(h.x,h.z))return true;
  for(const r of[3,6,9])for(let i=0;i<12;i++){const a=i/12*6.283,x=h.x+Math.cos(a)*r,z=h.z+Math.sin(a)*r;
    if(groundH(x,z)<S.seaY-.15&&!hotAt(x,z))return true}
  return false;
}
function updateHose(dt){
  const h=S.hose;if(!h.placed||h.burn<=0)return;
  h.burn=Math.max(0,h.burn-dt);h.tick+=dt;
  if(h.tick>=CFG.hoseTick||h.burn<=0){
    if(hoseWater())pour(h.tick*CFG.hoseRate,true);
    else if(!S.firsts.hoseDry){S.firsts.hoseDry=true;toast('Шланг качает впустую: рядом нет воды, переставь его ближе к морю')}
    h.tick=0;
  }
}
/* ---------- вливание ---------- */
function pour(L,viaHose=false){
  S.payFrac+=CFG.payK*Math.pow(L,CFG.payP)*(isNight()?CFG.nightPay:1);
  const pay=Math.max(1,Math.floor(S.payFrac+1e-6));S.payFrac=Math.max(0,S.payFrac-pay);
  S.shilver+=pay;S.pouredToday=true;S.bubbleT=2.2;
  {const set=PHRASES[Math.min(S.level,PHRASES.length-1)];S.thanksText=set.thanks[Math.floor(Math.random()*set.thanks.length)]}
  if(S.level<CFG.hotFromLevel)showHearts();
  gainXP(.5*Math.pow(L/.02,.25));firstTime('pour',5,'первая вода монстру');
  if(S.thirsty){S.thirsty=false;toast('Зверюшка напилась: свет щели вернулся')}
  S.mapCharge+=L/levelL();
  const toDebt=Math.min(S.debt,L);S.debt-=toDebt;L-=toDebt;
  S.meter=Math.min(levelL(),S.meter+L);
  blip(viaHose?180:320,.22,'triangle',.08);
  splash(MOUTH.x,MOUTH.z+1,5);
  showGain(pay);
  if(toDebt>0)toast('Кровавая вода: монстр платит, но шкала стоит');
  if(S.mapCharge>=CFG.mapEvery)giveMap();
}

/* ---------- новое: карты сокровищ ---------- */
function treasureSpot(){
  const rMax=170+S.level*32;
  for(let i=0;i<200;i++){
    const a=Math.random()*6.283,r=120+Math.random()*(rMax-120),x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(groundH(x,z)<-13&&!hotAt(x,z)&&Math.hypot(x,z)<395&&!activeMaps().some(m=>dist2(m,{x,z})<40))return{x,z};
  }
  return{x:190,z:-190};
}
function giveMap(){
  if(!gain('tmap'))return;
  S.mapCharge=0;S.mapN++;
  const q=treasureSpot(),m={n:S.mapN,x:Math.round(q.x),z:Math.round(q.z),done:false};
  S.maps.push(m);S.bubbleT=3.4;S.thanksText='Держи! Я нашёл на дне';
  blip(660,.18,'triangle',.08);blip(880,.22,'triangle',.06);
  showCard('Монстр отдал карту','Карта сокровищ',`${coord(m.x,m.z)}. Координаты будут сбоку, когда сядешь в лодку`,4.5);
}
function openTreasure(m){
  m.done=true;S.tmap=Math.max(0,S.tmap-1);
  const sh=Math.round((60+40*S.level)*(1+Math.random()));S.shilver+=sh;S.finds++;
  gainXP(20+S.level*8);firstTime('treasure',25,'первое сокровище');
  const roll=Math.random();let extra='';
  if(roll<.3&&gain('holy')){extra=' и святая вода';hotAdd('holy')}
  else if(roll<.7&&gain('food',2))extra=' и жареная рыба';
  else if(gain('wood',3))extra=' и дрова';
  treasChest.position.set(m.x,0,m.z);chestUp=1;
  blip(880,.2);blip(1175,.3,'triangle',.07);
  showCard('Выловлено','Сокровище!',`${sh} shilver${extra}`,4);
}
function hauling(m){startWinch('Лебёдка: сокровище',()=>openTreasure(m),()=>toast('Трос оборвался. Сундук ещё на дне, попробуй снова'))}
function dredge(w){startWinch('Лебёдка: обломки',()=>{
  w.cd=240;const sh=Math.round(20*(S.level+1)*(1+Math.random()));S.shilver+=sh;const wood=1+Math.floor(Math.random()*3);gain('wood',wood);gainXP(8+S.level*3);firstTime('dredge',12,'первые обломки');
  showCard('Поднято со дна','Обломки',`${sh} shilver и дрова: ${wood}`,3.5);blip(620,.2,'triangle',.08)},
  ()=>{w.cd=20;toast('Трос оборвался')},.8)}

/* ---------- что делает левая кнопка ---------- */
function getPrimary(){
  if(S.mode!=='play'||S.ui)return null;
  const h=held();
  if(h==='hose')return S.onBoat?null:{label:'Поставить шланг здесь',fn:placeHose};
  if(h==='axe'&&S.axe){
    const t=trees.find(t=>t.hp>0&&dist2(t,S)<3.2);
    return t&&!S.onBoat?{label:'Рубить дрова',fn(){chop(t)}}:null;
  }
  if(h==='holy'&&S.holy>0)return{label:'Использовать святую воду',fn:useHoly};
  if(h==='lantern'&&S.have.lantern)return{label:S.lanternOn?'Выключить фонарь':'Включить фонарь',fn:toggleLantern};
  if(h==='skates')return{label:S.skates.on?'Снять ролики':'Надеть ролики',fn:toggleSkates};
  if(h==='tmap'&&S.tmap>0)return{label:'Посмотреть карту',fn(){const m=activeMaps()[0];if(m)toast(`Карта ${m.n}: ${coord(m.x,m.z)}`)}};
  if(FOODS[h]&&S[h]>0)return{label:`Съесть: ${FOODS[h].name.toLowerCase()}`,fn(){eat(h)}};
  if(!TOOLS[h]||!S.have[h])return null;
  if(S.water>0){
    if(nearMonster())return{label:`Влить воду: ${fmtL(S.water)} л`,fn(){pour(S.water);S.water=0;S.pourT=.35}};
    const hs=S.hose,reach=S.onBoat?10:6;
    if(hs.placed&&dist2(hs,me())<reach)return{label:`Влить в шланг: ${fmtL(S.water)} л`,fn(){pour(S.water,true);S.water=0;S.pourT=.35}};
  }
  const w=waterReach();
  if(w&&!hotAt(w.x,w.z)&&S.water<toolCap()-1e-6)return{label:'Зачерпнуть воду',fn:scoopStart};
  return null;
}

/* ---------- что делает E ---------- */
function getAction(){
  if(S.mode!=='play'||S.ui)return null;
  if(S.inCave)return caveAction();
  if(S.car.on)return{label:'Выйти из машины',fn:leaveCar};
  const p=me();
  if(S.onBoat){
    const tm=nearestMap(CFG.treasureReach);
    if(tm)return{label:'Лебёдка: поднять сокровище',fn(){hauling(tm)}};
    const cr=crates.find(c=>c.cd<=0&&dist2(c,p)<6);
    if(cr)return{label:'Поднять ящик с кормом',fn(){pickCrate(cr)}};
    const spot=fishSpots.find(f=>f.cd<=0&&!f.dry&&dist2(f,p)<8);
    if(spot)return{label:spot.big?'Закинуть снасть: крупная рыба':'Закинуть снасть',fn(){startFishing(spot)}};
    const wr=wrecks.find(w=>w.cd<=0&&dist2(w,p)<9);
    if(wr)return{label:'Лебёдка: обшарить обломки',fn(){dredge(wr)}};
    const h=S.hose;
    if(h.placed&&dist2(h,p)<10)return hoseAction();
    for(const r of[5,7,9])for(let i=0;i<16;i++){const a=i/16*6.28,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
      if(groundH(x,z)>S.seaY-.2)return{label:'Выйти на берег',fn(){
        S.onBoat=false;S.x=x;S.z=z;S.y=Yat(x,z);S.boat.v=0;S.fx=Math.cos(a);S.fz=Math.sin(a);S.dir='down'}}}
    return null;
  }
  if(!S.chestOpen&&dist2(CHEST,S)<2.7)return{label:'Открыть сундук',fn:openChest};
  if(dist2(BENCH,S)<3.8)return{label:'Верстак: прокачать тару',fn(){openUI('bench')}};
  if(nearMonster())return{label:S.talked[Math.min(S.level,TALK.length-1)]?'Поговорить':'Поговорить: ему есть что сказать',fn:talkMonster};
  if(S.car.made&&Math.hypot(S.car.x-S.x,S.car.z-S.z)<4)return{label:'Сесть в машину',fn:enterCar};
  {const q=bridgeSpot();if(q)return{label:S.wood>=CFG.bridgeWood?`Построить мост: ${CFG.bridgeWood} дров`:`Для моста нужно дров: ${CFG.bridgeWood}`,fn(){if(S.wood>=CFG.bridgeWood)buildBridge(q)}}}
  {const raw=S.fish+fishIds.reduce((n,id)=>n+S[id],0);
    if(raw>0&&nearCook())return{label:`Пожарить рыбу: ${raw}`,fn(){let got=S.fish;S.fish=0;for(const id of fishIds){got+=S[id]*FISH[id].cook;S[id]=0}S.food+=got;blip(600,.14);toast(`Рыба готова: порций ${got}`);firstTime('cook',8,'первая готовка')}}}
  const t=trees.find(t=>t.hp>0&&dist2(t,S)<3.2);
  if(t&&!S.axe)return{label:'Нечем рубить: нужен топор',fn(){}};
  if(t&&held()!=='axe')return{label:'Чтобы рубить, выбери топор на панели',fn(){}};
  const b=bushes.find(b=>b.cd<=0&&dist2(b,S)<3);
  if(b)return{label:'Собрать ягоды',fn(){if(!gain('berries'))return;b.cd=150}};
  const d=digs.find(d=>dist2(d,S)<3.4);
  if(d)return{label:'Копать находку',fn:()=>dig(d)};
  if(S.hose.placed&&dist2(S.hose,S)<6)return hoseAction();
  {const c=CAVES.find(c=>Math.hypot(c.x-S.x,c.z+3.4-S.z)<3.6&&groundH(c.x,c.z)>S.seaY);
    if(c)return{label:S.caves[c.id]===S.day?'Пещера зачищена до завтра':`Войти: ${c.name}`,fn(){enterCave(c)}}}
  if(dist2(S.boat,S)<8.5)return{label:'Подняться на борт',fn(){S.onBoat=true;S.boat.v=0}};
  return null;
}
function pickCrate(c){
  const r=Math.random(),[id,n,txt]=r<.4?['berries',3,'ягоды']:r<.75?['fish',2,'рыба']:['food',1,'жареная рыба'];
  if(!gain(id,n))return;
  c.cd=170;blip(520,.14,'triangle',.07);toast(`В ящике: ${txt}`);firstTime('crate',6,'первый ящик в море');splash(c.x,c.z,6);
}
function dig(d){
  if(d.axe&&!invAdd('axe'))return toast('Нет места для топора: ему нужно 2 клетки');
  const bonus=20*(S.level+1);S.shilver+=bonus;S.finds++;gainXP(8);
  puff(d.x,.4,d.z,6);removeDig(d);
  if(d.axe){S.axe=true;toast(hotAdd('axe',false,true)?'Находка: топор! Он на панели снизу':'Находка: топор! Поставь его на панель в инвентаре')}
  else if(d.holy&&gain('holy')){hotAdd('holy');toast(`Находка: святая вода и ${bonus} shilver`)}else toast(`Находка: ${bonus} shilver`);
  blip(880,.2);
}

/* ---------- обморок ---------- */
function faint(){
  S.mode='faint';S.faintT=0;endAttack();S.scoopT=0;
  $('fade').textContent='Обморок';$('fade').style.opacity=1;blip(90,.8,'sawtooth',.06);
}
function updateFaint(dt){
  S.faintT+=dt;
  if(S.faintT>1.3&&!S.faintMoved){
    S.faintMoved=true;
    const toBoat=dist2(S.boat,me())<dist2(BASE,me());
    if(toBoat)S.onBoat=true;else{S.onBoat=false;S.x=BASE.x+2;S.z=BASE.z+2}
    newDay();S.t=5;S.sat=Math.max(S.sat,30);
  }
  if(S.faintT>2.2)$('fade').style.opacity=0;
  if(S.faintT>3){S.mode='play';S.faintMoved=false;$('fade').textContent='';toast(S.onBoat?'Ты очнулся в лодке':'Ты очнулся на базе')}
}

/* ---------- новое: заставка уровня. Вода падает на глазах, остров растёт, локация поднимается ---------- */
let cut=null;
const T_GROW=1.3,T_WIDE=1.5,T_FALL=2.6,T_PAN=4.9,T_FALLEND=8,T_BACK=9,T_END=11.2;
function startLevelUp(){
  S.mode='cutscene';S.scoopT=0;S.seaLocked=true;
  const loc=LOCS.find(l=>l.lv===S.level+1)||null;
  const from=S.baseSea,to=from-CFG.drop;
  /* лодка съезжает к новой кромке воды вместе с морем */
  const a=Math.atan2(S.boat.z,S.boat.x);let bt=null;
  for(let r=Math.hypot(S.boat.x,S.boat.z);r<420;r+=1){const x=Math.cos(a)*r,z=Math.sin(a)*r;if(groundH(x,z)<to-.7){bt={x,z};break}}
  cut={t:0,i:S.level,loc,from,to,seaFrom:S.seaY,boatFrom:{x:S.boat.x,z:S.boat.z},boatTo:bt,grew:false,card:false,labeled:false,rumble:false};
  document.body.classList.add('cine');blip(70,1.2,'sawtooth',.07);
  setSub('Зверёк напился');
}
function setSub(t){const e=$('subtitle');if(t){e.textContent=t;e.style.opacity=1}else e.style.opacity=0}
function cutGrow(){
  if(cut.grew)return;cut.grew=true;blip(55,1.4,'sawtooth',.09);S.monPop=1;
  const i=S.level;S.level++;S.meter=0;S.phraseI=0;S.phraseT=7;applyBlueprint(i);cut.bp=LEVELS[i];
  showHearts();puff(MOUTH.x,1.2,MOUTH.z,8);
}
function updateCutscene(dt){
  const c=cut;c.t+=dt;
  if(c.t>T_GROW)cutGrow();
  if(c.t>T_WIDE&&c.sub!==1){c.sub=1;setSub('Вода уходит')}
  if(c.t>T_FALL&&!c.rumble){c.rumble=true;rumble(T_FALLEND-T_FALL)}
  const f=smooth(T_FALL,T_FALLEND,c.t);
  S.baseSea=lerp(c.from,c.to,f);S.seaY=lerp(c.seaFrom,c.to+CFG.drop*Math.min(1,S.debt/levelL()),f);
  if(c.boatTo){S.boat.x=lerp(c.boatFrom.x,c.boatTo.x,f);S.boat.z=lerp(c.boatFrom.z,c.boatTo.z,f)}
  if(f>0&&f<1&&Math.random()<dt*14){const a=Math.random()*6.283,p=shoreAt(a);if(p)emit(A.puff,p.x,.2,p.z,0,.6,0,1,0,1.3)}
  if(c.loc&&c.t>6.1&&!c.labeled){c.labeled=true;setSub(null);$('locName').textContent=c.loc.name;$('locLabel').style.opacity=1;blip(520,.5,'triangle',.06);blip(780,.7,'triangle',.05)}
  if(c.t>T_BACK-.5)$('locLabel').style.opacity=0;
  if(c.t>T_BACK&&!c.card){c.card=true;setSub(null);
    if(c.bp&&c.bp.bp){$('cardKicker').textContent='Новый чертёж';$('cardTitle').textContent=c.bp.bp;$('cardText').textContent=c.bp.text;$('card').hidden=false}}
  if(c.t>T_END)finishCut();
}
function shoreAt(a){for(let r=10;r<200;r+=2){const x=Math.cos(a)*r,z=Math.sin(a)*r;if(groundH(x,z)<S.seaY)return{x,z}}return null}
function skipCut(){if(cut&&cut.t>1.6){cutGrow();finishCut()}}
function finishCut(){
  const c=cut;
  S.baseSea=c.to;S.seaY=seaTarget();S.seaLocked=false;
  if(c.boatTo){S.boat.x=c.boatTo.x;S.boat.z=c.boatTo.z}
  $('card').hidden=true;$('locLabel').style.opacity=0;setSub(null);document.body.classList.remove('cine');
  if(c.loc){S.opened.push(c.loc.id);if(c.loc.id==='les')addFire(c.loc.x+9,c.loc.z+7)}
  spawnDigs(c.loc);layHose();
  S.mode='play';cut=null;
  toast(c.loc?`Вода ушла. Открылось: ${c.loc.name}`:'Вода ушла, на берегу новые находки');
  gainXP(15*S.level,'новый уровень монстра');
  if(S.level===CFG.hotFromLevel)toast('Щель раскалилась: море у острова закипело. Теперь черпай за кольцом пара');
}
function spawnDigs(loc){
  if(loc){const hasAxe=loc.lv===1&&!S.axe;addDig(loc.x+2,loc.z+2,{axe:hasAxe,holy:!hasAxe})}
  /* две находки на только что обнажившемся берегу, на суше */
  for(let i=0;i<2;i++){const a=hash(S.level,i+3)*6.283;
    for(let r=20;r<300;r++){const x=Math.cos(a)*r,z=Math.sin(a)*r;
      if(groundH(x,z)<S.baseSea+.25){const k=(r-2.5)/r;addDig(x*k,z*k,{});break}}}
}

/* ---------- движение ---------- */
function slide(ox,oz,nx,nz){
  let x=nx,z=nz;
  if(Math.hypot(nx-HOUSE.x,nz-HOUSE.z)<12){
    const a=houseL(ox,oz),b=houseL(nx,nz),hit=(u,v)=>HOUSE_BOX.some(r=>u>r[0]-.3&&u<r[1]+.3&&v>r[2]-.3&&v<r[3]+.3);
    let u=b.x,v=b.z;if(hit(u,a.z))u=a.x;if(hit(u,v))v=a.z;const q=houseW(u,v);x=q.x;z=q.z;
  }
  for(const c of solids){const dx=x-c.x,dz=z-c.z,d=Math.hypot(dx,dz);if(d<c.r&&d>0){x=c.x+dx/d*c.r;z=c.z+dz/d*c.r}}
  /* в щель не упасть: ходим только по её краю */
  {const u=x-MOUTH.x,v=z-MOUTH.z,k=Math.hypot(u/3.9,v/2.4);if(k<1&&k>0){x=MOUTH.x+u/k;z=MOUTH.z+v/k}}
  return{x,z};
}
function updatePlayer(dt){
  S.moving=false;if(S.ui)return;
  const useMul=S.buff>0?.8:1,ix=(keys.KeyD?1:0)-(keys.KeyA?1:0),iz=(keys.KeyS?1:0)-(keys.KeyW?1:0),moving=!!(ix||iz);
  S.moving=moving;
  if(S.onBoat){
    /* W и S ход, A и D руль: руль слушается только на ходу */
    const b=S.boat,max=(11+S.up.boat.speed*1.8)*(S.stam>0?1:.5),thr=(keys.KeyW?1:0)-(keys.KeyS?1:0),rud=(keys.KeyA?1:0)-(keys.KeyD?1:0);
    b.v+=thr*(thr<0?5:8)*dt;b.v*=Math.pow(.42,dt);b.v=clamp(b.v,-max*.4,max);
    S.rudder=lerp(S.rudder||0,rud,Math.min(1,dt*5));
    b.h+=S.rudder*1.25*dt*(.28+Math.min(1,Math.abs(b.v)/5))*(b.v<-.2?-1:1);
    const nx=b.x+Math.sin(b.h)*b.v*dt,nz=b.z+Math.cos(b.h)*b.v*dt,fx=nx+Math.sin(b.h)*3.6*Math.sign(b.v||1),fz=nz+Math.cos(b.h)*3.6*Math.sign(b.v||1);
    if(Math.hypot(nx,nz)>405){b.v=0;if(!S.firsts.edge){S.firsts.edge=true;toast('Дальше стоит туман: карта здесь заканчивается')}}
    else if(groundH(fx,fz)>S.seaY-.5||groundH(nx,nz)>S.seaY-.5){if(Math.abs(b.v)>3)blip(90,.2,'sawtooth',.06);b.v=-b.v*.25}
    else{b.x=nx;b.z=nz}
    if(thr)S.stam=Math.max(0,S.stam-.9*useMul*Math.pow(.85,S.sk.row)*dt/(1+S.up.boat.speed*.12));
    else S.stam=Math.min(100,S.stam+1.6*dt);
  }else{
    if(S.stam<=0)S.winded=true;else if(S.stam>=15)S.winded=false;
    const running=(keys.ShiftLeft||keys.ShiftRight)&&moving&&!S.winded;S.running=running;
    const inCar=S.car.on,sp=inCar?CFG.carSpeed:5.4*(S.tachka?1.35:1)*(S.skates.on?CFG.skatesK:1)*(running?1.7*(1+S.sk.run*.08):1);
    if(S.rollT>0){
      S.rollT=Math.max(0,S.rollT-dt);
      const nx=S.x+S.rvx*dt,nz=S.z+S.rvz*dt,dNow=S.seaY-groundH(S.x,S.z),dNew=S.seaY-groundH(nx,nz);
      if(dNew<.42||dNew<dNow||bridgeAt(nx,nz)){const q=slide(S.x,S.z,nx,nz);S.x=q.x;S.z=q.z}
    }else if(moving){
      const l=Math.hypot(ix,iz),dx=ix/l,dz=iz/l;S.fx=dx;S.fz=dz;
      S.dir=Math.abs(dz)>Math.abs(dx)?(dz<0?'up':'down'):'side';if(ix)S.flip=ix<0;
      /* на обрыв лезем медленно, вниз спускаемся спокойно */
      const dy=(Yat(S.x+dx*.5,S.z+dz*.5)-Yat(S.x,S.z))/.5,climb=dy>.7?.45:1;
      const nx=S.x+dx*sp*climb*dt,nz=S.z+dz*sp*climb*dt,dNow=S.seaY-groundH(S.x,S.z),dNew=S.seaY-groundH(nx,nz);
      if(dNew<.42||dNew<dNow||bridgeAt(nx,nz)){const q=slide(S.x,S.z,nx,nz);S.x=q.x;S.z=q.z}
      S.walkT+=dt*(running?15:10.5);
    }
    if(running)S.stam=Math.max(0,S.stam-16*useMul*Math.pow(.88,S.sk.endur)*dt);
    else S.stam=Math.min(100,S.stam+(moving?5:7)*dt);
    if(meterFull()&&nearMonster())startLevelUp();
  }
  if(nearFire()||atBase())S.stam=Math.min(100,S.stam+9*dt);
  /* вода проливается, пока её несут: бегом сильнее, с лодки слабее */
  const carrying=S.onBoat?Math.abs(S.boat.v)>.3:moving;
  if(S.water>0&&carrying){
    const fill=clamp(S.water/toolCap(),0,1);
    S.water=Math.max(0,S.water-S.water*fill*spillRate()*dt*(S.onBoat?.2:S.car.on?.5:1));
    if(!S.onBoat&&Math.random()<dt*(S.running?16:8))dropFrom();
  }
}
function updateScoop(dt){
  S.chopT=Math.max(0,S.chopT-dt);
  S.pourT=Math.max(0,(S.pourT||0)-dt);
  if(S.scoopT>0){S.scoopT-=dt;if(S.scoopT<=0){S.scoopT=0;S.water=toolCap();blip(300,.08,'sine',.05);const w=waterReach();if(w&&!S.onBoat)splash(w.x,w.z,4)}}
}
function updateNeeds(dt){
  S.sat=Math.max(0,S.sat-CFG.satDecay*Math.pow(.88,S.sk.gut)*dt);S.buff=Math.max(0,S.buff-dt);S.bubbleT=Math.max(0,S.bubbleT-dt);
  if(S.firsts.pour||S.level>0){S.phraseT-=dt;if(S.phraseT<=0){S.phraseT=7;S.phraseI++}}
  if(S.lanternOn){S.lantern=Math.max(0,S.lantern-dt*CFG.lanternDrain);if(S.lantern<=0){S.lanternOn=false;toast('Фонарь погас: заряди его, C')}}
  if(S.inCave){invSync();updateHose(dt);if(S.cardT>0){S.cardT-=dt;if(S.cardT<=0)$('card').hidden=true}return}
  updateQuake(dt);
  const p=me();revealMap();invSync();updateHose(dt);
  for(const f of wrecks)if(f.cd>0)f.cd-=dt;
  for(const l of LOCS)if(!l.found&&S.opened.includes(l.id)&&Math.hypot(p.x-l.x,p.z-l.z)<l.r+22){l.found=true;gainXP(30,`открыт новый остров: ${l.name}`)}
  for(const f of fishSpots)if(f.cd>0)f.cd-=dt;
  for(const b of bushes)if(b.cd>0)b.cd-=dt;
  for(const c of crates)if(c.cd>0){c.cd-=dt;if(c.cd<=0)placeCrate(c)}
  if(S.cardT>0){S.cardT-=dt;if(S.cardT<=0)$('card').hidden=true}
}
function updateWake(dt){
  if(S.ui==='dialog')return;
  S.wakeT+=dt;
  const a=houseW(-3.3,-1.4),b=houseW(-.4,-.5),t=smooth(4.6,5.8,S.wakeT);
  S.x=lerp(a.x,b.x,t);S.z=lerp(a.z,b.z,t);S.dir=t>0&&t<1?'side':'down';S.moving=t>0&&t<1;if(S.moving)S.walkT+=dt*9;
  if(S.wakeT>4.5&&!S.wakeTxt){S.wakeTxt=true;blip(90,.5,'sawtooth',.05);say(INTRO)}
  if(S.wakeT>6){endWake()}
}
function endWake(){
  const b=houseW(-.4,-.5);S.x=b.x;S.z=b.z;S.dir='down';S.moving=false;
  S.mode='play';setSub(null);document.body.classList.remove('cine');toast('Кто-то зовёт снаружи. Что там у сундука?');
}
function updateHomeWake(dt){
  S.wakeT+=dt;
  if(S.wakeT>1.5)$('fade').style.opacity=0;
  if(S.wakeT>2.4){S.mode='play';$('fade').textContent='';$('fade').style.transition='opacity .9s';say([{who:'hero',t:'Опять дома… Как я сюда добрался? Вся добыча из пещеры пропала.'}])}
}

/* ---------- машина ---------- */
function enterCar(){S.car.on=true;S.skates.on=false;S.x=S.car.x;S.z=S.car.z;blip(180,.25,'sawtooth',.05)}
function leaveCar(){const c=S.car;c.on=false;c.x=S.x;c.z=S.z;for(const[a,b]of[[3,0],[-3,0],[0,3],[0,-3]]){const x=S.x+a,z=S.z+b;if(groundH(x,z)>S.seaY-.2){S.x=x;S.z=z;break}}}
function craftSkates(){const[sh,w]=CFG.skatesCost;if(S.shilver<sh||S.wood<w)return;if(!invAdd('skates'))return toast('Нет места в инвентаре: роликам нужно 2 клетки');
  S.shilver-=sh;S.wood-=w;S.skates.made=true;hotAdd('skates',false,true);blip(760,.2,'triangle',.08);toast('Ролики готовы: V надеть');}
function craftCar(){const[sh,w]=CFG.carCost;if(S.shilver<sh||S.wood<w)return;S.shilver-=sh;S.wood-=w;
  const c=S.car;c.made=true;c.x=BENCH.x+1;c.z=BENCH.z+6;blip(180,.5,'sawtooth',.07);toast('Машина стоит у верстака: подойди и нажми E');}

/* ---------- землетрясения и мосты ---------- */
const QUAKES=[
  [[9.5,-140],[9.5,-30],[9,-12],[9.5,0],[8.5,10],[7,22],[5,60],[2,150]],
  [[-170,46],[-70,30],[-28,25],[-6,24],[7,23]],
  [[9,-9],[40,-22],[80,-40],[170,-74]],
  [[-130,-110],[-60,-50],[-26,-18],[-24,2],[-30,16],[-70,28]],
];
function updateQuake(dt){
  if(S.shakeT>0)S.shakeT=Math.max(0,S.shakeT-dt);
  if(S.quakeFire!=null){S.quakeFire-=dt;if(S.quakeFire<=0){S.quakeFire=null;splitIsland()}return}
  if(S.level<1||S.quakes>=Math.min(S.level,QUAKES.length))return;
  S.quakeT-=dt;if(S.quakeT<=0)startQuake();
}
function startQuake(){
  if(S.quakes>=QUAKES.length||S.quakeFire!=null)return;
  S.shakeT=3;S.quakeFire=1.1;rumble(3);blip(50,1.6,'sawtooth',.1);toast('Земля дрожит!');
}
function splitIsland(){
  const pts=carveChasm(QUAKES[S.quakes],2.6);S.quakes++;S.quakeT=120+Math.random()*80;MV.sea=null;
  for(let i=0;i<pts.length;i+=4){const q=pts[i];if(Math.hypot(q[0]-CAM.x,q[1]-CAM.z)<70)emit(A.puff,q[0],.4,q[1],(Math.random()-.5)*2,2.4,(Math.random()-.5)*2,1.4,0,1.5)}
  /* герой не падает в разлом: выталкиваем на ближайшую сушу */
  if(!S.onBoat&&groundH(S.x,S.z)<S.seaY-.3){let best=null,bd=1e9;for(let r=1;r<12;r+=.5)for(let a=0;a<6.28;a+=.4){const x=S.x+Math.cos(a)*r,z=S.z+Math.sin(a)*r;if(groundH(x,z)>S.seaY&&r<bd){bd=r;best=[x,z]}}if(best){S.x=best[0];S.z=best[1]}}
  if(!S.firsts.quake){S.firsts.quake=true;say([{who:'hero',t:'Остров раскололся! Через такую щель не перепрыгнуть.'},{who:'hero',t:'Нужны дрова. Построю мост.'}])}
  else toast('Новый разлом: остров снова разделился');
}
/* место для моста: разлом перед героем, а за ним снова суша */
function bridgeSpot(){
  if(S.onBoat)return null;let best=null;
  for(let i=0;i<16;i++){
    const a=i/16*6.283,ux=Math.cos(a),uz=Math.sin(a);let start=null,end=null,deep=false;
    for(let r=.6;r<15;r+=.6){const x=S.x+ux*r,z=S.z+uz*r,h=groundH(x,z);
      if(start===null){if(r>4.2)break;if(h<S.seaY-.4)start=r}
      else{if(h<-20)deep=true;if(h>S.seaY+.05){end=r;break}}}
    if(start!==null&&end!==null&&deep){const len=end-start+1.2;if(!best||len<best.len)best={ux,uz,len,x:S.x+ux*(start+end)/2,z:S.z+uz*(start+end)/2,a:start-.6,b:end+.6}}
  }
  if(best&&bridgeAt(best.x,best.z))return null;
  return best;
}
function buildBridge(q){
  S.wood-=CFG.bridgeWood;
  const y=Math.max(Yat(S.x+q.ux*q.a,S.z+q.uz*q.a),Yat(S.x+q.ux*q.b,S.z+q.uz*q.b))+.1;
  const b={x:q.x,z:q.z,ux:q.ux,uz:q.uz,len:q.len,y};S.bridges.push(b);layBridge(b);
  blip(240,.2,'square',.06);puff(q.x,.6,q.z,5);toast('Мост построен');firstTime('bridge',12,'первый мост');
}
