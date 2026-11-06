/* Карта, управление, интерфейс и главный цикл */
/* ---------- ввод ---------- */
const keys={},MOUSE={x:innerWidth/2,y:innerHeight/2,down:false,right:false,lx:0};
function zoomCam(k){
  const key=S.onBoat?'zoomBoat':'zoomFoot',lo=S.onBoat?.7:CFG.zoomMin,hi=S.onBoat?7:CFG.zoomMax;
  S[key]=clamp(S[key]*k,lo,hi);
}
function handleKey(code){
  if(DLG.on){if(['KeyE','Space','Enter'].includes(code))dlgNext();return}
  if(S.ui==='grid'){const n=C.node.next.length;
    if(code==='KeyA'||code==='ArrowLeft'){C.pick=(C.pick+n-1)%n;drawGridNow()}
    if(code==='KeyD'||code==='ArrowRight'){C.pick=(C.pick+1)%n;drawGridNow()}
    if(['KeyE','Enter','Space'].includes(code))pickNode(C.node.next[C.pick]);
    if(code==='Escape')closeGrid();return}
  if(MG.on){if(['KeyE','Space'].includes(code))miniPress();return}
  if(S.mode==='cutscene'){if(['KeyE','Space','Enter'].includes(code))skipCut();return}
  if(S.mode==='wake'){if(['KeyE','Space','Enter'].includes(code)&&S.wakeT<4.4)S.wakeT=4.4;return}
  if(S.mode!=='play')return;
  if(code==='KeyT')return toggleUI('tree');
  if(code==='KeyI')return toggleUI('inv');
  if(code==='KeyM')return toggleUI('map');
  if(S.ui==='inv'&&/^Digit[1-4]$/.test(code)){S.invSlot=+code.slice(5)-1;renderInv();return}
  if(code==='KeyR'&&S.ui==='inv'&&drag){const t=drag.w;drag.w=drag.h;drag.h=t;dragMove(drag.px??drag.sx,drag.py??drag.sy);return}
  if(code==='KeyR'&&!S.ui&&S.hose.placed&&dist2(S.hose,me())<(S.onBoat?10:6))return takeHose();
  if(code==='Escape'&&S.ui)return closeUI();
  if(S.ui)return;
  if(code==='Equal'||code==='NumpadAdd')return zoomCam(1/1.2);
  if(code==='Minus'||code==='NumpadSubtract')return zoomCam(1.2);
  if(S.inCave){if(code==='Space')tryRoll();if(code==='KeyF')eat();if(code==='KeyL')toggleLantern();if(code==='KeyE'){const a=caveAction();if(a)a.fn()}if(/^Digit[1-4]$/.test(code))selectSlot(+code.slice(5)-1);return}
  if(code==='KeyE'){const a=getAction();if(a)a.fn()}
  if(code==='KeyF')eat();
  if(code==='Space'&&!S.onBoat)tryRoll();
  if(code==='KeyL')toggleLantern();
  if(code==='KeyC')chargeLantern();
  if(code==='KeyV')toggleSkates();
  if(code==='KeyG')toggleStash();
  if(code==='KeyH')useHoly();
  if(code==='KeyB')buildFire();
  if(/^Digit[1-4]$/.test(code))selectSlot(+code.slice(5)-1);
  if(code==='KeyN'){S.t=CFG.dayLen-4;toast('Тест: ночь через 4 секунды')}
  if(code==='KeyK'){S.meter=Math.min(levelL()*.985,S.meter+levelL()*.985);toast('Тест: шкала почти полная')}
  if(code==='KeyP'){S.shilver+=200;S.xp+=60}
  if(code==='KeyJ'){S.food+=3;S.fish+=3;S.wood+=5}
  if(code==='KeyO')giveMap();
  if(code==='KeyU'&&!S.onBoat)enterCave(CAVES[0]);
  if(code==='KeyQ')startQuake();
}
addEventListener('keydown',e=>{if(e.repeat)return;keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();handleKey(e.code)});
addEventListener('keyup',e=>{keys[e.code]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false});
canvas.addEventListener('mousedown',e=>{
  if(S.mode!=='play'||S.ui)return;
  if(e.button===2){MOUSE.right=true;MOUSE.lx=e.clientX;if(S.inCave)throwCards();return}
  if(e.button!==0)return;
  MOUSE.down=true;if(S.inCave)startAttack();else primaryAction();
});
addEventListener('mouseup',e=>{if(e.button===2)MOUSE.right=false;else MOUSE.down=false;if(MG.on)MG.on.mouse=false});
addEventListener('mousemove',e=>{MOUSE.x=e.clientX;MOUSE.y=e.clientY;if(MOUSE.right&&S.onBoat){S.lookYaw=(S.lookYaw||0)+(e.clientX-MOUSE.lx)*.006;MOUSE.lx=e.clientX}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();if(S.mode==='play'&&!S.ui)zoomCam(Math.exp(e.deltaY*.0012))},{passive:false});
$('miniC').addEventListener('mousedown',e=>{e.preventDefault();if(MG.on){MG.on.mouse=true;miniPress()}});
$('shilverL').innerHTML=INGOT+'Shilver';
$('btnTree').onclick=()=>toggleUI('tree');$('btnInv').onclick=()=>toggleUI('inv');$('btnMap').onclick=()=>toggleUI('map');
$('startBtn').onclick=()=>{initAudio();$('start').hidden=true;S.mode='wake';S.wakeT=0;document.body.classList.add('cine')};
function showCard(kicker,title,text,sec){
  $('cardKicker').textContent=kicker;$('cardTitle').textContent=title;$('cardText').textContent=text;$('card').hidden=false;S.cardT=sec;
}

/* ---------- камера ---------- */
function updateCam(dt){
  let tx=S.x,ty=S.y,tz=S.z,th=CFG.viewFoot*S.zoomFoot,tp=CFG.pitchFoot,ty2=0,fov=24,rate=5;
  if(S.mode==='start'){tx=0;tz=2;th=88;tp=1;ty=0}
  else if(S.mode==='wake'){const t=smooth(1.8,4.4,S.wakeT);tx=lerp(0,HOUSE.x,t);tz=lerp(2,HOUSE.z+1,t);th=lerp(88,CFG.viewFoot,t);tp=lerp(1,CFG.pitchFoot,t);ty=lerp(0,HY,t);rate=30}
  else if(S.mode==='cutscene'&&cut){
    const c=cut,t=c.t;rate=2.3;ty=seaVis();
    if(t<T_WIDE){tx=MOUTH.x;tz=MOUTH.z;ty=Yat(MOUTH.x,MOUTH.z);th=12;tp=CFG.pitchFoot;rate=2.6}
    else if(!c.loc?t<T_BACK:t<T_PAN){th=Math.max(62,SHORE[Math.min(S.level,7)]*2.5);tx=0;tz=2;tp=.82}
    else if(t<T_BACK){tx=c.loc.x;tz=c.loc.z;th=Math.max(58,c.loc.r*3);tp=.82}
    else{ty=S.y}
  }
  else if(S.inCave){tx=S.x*.5;tz=S.z*.42;ty=0;th=CFG.viewCave*Math.min(1.5,S.zoomFoot);rate=4}
  else if(S.onBoat){
    /* как в морских играх: камера за кормой, при отдалении поднимается */
    const b=S.boat,z=S.zoomBoat,k=smooth(1,5.5,z);
    tx=b.x+Math.sin(b.h)*(2+b.v*.25);tz=b.z+Math.cos(b.h)*(2+b.v*.25);ty=seaVis()+2.8;
    fov=42;th=21*z;tp=lerp(.27,CFG.pitchBoat,k);rate=3;
    if(!MOUSE.right)S.lookYaw=(S.lookYaw||0)*Math.pow(.25,dt);
    const want=Math.PI-b.h+(S.lookYaw||0);let dy=want-CAM.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));CAM.yaw+=dy*(1-Math.exp(-dt*3.2));
  }
  if(!S.onBoat){let dy=-CAM.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));CAM.yaw+=dy*(1-Math.exp(-dt*4));if(Math.abs(CAM.yaw)<.002)CAM.yaw=0}
  /* в узком окне камера отъезжает, чтобы по ширине было видно столько же */
  if(fov<30)th*=Math.max(1,1.15/camera.aspect);
  const k=1-Math.exp(-dt*rate);
  CAM.x+=(tx-CAM.x)*k;CAM.y+=(ty-CAM.y)*k;CAM.z+=(tz-CAM.z)*k;CAM.h+=(th-CAM.h)*k;CAM.p+=(tp-CAM.p)*k;CAM.fov+=(fov-CAM.fov)*Math.min(1,dt*3.6);
  if(Math.abs(CAM.fov-fov)<.02)CAM.fov=fov;
  const shake=S.inCave?C.shake:S.shakeT>0?Math.min(.5,S.shakeT*.3):(S.mode==='cutscene'&&cut&&cut.t>T_FALL&&cut.t<T_FALLEND?.25:0);
  if(shake){CAM.x+=Math.sin(time*57)*shake*.8;CAM.z+=Math.cos(time*49)*shake*.8}
  const boatView=CAM.fov>30;
  if(boatView!==S.boatView){S.boatView=boatView;flatMats.forEach(m=>m.depthTest=boatView)}
  applyCam();
}

/* ---------- интерфейс ---------- */
const v3=new THREE.Vector3();
function screenOf(x,y,z){
  const u=WU.uUp.value;v3.set(x+u.x*y,Yat(x,z)+u.y*y,z+u.z*y).project(camera);
  return{x:(v3.x*.5+.5)*innerWidth,y:(-v3.y*.5+.5)*innerHeight,off:Math.abs(v3.x)>1.02||Math.abs(v3.y)>1.02};
}
const monTop=()=>2.2+S.level*.75;
function updateFloats(){
  for(let i=floats.length-1;i>=0;i--){
    const f=floats[i],t=time-f.start;
    if(t>1.9||S.mode!=='play'&&S.mode!=='cutscene'){f.el.remove();floats.splice(i,1);continue}
    if(t<0)continue;
    const q=screenOf(MOUTH.x,monTop(),MOUTH.z);
    f.el.style.display=q.off?'none':'block';
    f.el.style.left=q.x+f.side+'px';
    f.el.style.top=clamp(q.y-120-t*(f.heart?120:70),70,innerHeight-120)+'px';
    f.el.style.opacity=clamp((1.9-t)/.5,0,1);
  }
}
const setT=(id,v)=>{const e=$(id);if(e.textContent!==v)e.textContent=v};
function hintText(){
  const p=me(),hot=hotAt(p.x,p.z);
  if(S.inCave)return C.chest?(C.chest.open?'Иди к двери: там выбор пути':'Зал чист: открой сундук, E'):'ЛКМ удар, удержание сильный удар, ПКМ карты, Пробел кувырок';
  if(!S.chestOpen)return 'Дверь заперта. Загляни в сундук у кровати: E';
  if(!S.doorOpen)return 'Ключ у тебя. Подойди к двери и открой её: E';
  if(meterFull())return S.onBoat?'Шкала полна: возвращайся к монстру':'Шкала полна: подойди к щели, чтобы активировать новый уровень';
  if(isNight()&&!S.lit)return S.have.lantern?(S.lantern>0?'Ты без света: включи фонарь, L':'Фонарь разряжен: заряди его, C. Или костёр B, база у дома'):'Ты без света: костёр B или база у дома';
  if(inHouse())return 'Выйди из дома и найди, кто зовёт';
  if(S.level>=1&&!S.axe)return S.onBoat?`Плыви к Отмели находки: ${coord(LOCS[0].x,LOCS[0].z)}`:'Вода ушла и открылась отмель. Поднимись на борт: E';
  if(S.bp.hose&&!S.hose.made&&S.wood>=CFG.hoseCraftWood&&S.shilver>=CFG.hoseCost)return 'Хватает на шланг: сделай его на верстаке у дома';
  if(S.hose.made&&!S.hose.placed&&held()==='hose')return 'Встань там, где нужна точка вливания, и поставь шланг: ЛКМ';
  {const need=Object.keys(S.bp).find(t=>TOOLS[t]&&!S.have[t]);
    if(need&&S.axe){const[sh,w]=TOOLS[need].craft,nm=TOOLS[need].name.toLowerCase();
      if(S.wood<w)return `Для чертежа нужны дрова: ${w}. Выбери топор и руби деревья`;
      if(S.shilver>=sh)return `Хватает на чертёж: сделай ${nm} на верстаке у дома`}}
  if(activeMaps().length&&!S.onBoat&&!S.firsts.sailed)return 'У тебя карта сокровищ. Поднимись на борт: координаты появятся сбоку';
  if(!TOOLS[held()]&&S.water<=0)return 'Чтобы черпать, выбери тару на панели: 1–4';
  if(S.water<=0){
    if(!S.onBoat){
      const w=waterReach();
      if(w)return hotAt(w.x,w.z)?'Здесь кипяток. Черпать можно за кольцом пара: с лодки или с других островов':'Зачерпни воду: ЛКМ';
      return hotOn()?'Нужна вода: садись в лодку и плыви за кольцо пара':'Зверюшка просит пить. Подойди к воде и зачерпни её';
    }
    if(hot)return 'У острова кипяток. Плыви дальше, за кольцо пара';
    return 'Зачерпни воду: ЛКМ';
  }
  return nearMonster()?'Влей воду в щель: ЛКМ':'Неси воду к щели. Вместимость растёт на верстаке у дома';
}
/* шкала воды стоит над монстром, а верхняя панель появляется, только когда его не видно */
function updateMeter(){
  const m=$('monMeter'),top=$('mon');
  const q=screenOf(MOUTH.x,monTop(),MOUTH.z),show=S.mode==='play'&&!S.inCave&&!S.ui&&!q.off&&v3.z<1&&Math.hypot(MOUTH.x-CAM.x,MOUTH.z-CAM.z)<CAM.h*1.1;
  m.style.display=show?'block':'none';top.style.display=show?'none':'block';
  if(!show)return;
  const L=levelL(),lv=LEVELS[Math.min(S.level,LEVELS.length-1)];
  m.style.left=q.x+'px';m.style.top=q.y-6+'px';
  setT('mmName',`${lv.monster}, уровень ${S.level+1}`);setT('mmNum',`${fmtL(S.meter)} / ${fmtL(L)} л`);
  $('mmBar').style.width=clamp(S.meter/L*100,0,100)+'%';$('mmDebt').style.width=clamp(S.debt/L*100,0,100)+'%';
}
function updateBubble(){
  const el=$('bubble'),p=me(),d=Math.hypot(p.x-MOUTH.x,p.z-MOUTH.z),q=screenOf(MOUTH.x,monTop(),MOUTH.z);
  if(S.mode!=='play'||S.onBoat||S.inCave||inHouse()||d>34||q.off){el.style.display='none';return}
  el.style.display='block';el.style.left=q.x+'px';el.style.top=(q.y-72)+'px';
  const set=PHRASES[Math.min(S.level,PHRASES.length-1)],kind=S.level<CFG.hotFromLevel;
  const t=S.bubbleT>0?S.thanksText:meterFull()?(kind?'Я расту! Иди ко мне':'Подойди ближе'):S.thirsty?(kind?'Пить… Почему ты ушёл?':'Где вода'):set.idle[S.phraseI%set.idle.length];
  if(el.textContent!==t)el.textContent=t;
}
/* новое: лоция сбоку, пока ты в лодке */
function updateNav(){
  const el=$('nav');
  if(!(S.onBoat&&S.mode==='play')){if(el.style.display!=='none')el.style.display='none';return}
  el.style.display='block';S.firsts.sailed=true;
  const b=S.boat,dirs=['Ю','ЮВ','В','СВ','С','СЗ','З','ЮЗ'],course=dirs[((Math.round(b.h/(Math.PI/4))%8)+8)%8];
  let h=`<h4>Лоция · курс ${course} · ${Math.round(Math.abs(b.v)*1.9)} уз</h4><div class="coord">${coord(b.x,b.z)}</div>`;
  const live=activeMaps();
  if(live.length){h+='<hr><h4>Карты сокровищ</h4>';for(const m of live){const d=dist2(m,b),here=d<CFG.treasureReach;
    h+=`<div class="row${d<32?' hot':''}"><span>${coord(m.x,m.z)}</span><small>${here?'здесь':d<32?'рядом':''}</small></div>`}}
  const open=LOCS.filter(l=>S.opened.includes(l.id));
  if(open.length){h+='<hr><h4>Места</h4>';for(const l of open)h+=`<div class="row"><span>${l.name}</span></div><div class="row"><small>${coord(l.x,l.z)}</small></div>`}
  if(el.dataset.h!==h){el.dataset.h=h;el.innerHTML=h}
}
function updateHUD(){
  const L=levelL(),lv=LEVELS[Math.min(S.level,LEVELS.length-1)];
  setT('monName',`${lv.monster}, уровень ${S.level+1}`);
  setT('monNum',`${fmtL(S.meter)} / ${fmtL(L)} л`);
  $('monBar').style.width=clamp(S.meter/L*100,0,100)+'%';
  $('debtBar').style.width=clamp(S.debt/L*100,0,100)+'%';
  const night=isNight(),left=night?CFG.dayLen+CFG.nightLen-S.t:CFG.dayLen-S.t;
  setT('clock',night?`Ночь ${S.day} · до утра ${mmss(left)}`:`День ${S.day} · до ночи ${mmss(left)}`);
  $('satBar').style.width=S.sat+'%';$('stamBar').style.width=S.stam+'%';$('lanBar').style.width=S.lantern+'%';
  setT('shilverV',String(S.shilver));setT('xpV',String(Math.floor(S.xp)));
  updateMeter();updateBubble();updateFloats();updateNav();
  setT('depth',S.level>0&&!S.inCave?`Вода ушла на ${Math.round(-visY(S.baseSea))} м ниже старого берега`:'');
  if(S.ui&&S.cardT>0){S.cardT=0;$('card').hidden=true}
  const hasT=S.have[S.tool];setT('toolName',hasT?TOOLS[S.tool].name:'Руки');setT('waterV',hasT?`${fmtL(S.water)} / ${fmtL(toolCap())} л`:'пусто');
  for(let i=0;i<4;i++){
    const h=S.hot[i],inf=itemInfo(h),el=$('hs'+i),cls='slot'+(i===S.sel?' on':'')+(h&&!inf.count?' empty':'');
    if(el.className!==cls)el.className=cls;
    setT('hn'+i,inf.name);setT('hc'+i,inf.short);
  }
  const a=getAction(),b=getPrimary(),pr=$('prompt');
  if(a||b){
    pr.style.display='block';
    const h=(b?`<span><kbd>ЛКМ</kbd>${b.label}</span>`:'')+(a?`<span><kbd>E</kbd>${a.label}</span>`:'');
    if(pr.dataset.h!==h){pr.dataset.h=h;pr.innerHTML=h}
  }else pr.style.display='none';
  setT('hint',S.mode==='play'&&!S.ui?hintText():'');
  const d=$('danger');
  if(S.attacking){d.style.display='block';
    const nightCap=CFG.nightCapShare*L;
    setT('danger',S.bleeding?`Течёт кровь: откат ${Math.round(S.nightBlood/nightCap*100)}%. К костру или на базу, либо поешь`:'Демоны уносят лут. К костру или на базу, либо поешь');
  }else if(isNight()&&!S.lit){d.style.display='block';setT('danger',`Без света: ${Math.ceil(darkLimit()-S.darkT)} с`)}
  else if(isNight()&&S.sat<CFG.hungry&&!S.safe){d.style.display='block';setT('danger','Ты голоден: демоны рядом')}
  else d.style.display='none';
  $('bloodfx').style.opacity=S.bleeding?.95:(S.attacking?.5:0);
  $('vignette').style.opacity=isNight()&&!S.lit?1:.5;
  const pg=$('progress');
  if(S.scoopT>0){pg.style.display='block';$('progBar').style.width=(1-S.scoopT/toolScoop())*100+'%'}
  else if(S.haul>0){pg.style.display='block';$('progBar').style.width=S.haul/CFG.haulTime*100+'%'}
  else pg.style.display='none';
  const m=me();setT('dist',S.hose.burn>0?`Шланг качает ещё ${Math.ceil(S.hose.burn)} с`:S.onBoat?`До монстра ${Math.round(Math.hypot(m.x-MOUTH.x,m.z-MOUTH.z))} м`:'');
  $('hud').style.display=S.mode==='start'||S.mode==='cutscene'||S.mode==='wake'?'none':'block';
  $('left').style.opacity=S.inCave?.86:1;
}

/* ---------- цикл ---------- */
function update(dt){
  updateDialog(dt);
  if(MG.on){updateMini(dt);updateNeeds(dt);updateClock(dt)}
  else if(S.mode==='play'&&S.inCave){updateClock(dt);updateNeeds(dt);if(!S.ui)updateCombat(dt)}
  else if(S.mode==='play'){updateClock(dt);updateNeeds(dt);updatePlayer(dt);updateNight(dt);updateScoop(dt)}
  else if(S.mode==='wake')updateWake(dt);
  else if(S.mode==='cutscene')updateCutscene(dt);
  else if(S.mode==='faint')updateFaint(dt);
  else if(S.mode==='wakeHome')updateHomeWake(dt);
  updateScene(dt);updateCam(dt);
}
applyCam();
{const url=heroPortrait(360).toDataURL('image/jpeg',.9);document.querySelectorAll('[data-hero]').forEach(i=>{i.src=url})}
let last=performance.now();
function frame(now){
  const dt=clamp((now-last)/1000,0,.05);last=now;
  if(!window.__paused){update(dt);adaptQuality(dt)}updateHUD();renderFrame();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* для автоматической проверки */
window.__spoon={S,CFG,LEVELS,LOCS,MOUTH,HOUSE,BENCH,POT,CHEST,houseW,mapFog,selectSlot,held,keys,handleKey,getAction,getPrimary,primaryAction,openUI,closeUI,scoopStart,seaTarget,levelL,toolCap,
  giveMap,activeMaps,DLG,dlgNext,say,talkMonster,toggleLantern,toggleSkates,startQuake,bridgeSpot,buildBridge,craftSkates,craftCar,enterCar,leaveCar,syncWood,woodCells,gain,pickNode,openGrid,openRoomChest,drawGridNow,groundH,shorePoint,startLevelUp,skipCut,trees,digs,crates,cam:CAM,cutT:()=>cut&&cut.t,CAVES,C,MG,MV,enterCave,leaveCave,fishSpots,wrecks,startFishing,startMini,endMini,miniPress,tryRoll,startAttack,throwCards,MOUSE,zoomCam,Yat,objs,
  step(sec,dt=.05){for(let t=0;t<sec;t+=dt)update(dt);updateHUD();renderFrame()},
  teleport(x,z){if(S.onBoat){S.boat.x=x;S.boat.z=z}else{S.x=x;S.z=z}CAM.x=x;CAM.z=z}};
