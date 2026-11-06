/* Мини-игры на лодке. Все рисуются в одном окне поверх игры:
   «Круг» для обычной рыбы, «Вываживание» для крупной, «Лебёдка» для сокровищ и обломков */
const FISH={
  herring:{name:'Сельдь',sat:10,heal:1,cook:1},
  perch:{name:'Окунь',sat:16,heal:1,cook:2},
  pike:{name:'Щука',sat:22,heal:2,cook:3},
  eel:{name:'Угорь',sat:22,heal:2,cook:3},
  ray:{name:'Скат',sat:30,heal:2,cook:4},
  angler:{name:'Удильщик',sat:40,heal:3,cook:5},
};
Object.assign(SHAPES,{herring:[1,1],perch:[2,1],pike:[3,1],eel:[1,3],ray:[2,2],angler:[2,2]});
for(const id in FISH){FOODS[id]={name:FISH[id].name,sat:FISH[id].sat,heal:FISH[id].heal};S[id]=0}
const fishIds=Object.keys(FISH);
function pickFish(big){
  const deep=S.level>=4;
  if(big)return deep?(Math.random()<.5?'angler':'ray'):(Math.random()<.5?'pike':'eel');
  return Math.random()<.55?'herring':'perch';
}
const MG={on:null};
function startMini(kind,o,onWin,onLose){
  if(MG.on)return;
  S.ui='mini';S.boat.v=0;
  const c=$('miniC');$('mini').hidden=false;$('miniTitle').textContent=o.title;$('miniHelp').textContent=o.help;
  MG.on={kind,o,onWin,onLose,t:0,done:0,press:false,hold:false};
  const m=MG.on;
  if(kind==='ring'){m.a=-1.57;m.sp=o.speed||3.2;m.zones=[];m.round=0;m.rounds=o.rounds||3;m.life=1;m.drain=o.drain||.07;newRing(m)}
  if(kind==='reel'){m.fish=.5;m.fv=0;m.bar=.3;m.bv=0;m.size=o.size||.26;m.prog=.3;m.tgt=.5;m.tt=0}
  if(kind==='winch'){m.x=.5;m.depth=0;m.goal=o.goal||1;m.rocks=[];m.cd=0;m.lives=3;m.inv=0;m.sp=o.speed||.22}
}
function newRing(m){
  const n=1+Math.min(2,m.round);m.zones=[];
  for(let i=0;i<n;i++){const a=(i/n)*6.283+Math.random()*1.2+m.a+1.2;m.zones.push({a,w:(m.o.width||.62)*(1-m.round*.1)})}
}
const inArc=(a,c,w)=>Math.abs(Math.atan2(Math.sin(a-c),Math.cos(a-c)))<w/2;
function miniPress(){
  const m=MG.on;if(!m)return;
  if(m.kind==='ring'){
    const z=m.zones.find(q=>inArc(m.a,q.a,q.w));
    if(z){m.zones.splice(m.zones.indexOf(z),1);m.flash=.2;blip(660+m.round*120,.1,'triangle',.08);m.sp=-m.sp*1.06;
      if(!m.zones.length){m.round++;if(m.round>=m.rounds)return endMini(true);newRing(m)}}
    else{m.life-=.22;m.shake=.25;blip(150,.16,'square',.06);if(m.life<=0)endMini(false)}
  }
}
function endMini(win){
  const m=MG.on;MG.on=null;$('mini').hidden=true;S.ui=null;
  if(win)m.onWin&&m.onWin();else m.onLose&&m.onLose();
}
function updateMini(dt){
  const m=MG.on;if(!m)return;m.t+=dt;m.flash=Math.max(0,(m.flash||0)-dt);m.shake=Math.max(0,(m.shake||0)-dt);
  const hold=keys.KeyE||keys.Space||m.mouse;
  if(m.kind==='ring'){m.a+=m.sp*dt;m.life-=m.drain*dt;if(m.life<=0)return endMini(false)}
  if(m.kind==='reel'){
    m.tt-=dt;if(m.tt<=0){m.tt=.6+Math.random()*1.1;m.tgt=.08+Math.random()*.84}
    m.fv+=(m.tgt-m.fish)*(m.o.wild||5)*dt;m.fv*=Math.pow(.2,dt);m.fish=clamp(m.fish+m.fv*dt,0,1);
    m.bv+=(hold?1.5:-1.2)*dt;m.bv*=Math.pow(.25,dt);m.bar+=m.bv*dt;
    if(m.bar<0){m.bar=0;m.bv=Math.abs(m.bv)*.3}if(m.bar>1-m.size){m.bar=1-m.size;m.bv=0}
    const inside=m.fish>m.bar&&m.fish<m.bar+m.size;
    m.prog+=(inside?.2:-.14)*dt;if(m.prog>=1)return endMini(true);if(m.prog<=0)return endMini(false);
    m.inside=inside;
  }
  if(m.kind==='winch'){
    const dir=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);m.x=clamp(m.x+dir*.95*dt,.05,.95);
    m.depth+=m.sp*dt;m.inv=Math.max(0,m.inv-dt);m.cd-=dt;
    if(m.cd<=0){m.cd=.5+Math.random()*.45;const gap=.24+Math.random()*.1,gx=gap/2+Math.random()*(1-gap);m.rocks.push({y:1.1,gx,gap})}
    for(const r of m.rocks){r.y-=.62*dt;
      if(!r.hit&&Math.abs(r.y-.3)<.03&&Math.abs(m.x-r.gx)>r.gap/2&&m.inv<=0){r.hit=true;m.lives--;m.inv=.8;m.shake=.3;blip(120,.2,'square',.07);if(m.lives<=0)return endMini(false)}}
    m.rocks=m.rocks.filter(r=>r.y>-.1);
    if(m.depth>=m.goal)return endMini(true);
  }
  drawMini(m);
}
function drawMini(m){
  const c=$('miniC'),g=c.getContext('2d'),W=c.width,H=c.height;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);
  if(m.shake)g.translate((Math.random()-.5)*8,(Math.random()-.5)*8);
  const ink='#1d1420',gold='#ffd65a',teal='#3fb8a8',paper='#f2e6c8';
  if(m.kind==='ring'){
    const cx=W/2,cy=H/2,r=W*.36;
    g.lineCap='butt';g.lineWidth=30;g.strokeStyle='#14303a';g.beginPath();g.arc(cx,cy,r,0,6.3);g.stroke();
    g.lineWidth=2;g.strokeStyle=rgba(paper,.3);for(const k of[-17,17]){g.beginPath();g.arc(cx,cy,r+k,0,6.3);g.stroke()}
    for(const z of m.zones){g.lineWidth=30;g.strokeStyle=inArc(m.a,z.a,z.w)?'#ffe27a':teal;g.beginPath();g.arc(cx,cy,r,z.a-z.w/2,z.a+z.w/2);g.stroke()}
    g.lineCap='round';g.strokeStyle=m.flash?'#ffffff':'#ff6a3a';g.lineWidth=7;g.beginPath();g.moveTo(cx+Math.cos(m.a)*(r-34),cy+Math.sin(m.a)*(r-34));g.lineTo(cx+Math.cos(m.a)*(r+26),cy+Math.sin(m.a)*(r+26));g.stroke();
    g.fillStyle=paper;g.font='700 34px Georgia,serif';g.textAlign='center';g.textBaseline='middle';g.fillText(`${Math.min(m.round+1,m.rounds)} / ${m.rounds}`,cx,cy-6);
    g.fillStyle='#14303a';g.fillRect(cx-70,cy+26,140,10);g.fillStyle=m.life<.3?'#ff5a3a':gold;g.fillRect(cx-70,cy+26,140*Math.max(0,m.life),10);
  }
  if(m.kind==='reel'){
    const x=W/2-34,y=30,w=68,h=H-60;
    g.fillStyle='#14303a';g.fillRect(x,y,w,h);g.strokeStyle=rgba(paper,.4);g.lineWidth=2;g.strokeRect(x,y,w,h);
    const by=y+h*(1-m.bar-m.size);g.fillStyle=m.inside?'rgba(255,214,90,.75)':'rgba(63,184,168,.6)';g.fillRect(x+4,by,w-8,h*m.size);
    const fy=y+h*(1-m.fish);g.save();g.translate(W/2,fy);g.fillStyle='#ff8a5a';g.beginPath();g.ellipse(0,0,22,11,Math.sin(m.t*9)*.25,0,6.3);g.fill();g.beginPath();g.moveTo(18,0);g.lineTo(34,-11);g.lineTo(34,11);g.fill();g.fillStyle=ink;g.beginPath();g.arc(-11,-2,3,0,6.3);g.fill();g.restore();
    const px=x+w+26;g.fillStyle='#14303a';g.fillRect(px,y,16,h);g.fillStyle=gold;g.fillRect(px,y+h*(1-m.prog),16,h*m.prog);
  }
  if(m.kind==='winch'){
    const px=v=>30+v*(W-60),py=v=>H-30-v*(H-60);
    g.fillStyle='#0e2433';g.fillRect(30,30,W-60,H-60);
    g.save();g.beginPath();g.rect(30,30,W-60,H-60);g.clip();
    for(let i=0;i<14;i++){const y=(i*53+m.depth*700)%(H-60)+30;g.fillStyle='rgba(120,200,220,.08)';g.fillRect(40+(i*37)%(W-120),y,40,3)}
    for(const r of m.rocks){const y=py(r.y),a=px(r.gx-r.gap/2),b=px(r.gx+r.gap/2);g.fillStyle=r.hit?'#7a3a3a':'#4a4660';g.beginPath();g.moveTo(0,y-16);g.lineTo(a,y-10);g.lineTo(a-14,y);g.lineTo(a,y+12);g.lineTo(0,y+16);g.fill();g.beginPath();g.moveTo(W,y-16);g.lineTo(b,y-10);g.lineTo(b+14,y);g.lineTo(b,y+12);g.lineTo(W,y+16);g.fill()}
    const hx=px(m.x),hy=py(.3);g.strokeStyle=paper;g.lineWidth=3;g.beginPath();g.moveTo(hx,30);g.lineTo(hx,hy-12);g.stroke();
    g.globalAlpha=m.inv>0&&Math.floor(m.t*12)%2?.4:1;g.strokeStyle=gold;g.lineWidth=6;g.lineCap='round';g.beginPath();g.arc(hx,hy,12,.2,3.6);g.stroke();g.globalAlpha=1;
    g.restore();
    g.fillStyle='#14303a';g.fillRect(30,12,W-60,10);g.fillStyle=gold;g.fillRect(30,12,(W-60)*Math.min(1,m.depth/m.goal),10);
    g.fillStyle='#ff5a6a';g.font='24px Georgia,serif';g.textAlign='left';g.textBaseline='top';g.fillText('♥'.repeat(Math.max(0,m.lives)),36,36);
  }
  g.setTransform(1,0,0,1,0,0);
}
/* ---------- что запускается ---------- */
function startFishing(spot){
  const id=pickFish(spot.big),F=FISH[id],lvl=Math.min(1,S.sk.fisher*.12);
  const done=()=>{const n=Math.random()<S.sk.fisher*.2?2:1;if(!gain(id,n)){toast('Нет места в инвентаре: рыбе нужны клетки');return}
    spot.cd=120;blip(620,.2,'triangle',.08);showCard('Поймано',F.name,`${SHAPES[id].join('×')} клетки. Её можно съесть или пожарить`,3);firstTime('fish',10,'первая рыба');splash(spot.x,spot.z,8)};
  const miss=()=>{spot.cd=25;toast('Сорвалась!');splash(spot.x,spot.z,4)};
  if(spot.big)startMini('reel',{title:`Крупная рыба: ${F.name}`,help:'Держи E, Пробел или мышь: жёлтая полоса поднимается. Держи рыбу внутри полосы',size:.27+lvl*.4,wild:5+S.level*.5},done,miss);
  else startMini('ring',{title:`На крючке: ${F.name}`,help:'Жми E, Пробел или кликай, когда стрелка в зелёном секторе. Не торопись: промах отнимает леску',speed:3+S.level*.2,width:.66+lvl,rounds:id==='perch'?3:2},done,miss);
}
function startWinch(title,onWin,onLose,goal=1){
  startMini('winch',{title,help:'A и D ведут крюк между скалами. Три удара, и трос обрывается',goal},onWin,onLose);
}
