/* Подробная карта: старая морская лоция. Колесо приближает к курсору, мышью можно таскать */
const MAP_N=430,MAP_W=WORLD,mapFog=new Uint8Array(MAP_N*MAP_N);
const mapI=v=>Math.floor((v+MAP_W/2)/MAP_W*MAP_N);
let mapLast=null;
const MV={zoom:1,x:0,z:0,sea:null,base:null,fog:null,fogDirty:true,drag:null,hover:null};
function revealMap(){
  const p=me();
  if(mapLast&&Math.hypot(p.x-mapLast.x,p.z-mapLast.z)<3)return;
  mapLast={x:p.x,z:p.z};MV.fogDirty=true;
  const R=S.onBoat?64:34,cell=MAP_W/MAP_N,r=Math.ceil(R/cell),cx=mapI(p.x),cz=mapI(p.z);
  for(let z=cz-r;z<=cz+r;z++)for(let x=cx-r;x<=cx+r;x++){
    if(x<0||z<0||x>=MAP_N||z>=MAP_N)continue;
    if(Math.hypot(x-cx,z-cz)<=r)mapFog[z*MAP_N+x]=1;
  }
}
const seenAt=(x,z)=>{const i=mapI(x),j=mapI(z);return i>=0&&j>=0&&i<MAP_N&&j<MAP_N&&mapFog[j*MAP_N+i]};
const LAYERS=[[236,212,150],[226,190,128],[210,150,106],[190,130,124],[156,118,146],[108,120,146],[86,92,136],[70,66,104]];
function buildMapBase(){
  const N=1536,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d'),img=g.createImageData(N,N),d=img.data,sea=S.seaY,sc=MAP_W/N;
  const sample=(x,z)=>groundH(x,z);
  for(let j=0;j<N;j++)for(let i=0;i<N;i++){
    const x=(i+.5)*sc-MAP_W/2,z=(j+.5)*sc-MAP_W/2,h=sample(x,z),a=(j*N+i)*4;
    const he=sample(x+1.2,z),hs=sample(x,z+1.2),Y=visY(h),slope=(Y-visY(he))+(Y-visY(hs));
    let r,gg,b;
    if(h<sea){
      const dp=sea-h,k=clamp(dp/6,0,1),st=Math.floor(k*6)/6;
      r=lerp(168,62,st);gg=lerp(214,118,st);b=lerp(206,150,st);
      const line=Math.abs(((dp*2.5)%1)-.5)<.05&&dp<7;if(line){r-=14;gg-=14;b-=10}
      if(dp<.14){r=70;gg=52;b=48}
    }else{
      const lv=Math.max(0,-h/CFG.drop),p=LAYERS[Math.min(7,Math.floor(lv+.72))];r=p[0];gg=p[1];b=p[2];
      const bio=biomeAt(x,z);
      if(bio[0]>.48){r=lerp(r,112,.8);gg=lerp(gg,150,.8);b=lerp(b,88,.8)}
      if(bio[1]>.48){r=lerp(r,146,.7);gg=lerp(gg,142,.7);b=lerp(b,132,.7)}
      if(bio[2]>.48){r=lerp(r,62,.8);gg=lerp(gg,56,.8);b=lerp(b,72,.8)}
      const sh=clamp(slope*.14,-.5,.4);r*=1+sh;gg*=1+sh;b*=1+sh*.9;
      if(Math.abs(slope)>1.1){r*=.62;gg*=.58;b*=.6}
      if(h-sea<.12){r=70;gg=52;b=48}
    }
    const n=hash(i*.7,j*.7)*7-3.5;d[a]=r+n;d[a+1]=gg+n;d[a+2]=b+n;d[a+3]=255;
  }
  g.putImageData(img,0,0);MV.base=c;MV.sea=sea;
}
function buildMapFog(){
  if(!MV.fog){MV.fog=document.createElement('canvas');MV.fog.width=MV.fog.height=MAP_N}
  const g=MV.fog.getContext('2d'),img=g.createImageData(MAP_N,MAP_N),d=img.data;
  for(let i=0;i<MAP_N*MAP_N;i++){const a=i*4,on=!mapFog[i];const n=hash(i%MAP_N,i/MAP_N|0)*10;d[a]=214+n;d[a+1]=194+n;d[a+2]=150+n;d[a+3]=on?255:0}
  g.putImageData(img,0,0);MV.fogDirty=false;
}
function drawMap(){
  if(MV.sea===null||Math.abs(MV.sea-S.seaY)>.02)buildMapBase();
  if(MV.fogDirty||!MV.fog)buildMapFog();
  const c=$('mapC'),g=c.getContext('2d'),W=c.width,H=c.height,scale=Math.min(W,H)/MAP_W*MV.zoom;
  const px=x=>W/2+(x-MV.x)*scale,pz=z=>H/2+(z-MV.z)*scale;
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#d8c49a';g.fillRect(0,0,W,H);
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(MV.base,px(-MAP_W/2),pz(-MAP_W/2),MAP_W*scale,MAP_W*scale);
  /* сетка координат */
  const step=MV.zoom>=6?25:MV.zoom>=3?50:100;
  g.lineWidth=1;g.strokeStyle='rgba(50,30,30,.2)';g.fillStyle='rgba(40,24,24,.8)';g.font='12px Georgia,serif';
  for(let v=-400;v<=400;v+=step){const a=px(v),b=pz(v);g.beginPath();g.moveTo(a,0);g.lineTo(a,H);g.moveTo(0,b);g.lineTo(W,b);g.stroke();
    if(v&&a>30&&a<W-30)g.fillText(`${v>0?'В':'З'} ${Math.abs(v)}`,a+3,14);if(v&&b>24&&b<H-8)g.fillText(`${v>0?'Ю':'С'} ${Math.abs(v)}`,4,b-3)}
  /* значки */
  const dot=(x,z,col,r=4)=>{g.fillStyle=col;g.strokeStyle='#241820';g.lineWidth=1;g.beginPath();g.arc(px(x),pz(z),r,0,6.3);g.fill();g.stroke()};
  const label=(x,z,t,o=10,size=13)=>{g.font=`${size}px Georgia,serif`;g.lineWidth=3;g.strokeStyle='rgba(240,226,190,.9)';g.fillStyle='#2a1a20';g.strokeText(t,px(x)+o,pz(z)+4);g.fillText(t,px(x)+o,pz(z)+4)};
  const vis=(x,z)=>seenAt(x,z)&&px(x)>-20&&px(x)<W+20&&pz(z)>-20&&pz(z)<H+20;
  if(MV.zoom>=2.6){
    for(const t of trees)if(t.hp>0&&t.e.k>.5&&vis(t.x,t.z)){g.fillStyle='#3a6a44';g.beginPath();g.arc(px(t.x),pz(t.z),Math.min(5,1.4*MV.zoom),0,6.3);g.fill()}
    for(const b of bushes)if(b.e.k>.5&&vis(b.x,b.z))dot(b.x,b.z,'#c8405a',2.5);
    for(const f of fishSpots)if(!f.dry&&f.cd<=0&&vis(f.x,f.z)){g.strokeStyle='#245a6a';g.lineWidth=1.5;g.beginPath();g.arc(px(f.x),pz(f.z),f.big?6:4,0,6.3);g.stroke()}
    for(const c2 of crates)if(c2.cd<=0&&vis(c2.x,c2.z))dot(c2.x,c2.z,'#b5875a',2.5);
  }
  for(const w of wrecks)if(w.cd<=0&&vis(w.x,w.z))label(w.x,w.z,'⚓',-6,14);
  for(const f of fires)if(vis(f.x,f.z))dot(f.x,f.z,'#ff8a3a',4);
  for(const d2 of digs)if(vis(d2.x,d2.z))label(d2.x,d2.z,'✕',-5,15);
  for(const k of CAVES)if(groundH(k.x,k.z)>S.seaY&&vis(k.x,k.z)){g.fillStyle='#241820';g.beginPath();g.arc(px(k.x),pz(k.z)+3,6,3.14,0);g.lineTo(px(k.x)+6,pz(k.z)+6);g.lineTo(px(k.x)-6,pz(k.z)+6);g.fill();if(MV.zoom>=2.2)label(k.x,k.z,S.caves[k.id]===S.day?'пещера, зачищена':'пещера',9,12)}
  if(vis(MOUTH.x,MOUTH.z)){dot(MOUTH.x,MOUTH.z,'#ff4b3a',5);label(MOUTH.x,MOUTH.z,'Щель')}
  if(vis(HOUSE.x,HOUSE.z)){dot(HOUSE.x,HOUSE.z,'#ffb96a',5);label(HOUSE.x,HOUSE.z,'Дом')}
  if(vis(S.boat.x,S.boat.z)&&!S.onBoat){dot(S.boat.x,S.boat.z,'#b8392e',4);label(S.boat.x,S.boat.z,'Корабль')}
  for(const l of LOCS)if(S.opened.includes(l.id)&&seenAt(l.x,l.z))label(l.x-l.name.length*3,l.z-l.r*.8,l.name,0,15);
  /* туман неизвестного */
  g.imageSmoothingEnabled=true;g.drawImage(MV.fog,px(-MAP_W/2),pz(-MAP_W/2),MAP_W*scale,MAP_W*scale);
  /* роза ветров */
  g.save();g.translate(W-58,H-58);g.strokeStyle='#2a1a20';g.fillStyle='#2a1a20';g.lineWidth=1.5;g.beginPath();g.arc(0,0,34,0,6.3);g.stroke();
  for(let i=0;i<4;i++){g.rotate(1.5708);g.beginPath();g.moveTo(0,-32);g.lineTo(6,0);g.lineTo(-6,0);g.fill()}g.font='13px Georgia,serif';g.fillText('С',-5,-38);g.restore();
  /* где ты */
  const p=S.inCave?(C.back||S):me(),a=S.onBoat?Math.atan2(Math.cos(S.boat.h),Math.sin(S.boat.h)):Math.atan2(S.fz,S.fx);
  g.save();g.translate(px(p.x),pz(p.z));g.rotate(a);g.fillStyle='#fff';g.strokeStyle='#1d1420';g.lineWidth=1.5;g.beginPath();g.moveTo(13,0);g.lineTo(-8,7);g.lineTo(-3,0);g.lineTo(-8,-7);g.closePath();g.fill();g.stroke();g.restore();
  $('mapInfo').textContent=(MV.hover?coord(MV.hover.x,MV.hover.z)+' · ':'')+`масштаб ×${MV.zoom.toFixed(1)}. Колесо приближает, мышью таскать`;
}
function clampMap(){const r=Math.max(0,MAP_W/2*(1-1/MV.zoom));MV.x=clamp(MV.x,-r,r);MV.z=clamp(MV.z,-r,r)}
function mapPoint(e){const c=$('mapC'),b=c.getBoundingClientRect(),sx=c.width/b.width,sy=c.height/b.height,scale=Math.min(c.width,c.height)/MAP_W*MV.zoom;
  const cx=(e.clientX-b.left)*sx,cy=(e.clientY-b.top)*sy;return{x:MV.x+(cx-c.width/2)/scale,z:MV.z+(cy-c.height/2)/scale,cx,cy,scale}}
function zoomMap(k,e){
  const before=e?mapPoint(e):null;MV.zoom=clamp(MV.zoom*k,1,12);
  if(before){const c=$('mapC'),scale=Math.min(c.width,c.height)/MAP_W*MV.zoom;MV.x=before.x-(before.cx-c.width/2)/scale;MV.z=before.z-(before.cy-c.height/2)/scale}
  clampMap();drawMap();
}
function centerMap(){const p=S.inCave?(C.back||S):me();MV.x=p.x;MV.z=p.z;if(MV.zoom<3)MV.zoom=3;clampMap();drawMap()}
{
  const c=$('mapC');
  c.addEventListener('wheel',e=>{e.preventDefault();zoomMap(Math.exp(-e.deltaY*.0016),e)},{passive:false});
  c.addEventListener('pointerdown',e=>{const q=mapPoint(e);MV.drag={sx:e.clientX,sy:e.clientY,x:MV.x,z:MV.z,scale:q.scale,k:c.width/c.getBoundingClientRect().width};try{c.setPointerCapture(e.pointerId)}catch(_){}});
  c.addEventListener('pointermove',e=>{MV.hover=mapPoint(e);if(MV.drag){const d=MV.drag;MV.x=d.x-(e.clientX-d.sx)*d.k/d.scale;MV.z=d.z-(e.clientY-d.sy)*d.k/d.scale;clampMap();drawMap()}else $('mapInfo').textContent=coord(MV.hover.x,MV.hover.z)+` · масштаб ×${MV.zoom.toFixed(1)}. Колесо приближает, мышью таскать`});
  c.addEventListener('pointerup',()=>{MV.drag=null});
  c.addEventListener('dblclick',e=>zoomMap(1.8,e));
  $('mapPlus').onclick=()=>zoomMap(1.5);$('mapMinus').onclick=()=>zoomMap(1/1.5);$('mapHome').onclick=centerMap;$('mapClose').onclick=()=>closeUI();
}
