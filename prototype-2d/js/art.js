/* Вся графика рисуется кодом: мазки гуашью поверх заливки, тёплый свет слева сверху,
   холодная сине-фиолетовая тень, неровный чернильный контур. Как книжная иллюстрация */
const PPM=64,INK='#1d1420',LW=.075;
const rnd=s=>{s=Math.floor(s*7919+17)%2147483647;return()=>{s=(s*16807)%2147483647;return s/2147483647}};
let R=rnd(1),artSeed=1,ARTQ=1;
function art(w,h,fn,ppm=PPM){
  const c=document.createElement('canvas');c.width=Math.round(w*ppm);c.height=Math.round(h*ppm);
  const g=c.getContext('2d');g.scale(ppm,ppm);g.lineJoin=g.lineCap='round';
  R=rnd(artSeed++*31+7);
  if(fn)fn(g,w,h);
  const tex=new THREE.CanvasTexture(c);tex.anisotropy=4;
  return{tex,w,h,c,g};
}
/* предметы из листа: холст создаётся сразу, рисунок появляется, как только лист загрузится */
const itemImg=new Image();itemImg.src=ITEM_SHEET;
function sheetArt(name,wm){
  const r=IT[name],c=document.createElement('canvas');c.width=r.w;c.height=r.h;const tex=new THREE.CanvasTexture(c);tex.anisotropy=4;
  const draw=()=>{c.getContext('2d').drawImage(itemImg,r.x,r.y,r.w,r.h,0,0,r.w,r.h);tex.needsUpdate=true};
  if(itemImg.complete&&itemImg.naturalWidth)draw();else itemImg.addEventListener('load',draw);
  return{tex,w:wm,h:wm*r.h/r.w,c};
}
/* рисунок на основе листа: холст есть сразу, картинка появляется после загрузки */
const lateArt=(w,h,fn,ppm)=>{const a=art(w,h,null,ppm),run=()=>{fn(a.g,w,h);a.tex.needsUpdate=true};if(itemImg.complete&&itemImg.naturalWidth)run();else itemImg.addEventListener('load',run);return a};
function drawIt(g,name,w,ax=.5,ay=1,x=0,y=0){if(!itemImg.complete)return;const r=IT[name],h=w*r.h/r.w;g.drawImage(itemImg,r.x,r.y,r.w,r.h,x-w*ax,y-h*ay,w,h)}
const ICON_OF={spoon:'spoon',ladle:'ladle',pot:'pot',bucket:'bucket',canister:'canister',axe:'axe',hose:'hose',lantern:'lanternOff',key:'key',skates:'skates',berries:'berries',fish:'fishRaw',food:'fishCooked',herring:'herring',perch:'perch',pike:'pike',eel:'eel',ray:'ray',angler:'angler',wood:'logs0',holy:'holy',tmap:'tmap'};
const iconCache={};
function itemIcon(id){
  const n=ICON_OF[id];if(!n||!itemImg.complete)return'';if(iconCache[n])return iconCache[n];
  const r=IT[n],c=document.createElement('canvas');c.width=r.w;c.height=r.h;c.getContext('2d').drawImage(itemImg,r.x,r.y,r.w,r.h,0,0,r.w,r.h);return iconCache[n]=c.toDataURL('image/png');
}
const hex=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
const rgba=(c,a)=>{const p=hex(c);return`rgba(${p[0]},${p[1]},${p[2]},${a})`};
const mixc=(a,b,t)=>{const p=hex(a),q=hex(b);return'#'+p.map((v,i)=>Math.round(v+(q[i]-v)*t).toString(16).padStart(2,'0')).join('')};
/* простые фигуры для мелочей */
const tracePoly=(g,pts)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()};
function traceSmooth(g,pts){
  const n=pts.length,a=pts[n-1],b=pts[0];g.beginPath();g.moveTo((a[0]+b[0])/2,(a[1]+b[1])/2);
  for(let i=0;i<n;i++){const p=pts[i],q=pts[(i+1)%n];g.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2)}
  g.closePath();
}
const P=(g,pts,fill,stroke=INK,lw=LW)=>{tracePoly(g,pts);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}};
const Ln=(g,pts,col=INK,lw=LW)=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.strokeStyle=col;g.lineWidth=lw;g.stroke()};
const El=(g,x,y,rx,ry,fill,stroke=INK,lw=LW,rot=0)=>{g.beginPath();g.ellipse(x,y,rx,ry,rot,0,6.2832);
  if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}};
/* один мазок кистью */
function dab(g,x,y,len,wid,ang,col,a=1){
  g.save();g.translate(x,y);g.rotate(ang);g.globalAlpha=a;g.fillStyle=col;g.beginPath();g.moveTo(-len/2,0);
  g.quadraticCurveTo(0,-wid,len/2,wid*.2);g.quadraticCurveTo(0,wid*.8,-len/2,0);g.fill();g.restore();
}
/* главная кисть: заливка, объём градиентом, мазки, блик по краю, неровный контур */
function paint(g,pts,o){
  const tr=o.sharp?tracePoly:traceSmooth;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of pts){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1])}
  const w=x1-x0||.01,h=y1-y0||.01,l=o.l||mixc(o.c,'#ffe9c0',.4),d=o.d||mixc(o.c,'#2a2050',.55);
  g.save();tr(g,pts);g.fillStyle=o.c;g.fill();g.clip();
  const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,rgba(l,.55));gr.addColorStop(.48,rgba(l,0));gr.addColorStop(.55,rgba(d,0));gr.addColorStop(1,rgba(d,.8));
  g.fillStyle=gr;g.fillRect(x0,y0,w,h);
  const n=Math.round((o.n??Math.ceil(w*h*26))*ARTQ),len=o.len||.34,wid=(o.wid||.07)/Math.sqrt(ARTQ);
  for(let i=0;i<n;i++){
    const x=x0+R()*w,y=y0+R()*h,t=((x-x0)/w+(y-y0)/h)/2+(R()-.5)*.42;
    const col=t<.38?l:t>.64?d:(R()<.5?o.c:mixc(o.c,R()<.5?l:d,.5));
    const a=o.rad?Math.atan2(y-o.rad[1],x-o.rad[0]):(o.ang??-.6)+(R()-.5)*.5;
    dab(g,x,y,len*(.6+R()*.7),wid*(.6+R()*.7),a,col,.42+R()*.42);
  }
  if(o.rim){g.translate(.055,.06);tr(g,pts);g.strokeStyle=o.rim;g.lineWidth=o.rimW||.075;g.globalAlpha=.85;g.stroke();g.globalAlpha=1}
  g.restore();
  if(o.ink!==0){
    tr(g,pts);g.strokeStyle=INK;g.lineWidth=o.ink||LW;g.stroke();
    g.save();g.translate((R()-.5)*.03,(R()-.5)*.03);tr(g,pts);g.globalAlpha=.32;g.lineWidth=(o.ink||LW)*.55;g.stroke();g.restore();
  }
}
const ell=(x,y,rx,ry,n=18,j=.05)=>Array.from({length:n},(_,i)=>{const a=i/n*6.283,k=1+(R()-.5)*j*2;return[x+Math.cos(a)*rx*k,y+Math.sin(a)*ry*k]});
const clump=(x,y,rx,ry,n=13,amp=.14)=>Array.from({length:n*2},(_,i)=>{const a=i/(n*2)*6.283,k=(i%2?1:1-amp)*(1+(R()-.5)*.12);return[x+Math.cos(a)*rx*k,y+Math.sin(a)*ry*k]});

/* ---------- деревья ---------- */
/* ---------- камни, дно, мелочи ---------- */
const artColumn=broken=>art(2.1,broken?3.8:6,(g,w,h)=>{
  const top=broken?.5:.6,c='#d7cfba',l='#fff6df',d='#6a5a80';
  paint(g,[[.1,h-.08],[.1,h-.5],[w-.1,h-.5],[w-.1,h-.08]],{c,l,d,n:14,sharp:true,ang:0,len:.4});
  if(broken)paint(g,[[.46,h-.5],[.46,top+.7],[.86,top+.1],[1.14,top+.56],[1.64,top],[1.64,h-.5]],{c,l,d,n:40,sharp:true,ang:1.57,len:.5,wid:.05});
  else{paint(g,[[.46,h-.5],[.52,top+.36],[1.58,top+.36],[1.64,h-.5]],{c,l,d,n:50,sharp:true,ang:1.57,len:.6,wid:.05});paint(g,[[.18,top+.36],[.18,top],[w-.18,top],[w-.18,top+.36]],{c,l,d,n:12,sharp:true,ang:0})}
  for(const x of[.76,1.05,1.36])Ln(g,[[x,h-.6],[x,top+.62]],rgba('#5a4a70',.55),.05);
  for(let i=0;i<12;i++)dab(g,.4+R()*1.3,h-.6-R()*1.2,.24,.09,-.4,'#5fa84e',.8);
});
const artRib=flip=>art(3.6,6.8,(g,w,h)=>{
  g.save();if(flip){g.translate(w,0);g.scale(-1,1)}
  paint(g,[[.5,h-.1],[.22,3.6],[.72,1.7],[2.9,.4],[1.5,2.1],[1.05,3.8],[1.24,h-.1]],{c:'#ece2c9',l:'#fffbe9',d:'#7a6a90',n:40,len:.5,wid:.05,ang:1.2});
  g.restore();
});
const artWreck=()=>art(10,5.6,(g,w,h)=>{
  paint(g,[[3.9,1.8],[4.2,.2],[4.5,1.8]],{c:'#7a5a44',sharp:true,n:10,ang:1.57});
  paint(g,[[4.4,.3],[6.5,.85],[6,1.2],[4.4,1.25]],{c:'#c7b48a',l:'#fff0cc',d:'#6a5a70',sharp:true,n:24,len:.5,wid:.05,ang:.2});
  paint(g,[[.5,h-.3],[1,2.4],[3.8,1.6],[9.5,2.7],[8.8,h-.25],[5.5,h-.1]],{c:'#6b4632',l:'#c0895a',d:'#2a1a30',n:150,len:.7,wid:.06,ang:.1,sharp:true,rim:'#ffd79a'});
  for(const x of[1.8,3.2,4.6,6,7.4])Ln(g,[[x,2.2+Math.abs(x-3.9)*.16],[x+.14,h-.4]],'#2a1a26',.11);
  P(g,[[3.7,3.1],[5,3.3],[4.8,4.3],[3.6,4.2]],'#140e18');
  for(let i=0;i<24;i++)dab(g,1+R()*8,h-.5-R()*.7,.32,.09,-.2,'#3c8f4f',.75);
});
const artCave=()=>art(9.4,7,(g,w,h)=>{
  paint(g,[[.1,h-.1],[.4,3.6],[1.3,1.7],[3,.5],[5.2,.2],[7.3,.9],[8.6,2.4],[9.2,4.2],[9.3,h-.1]],{c:'#6d6780',l:'#efe0c0',d:'#262038',n:240,len:.6,wid:.1,ang:1,sharp:false,rim:'#ffe7b4'});
  paint(g,[[2.4,h-.1],[2.7,3.7],[3.5,2.7],[4.7,2.3],[5.9,2.8],[6.7,3.8],[7,h-.1]],{c:'#0c0814',l:'#2a1f3a',d:'#04020a',n:30,ink:.12});
  for(const[x,ht]of[[3.3,.7],[3.95,1.1],[4.7,.6],[5.4,1],[6.1,.6]])P(g,[[x-.2,2.7+Math.abs(x-4.7)*.32],[x,3+Math.abs(x-4.7)*.3+ht],[x+.2,2.7+Math.abs(x-4.7)*.32]],'#4d4660');
  for(const s of[1.8,7.6]){Ln(g,[[s,h-.1],[s,h-1.5]],INK,.2);Ln(g,[[s,h-.1],[s,h-1.5]],'#8a5a38',.11);El(g,s,h-1.7,.2,.24,'#ffb52e',INK,.06);El(g,s,h-1.72,.09,.13,'#fff0b0',null)}
  for(let i=0;i<42;i++)dab(g,.6+R()*8.2,1+R()*1.2+Math.abs(R()-.5)*1.4,.34,.1,-.3,R()<.5?'#6fb94e':'#2f7a4f',.75);
});
const artShell=()=>art(1,.8,g=>{paint(g,[[.5,.72],[.12,.36],[.26,.1],[.5,.04],[.74,.1],[.88,.36]],{c:'#f6cdb4',l:'#fff4e4',d:'#a0607a',n:10,len:.2,wid:.04,ang:1.57,ink:.04});for(const x of[.3,.5,.7])Ln(g,[[.5,.66],[x,.16]],'#b07a80',.03)});
const artStar=()=>art(1,1,g=>{const p=[];for(let i=0;i<10;i++){const a=i/10*6.283-1.57,r=i%2?.17:.44;p.push([.5+Math.cos(a)*r,.52+Math.sin(a)*r])}paint(g,p,{c:'#e8693e',l:'#ffc48a',d:'#8a2a4a',n:12,len:.18,wid:.04,sharp:true,ink:.05});for(let i=0;i<7;i++)El(g,.3+R()*.4,.34+R()*.4,.025,.025,'#ffe6c8',null)});
const artCoral=()=>art(1.9,1.8,g=>{const b=1.72,arms=[[.95,.2],[.48,.46],[1.42,.42],[.28,.95],[1.62,.9]];for(const[a,e]of arms){Ln(g,[[.95,b],[(a+.95)/2,(e+b)/2+.1],[a,e]],INK,.26)}for(const[a,e]of arms){Ln(g,[[.95,b],[(a+.95)/2,(e+b)/2+.1],[a,e]],'#e8604f',.15);Ln(g,[[.92,b],[(a+.92)/2,(e+b)/2+.1],[a-.03,e+.03]],'#ffb09a',.05)}});
const artKelp=()=>art(1.3,2,g=>{for(const x of[.36,.68,.95]){g.beginPath();g.moveTo(x,1.95);g.bezierCurveTo(x+.34,1.3,x-.34,.9,x+.06,.14);g.strokeStyle=INK;g.lineWidth=.17;g.stroke();g.strokeStyle='#3f8d6a';g.lineWidth=.1;g.stroke();g.strokeStyle='#9ad98a';g.lineWidth=.02;g.stroke()}});
const artDrift=()=>art(2.6,.9,g=>{paint(g,[[.1,.56],[.7,.26],[2,.2],[2.5,.46],[2,.72],[.6,.78]],{c:'#b1946e',l:'#f2dfb6',d:'#6a4a50',n:26,len:.6,wid:.04,ang:.05,sharp:false})});
const artAnchor=()=>art(2,2.4,g=>{const c='#5a6072';Ln(g,[[1,.4],[1,2]],INK,.26);Ln(g,[[1,.4],[1,2]],c,.15);Ln(g,[[.55,.75],[1.45,.75]],INK,.2);Ln(g,[[.55,.75],[1.45,.75]],c,.11);g.beginPath();g.arc(1,1.3,.76,.25,2.9);g.strokeStyle=INK;g.lineWidth=.26;g.stroke();g.strokeStyle=c;g.lineWidth=.15;g.stroke();El(g,1,.28,.17,.17,null,INK,.13);for(let i=0;i<14;i++)dab(g,.4+R()*1.2,.6+R()*1.5,.18,.05,R()*3,'#a85a34',.6)});
const artBottle=()=>art(1,.7,g=>{P(g,[[.12,.34],[.6,.2],[.76,.3],[.92,.26],[.94,.42],[.76,.44],[.62,.54],[.14,.56]],'#6fc6a8');Ln(g,[[.2,.34],[.56,.28]],'#e0fff0',.04);P(g,[[.3,.3],[.5,.28],[.5,.48],[.3,.5]],'#efe0b8',null)});
const artBoot=()=>art(1.1,1,g=>{paint(g,[[.3,.1],[.68,.1],[.66,.56],[1,.74],[1,.9],[.3,.9]],{c:'#6a4230',n:14,len:.2,sharp:true,ink:.05})});
const artSkull=()=>art(1,.9,g=>{paint(g,[[.2,.4],[.3,.14],[.7,.14],[.8,.4],[.66,.56],[.66,.78],[.34,.78],[.34,.56]],{c:'#ece2c9',l:'#fffbe9',d:'#7a6a90',n:10,len:.16,ink:.05});El(g,.38,.42,.09,.1,'#1d1420',null);El(g,.62,.42,.09,.1,'#1d1420',null)});
const artFishBone=()=>art(2.6,1,g=>{Ln(g,[[.5,.5],[2.3,.5]],INK,.13);Ln(g,[[.5,.5],[2.3,.5]],'#ece2c9',.06);for(let i=0;i<6;i++){const x=.85+i*.24,k=.3-i*.03;Ln(g,[[x,.5-k],[x,.5+k]],'#ece2c9',.05)}paint(g,[[.1,.5],[.54,.14],[.74,.5],[.54,.86]],{c:'#ece2c9',n:8,sharp:true,ink:.05});P(g,[[2.3,.5],[2.56,.26],[2.5,.5],[2.56,.74]],'#ece2c9',INK,.05);El(g,.46,.44,.06,.06,'#1d1420',null)});
const artAmphora=()=>art(1.1,1.7,g=>{paint(g,[[.42,.1],[.68,.1],[.62,.34],[.96,.7],[.82,1.2],[.56,1.62],[.28,1.2],[.14,.7],[.48,.34]],{c:'#c8693a',l:'#ffc48a',d:'#5a2a4a',n:24,len:.3,wid:.05,ang:1.57});Ln(g,[[.22,.8],[.9,.8]],'#3a1a2a',.05);Ln(g,[[.26,.96],[.84,.96]],'#3a1a2a',.05)});
const artSpike=()=>art(1.8,2.4,g=>{paint(g,[[.2,2.3],[.54,.9],[.9,.1],[1.2,1],[1.6,2.3]],{c:'#2a2144',l:'#8a6ae8',d:'#0a0618',n:30,len:.5,wid:.05,ang:1.3,sharp:true,rim:'#c6b0ff'})});
const artChain=()=>art(2.6,.7,g=>{for(let i=0;i<6;i++)El(g,.28+i*.4,.34+Math.sin(i)*.08,.2,.1,null,'#5a6072',.07,i%2?.5:-.5)});
/* постройки и хозяйство у дома */
/* дом сказочной кривизны */
const artFloor=()=>lateArt(9.6,7.6,(g,w,h)=>{
  const r=IT.floor;g.fillStyle='#24160f';g.fillRect(0,0,w,h);for(let y=-.04;y<h;y+=2.3)for(let x=-.04;x<w;x+=3.06)g.drawImage(itemImg,r.x+10,r.y+10,r.w-20,r.h-20,x,y,3.12,2.36);
  El(g,4.7,1.1,3,1.7,'#5a2430',null);El(g,4.7,1.1,2.5,1.3,null,'#a07a4a',.07);El(g,4.7,1.1,2,1,null,'#a07a4a',.03);
  g.strokeStyle='#150c14';g.lineWidth=.34;g.strokeRect(.15,.15,w-.3,h-.3);
});
const artBackWall=()=>lateArt(9.6,2.5,(g,w,h)=>{const r=IT.wall;for(let x=0;x<w;x+=2.68)g.drawImage(itemImg,r.x+4,r.y+4,r.w-8,r.h-8,x,0,2.7,h)});
const artCrate=()=>art(2,1.8,g=>{paint(g,[[.2,.3],[1.8,.3],[1.8,1.6],[.2,1.6]],{c:'#b5875a',l:'#ffd59a',d:'#4b2d3e',n:30,sharp:true,ang:0,len:.5,wid:.05});Ln(g,[[.26,.36],[1.74,1.54]],'#6b4630',.12);Ln(g,[[.2,.95],[1.8,.95]],'#6b4630',.08)});
const artInlet=()=>art(2.4,2.8,g=>{
  paint(g,[[.4,.25],[2,.25],[1.45,1.3],[.95,1.3]],{c:'#c79a50',l:'#ffe6a0',d:'#5a3a3a',n:14,sharp:true,ang:1.3});El(g,1.2,.27,.8,.17,'#3d3030');
  Ln(g,[[1.2,1.3],[1.2,2.5]],INK,.3);Ln(g,[[1.2,1.3],[1.2,2.5]],'#6f5a44',.15);El(g,1.2,2.45,.7,.24,'#4a3a2e');El(g,1.2,2.45,.38,.11,'#2a2126');
});
const artBoat=()=>art(5.4,7.2,(g,w,h)=>{
  const cx=w/2;
  for(const[a,b]of[[[cx-1.2,3.2],[.2,4.6]],[[cx+1.2,3.2],[w-.2,4.6]]]){Ln(g,[a,b],INK,.24);Ln(g,[a,b],'#d0a674',.12)}
  El(g,.3,4.7,.2,.42,'#d0a674',INK,.08,.8);El(g,w-.3,4.7,.2,.42,'#d0a674',INK,.08,-.8);
  const hull=[[cx,.15],[cx+.9,.8],[cx+1.55,2.4],[cx+1.5,4.6],[cx+.95,h-.2],[cx-.95,h-.2],[cx-1.5,4.6],[cx-1.55,2.4],[cx-.9,.8]];
  paint(g,hull,{c:'#8a5a3a',l:'#e8b47e',d:'#3a2238',n:90,len:.8,wid:.05,ang:1.57,ink:.12,rim:'#ffe0a8'});
  paint(g,[[cx,.95],[cx+.75,1.5],[cx+1.1,2.6],[cx+1.05,4.5],[cx+.72,h-.55],[cx-.72,h-.55],[cx-1.05,4.5],[cx-1.1,2.6],[cx-.75,1.5]],{c:'#4d3628',l:'#7a5238',d:'#1d1420',n:30,len:.6,wid:.05,ang:1.57,ink:.05});
  for(const y of[2.5,4.6])paint(g,[[cx-1.15,y],[cx+1.15,y],[cx+1.1,y+.42],[cx-1.1,y+.42]],{c:'#b5875a',n:8,sharp:true,ang:0,ink:.05});
  paint(g,[[cx-.5,5.4],[cx+.4,5.4],[cx+.4,6.1],[cx-.5,6.1]],{c:'#c7b48a',n:6,sharp:true});
});

/* ---------- пятна на земле ---------- */
const artShadow=()=>art(2,2,g=>{const k=g.createRadialGradient(1,1,.1,1,1,1);k.addColorStop(0,'rgba(24,18,60,.55)');k.addColorStop(.7,'rgba(24,18,60,.34)');k.addColorStop(1,'rgba(24,18,60,0)');g.fillStyle=k;g.fillRect(0,0,2,2)},32);
const artRing=()=>art(3,3,g=>{for(const[r,o]of[[1.3,.5],[.85,.8],[.42,.6]]){g.strokeStyle=`rgba(232,246,240,${o})`;g.lineWidth=.1;g.beginPath();g.arc(1.5,1.5,r,.3,5.6);g.stroke()}},32);
const artFoam=()=>art(2,2,g=>{const k=g.createRadialGradient(1,1,.1,1,1,1);k.addColorStop(0,'rgba(240,250,246,.8)');k.addColorStop(1,'rgba(240,250,246,0)');g.fillStyle=k;g.fillRect(0,0,2,2)},24);
const artDig=()=>art(3,2.2,g=>{El(g,1.5,1.1,1.25,.82,'rgba(70,44,50,.55)',null);for(const[a,b,c,d]of[[.8,.55,2.2,1.65],[2.2,.55,.8,1.65]]){Ln(g,[[a,b],[c,d]],INK,.38);Ln(g,[[a,b],[c,d]],'#ffd65a',.2)}});
const artPool=()=>art(4,2.6,g=>{paint(g,clump(2,1.3,1.8,1.05,9,.1),{c:'#3fa8b0',l:'#c8fff0',d:'#1a4a70',n:30,len:.5,wid:.05,ang:.1,ink:.06});for(let i=0;i<5;i++)El(g,1+R()*2,.9+R()*.9,.2,.05,'rgba(255,255,255,.7)',null)});
/* капля: круглая, слезинка и вытянутая в падении, с бликом и тёмным контуром */
const artDropF=k=>art(.3,.3,g=>{
  const cx=.15,cy=k?.19:.15,r=.095-.012*k,tip=k===1?.045:.01;g.beginPath();
  if(!k)g.arc(cx,cy,r,0,6.283);
  else{g.moveTo(cx,tip);g.bezierCurveTo(cx+.018,cy-r*1.05,cx+r,cy-r*.5,cx+r,cy);g.arc(cx,cy,r,0,3.1416);g.bezierCurveTo(cx-r,cy-r*.5,cx-.018,cy-r*1.05,cx,tip)}
  g.closePath();
  const gr=g.createRadialGradient(cx-.025,cy-.03,.005,cx,cy,r*1.25);gr.addColorStop(0,'#eafdff');gr.addColorStop(.4,'#8fe4ee');gr.addColorStop(.8,'#2f9cbc');gr.addColorStop(1,'#14607e');
  g.fillStyle=gr;g.fill();g.strokeStyle='rgba(8,40,56,.9)';g.lineWidth=.014;g.stroke();
  g.fillStyle='#fff';g.beginPath();g.ellipse(cx-.03,cy-.03,.021,.014,-.7,0,6.283);g.fill();
  g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(cx+.03,cy+.038,.016,.008,.7,0,6.283);g.fill();
},170);
const artDropRing=()=>art(1,1,g=>{g.strokeStyle='rgba(190,240,245,.9)';g.lineWidth=.035;g.beginPath();g.arc(.5,.5,.44,0,6.283);g.stroke();g.strokeStyle='rgba(190,240,245,.4)';g.lineWidth=.02;g.beginPath();g.arc(.5,.5,.27,0,6.283);g.stroke()},128);
const artWet=()=>art(1,1,g=>{for(let i=0;i<9;i++){const a=R()*6.28,r=R()*.22;El(g,.5+Math.cos(a)*r,.5+Math.sin(a)*r,.1+R()*.14,.08+R()*.12,'rgba(6,10,20,.6)',null)}},64);
const artBubble=()=>art(.7,.7,g=>{El(g,.35,.35,.25,.25,null,'#e6f6f2',.06);El(g,.27,.27,.05,.05,'#ffffff',null)});
const artPuff=()=>art(1.6,1.6,g=>{for(const[x,y,r,c]of[[.55,.92,.34,'#b8aec8'],[1.05,.95,.32,'#b8aec8'],[.8,.62,.4,'#d8cedc'],[.62,.72,.28,'#f6ecdc'],[.98,.7,.26,'#f6ecdc'],[.78,.5,.2,'#ffffff']]){const k=g.createRadialGradient(x,y,.02,x,y,r);k.addColorStop(0,c);k.addColorStop(.72,c);k.addColorStop(1,rgba(c,0));g.fillStyle=k;g.beginPath();g.arc(x,y,r,0,6.3);g.fill()}},40);
/* щель в каменной плите: края по телу монстра, растёт вместе с ним */
const CRACK_A=2.9,CRACK_B=.95;
const crackEdge=(t,sg)=>sg*CRACK_B*Math.pow(Math.max(0,1-t*t),.62)*(.8+.4*hash(Math.round((t+1)*9),sg>0?4:9));
const artCrack=()=>lateArt(10,6,(g,w,h)=>{
  const cx=w/2,cy=h/2,E=.56;
  tileFill(g,'dFloor',0,0,3.4,w,h);
  g.save();g.translate(cx,cy);g.scale(1,E);
  let k=g.createRadialGradient(0,0,1,0,0,4.6);k.addColorStop(0,'rgba(84,20,10,.8)');k.addColorStop(1,'rgba(20,8,16,0)');g.fillStyle=k;g.fillRect(-cx,-cy/E,w,h/E);g.restore();
  for(let b=0;b<12;b++){const a=b/12*6.283+hash(b,6)*.4,c=Math.cos(a),s=Math.sin(a);let x=cx+c*CRACK_A*.84,y=cy+s*CRACK_B*.84,an=Math.atan2(s*.6,c);const pts=[[x,y]],n=4+Math.floor(hash(b,8)*4);
    for(let i=0;i<n;i++){an+=(hash(i,b+20)-.5)*.9;x+=Math.cos(an)*.42;y+=Math.sin(an)*.3;pts.push([x,y])}
    Ln(g,pts,'#0a060c',.1);Ln(g,pts,'rgba(255,96,40,.6)',.035)}
  g.save();g.globalCompositeOperation='destination-in';g.translate(cx,cy);g.scale(1,E);
  k=g.createRadialGradient(0,0,2.4,0,0,4.9);k.addColorStop(0,'#000');k.addColorStop(.6,'rgba(0,0,0,.9)');k.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=k;g.fillRect(-cx,-cy/E,w,h/E);g.restore();
  const top=[],bot=[];for(let i=0;i<=18;i++){const t=-1+i/9;top.push([cx+t*CRACK_A,cy+crackEdge(t,-1)]);bot.push([cx+t*CRACK_A,cy+crackEdge(t,1)])}
  const hole=[...top,...bot.slice().reverse()];
  P(g,hole.map(p=>[cx+(p[0]-cx)*1.05,cy+(p[1]-cy)*1.2]),'#07040a',null);
  const gr=g.createLinearGradient(0,cy-CRACK_B,0,cy+CRACK_B);gr.addColorStop(0,'#2a1216');gr.addColorStop(.32,'#7a2212');gr.addColorStop(.66,'#f0561e');gr.addColorStop(1,'#ffb04a');
  P(g,hole,gr,'#0a060c',.06);
  Ln(g,top,'rgba(255,120,50,.4)',.04);
},48);
/* ближний край щели: рисуется поверх монстра, поэтому он будто застрял */
const artCrackLip=()=>art(6.6,1.7,(g,w,h)=>{
  const cx=w/2,a=CRACK_A*1.08,N=22,top=[],bot=[];
  for(let i=0;i<=N;i++){const t=-1+2*i/N,yb=h-.05-(1-Math.pow(Math.max(0,1-t*t),.62))*CRACK_B*.8,tp=Math.pow(Math.max(0,1-t*t),.4);
    bot.push([cx+t*a,yb]);top.push([cx+t*a,yb-(i%2?.22+hash(i,3)*.2:.55+hash(i,7)*.6)*tp])}
  paint(g,[...top,...bot.slice().reverse()],{c:'#2f2a35',l:'#6a5a68',d:'#0e0a12',n:90,len:.4,wid:.08,sharp:true,ang:1.2,ink:.06});
  Ln(g,top,'rgba(255,110,50,.6)',.045);
},60);

/* ---------- монстр: овца из листа, 4 стадии роста и 4 кадра улыбки ---------- */
const monImg=new Image();monImg.src=MONSTER_SHEET;
const MON_K=.0105,MON_M=5;
const monStage=()=>S.level>=6?3:S.level>=4?2:S.level>=2?1:0;
function drawSheep(g,st,col){
  g.clearRect(0,0,MON_M,MON_M);if(!monImg.complete)return;
  const f=MF[st][col];g.drawImage(monImg,f.x,f.y,f.w,f.h,MON_M/2-f.cx*MON_K,MON_M-f.by*MON_K,f.w*MON_K,f.h*MON_K);
}
/* ---------- предметы в лапе. Начало координат в лапе, предмет смотрит вверх ---------- */
const handIt=(name,w)=>g=>drawIt(g,name,w,.5,.92);
const ITEM_DRAW={
  spoon(g,w){g.save();g.rotate(2.3);drawIt(g,'spoon',.95,.92,.1);g.restore();if(w)El(g,0,-.74,.1,.12,'#6fe0e0',null)},
  ladle(g,w){g.save();g.rotate(2.34);drawIt(g,'ladle',1.2,.9,.1);g.restore();if(w)El(g,-.02,-1.02,.17,.14,'#6fe0e0',null)},
  pot(g,w){drawIt(g,'pot',1.05,.5,1);if(w)El(g,0,-.6,.34,.08,'#6fe0e0',null)},
  bucket(g,w){drawIt(g,'bucket',.8,.5,1);if(w)El(g,0,-.68,.26,.07,'#6fe0e0',null)},
  canister:g=>drawIt(g,'canister',.85,.5,1),
  axe(g){g.save();g.rotate(-.64);drawIt(g,'axe',1.1,.06,.96);g.restore()},
  hose:g=>drawIt(g,'hose',1,.5,.7),
  berries:handIt('berries',.6),fish:handIt('fishRaw',.66),food:handIt('fishCooked',.74),herring:handIt('herring',.7),perch:handIt('perch',.74),pike:handIt('pike',.86),eel:handIt('eel',.7),ray:handIt('ray',.74),angler:handIt('angler',.74),
  holy:handIt('holy',.36),wood:handIt('logs0',.7),tmap:handIt('tmap',.66),key:handIt('key',.42),skates:handIt('skates',.72),
};

/* ---------- главный герой: кадры из листа, предметы дорисовываются в лапе ---------- */
const INK2='#17121a';
function lampAt(g,x,y,on){
  if(on){const k=g.createRadialGradient(x,y+.12,.02,x,y+.12,.6);k.addColorStop(0,'rgba(255,220,130,.8)');k.addColorStop(1,'rgba(255,200,90,0)');g.fillStyle=k;g.fillRect(x-.6,y-.5,1.2,1.2)}
  drawIt(g,on?'lanternOn':'lanternOff',.42,.5,.08,x,y-.3);
}
ITEM_DRAW.lantern=(g,on)=>lampAt(g,0,.3,on);
const heroImg=new Image();heroImg.src=HERO_SHEET;
/* метров на пиксель в каждой группе: листы нарисованы в разном масштабе, а капюшон должен быть одного размера */
const HK={idle:.0124,spIdle:.0135,wIdle:.0135,walkS:.0125,spWalkS:.0125,wWalkS:.0125,wRunS:.0125,spRunS:.0125,runS:.00966,walkD:.0134,walkU:.0134,spWalkD:.0134,spWalkU:.0134,runD:.0134,runU:.0134,spRunD:.0134,spRunU:.0134,wWalkD:.0134,wWalkU:.0134,wRunD:.0134,scS:.0117,scD:.0117,scU:.0117,poS:.0117,poD:.0117,poU:.0117};
function frameDraw(g,group,i){const l=HF[group],f=l[i%l.length],k=HK[group];g.drawImage(heroImg,f.x,f.y,f.w,f.h,-f.ax*k,-f.ay*k,f.w*k,f.h*k)}
/* где лапа относительно ступней и как держать предмет */
const HAND={down:[.86,-.96],up:[.86,-.96],side:[.1,-1.12],run:[.16,-1.1],atk:[.6,-.9]};
const SMALL={spoon:1,ladle:1},HANGS={pot:.62,bucket:.72,canister:1};
function holdItem(g,o,view,x0,y0,mirror){
  const it=ITEM_DRAW[o.item];if(!it)return;
  const tool=TOOLS[o.item],small=SMALL[o.item],full=tool&&o.water;
  let [x,y]=[x0,y0],a=.18,drop=0;
  if(o.pose==='scoop'){a=2.5;y+=.35;x+=.1}
  else if(o.pose==='pour'){a=1.9;y-=.2;x+=.12}
  else if(o.pose==='chop'){a=.9;y-=.42;x+=.1}
  else if(full&&small){ /* полная ложка лежит ровно, бережно на вытянутой лапе */
    a=1.5708;y=-1.02;x=view==='down'?-.34:view==='run'?.34:.2;
    a+=Math.sin(o.wobble||0)*.03;
  }
  else if(full){a=Math.sin(o.wobble||0)*.03;drop=HANGS[o.item]||0;y=-1.02;x=view==='down'?.3:view==='up'?.3:.5} /* полная тара висит прямо */
  else if(tool){a=small?2.3:.32;drop=small?0:(HANGS[o.item]||0)*.9;y=small?-.86:-.98} /* пустая болтается свободно */
  else if(o.item==='lantern'){a=0}
  else if(o.item==='axe'){a=-.55;y=-1.08;x-=.1} /* топор на плече */
  else if(o.item==='hose'){a=0;y=-1.3;x=.1} /* бухта шланга через плечо */
  else{a=0;y-=.04} /* еда, дрова, ключ и остальное просто в лапе */
  g.save();g.translate(x*(mirror?-1:1),y);g.scale(mirror?-1:1,1);g.rotate(a);g.translate(0,drop);it(g,o.water);g.restore();
  El(g,x*(mirror?-1:1),y,.1,.09,'#8d88a4',INK2,.03);
}
const HERO_W=6,HERO_H=4.5;
function drawHero(g,o){
  g.clearRect(0,0,HERO_W,HERO_H);if(!heroImg.complete)return;
  g.save();g.translate(HERO_W/2,HERO_H-.04);
  const view=o.view;
  if(o.pose==='roll'){g.save();g.translate(0,-1);g.rotate(o.rollA||0);g.translate(0,1);frameDraw(g,o.group,o.fi);g.restore();g.restore();return}
  if(o.tilt)g.rotate(o.tilt);
  const [hx,hy]=HAND[view]||HAND.side;
  if(view==='up'&&o.item)holdItem(g,o,view,hx,hy);
  frameDraw(g,o.group,o.fi);
  if(o.skates)for(const s of[-1,1])for(const k of[-.13,0,.13])El(g,s*.3+k,-.02,.055,.055,'#ffd65a',INK,.025);
  if(view!=='up'&&o.item){holdItem(g,o,view,hx,hy);if(o.dual&&view==='down')holdItem(g,o,view,hx,hy,true)}
  if(o.lamp)lampAt(g,view==='down'||view==='up'?-.86:.1,-.84,true);
  g.restore();
}
/* портрет для диалогов: голова из той же передней стойки */
function heroPortrait(px=640){
  const c=document.createElement('canvas');c.width=c.height=px;const g=c.getContext('2d');
  const bg=g.createRadialGradient(px/2,px*.4,px*.08,px/2,px/2,px*.75);bg.addColorStop(0,'#5a2a32');bg.addColorStop(1,'#120b14');g.fillStyle=bg;g.fillRect(0,0,px,px);
  const f=HF.idle[0],cx=f.x+f.ax,cy=f.y+74,r=66;g.imageSmoothingQuality='high';
  if(heroImg.complete)g.drawImage(heroImg,cx-r,cy-r,r*2,r*2,0,0,px,px);
  return c;
}
function monsterPortrait(st,shadow){
  const c=document.createElement('canvas');c.width=c.height=320;const g=c.getContext('2d');
  const bg=g.createRadialGradient(160,150,20,160,160,220);bg.addColorStop(0,'#5a2038');bg.addColorStop(1,'#120a18');g.fillStyle=bg;g.fillRect(0,0,320,320);
  if(!monImg.complete)return c;
  const f=MF[st][0],k=300/Math.max(f.w,f.h),w=f.w*k,h=f.h*k,x=160-w/2,y=320-h;
  if(shadow){const t=document.createElement('canvas');t.width=t.height=320;const q=t.getContext('2d');q.drawImage(monImg,f.x,f.y,f.w,f.h,x,y,w,h);q.globalCompositeOperation='source-in';q.fillStyle='#07040c';q.fillRect(0,0,320,320);g.drawImage(t,0,0);
    for(const s of[-1,1]){El(g,160+s*w*.17,y+h*.56,w*.05,h*.065,'#ff3a1a',null);El(g,160+s*w*.16,y+h*.54,w*.016,h*.02,'#ffe0b0',null)}}
  else g.drawImage(monImg,f.x,f.y,f.w,f.h,x,y,w,h);
  return c;
}
/* транспорт и мост */
function artCar(view){return art(5.4,4,(g,w,h)=>{
  const body='#b8392e',lite='#ff8a5a',dk='#4a1420',b=h-.2;
  const wheel=(x,y,r=.55)=>{El(g,x,y,r,r,'#1d1420');El(g,x,y,r*.62,r*.62,'#c7b48a',INK,.04);for(let i=0;i<6;i++){const a=i/6*6.28;Ln(g,[[x,y],[x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.6]],'#5a3e2c',.04)}El(g,x,y,.1,.1,'#5a3e2c',null)};
  const head=(x,y,k=1)=>{paint(g,[[x-.44*k,y+.44*k],[x-.4*k,y-.2*k],[x,y-.66*k],[x+.4*k,y-.2*k],[x+.44*k,y+.44*k]],{c:'#2a2230',l:'#6a5a78',d:'#0c0a12',n:18,len:.14,wid:.03,sharp:true});El(g,x,y+.12*k,.24*k,.2*k,'#8d88a4',null);for(const s2 of[-1,1])El(g,x+s2*.11*k,y+.04*k,.05*k,.04*k,'#ff3a1a',null);El(g,x,y+.2*k,.05*k,.04*k,'#17121a',null)};
  if(view==='side'){
    wheel(1.3,b-.5);wheel(4.1,b-.5);
    paint(g,[[1.7,b-2.5],[3.3,b-2.5],[3.9,b-1.5],[1.4,b-1.5]],{c:'#f2e6cc',l:'#ffffff',d:'#8a7a70',n:30,sharp:true,len:.5,wid:.04,ang:0});
    P(g,[[2.65,b-2.36],[3.22,b-2.36],[3.66,b-1.56],[2.65,b-1.56]],'#a8e0e8',INK,.05);
    head(3,b-1.96,.72);
    paint(g,[[.3,b-1.5],[.5,b-1.72],[1.5,b-1.72],[4.2,b-1.66],[5.1,b-1.3],[5.15,b-.8],[5,b-.55],[.3,b-.55]],{c:body,l:lite,d:dk,n:110,len:.8,wid:.05,ang:0,sharp:true,rim:'#ffc0a0'});
    Ln(g,[[2.2,b-1.6],[2.2,b-.6]],dk,.05);Ln(g,[[2.5,b-1.3],[2.85,b-1.3]],'#ffd65a',.05);
    El(g,5.02,b-1.14,.16,.2,'#ffe9a0',INK,.05);P(g,[[.2,b-.72],[.5,b-.72],[.5,b-.55],[.2,b-.55]],'#6a7080');
    wheel(1.3,b-.5,.46);wheel(4.1,b-.5,.46);
  }else{
    const back=view==='back';
    for(const s of[-1,1]){El(g,2.7+s*1.72,b-.42,.32,.5,'#1d1420')}
    paint(g,[[1.2,b-2.8],[4.2,b-2.8],[4.5,b-1.6],[.9,b-1.6]],{c:'#f2e6cc',l:'#ffffff',d:'#8a7a70',n:30,sharp:true,len:.5,wid:.04,ang:0});
    P(g,[[1.4,b-2.64],[4,b-2.64],[4.24,b-1.7],[1.16,b-1.7]],back?'#8ad0e0':'#a8e0e8',INK,.05);
    head(2.7,b-2.06,back?.86:.92);
    paint(g,[[.5,b-1.7],[4.9,b-1.7],[5,b-.5],[.4,b-.5]],{c:body,l:lite,d:dk,n:100,len:.8,wid:.05,ang:0,sharp:true,rim:'#ffc0a0'});
    if(back){P(g,[[1.9,b-1.35],[3.5,b-1.35],[3.5,b-.85],[1.9,b-.85]],'#f2e6cc',INK,.04);for(const s of[-1,1])El(g,2.7+s*1.8,b-1.2,.17,.17,'#ff5a4a',INK,.05);wheel(2.7,b-1.92,.0)}
    else{for(const s of[-1,1])El(g,2.7+s*1.72,b-1.12,.3,.3,'#ffe9a0',INK,.06);P(g,[[1.9,b-1.42],[3.5,b-1.42],[3.5,b-.72],[1.9,b-.72]],'#2a2030',INK,.05);for(let x=2.05;x<3.5;x+=.26)Ln(g,[[x,b-1.38],[x,b-.76]],'#8a90a0',.04)}
    Ln(g,[[.4,b-.52],[5,b-.52]],'#6a7080',.14);
  }
})}
const artBridge=()=>art(3.4,10,(g,w,h)=>{
  for(const x of[.24,w-.24])Ln(g,[[x,0],[x,h]],'#3a2a22',.12);
  for(let y=.14;y<h;y+=.5){const j=(R()-.5)*.16;paint(g,[[.1+j,y-.2],[w-.1+j,y-.2],[w-.1+j,y+.2],[.1+j,y+.2]],{c:'#a57a4e',l:'#f0c890',d:'#4b2d3e',n:6,sharp:true,ang:0,len:.9,wid:.03,ink:.03})}
  for(const x of[.24,w-.24]){Ln(g,[[x,0],[x,h]],'#e0cfa8',.05)}
},36);
const artPost=()=>art(.8,2.2,g=>{Ln(g,[[.4,.2],[.4,2.1]],INK,.26);Ln(g,[[.4,.2],[.4,2.1]],'#8a6242',.15);Ln(g,[[.18,.5],[.62,.5]],'#e0cfa8',.06)});

/* ---------- пещеры ---------- */
const CAVE_PAL=[['#6a5a54','#b09a80','#2a2230','#7fb069'],['#7a4a3a','#d09064','#2e1a26','#e0a040'],['#7a4048','#d87a6a','#2c1426','#ff8a5a'],['#5a4070','#a080c8','#1e1434','#8ae0c8'],['#3a4a70','#7a9ad0','#141a34','#70e0e8'],['#2a5060','#58a8b0','#0e2030','#7affd0'],['#2c2a58','#6a60c0','#0e0c28','#b08aff'],['#3a1a3a','#a04a60','#160814','#ff5a3a']];
const ROOM={w:28,d:17};
/* у каждой глубины свой оттенок поверх общих плиток подземелья, на первой глубине цвет листа */
const caveTint=(g,w,h,lv)=>{if(!(lv%8))return;g.globalCompositeOperation='source-atop';g.globalAlpha=.3;g.fillStyle=CAVE_PAL[lv%8][0];g.fillRect(0,0,w,h);g.globalAlpha=1;g.globalCompositeOperation='source-over'};
const tileFill=(g,name,x0,y0,tw,w,h)=>{const r=IT[name],th=tw*r.h/r.w;for(let y=y0;y<h;y+=th)for(let x=x0;x<w;x+=tw)g.drawImage(itemImg,r.x+2,r.y+2,r.w-4,r.h-4,x,y,tw+.03,th+.03)};
function artCaveFloor(lv){const[c,l,d,acc]=CAVE_PAL[lv%8];return art(32,21,(g,w,h)=>{
  tileFill(g,'dFloor',0,0,6.4,w,h);caveTint(g,w,h,lv);
  for(let i=0;i<46;i++)dab(g,R()*w,R()*h,.5,.14,R()*3,acc,lv%8?.22:.12);
  const v=g.createRadialGradient(w/2,h/2,6,w/2,h/2,19);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.62,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(6,3,10,.9)');g.fillStyle=v;g.fillRect(0,0,w,h);
  const b=g.createLinearGradient(0,h-3.4,0,h);b.addColorStop(0,'rgba(6,3,10,0)');b.addColorStop(1,'rgba(6,3,10,1)');g.fillStyle=b;g.fillRect(0,0,w,h);
},30)}
function artCaveWall(lv){return art(32,9,(g,w,h)=>{
  tileFill(g,'dWall',0,0,9.6,w,h);caveTint(g,w,h,lv);
  const sh=g.createLinearGradient(0,0,0,h);sh.addColorStop(0,'rgba(0,0,0,.6)');sh.addColorStop(.5,'rgba(0,0,0,.08)');sh.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=sh;g.fillRect(0,0,w,h);
},36)}
const artCaveFront=lv=>art(36,5,(g,w,h)=>{
  const r=IT.dFront;for(let x=-2,i=0;x<w;i++){const tw=7.4+R()*2.6,th=tw*r.h/r.w,flip=i%2;g.save();g.translate(x+(flip?tw:0),h-th);g.scale(flip?-1:1,1);g.drawImage(itemImg,r.x,r.y,r.w,r.h,0,0,tw,th);g.restore();x+=tw*.82}
  g.globalCompositeOperation='source-atop';g.fillStyle='rgba(6,3,10,.5)';g.fillRect(0,0,w,h);
  const b=g.createLinearGradient(0,h*.45,0,h);b.addColorStop(0,'rgba(0,0,0,0)');b.addColorStop(1,'#000');g.fillStyle=b;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
},30);
function sheetArtTint(name,wm,lv){const r=IT[name];return art(wm,wm*r.h/r.w,(g,w,h)=>{g.drawImage(itemImg,r.x,r.y,r.w,r.h,0,0,w,h);caveTint(g,w,h,lv)},50)}
function artPillar(lv){const r=IT.dPillar,a=art(3.6,3.6*r.h/r.w,(g,w,h)=>{g.drawImage(itemImg,r.x,r.y,r.w,r.h,0,0,w,h);caveTint(g,w,h,lv)},60);return a}
const artSplat=c=>art(3,2,g=>{for(let i=0;i<16;i++)El(g,1.5+(R()-.5)*2.2,1+(R()-.5)*1.2,.1+R()*.34,.08+R()*.2,c,null)});
const artSlam=()=>art(8,8,g=>{g.strokeStyle='#fff6c8';g.lineWidth=.3;g.beginPath();g.arc(4,4,3.5,0,6.283);g.stroke();for(let i=0;i<40;i++){const a=R()*6.28,r=2.6+R()*1.2;dab(g,4+Math.cos(a)*r,4+Math.sin(a)*r,.9,.1,a+1.57,R()<.5?'#ffd65a':'#ff8a3a',.8)}},32);
function drawEnemyArt(kind,f){
  if(kind==='grub')return art(3,2.4,(g,w,h)=>{
    const sq=f?.92:1.06,b=h-.2;
    for(let i=0;i<4;i++)Ln(g,[[.8+i*.5,b-.2],[.7+i*.5+(f?.1:-.1),b]],INK,.08);
    paint(g,ell(1.5,b-.74*sq,1.2/sq,.72*sq,18),{c:'#e0b4b0',l:'#fff0e4',d:'#8a4a70',n:80,len:.4,wid:.07,ang:1.4,rim:'#fff6e8'});
    for(let i=1;i<5;i++)Ln(g,[[.4+i*.46,b-1.4*sq+.12],[.5+i*.42,b-.08]],rgba('#8a4a70',.55),.04);
    El(g,2.26,b-.76*sq,.36,.42,'#3a0f1c');for(let i=0;i<8;i++){const a=i/8*6.28;P(g,[[2.26+Math.cos(a)*.34,b-.76*sq+Math.sin(a)*.4],[2.26+Math.cos(a+.3)*.34,b-.76*sq+Math.sin(a+.3)*.4],[2.26+Math.cos(a+.15)*.16,b-.76*sq+Math.sin(a+.15)*.2]],'#fff6e0',null)}
  });
  if(kind==='spitter')return art(2.8,3.2,(g,w,h)=>{
    const b=h-.15;
    paint(g,[[.9,b],[.78,b-1],[1.02,b-1.7],[1.78,b-1.7],[2.02,b-1],[1.9,b]],{c:'#c8bfa8',l:'#fff6e0',d:'#5a4a70',n:40,len:.4,wid:.06,ang:1.5});
    paint(g,[[.1,b-1.4],[.4,b-2.3],[1.4,b-2.8-(f?.1:0)],[2.4,b-2.3],[2.7,b-1.4],[1.4,b-1.6]],{c:'#3a8a7a',l:'#a0ffe0',d:'#123a4a',n:60,len:.4,wid:.08,rim:'#d8fff0'});
    for(const[x,y]of[[.8,b-2],[1.5,b-2.4],[2,b-1.9]])El(g,x,y,.14,.1,'#a0ffe0',null);
    El(g,1.4,b-1.2,.26,.26,'#0c2028');El(g,1.4,b-1.2,.13,.13,'#7affe0',null);
  });
  if(kind==='hopper')return art(3.4,2.8,(g,w,h)=>{
    const b=h-.1,up=f?.3:0;
    for(const s of[-1,1])for(const k of[0,1,2]){const p=[[1.7+s*.5,b-1-up],[1.7+s*(1.1+k*.26),b-1.7+k*.24-up],[1.7+s*(1.26+k*.28),b]];Ln(g,p,INK,.16);Ln(g,p,'#3a5aa0',.08)}
    paint(g,ell(1.7,b-1.1-up,.86,.62,16),{c:'#2c4a8a',l:'#8ac0ff',d:'#141a4a',n:60,len:.3,wid:.07,rim:'#c0e0ff'});
    El(g,1.7,b-1.1-up,.3,.3,'#fff0e4');El(g,1.7,b-1.08-up,.15,.17,'#ff3a1a');El(g,1.7,b-1.08-up,.07,.1,'#120810',null);
  });
  return art(6.4,6.4,(g,w,h)=>{
    const b=h-.2,sq=f?.97:1.02;
    for(const s of[-1,1]){paint(g,[[3.2+s*1.5,b-3],[3.2+s*2.8,b-2.2],[3.2+s*2.7,b-.5],[3.2+s*2.1,b-.3],[3.2+s*1.9,b-1.6],[3.2+s*1.2,b-2]],{c:'#4a4470',l:'#b0a0e0',d:'#141034',n:50,sharp:true,len:.5,wid:.1,ang:1.3,rim:'#d8c8ff'})}
    paint(g,[[1.5,b-.1],[1.1,b-2.4*sq],[1.7,b-4.2*sq],[3.2,b-4.9*sq],[4.7,b-4.2*sq],[5.3,b-2.4*sq],[4.9,b-.1]],{c:'#3a3460',l:'#a090d8',d:'#100c2a',n:220,len:.7,wid:.14,ang:1.2,rim:'#d8c8ff'});
    for(let i=0;i<10;i++){const x=1.9+R()*2.6,y=b-.6-R()*3.2;Ln(g,[[x,y],[x+.3*(R()-.5),y+.4],[x+.3*(R()-.5),y+.8]],'#7affe0',.06)}
    for(const s of[-1,1]){P(g,[[3.2+s*.8,b-4.2*sq],[3.2+s*1.4,b-5.9*sq],[3.2+s*1.5,b-3.9*sq]],'#efe4c8');El(g,3.2+s*.62,b-3.3*sq,.28,.2,'#ff3a1a',INK,.05)}
    P(g,[[2.1,b-2.3],[4.3,b-2.3],[3.9,b-1.2],[2.5,b-1.2]],'#1a0a14');for(let i=0;i<7;i++){const x=2.25+i*.32;P(g,[[x-.1,b-2.3],[x+.1,b-2.3],[x,b-1.85]],'#fff6e0',null)}
  });
}
