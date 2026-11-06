/* Пещеры и бой. Цепочка залов: зачистил зал, открылись двери, выбрал следующую награду.
   Удары когтями сериями, тяжёлый удар при удержании, карты на азарте, кувырок с неуязвимостью */
const C={rooms:0,i:0,enemies:[],shots:[],picks:[],fx:[],doors:[],clear:false,cave:null,solids:[],stop:0,shake:0,torches:[],reward:null,trans:0,boss:null,lv:0,back:null};
const caveFloor=new THREE.Mesh(flatGeo,regFlat(makeMat(A.dig.tex,true)));caveFloor.renderOrder=-20;caveG.add(caveFloor);
const caveWall=new THREE.Mesh(spriteGeo,makeMat(A.dig.tex,false));caveWall.renderOrder=-15;caveG.add(caveWall);
const caveFront=new THREE.Mesh(spriteGeo,makeMat(A.dig.tex,false,{depth:false}));caveFront.renderOrder=50;caveG.add(caveFront);
const slashMats=A.slash.map(a=>regFlat(makeMat(a.tex,true,{glow:1,op:0})));
const slashM=new THREE.Mesh(flatGeo,slashMats[0]);slashM.renderOrder=-3;slashM.visible=false;caveG.add(slashM);
const slamMat=regFlat(makeMat(A.slam.tex,true,{glow:1,op:0})),slamM=new THREE.Mesh(flatGeo,slamMat);slamM.renderOrder=-3;slamM.visible=false;caveG.add(slamM);
const aimMat=regFlat(makeMat(A.ring.tex,true,{op:.5,glow:1})),aimM=new THREE.Mesh(flatGeo,aimMat);aimM.renderOrder=-4;aimM.visible=false;caveG.add(aimM);
const caveCache=new Map();
function caveArt(lv){const k=lv%8;if(!caveCache.has(k))caveCache.set(k,{floor:artCaveFloor(k),wall:artCaveWall(k),front:artCaveFront(k),pillar:artPillar(k)});return caveCache.get(k)}
const ENEMY={grub:{hp:3,speed:2.4,r:1.1,scale:1},spitter:{hp:3,speed:1.7,r:1,scale:1},hopper:{hp:4,speed:0,r:1,scale:1},brute:{hp:24,speed:1.5,r:2,scale:1}};
const hurtK=()=>1+C.lv*.35;
function clearRoom(){
  for(const e of C.enemies)removeEnemy(e);for(const s of C.shots)caveG.remove(s.m);for(const p of C.picks)caveG.remove(p.m);
  for(const f of C.fx)caveG.remove(f);for(const d of C.doors){caveG.remove(d.m);if(d.icon)caveG.remove(d.icon)}for(const t of C.torches)caveG.remove(t.m);
  C.enemies=[];C.shots=[];C.picks=[];C.fx=[];C.doors=[];C.torches=[];C.solids=[];C.boss=null;
}
const inCaveG=fn=>{const p=parentG;parentG=caveG;const r=fn();parentG=p;return r};
function buildRoom(){
  clearRoom();
  const lv=C.lv,set=caveArt(lv),boss=C.i===C.rooms-1;
  C.clear=false;
  caveFloor.material.uniforms.map.value=set.floor.tex;caveFloor.scale.set(32,1,21);caveFloor.position.set(0,0,0);
  caveWall.material.uniforms.map.value=set.wall.tex;caveWall.position.set(0,0,-ROOM.d/2-.3);caveWall.scale.set(32,9,1);
  caveFront.material.uniforms.map.value=set.front.tex;caveFront.scale.set(36,5,1);
  inCaveG(()=>{
    for(const x of[-11,11,-5.5,5.5]){const m=spr(A.torch[0],x,-ROOM.d/2+.1,1.1,false,makeMat(A.torch[0].tex,false,{glow:.8}),0);C.torches.push({m,x,z:-ROOM.d/2+.6,ph:x})}
    const n=boss?0:1+Math.floor(hash(C.i,lv+2)*3);
    for(let i=0;i<n;i++){const x=(hash(i,C.i+7)-.5)*ROOM.w*.74,z=(hash(i,C.i+9)-.5)*ROOM.d*.6;if(Math.hypot(x,z-ROOM.d/2)<5)continue;
      const m=spr(set.pillar,x,z,.8,false,undefined,0);C.fx.push(m);C.solids.push({x,z,r:1.3})}
    for(let i=0;i<24;i++){const x=(hash(i,C.i+3)-.5)*ROOM.w,z=(hash(i,C.i+5)-.5)*ROOM.d,k=hash(i,11);
      const a=k<.3?A.glow:k<.55?A.skull:k<.8?A.mush:A.shell;const m=spr(a,x,z,.8,i%2===0,undefined,0);C.fx.push(m)}
  });
  C.fx.push(C.doorM=inCaveG(()=>spr(A.door,0,-ROOM.d/2+.2,1,false,undefined,0)));C.chest=null;
  if(boss){spawnEnemy('brute',0,-2);$('bossName').textContent=`Страж пещеры`;C.boss=C.enemies[0]}
  else{
    const n=Math.min(7,2+Math.floor(lv*.6)+Math.floor(C.i*.7));
    for(let i=0;i<n;i++){
      const pool=lv===0&&C.i<1?['grub']:lv<1?['grub','grub','spitter']:['grub','spitter','hopper'];
      const t=pool[Math.floor(Math.random()*pool.length)];
      let x,z,k=0;do{x=(Math.random()-.5)*(ROOM.w-5);z=(Math.random()-.5)*(ROOM.d-4);k++}while(Math.hypot(x-S.x,z-S.z)<8&&k<20);
      spawnEnemy(t,x,z);
    }
  }
  updateRoomDots();
}
function spawnEnemy(t,x,z){
  const D=ENEMY[t],f=A.en[t],mats=f.map(a=>makeMat(a.tex,false));
  const m=inCaveG(()=>spr(f[0],x,z,1,false,mats[0],0)),sh=inCaveG(()=>flat(A.shadow,x,z,f[0].w*.8,f[0].w*.32,.04,undefined,-5,0));
  const e={t,x,z,hp:D.hp*hurtK(),max:D.hp*hurtK(),m,sh,mats,f,fr:0,st:'spawn',tm:.55,flash:0,kx:0,kz:0,cd:1+Math.random()*1.2,y:0,dx:0,dz:0,r:D.r};
  m.scale.y=.01;C.enemies.push(e);return e;
}
function removeEnemy(e){caveG.remove(e.m);caveG.remove(e.sh);for(const q of e.mats)q.dispose()}
function enterCave(c){
  if(S.caves[c.id]===S.day)return toast('Пещера зачищена: новые твари придут завтра');
  C.cave=c;C.lv=c.lv;C.rooms=4+Math.floor(c.lv/2);C.i=0;C.back={x:S.x,z:S.z+4};
  C.graph=makeGraph(C.rooms);C.node=C.graph[0][0];C.node.seen=true;
  S.run={sh:0,hp:0,dmg:0};S.inCave=true;S.onBoat=false;S.hp=hpMax();S.azart=40;
  worldG.visible=false;caveG.visible=true;sky.visible=false;
  S.x=0;S.z=ROOM.d/2-2.6;S.dir='up';S.scoopT=0;S.y=0;
  flatMats.forEach(m=>m.depthTest=false);
  buildRoom();CAM.x=0;CAM.z=0;CAM.y=0;CAM.yaw=0;CAM.fov=24;CAM.p=CFG.pitchFoot;
  $('combatHud').style.display='flex';$('caveMini').style.display='block';$('dev').style.display='none';drawGraph($('miniMap'),false);
  toast(c.name);blip(110,.6,'sawtooth',.06);
}
function leaveCave(cleared){
  const c=C.cave;clearRoom();S.inCave=false;worldG.visible=true;caveG.visible=false;sky.visible=true;
  S.x=C.back.x;S.z=C.back.z;S.y=Yat(S.x,S.z);S.dir='down';
  $('combatHud').style.display='none';$('bossBar').style.display='none';$('caveMini').style.display='none';$('dev').style.display='';
  const loot=S.run.sh;
  if(cleared){S.shilver+=loot;S.caves[c.id]=S.day;gainXP(25+c.lv*15,'пещера зачищена');showCard('Пещера пройдена',c.name,`Добыча: ${loot} shilver`,4)}
  else{
    /* смерть: вся добыча пещеры пропадает, герой просыпается дома, а корабль оказывается у родного берега */
    const q=houseW(-1.9,-.9);S.x=q.x;S.z=q.z;S.y=Yat(q.x,q.z);
    if(c.lv>0){const p=shorePoint(1.5,20);if(p){S.boat.x=p.x;S.boat.z=p.z;S.boat.v=0}}
    S.mode='wakeHome';S.wakeT=0;$('fade').style.transition='opacity .2s';$('fade').textContent='Обморок';$('fade').style.opacity=1;
  }
  S.run=null;S.hp=hpMax();S.atkT=0;S.rollT=0;S.chargeT=0;S.hurtT=0;S.iframe=0;CAM.x=S.x;CAM.z=S.z;CAM.y=S.y;C.cave=null;objBusy=true;
}
function updateRoomDots(){
  let h='';for(let i=0;i<C.rooms;i++)h+=`<i class="${i<C.i?'done':i===C.i?'now':''}${i===C.rooms-1?' boss':''}"></i>`;
  $('roomDots').innerHTML=h;
}

/* ---------- прицел мышью ---------- */
const ray=new THREE.Vector3();
function aimPoint(){
  ray.set(MOUSE.x/innerWidth*2-1,-(MOUSE.y/innerHeight)*2+1,.5).unproject(camera).sub(camera.position).normalize();
  const t=-camera.position.y/ray.y;return{x:camera.position.x+ray.x*t,z:camera.position.z+ray.z*t};
}
function aimDir(){
  const p=aimPoint();let dx=p.x-S.x,dz=p.z-S.z,d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
  /* лёгкое наведение на ближайшую цель в конусе */
  let best=null,bd=9;for(const e of C.enemies){if(e.st==='spawn')continue;const ex=e.x-S.x,ez=e.z-S.z,l=Math.hypot(ex,ez)||1;if(l<bd&&(ex*dx+ez*dz)/l>.72){bd=l;best=[ex/l,ez/l]}}
  return best||[dx,dz];
}
const faceTo=(dx,dz)=>{S.dir=Math.abs(dz)>Math.abs(dx)?(dz<0?'up':'down'):'side';if(dx)S.flip=dx<0};

/* ---------- удары ---------- */
const ATK=[{t:.27,hit:.1,dmg:1,reach:3.1,arc:1.15,lunge:7},{t:.27,hit:.1,dmg:1,reach:3.1,arc:1.15,lunge:7},{t:.42,hit:.16,dmg:2.2,reach:3.6,arc:1.35,lunge:10}];
const dmgK=()=>(1+S.sk.claw*.25)+(S.run?S.run.dmg*.4:0);
function startAttack(){
  if(S.atkT>0||S.rollT>0)return;
  const[dx,dz]=aimDir();S.ax=dx;S.az=dz;faceTo(dx,dz);
  const i=(C.comboT>0?C.combo+1:0)%3;C.combo=i;const a=ATK[i];
  S.atkT=a.t;S.atkDur=a.t;C.hitAt=a.t-a.hit;C.struck=false;S.lvx=dx*a.lunge;S.lvz=dz*a.lunge;C.comboT=.5;
  slashM.material=slashMats[i===2?1:0];slashM.position.set(S.x+dx*1.7,.12,S.z+dz*1.7);slashM.rotation.y=Math.atan2(-dx,-dz)+(i===1?Math.PI:0);slashM.scale.set(i===2?5.6:4.6,1,i===2?3.4:2.8);slashM.visible=true;slashM.material.uniforms.uOp.value=.6;
  blip(i===2?260:340,.08,'sawtooth',.05);
}
function strike(a){
  for(const e of C.enemies){if(e.st==='spawn'||e.dead)continue;const ex=e.x-S.x,ez=e.z-S.z,d=Math.hypot(ex,ez);
    if(d<a.reach+e.r*.5&&(d<1.2||Math.acos(clamp((ex*S.ax+ez*S.az)/d,-1,1))<a.arc)){hitEnemy(e,a.dmg*dmgK(),S.ax,S.az,a.dmg>2?10:7)}}
}
function heavy(){
  S.atkT=.34;S.atkDur=.34;C.hitAt=-1;C.chargeHit=true;
  slamM.position.set(S.x,.12,S.z);slamM.scale.set(9,1,9);slamM.visible=true;slamMat.uniforms.uOp.value=1;C.shake=.32;C.stop=.08;blip(90,.3,'sawtooth',.09);
  for(const e of C.enemies){if(e.st==='spawn'||e.dead)continue;const ex=e.x-S.x,ez=e.z-S.z,d=Math.hypot(ex,ez)||1;if(d<4.6+e.r*.5)hitEnemy(e,3.4*dmgK(),ex/d,ez/d,13)}
}
function throwCards(){
  const cost=Math.max(15,30-S.sk.deck*5);if(S.azart<cost){toast('Мало азарта: бей когтями');return}
  S.azart-=cost;const[dx,dz]=aimDir();faceTo(dx,dz);S.atkT=.2;S.atkDur=.2;C.hitAt=-1;blip(760,.08,'triangle',.06);
  for(const k of[-.22,0,.22]){const c=Math.cos(k),s=Math.sin(k);addShot(S.x+dx*1.2,S.z+dz*1.2,(dx*c-dz*s)*19,(dx*s+dz*c)*19,true)}
}
function addShot(x,z,vx,vz,mine){
  const a=mine?A.card:A.orb[C.lv>3?1:0],m=inCaveG(()=>spr(a,x,z,mine?1:1.1,false,makeMat(a.tex,false,{glow:1}),.9));
  C.shots.push({x,z,vx,vz,m,mine,life:mine?.9:5.5});
}
function hitEnemy(e,dmg,dx,dz,kb){
  e.hp-=dmg;e.flash=1;C.struck=true;e.kx=dx*kb;e.kz=dz*kb;C.stop=Math.max(C.stop,.055);C.shake=Math.max(C.shake,.1);
  S.azart=Math.min(100,S.azart+6);blip(190+Math.random()*80,.07,'square',.05);
  emit(A.drop,e.x,1,e.z,dx*5,3,dz*5,.4,10,1.4,true);
  if(e.st==='wind'&&e.t!=='brute'){e.st='rest';e.tm=.5}
  if(e.hp<=0)killEnemy(e,dx,dz);
}
function killEnemy(e,dx,dz){
  e.dead=true;removeEnemy(e);C.enemies.splice(C.enemies.indexOf(e),1);C.stop=.09;C.shake=.2;blip(110,.2,'sawtooth',.07);
  C.fx.push(inCaveG(()=>flat(A.splat[e.t==='spitter'?1:0],e.x,e.z,e.t==='brute'?7:3,e.t==='brute'?4.4:2,.03,undefined,-6,0)));
  for(let i=0;i<7;i++)emit(A.puff,e.x,.8,e.z,(Math.random()-.5)*5+dx*3,Math.random()*3,(Math.random()-.5)*4+dz*3,.5,0,.8,true);
  const n=e.t==='brute'?10:1+Math.floor(Math.random()*3);
  for(let i=0;i<n;i++)addPick('ingot',e.x+(Math.random()-.5)*1.6,e.z+(Math.random()-.5)*1.2);
  if(Math.random()<.18)addPick('heart',e.x,e.z);
  if(e===C.boss){$('bossBar').style.display='none';C.boss=null}
  if(!C.enemies.length)roomCleared();
}
function addPick(kind,x,z){const a=kind==='heart'?A.heart:A.ingot,m=inCaveG(()=>spr(a,x,z,1,false,undefined,.2));C.picks.push({kind,x,z,m,vy:5,y:.2,t:0})}
const REWARD={shilver:{label:'Добыча',art:'ingot'},heart:{label:'Здоровье',art:'heart'},food:{label:'Корм',art:'crate'},map:{label:'Карта сокровищ',art:'treasure'},buff:{label:'Карта удачи',art:'card'}};
/* бой окончен: посреди зала появляется сундук с наградой этой комнаты */
function roomCleared(){
  C.clear=true;blip(520,.3,'triangle',.07);
  const boss=C.i>=C.rooms-1,x=0,z=-1.6,s=boss?1.5:1.15;
  const m=inCaveG(()=>spr(A.treasure,x,z,s,false,makeMat(A.treasure.tex,false,{glow:.25}),0));C.fx.push(m);
  C.chest={x,z,m,s,open:false,boss};puff(x,.6,z,8);C.shake=Math.max(C.shake,.12);
}
function openRoomChest(){
  const c=C.chest;if(!c||c.open)return;c.open=true;
  c.m.material=sharedMat(A.chestO,false);c.m.scale.set(A.chestO.w*c.s*1.3,A.chestO.h*c.s*1.3,1);
  blip(880,.2,'triangle',.08);blip(1175,.3,'triangle',.06);
  const type=C.node.type;
  for(let i=0;i<(c.boss?16:type==='shilver'?8:3);i++)addPick('ingot',c.x+(Math.random()-.5)*3,c.z+1+Math.random()*2);
  if(type==='heart')for(let i=0;i<3;i++)addPick('heart',c.x+(i-1)*1.2,c.z+1.6);
  if(type==='food'&&gain('food',2))toast('В сундуке еда');
  if(type==='map')giveMap();
  if(type==='buff'){if(Math.random()<.5){S.run.dmg++;toast('Карта удачи: удары сильнее до конца пещеры')}else{S.run.hp+=2;S.hp+=2;toast('Карта удачи: лишнее сердце до конца пещеры')}}
  if(c.boss&&Math.random()<.5)giveMap();
  C.doorM.material=sharedMat(A.doorO,false);
  C.doors.push({x:0,z:-ROOM.d/2+1.6,exit:c.boss});
}
function caveAction(){
  const c=C.chest;
  if(c&&!c.open&&Math.hypot(S.x-c.x,S.z-c.z)<3.2)return{label:c.boss?'Открыть большой сундук':'Открыть сундук',fn:openRoomChest};
  return null;
}
/* сетка пути: ярусы снизу вверх, из комнаты ведут одна или две дорожки */
const NODE_ICON={shilver:'ingot',heart:'heart',food:'crate',map:'treasure',buff:'card',boss:'skull'};
const NODE_NAME={shilver:'Добыча: много shilver',heart:'Здоровье',food:'Корм',map:'Карта сокровищ',buff:'Карта удачи',boss:'Страж пещеры'};
function makeGraph(n){
  const pool=['shilver','shilver','heart','food','buff','map'],layers=[];
  for(let i=0;i<n;i++){
    const count=i===0||i===n-1?1:2+(Math.random()<.5?1:0),row=[];
    for(let k=0;k<count;k++)row.push({i,k,count,next:[],seen:false,type:i===n-1?'boss':i===0?'shilver':pool[Math.floor(Math.random()*pool.length)]});
    layers.push(row);
  }
  for(let i=0;i<n-1;i++){const a=layers[i],b=layers[i+1];
    a.forEach((p,k)=>{const q=Math.round(k/(Math.max(1,a.length-1))*(b.length-1));p.next.push(b[q]);const alt=b[q+(Math.random()<.5?1:-1)];if(alt&&!p.next.includes(alt))p.next.push(alt)});
    b.forEach((q,k)=>{if(!a.some(p=>p.next.includes(q)))a[Math.round(k/Math.max(1,b.length-1)*(a.length-1))].next.push(q)});
  }
  return layers;
}
function nodePos(nd,W,H,pad){const rows=C.graph.length,y=H-pad-(H-pad*2)*nd.i/Math.max(1,rows-1),x=W/2+(nd.k-(nd.count-1)/2)*(W-pad*2)/2.2;return[x,y]}
function drawGraph(c,big){
  const g=c.getContext('2d'),W=c.width,H=c.height,pad=big?54:44,R0=big?30:26;g.clearRect(0,0,W,H);
  const nexts=C.node?C.node.next:[];
  for(const row of C.graph)for(const n of row)for(const q of n.next){const[a,b]=nodePos(n,W,H,pad),[x,y]=nodePos(q,W,H,pad),on=n===C.node;
    g.strokeStyle=on?'#ffd65a':n.seen&&q.seen?'#c7a86a':'rgba(236,226,201,.28)';g.lineWidth=on?5:3;g.setLineDash(on?[]:[9,8]);g.beginPath();g.moveTo(a,b);g.lineTo(x,y);g.stroke()}
  g.setLineDash([]);
  for(const row of C.graph)for(const n of row){
    const[x,y]=nodePos(n,W,H,pad),here=n===C.node,can=nexts.includes(n),sel=big&&can&&nexts[C.pick]===n;n.px=x;n.py=y;
    g.globalAlpha=n.seen||can?1:.5;
    g.fillStyle=here?'#3a2a50':n.seen?'#2a2230':'#1d1420';g.strokeStyle=sel?'#ffffff':here?'#ff8a5a':can?'#ffd65a':'rgba(236,226,201,.4)';g.lineWidth=sel?6:here||can?4:2;
    g.beginPath();g.arc(x,y,R0+(sel?4:0),0,6.3);g.fill();g.stroke();
    const a=A[NODE_ICON[n.type]],k=R0*1.3/Math.max(a.c.width,a.c.height);g.drawImage(a.c,x-a.c.width*k/2,y-a.c.height*k/2,a.c.width*k,a.c.height*k);
    g.globalAlpha=1;
    if(here){g.fillStyle='#ff8a5a';g.font='700 '+(big?18:17)+'px Georgia,serif';g.textAlign='center';g.fillText('ты здесь',x,y+R0+(big?22:21))}
  }
}
function openGrid(){
  C.pick=0;S.ui='grid';S.moving=false;$('caveGrid').hidden=false;drawGridNow();
}
function drawGridNow(){drawGraph($('gridC'),true);const n=C.node.next[C.pick];$('gridInfo').textContent=n?NODE_NAME[n.type]:''}
function closeGrid(){$('caveGrid').hidden=true;S.ui=null;S.z=Math.min(S.z+2.2,ROOM.d/2-1)}
function pickNode(n){
  $('caveGrid').hidden=true;S.ui=null;C.node=n;n.seen=true;C.nextDoor={x:0};C.trans=.3;blip(520,.14,'triangle',.06);
  $('fade').style.transition='opacity .15s';$('fade').style.opacity=1;
}
$('gridC').addEventListener('click',e=>{
  const c=$('gridC'),b=c.getBoundingClientRect(),x=(e.clientX-b.left)*c.width/b.width,y=(e.clientY-b.top)*c.height/b.height;
  const n=C.node.next.find(q=>Math.hypot(q.px-x,q.py-y)<46);if(n)pickNode(n);
});
$('gridC').addEventListener('mousemove',e=>{
  const c=$('gridC'),b=c.getBoundingClientRect(),x=(e.clientX-b.left)*c.width/b.width,y=(e.clientY-b.top)*c.height/b.height;
  const i=C.node.next.findIndex(q=>Math.hypot(q.px-x,q.py-y)<46);if(i>=0&&i!==C.pick){C.pick=i;drawGridNow()}
});
function nextRoom(door){
  if(door.exit)return leaveCave(true);
  openGrid();
}
function hurtPlayer(n,fromX,fromZ){
  if(S.iframe>0||S.rollT>0||!S.inCave)return;
  S.hp-=n;S.iframe=1.1;S.hurtT=.25;C.shake=.34;C.stop=.1;blip(150,.2,'sawtooth',.08);
  const dx=S.x-fromX,dz=S.z-fromZ,d=Math.hypot(dx,dz)||1;S.lvx=dx/d*11;S.lvz=dz/d*11;
  if(S.hp<=0){S.hp=0;leaveCave(false)}
}

/* ---------- поведение тварей ---------- */
function moveEnemy(e,vx,vz,dt){
  e.x=clamp(e.x+vx*dt,-ROOM.w/2+1.5,ROOM.w/2-1.5);e.z=clamp(e.z+vz*dt,-ROOM.d/2+1.5,ROOM.d/2-1);
  for(const s of C.solids){const dx=e.x-s.x,dz=e.z-s.z,d=Math.hypot(dx,dz);if(d<s.r+.6&&d>0){e.x=s.x+dx/d*(s.r+.6);e.z=s.z+dz/d*(s.r+.6)}}
}
function updateEnemy(e,dt){
  e.flash=Math.max(0,e.flash-dt*7);e.tm-=dt;e.cd-=dt;
  const dx=S.x-e.x,dz=S.z-e.z,d=Math.hypot(dx,dz)||1,ux=dx/d,uz=dz/d;
  if(e.kx||e.kz){moveEnemy(e,e.kx,e.kz,dt);const k=Math.pow(.005,dt);e.kx*=k;e.kz*=k;if(Math.abs(e.kx)+Math.abs(e.kz)<.2)e.kx=e.kz=0}
  if(e.st==='spawn'){if(e.tm<=0){e.st='idle';e.tm=.3}}
  else if(e.t==='grub'){
    if(e.st==='idle'){moveEnemy(e,ux*ENEMY.grub.speed,uz*ENEMY.grub.speed,dt);if(d<6&&e.cd<=0){e.st='wind';e.tm=.55;e.dx=ux;e.dz=uz}}
    else if(e.st==='wind'){if(e.tm<=0){e.st='lunge';e.tm=.42;blip(240,.1,'square',.05)}}
    else if(e.st==='lunge'){moveEnemy(e,e.dx*11,e.dz*11,dt);if(e.tm<=0){e.st='rest';e.tm=.7;e.cd=1.2}}
    else if(e.tm<=0)e.st='idle';
  }else if(e.t==='spitter'){
    if(e.st==='idle'){const want=d<6?-1:d>11?1:0;moveEnemy(e,ux*want*ENEMY.spitter.speed,uz*want*ENEMY.spitter.speed,dt);if(e.cd<=0){e.st='wind';e.tm=.7}}
    else if(e.st==='wind'){if(e.tm<=0){for(const k of[-.32,0,.32]){const c=Math.cos(k),s=Math.sin(k);addShot(e.x,e.z,(ux*c-uz*s)*7,(ux*s+uz*c)*7,false)}blip(420,.1,'triangle',.05);e.st='idle';e.cd=2.2+Math.random()}}
  }else if(e.t==='hopper'){
    if(e.st==='idle'&&e.cd<=0){e.st='jump';e.tm=.75;e.sx=e.x;e.sz=e.z;e.tx=clamp(S.x,-ROOM.w/2+2,ROOM.w/2-2);e.tz=clamp(S.z,-ROOM.d/2+2,ROOM.d/2-2)}
    else if(e.st==='jump'){const t=1-e.tm/.75;e.x=lerp(e.sx,e.tx,t);e.z=lerp(e.sz,e.tz,t);e.y=Math.sin(t*3.14)*4.4;
      if(e.tm<=0){e.y=0;e.st='rest';e.tm=.7;e.cd=1.1;C.shake=Math.max(C.shake,.12);for(let i=0;i<6;i++){const a=i/6*6.28;emit(A.puff,e.x,.3,e.z,Math.cos(a)*5,.4,Math.sin(a)*3,.4,0,.8,true)}if(Math.hypot(S.x-e.x,S.z-e.z)<2.6)hurtPlayer(1,e.x,e.z)}}
    else if(e.st==='rest'&&e.tm<=0)e.st='idle';
  }else{
    /* страж: рывок, кольцо снарядов, вызов слепышей */
    if(e.st==='idle'){moveEnemy(e,ux*1.5,uz*1.5,dt);if(e.cd<=0){const r=Math.random();e.act=r<.45?'dash':r<.8?'ring':'call';e.st='wind';e.tm=e.act==='dash'?.8:.7;e.dx=ux;e.dz=uz}}
    else if(e.st==='wind'){if(e.tm<=0){
      if(e.act==='dash'){e.st='dash';e.tm=.8}
      else if(e.act==='ring'){const n=14;for(let i=0;i<n;i++){const a=i/n*6.283;addShot(e.x,e.z,Math.cos(a)*7.5,Math.sin(a)*7.5,false)}e.st='rest';e.tm=.9;e.cd=1.6}
      else{if(C.enemies.length<5){spawnEnemy('grub',e.x-3,e.z+2);spawnEnemy('grub',e.x+3,e.z+2)}e.st='rest';e.tm=.9;e.cd=2}}}
    else if(e.st==='dash'){moveEnemy(e,e.dx*14,e.dz*14,dt);if(e.tm<=0||Math.abs(e.x)>ROOM.w/2-2.4||Math.abs(e.z)>ROOM.d/2-2.2){e.st='rest';e.tm=1.2;e.cd=1.2;C.shake=.24}}
    else if(e.tm<=0)e.st='idle';
  }
  if(e.st!=='spawn'&&e.st!=='jump'&&e.y<.1&&d<e.r+.5)hurtPlayer(e.t==='brute'?2:1,e.x,e.z);
  /* вид */
  e.fr=(e.st==='wind'||Math.floor(time*6+e.x)%2)?1:0;
  const mat=e.mats[e.fr];e.m.material=mat;mat.uniforms.uFlash.value=e.st==='wind'?(.35+.35*Math.sin(time*30)):e.flash;
  const f=e.f[0],sq=e.st==='spawn'?clamp(1-e.tm/.55,.01,1):e.st==='wind'?.9:1;
  e.m.position.set(e.x,e.y,e.z);e.m.scale.set(f.w*(dx<0?1:-1)*(e.t==='grub'?-1:1)*(2-sq),f.h*sq,1);
  e.sh.position.set(e.x,.05,e.z);e.sh.scale.set(f.w*.8*(1-Math.min(.6,e.y*.1)),1,f.w*.32*(1-Math.min(.6,e.y*.1)));
}
function updateShots(dt){
  for(let i=C.shots.length-1;i>=0;i--){
    const s=C.shots[i];s.life-=dt;s.x+=s.vx*dt;s.z+=s.vz*dt;s.m.position.set(s.x,.9,s.z);let gone=s.life<=0||Math.abs(s.x)>ROOM.w/2-.6||Math.abs(s.z)>ROOM.d/2-.4;
    if(s.mine){for(const e of C.enemies){if(e.st==='spawn')continue;if(Math.hypot(e.x-s.x,e.z-s.z)<e.r+.3){hitEnemy(e,(1.6+S.sk.deck*.5)*(1+S.sk.claw*.1),s.vx/19,s.vz/19,5);gone=true;break}}}
    else if(Math.hypot(S.x-s.x,S.z-s.z)<.8){hurtPlayer(1,s.x,s.z);gone=true}
    if(gone){caveG.remove(s.m);s.m.material.dispose();C.shots.splice(i,1)}
  }
}
function updatePicks(dt){
  for(let i=C.picks.length-1;i>=0;i--){
    const p=C.picks[i];p.t+=dt;p.vy-=16*dt;p.y=Math.max(.2,p.y+p.vy*dt);if(p.y<=.2)p.vy=0;
    const dx=S.x-p.x,dz=S.z-p.z,d=Math.hypot(dx,dz);
    if(p.t>.35&&d<5.5){p.x+=dx/d*16*dt;p.z+=dz/d*16*dt}
    p.m.position.set(p.x,p.y,p.z);
    if(d<1){caveG.remove(p.m);C.picks.splice(i,1);
      if(p.kind==='ingot'){S.run.sh+=2+C.lv*2;blip(880,.05,'triangle',.04)}else{S.hp=Math.min(hpMax(),S.hp+1);blip(620,.12,'triangle',.06)}}
  }
}
/* ---------- герой в пещере ---------- */
function updateCombat(dt0){
  if(C.trans>0){C.trans-=dt0;if(C.trans<=0){C.i++;S.x=0;S.z=ROOM.d/2-2.6;S.dir='up';buildRoom();drawGraph($('miniMap'),false);$('fade').style.opacity=0}return}
  S.iframe=Math.max(0,S.iframe-dt0);S.hurtT=Math.max(0,(S.hurtT||0)-dt0);
  C.shake=Math.max(0,C.shake-dt0);
  if(C.stop>0){C.stop-=dt0;dt0*=.08}
  const dt=dt0;
  C.comboT=Math.max(0,(C.comboT||0)-dt);
  const ix=(keys.KeyD?1:0)-(keys.KeyA?1:0),iz=(keys.KeyS?1:0)-(keys.KeyW?1:0),moving=!!(ix||iz);S.moving=moving;
  const l=Math.hypot(ix,iz)||1,mx=ix/l,mz=iz/l;
  if(S.rollT>0){
    S.rollT-=dt;moveHero(S.rvx*dt,S.rvz*dt);
    if(S.rollT<=0)S.rollT=0;
  }else if(S.atkT>0){
    S.atkT-=dt;moveHero(S.lvx*dt,S.lvz*dt);S.lvx*=Math.pow(.002,dt);S.lvz*=Math.pow(.002,dt);
    if(C.hitAt>=0&&S.atkT<=C.hitAt){const i=C.combo;C.hitAt=-1;strike(ATK[i])}
  }else if(S.hurtT>0){
    moveHero(S.lvx*dt,S.lvz*dt);S.lvx*=Math.pow(.01,dt);S.lvz*=Math.pow(.01,dt);
  }else{
    const sp=(MOUSE.down&&S.chargeT>0?2.4:6.6);
    if(moving){moveHero(mx*sp*dt,mz*sp*dt);faceTo(mx,mz);S.walkT+=dt*11}
  }
  /* удержание для тяжёлого удара */
  if(MOUSE.down&&S.atkT<=0&&S.rollT<=0){S.chargeT=(S.chargeT||0)+dt}
  if(!MOUSE.down){if(S.chargeT>=.55)heavy();S.chargeT=0}
  aimM.visible=S.chargeT>.18;if(aimM.visible){aimM.position.set(S.x,.1,S.z);const s=2+Math.min(1,S.chargeT/.55)*7;aimM.scale.set(s,1,s*.7)}
  S.stam=Math.min(100,S.stam+22*dt);
  for(const e of[...C.enemies])updateEnemy(e,dt);
  for(let i=0;i<C.enemies.length;i++)for(let j=i+1;j<C.enemies.length;j++){const a=C.enemies[i],b=C.enemies[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||1,m=a.r+b.r*.6;if(d<m){const p=(m-d)*.5;a.x-=dx/d*p;a.z-=dz/d*p;b.x+=dx/d*p;b.z+=dz/d*p}}
  updateShots(dt);updatePicks(dt);
  if(C.chest&&C.chest.open)for(const d of C.doors)if(Math.hypot(S.x-d.x,S.z-d.z)<2.2)return nextRoom(d);
}
function tryRoll(){
  const cost=15-S.sk.jump*2;
  if(S.rollT>0||S.stam<cost||S.car.on)return;
  if(!S.inCave&&S.water>0){S.water*=1-.15*clamp(S.water/toolCap(),0,1)*Math.pow(.8,S.sk.steady);for(let i=0;i<4;i++)dropFrom()}
  const ix=(keys.KeyD?1:0)-(keys.KeyA?1:0),iz=(keys.KeyS?1:0)-(keys.KeyW?1:0);let dx=ix,dz=iz;
  if(!dx&&!dz){dx=S.fx;dz=S.fz;if(!dx&&!dz)dz=1}const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
  const sp=14+S.sk.jump*1.2;S.rollT=.42;S.rvx=dx*sp;S.rvz=dz*sp;S.atkT=0;S.stam-=cost;S.chargeT=0;faceTo(dx,dz);S.fx=dx;S.fz=dz;blip(300,.06,'sine',.05);
}
function moveHero(dx,dz){
  S.x=clamp(S.x+dx,-ROOM.w/2+1.4,ROOM.w/2-1.4);S.z=clamp(S.z+dz,-ROOM.d/2+1.2,ROOM.d/2-.9);
  if(dx||dz){const l=Math.hypot(dx,dz);S.fx=dx/l;S.fz=dz/l}
  for(const s of C.solids){const x=S.x-s.x,z=S.z-s.z,d=Math.hypot(x,z);if(d<s.r+.5&&d>0){S.x=s.x+x/d*(s.r+.5);S.z=s.z+z/d*(s.r+.5)}}
}
function updateCaveScene(dt){
  const flick=1+Math.sin(time*9)*.08;
  addL(S.x,S.z,15,.8*flick,[1,.86,.7]);
  for(const t of C.torches){addL(t.x,t.z+2,11,.85*flick,[1,.62,.3]);t.m.material.uniforms.map.value=A.torch[Math.floor(time*8+t.ph)%3].tex}
  if(S.chargeT>.3)addL(S.x,S.z,7,.6,[1,.9,.5]);
  if(S.lanternOn)addL(S.x,S.z,22,.55,[1,.82,.55]);
  if(C.chest&&!C.chest.open)addL(C.chest.x,C.chest.z,8,.7+Math.sin(time*3)*.15,[1,.85,.45]);
  const sm=slashM.material.uniforms.uOp;if(slashM.visible){sm.value-=dt*6;if(sm.value<=0)slashM.visible=false}
  if(slamM.visible){slamMat.uniforms.uOp.value-=dt*4;slamM.scale.x+=dt*14;slamM.scale.z+=dt*14;if(slamMat.uniforms.uOp.value<=0)slamM.visible=false}
  heroMat.uniforms.uFlash.value=S.hurtT>0?.8:S.iframe>0&&Math.floor(time*14)%2?.25:0;
  caveFront.position.set(CAM.x*.2,-3.4,ROOM.d/2+5.4);
  if(C.boss){const b=$('bossBar');b.style.display='block';$('bossFill').style.width=clamp(C.boss.hp/C.boss.max*100,0,100)+'%'}
  let h='';const mx=hpMax();for(let i=0;i<mx;i+=2){const v=S.hp-i;h+=`<i class="${v>=2?'f':v===1?'h':''}"></i>`}
  const e=$('hearts');if(e.dataset.h!==h){e.dataset.h=h;e.innerHTML=h}
  $('azartFill').style.width=S.azart+'%';setT('runLoot',`+${S.run?S.run.sh:0}`);
}
