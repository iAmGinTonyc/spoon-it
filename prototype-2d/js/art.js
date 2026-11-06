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
const TREE_PAL=[['#163f48','#2a7a5c','#79c75c','#ffe680'],['#1c3f5e','#2f8f7a','#8fdc8a','#fff2a0'],['#5a2340','#c2562e','#f5b53a','#ffe9a0'],['#1b4a3a','#3c8f3f','#b4d94e','#fff2a0']];
function artTree(seed,pal){return art(7.4,9.2,(g,w,h)=>{
  const cx=w/2,b=h-.25,[d,c,l,rim]=pal,tw=(R()-.5)*.7;
  paint(g,[[cx-.7,b],[cx-.32,b-.9],[cx-.36+tw*.5,b-2.6],[cx-1+tw,b-4],[cx-.7+tw,b-4.2],[cx-.04+tw*.6,b-3.3],[cx+.36+tw,b-4.5],[cx+.7+tw,b-4.3],[cx+.34+tw*.5,b-2.6],[cx+.32,b-.9],[cx+.78,b],[cx+.14,b-.14],[cx-.2,b-.12]],
    {c:'#80553a',l:'#c99a68',d:'#35213a',n:90,len:.6,wid:.05,ang:1.5,rim:'#ffd79a',sharp:false});
  const top=b-5.2,back=[[-1.8,.55,1.5,1.1],[1.8,.5,1.5,1.15],[0,-.9,1.9,1.3]],mid=[[-1.25,-.35,1.3,1],[1.25,-.3,1.3,1],[0,.65,1.55,1]],front=[[-.65,-1.05,1,.72],[.75,-.8,.95,.7],[-.15,.05,1.15,.72]];
  for(const[x,y,rx,ry]of back)paint(g,clump(cx+x,top+y,rx,ry),{c:d,l:c,d:mixc(d,'#160f30',.5),n:70,len:.3,wid:.1,ink:LW});
  for(const[x,y,rx,ry]of mid)paint(g,clump(cx+x,top+y,rx,ry),{c:c,l:l,d:d,n:110,len:.28,wid:.1,ink:LW,rim:rgba2(rim)});
  for(const[x,y,rx,ry]of front)paint(g,clump(cx+x,top+y,rx,ry),{c:mixc(c,l,.45),l:rim,d:c,n:100,len:.24,wid:.09,ink:LW*.8,rim});
  for(let i=0;i<34;i++)dab(g,cx+(R()-.5)*5.4,top+(R()-.5)*3.8,.2,.07,R()*6,R()<.5?rim:l,.55);
})}
const rgba2=c=>c;
function artPalm(seed){return art(8,8.6,(g,w,h)=>{
  const cx=w/2,b=h-.2,lean=(R()-.5)*1.6,tx=cx+lean,ty=b-5.1;
  const trunk=[[cx-.42,b],[cx+lean*.1-.3,b-2],[cx+lean*.45-.22,b-3.8],[tx-.16,ty],[tx+.16,ty],[cx+lean*.45+.2,b-3.8],[cx+lean*.1+.32,b-2],[cx+.46,b]];
  paint(g,trunk,{c:'#a57a4e',l:'#e8c088',d:'#4b2d3e',n:80,len:.5,wid:.05,ang:0,rim:'#ffe2ac'});
  for(let i=1;i<9;i++){const t=i/9,x=cx+lean*t*t;Ln(g,[[x-.3+t*.1,b-t*5.1],[x+.3-t*.1,b-t*5.1+.09]],'#5e3a30',.05)}
  for(const[o,col]of[[.2,'#1d5a50'],[.9,'#2f9a68'],[1.6,'#6fd06a']]){
    for(let i=0;i<4;i++){
      const a=i/4*6.28+o+R()*.3,len=2.5+R()*.8,ex=tx+Math.cos(a)*len,ey=ty+Math.sin(a)*len*.5+.9,mx=tx+Math.cos(a)*len*.55,my=ty+Math.sin(a)*len*.35-.7;
      const pts=[];for(let k=0;k<=8;k++){const t=k/8,q=1-t;pts.push([q*q*tx+2*q*t*mx+t*t*ex,q*q*ty+2*q*t*my+t*t*ey-(k%2?.13:0)])}
      for(let k=8;k>=0;k--){const t=k/8,q=1-t;pts.push([q*q*tx+2*q*t*mx+t*t*ex,q*q*ty+2*q*t*(my+.75)+t*t*ey+(k%2?.14:0)])}
      paint(g,pts,{c:col,l:'#ffe680',d:'#123a44',n:30,len:.3,wid:.05,ang:a,sharp:true});
    }
  }
  El(g,tx-.2,ty+.2,.16,.16,'#7a4a30');El(g,tx+.2,ty+.26,.16,.16,'#8a5a38');
})}
function artBush(berries){return art(3.4,2.8,(g,w,h)=>{
  for(const[x,y,rx,ry,c,l]of[[.95,1.75,.72,.6,'#17474a','#2a7a5c'],[2.45,1.75,.72,.6,'#17474a','#2a7a5c'],[1.7,1.3,.98,.82,'#2a7a5c','#8fdc5a'],[1.25,1.9,.66,.5,'#3c9a58','#c6ee6a'],[2.1,1.9,.66,.5,'#3c9a58','#c6ee6a']])
    paint(g,clump(x,y,rx,ry,10,.12),{c,l,d:'#123a44',n:44,len:.2,wid:.07,rim:'#fff2a0'});
  if(berries)for(const[x,y]of[[1.15,1.35],[1.85,1.05],[2.35,1.7],[.95,1.85],[1.6,1.9],[2.05,1.5],[1.4,1.6]]){El(g,x,y,.14,.14,'#d62a50',INK,.05);El(g,x-.04,y-.05,.045,.045,'#ffc0c8',null)}
})}
const artStump=()=>art(2,1.4,g=>{paint(g,[[.35,1.25],[.42,.6],[1.58,.6],[1.65,1.25],[1.1,1.32]],{c:'#7a5238',l:'#c99a68',d:'#35213a',n:30,len:.4,wid:.05,ang:1.5});El(g,1,.58,.62,.27,'#d9b184');El(g,1,.58,.34,.14,null,'#9a6e44',.04);El(g,1,.58,.14,.06,null,'#9a6e44',.04)});

/* ---------- камни, дно, мелочи ---------- */
function artRock(w0,dark,moss){return art(w0,w0*.82,(g,w,h)=>{
  const c=dark?'#2f2a3e':'#8d8a98',l=dark?'#6a5f8a':'#e6ddc8',d=dark?'#120e1e':'#3a3454';
  const n=9,pts=[[w*.05,h-.08]];for(let i=0;i<=n;i++){const t=i/n;pts.push([w*.07+w*.86*t,h-.14-Math.sin(t*3.14)*h*(.62+R()*.26)])}pts.push([w*.95,h-.08]);
  paint(g,pts,{c,l,d,n:Math.round(w0*w0*22),len:.36,wid:.09,sharp:true,ang:1.1,rim:dark?'#9a8ad0':'#fff0cc'});
  for(let i=0;i<3;i++){const x=w*(.25+R()*.5),y=h*(.35+R()*.3);Ln(g,[[x,y],[x+.18,y+.2],[x+.08,y+.42]],INK,.04)}
  if(moss)for(let i=0;i<26;i++)dab(g,w*(.15+R()*.7),h*(.08+R()*.3),.22,.08,-.3+R(),R()<.5?'#6fb94e':'#3c8f4f',.8);
})}
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
const artTuft=()=>art(1.3,1.1,g=>{for(let i=0;i<7;i++){const a=.15+i*.17,x=a*1.5,y=.1+R()*.3;Ln(g,[[.65,1],[x,y]],INK,.11)}for(let i=0;i<7;i++){const a=.15+i*.17,x=a*1.5,y=.14+R()*.3;Ln(g,[[.65,1],[x,y]],i%2?'#8fdc5a':'#3c9a58',.055)}});
const artFlower=c=>art(1.2,1.3,g=>{for(const[x,h2]of[[.3,.55],[.62,.85],[.92,.5]]){Ln(g,[[x,1.25],[x,1.25-h2]],'#2f7a4f',.05);for(let i=0;i<5;i++){const a=i/5*6.28;El(g,x+Math.cos(a)*.1,1.25-h2+Math.sin(a)*.1,.08,.08,c,INK,.025)}El(g,x,1.25-h2,.05,.05,'#ffe680',null)}});
const artFern=()=>art(1.8,1.3,g=>{for(let i=-3;i<=3;i++){const a=i*.34-1.57;const pts=[[.9,1.25],[.9+Math.cos(a)*.42,1.25+Math.sin(a)*.5],[.9+Math.cos(a)*.86,1.25+Math.sin(a)*.86+.14]];Ln(g,pts,INK,.14);Ln(g,pts,i%2?'#3c9a58':'#7ac75a',.07)}});
const artMush=(c='#d6404a',glow)=>art(1.5,1.3,g=>{for(const[x,y,s]of[[.45,1.2,.72],[1,1.2,1],[.76,1.25,.5]]){P(g,[[x-.07*s,y],[x-.05*s,y-.5*s],[x+.05*s,y-.5*s],[x+.07*s,y]],'#f1e4cc',INK,.04);paint(g,[[x-.34*s,y-.46*s],[x-.2*s,y-.8*s],[x+.2*s,y-.8*s],[x+.34*s,y-.46*s]],{c,l:glow?'#d8fff0':'#ffb0a0',d:'#3a1a4a',n:10,len:.14,wid:.05,ink:.04});if(!glow)for(const[a,b]of[[-.12,-.64],[.1,-.6],[0,-.72]])El(g,x+a*s,y+b*s,.035,.03,'#fff4e0',null)}});
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
const artFence=()=>art(3.2,1.7,g=>{for(const y of[.72,1.18])paint(g,[[.1,y],[3.1,y-.05],[3.1,y+.14],[.1,y+.19]],{c:'#a57a4e',n:8,sharp:true,ang:0,ink:.05});for(const x of[.4,1.6,2.8])paint(g,[[x-.13,1.6],[x-.13,.34],[x,.16],[x+.13,.34],[x+.13,1.6]],{c:'#8a6242',l:'#d7ab74',d:'#3a2238',n:8,sharp:true,ang:1.57,len:.4,ink:.05})});
const artSign=()=>art(2,2.4,g=>{Ln(g,[[1,.6],[1,2.3]],INK,.24);Ln(g,[[1,.6],[1,2.3]],'#8a6242',.13);paint(g,[[.2,.36],[1.64,.26],[1.92,.62],[1.64,.98],[.2,.94]],{c:'#b58a5a',l:'#ffe0a8',d:'#5a3a3a',n:18,sharp:true,ang:0,len:.5,wid:.04});for(const y of[.5,.66,.8])Ln(g,[[.42,y],[1.4,y-.02]],'#4b2d30',.035)});
const artBarrel=()=>art(1.6,1.9,g=>{paint(g,[[.28,1.8],[.14,1],[.3,.2],[1.3,.2],[1.46,1],[1.32,1.8]],{c:'#94643e',l:'#e0ae72',d:'#3a2238',n:36,len:.6,wid:.05,ang:1.57});for(const y of[.5,1.5])Ln(g,[[.2,y],[1.4,y]],'#3f4250',.1);El(g,.8,.22,.5,.13,'#5a3e2c')});
const artLogs=()=>art(2.8,1.7,g=>{for(const[x,y]of[[.6,1.3],[1.4,1.3],[2.2,1.3],[1,.82],[1.8,.82],[1.4,.36]]){El(g,x,y,.4,.38,'#7a5238');El(g,x,y,.27,.25,'#d9b184',INK,.03);El(g,x,y,.12,.11,null,'#9a6e44',.03)}});
const artWell=()=>art(3,3.6,g=>{paint(g,[[.4,3.4],[.4,2.2],[2.6,2.2],[2.6,3.4]],{c:'#8d8a98',l:'#e6ddc8',d:'#3a3454',n:50,sharp:true,ang:0,len:.4,wid:.08});El(g,1.5,2.2,1.1,.3,'#2a3a50');El(g,1.5,2.22,.8,.18,'#5fb9c4',null);for(const x of[.55,2.45])Ln(g,[[x,2.2],[x,.9]],INK,.2),Ln(g,[[x,2.2],[x,.9]],'#8a6242',.1);paint(g,[[.1,1],[1.5,.1],[2.9,1],[2.5,1.2],[.5,1.2]],{c:'#8c4b3f',l:'#ff9a6a',d:'#3a1a3a',n:30,sharp:true,len:.3});Ln(g,[[1.5,1.1],[1.5,1.9]],'#c7b48a',.04)});
const artTent=()=>art(4.2,3.2,g=>{paint(g,[[.2,3],[2.1,.2],[4,3]],{c:'#c8693a',l:'#ffd08a',d:'#5a2a4a',n:60,sharp:true,ang:1.1,len:.6,wid:.06,rim:'#ffe6b0'});P(g,[[1.6,3],[2.1,1.1],[2.6,3]],'#1d1420')});
const artCart=()=>art(3.6,2.4,g=>{paint(g,[[.4,.5],[3.2,.5],[3,1.5],[.6,1.5]],{c:'#8a6242',n:30,sharp:true,ang:0,len:.5,wid:.05});Ln(g,[[3.1,1.3],[3.55,.5]],'#8a6242',.14);for(const x of[1,2.5]){El(g,x,1.75,.5,.5,'#5a3e2c');El(g,x,1.75,.34,.34,null,'#8a6242',.05);El(g,x,1.75,.08,.08,'#3a2238',null)}for(let i=0;i<10;i++)El(g,.9+R()*1.8,.5-R()*.2,.14,.14,'#a7d9f5',INK,.03)});
const artClothes=()=>art(5,3,g=>{for(const x of[.3,4.7])Ln(g,[[x,2.9],[x,.5]],INK,.2),Ln(g,[[x,2.9],[x,.5]],'#8a6242',.1);g.beginPath();g.moveTo(.3,.6);g.quadraticCurveTo(2.5,1.1,4.7,.6);g.strokeStyle=INK;g.lineWidth=.04;g.stroke();for(const[x,c,h2]of[[1.2,'#d6404a',1],[2.3,'#e8d9b0',.8],[3.4,'#3a7ab0',1.1]])paint(g,[[x-.36,.84],[x+.36,.84],[x+.3,.86+h2],[x-.3,.86+h2]],{c,n:12,sharp:true,ang:1.57,len:.4,wid:.05,ink:.05})});
const artLamp=()=>art(1.1,3.2,g=>{Ln(g,[[.55,1],[.55,3.1]],INK,.2);Ln(g,[[.55,1],[.55,3.1]],'#4a4250',.1);P(g,[[.3,.5],[.8,.5],[.72,1],[.38,1]],'#ffdf8a');P(g,[[.22,.5],[.55,.18],[.88,.5]],'#3a3444')});
const artNet=()=>art(3.4,2.6,g=>{for(const x of[.3,3.1])Ln(g,[[x,2.5],[x,.3]],INK,.18),Ln(g,[[x,2.5],[x,.3]],'#8a6242',.09);Ln(g,[[.3,.4],[3.1,.4]],'#8a6242',.09);g.strokeStyle='rgba(236,226,201,.7)';g.lineWidth=.025;for(let i=0;i<9;i++){g.beginPath();g.moveTo(.45+i*.3,.45);g.lineTo(.6+i*.25,1.9);g.moveTo(.45+i*.3,.45+.14*i);g.lineTo(3,.45+.14*i);g.stroke()}});
const artScare=()=>art(2.4,3.2,g=>{Ln(g,[[1.2,.8],[1.2,3.1]],INK,.2);Ln(g,[[1.2,.8],[1.2,3.1]],'#8a6242',.1);Ln(g,[[.2,1.3],[2.2,1.3]],'#8a6242',.1);paint(g,[[.7,1.1],[1.7,1.1],[1.9,2.2],[.5,2.2]],{c:'#6a4a80',n:16,sharp:true,ink:.05});paint(g,ell(1.2,.72,.36,.36,10),{c:'#d8b070',n:8,ink:.05});P(g,[[.62,.54],[1.2,.06],[1.78,.54]],'#3a2a30',INK,.05)});
const artHive=()=>art(1.3,1.6,g=>{for(let i=0;i<5;i++)El(g,.65,.3+i*.26,.3+Math.sin(i/4*3.14)*.3,.17,i%2?'#e8a93e':'#f6c95a',INK,.04);El(g,.65,1,.09,.1,'#1d1420',null)});
/* дом сказочной кривизны */
const artHouse=()=>art(11.4,10.4,(g,w,h)=>{
  const b=h-.1,x0=.9,x1=w-.9;
  paint(g,[[x1-1.6,1.1],[x1-1.7,.1],[x1-.7,.05],[x1-.62,1.5]],{c:'#a27360',l:'#ffc79a',d:'#4a2a3a',n:30,sharp:true,len:.3,ang:0});
  paint(g,[[x0,b],[x0+.1,b-3.4],[x1-.1,b-3.5],[x1,b]],{c:'#b58254',l:'#ffd59a',d:'#4b2d3e',n:130,len:.9,wid:.05,ang:1.56,sharp:true});
  for(let x=x0+.55;x<x1;x+=.6)Ln(g,[[x,b-.05],[x+.02,b-3.35]],'#6b4630',.045);
  paint(g,[[4.75,b],[4.7,b-2.3],[5.7,b-2.75],[6.7,b-2.3],[6.65,b],[5.7,b+.02]],{c:'#2a1e2c',l:'#5a3a3a',d:'#120a14',n:16,sharp:true,ink:.11});
  for(const x of[1.9,8.2]){paint(g,[[x,b-1.1],[x+.02,b-2.4],[x+1.3,b-2.45],[x+1.32,b-1.1]],{c:'#ffd77a',l:'#fff2c0',d:'#e88a3a',n:16,sharp:true,ink:.1});Ln(g,[[x+.66,b-1.1],[x+.66,b-2.4]],INK,.07);Ln(g,[[x,b-1.75],[x+1.3,b-1.75]],INK,.07);
    paint(g,[[x-.14,b-1.1],[x+1.46,b-1.1],[x+1.36,b-.8],[x-.04,b-.8]],{c:'#7a5238',n:6,sharp:true,ink:.05});for(let i=0;i<14;i++)El(g,x+R()*1.3,b-1.14-R()*.2,.09,.09,R()<.5?'#e04a60':R()<.5?'#ffd24a':'#5fbf5a',null)}
  /* толстая соломенная крыша с волнистым краем */
  const roof=[[.1,b-2.9],[.7,b-3.05],[1.9,.9],[3.2,.5],[5.7,.3],[8.2,.5],[9.5,.9],[w-.7,b-3.05],[w-.1,b-2.9],[w-1.5,b-2.65],[w-3,b-2.85],[w-4.4,b-2.62],[5.7,b-2.85],[4.3,b-2.62],[3,b-2.85],[1.5,b-2.65]];
  paint(g,roof,{c:'#c2873c',l:'#ffe08a',d:'#5a2a3a',n:420,len:.8,wid:.06,ang:1.35,rim:'#fff0b0'});
  for(let i=0;i<5;i++){const y=1.3+i*1.15;for(let x=1.4;x<w-1.2;x+=.9+R()*.5)Ln(g,[[x,y+R()*.3],[x+(x-5.7)*.05,y+.5+R()*.2]],rgba('#5a2a3a',.6),.04)}
  for(let i=0;i<26;i++)dab(g,1.5+R()*8.4,b-3-R()*1.2,.3,.1,-.2,'#6fa84e',.8);
},56);
const artFloor=()=>art(9.6,7.6,(g,w,h)=>{
  g.fillStyle='#c79460';g.fillRect(0,0,w,h);
  for(let i=0;i<220;i++)dab(g,R()*w,R()*h,.9,.06,(R()-.5)*.1,R()<.5?'#e2b27e':'#a87a4e',.5);
  for(let y=.55;y<h;y+=.62){g.fillStyle='#7d5636';g.fillRect(0,y,w,.045)}
  for(let i=0;i<30;i++){const y=(i%12)*.62+.1,x=(i*2.7)%w;g.fillStyle='#7d5636';g.fillRect(x,y,.045,.5)}
  El(g,4.7,1.1,3,1.7,'#9a3f46',null);El(g,4.7,1.1,2.5,1.3,null,'#f2d08a',.07);El(g,4.7,1.1,2,1,null,'#f2d08a',.03);
  g.strokeStyle='#3a2230';g.lineWidth=.34;g.strokeRect(.15,.15,w-.3,h-.3);
});
const artBackWall=()=>art(9.6,2.5,(g,w,h)=>{
  paint(g,[[.02,h-.02],[.02,.1],[w-.02,.1],[w-.02,h-.02]],{c:'#a07048',l:'#e8b47e',d:'#4b2d3e',n:60,sharp:true,ang:1.57,len:.8,wid:.05});
  for(let x=.6;x<w;x+=.62)Ln(g,[[x,.15],[x,h-.1]],'#6b4630',.045);
  paint(g,[[6,.45],[6,1.5],[7.2,1.5],[7.2,.45]],{c:'#a8e0e8',l:'#ffffff',d:'#3a7ab0',sharp:true,n:10,ink:.08});Ln(g,[[6.6,.45],[6.6,1.5]]);Ln(g,[[6,.97],[7.2,.97]]);
  for(const[x,c]of[[1.6,'#c8693a'],[2.4,'#3a7ab0'],[3.2,'#6fa84e']])paint(g,[[x-.3,1.4],[x+.3,1.4],[x+.24,.7],[x-.24,.7]],{c,n:6,sharp:true,ink:.05});
  Ln(g,[[1.1,1.42],[3.7,1.42]],'#6b4630',.1);
});
const artBed=()=>art(2.3,3.6,g=>{paint(g,[[.1,.1],[2.2,.1],[2.2,3.5],[.1,3.5]],{c:'#6b4630',n:14,sharp:true,ang:1.57});paint(g,[[.2,1.1],[2.1,1.1],[2.1,3.4],[.2,3.4]],{c:'#b84a4a',l:'#ff9a7a',d:'#5a1a3a',n:40,sharp:true,len:.5,ang:.1});Ln(g,[[.2,1.5],[2.1,1.5]],'#7c2f33',.08);paint(g,[[.45,.25],[1.85,.25],[1.85,.95],[.45,.95]],{c:'#f6edd8',n:10,ink:.05})});
const artTable=()=>art(2.2,1.8,g=>{for(const x of[.42,1.78])Ln(g,[[x,.9],[x,1.7]],INK,.17),Ln(g,[[x,.9],[x,1.7]],'#7a5238',.08);paint(g,[[.2,.5],[2,.5],[1.86,.95],[.34,.95]],{c:'#94643e',n:14,sharp:true,ang:0,len:.5,wid:.05});El(g,1.1,.36,.16,.22,'#ffdf9e');Ln(g,[[1.1,.5],[1.1,.56]],INK,.1)});
const artChest=open=>art(1.9,1.7,g=>{
  if(open){paint(g,[[.2,.15],[1.7,.15],[1.7,.75],[.2,.75]],{c:'#94643e',n:10,sharp:true,ang:0});paint(g,[[.2,.72],[1.7,.72],[1.7,1.55],[.2,1.55]],{c:'#7a4f2e',n:10,sharp:true,ang:0});P(g,[[.35,.8],[1.55,.8],[1.55,1],[.35,1]],'#1d1420',null)}
  else{paint(g,[[.2,.62],[1.7,.62],[1.7,1.55],[.2,1.55]],{c:'#7a4f2e',l:'#c98a50',d:'#3a2238',n:14,sharp:true,ang:0,wid:.05});paint(g,[[.2,.74],[.42,.34],[.95,.2],[1.48,.34],[1.7,.74]],{c:'#94643e',l:'#e0ae72',d:'#4a2a30',n:12,sharp:true,ang:0,wid:.05});P(g,[[.8,.66],[1.1,.66],[1.1,1.05],[.8,1.05]],'#e6bb4d')}
});
const artBench=()=>art(4.2,2.7,g=>{
  for(const x of[.7,3.5])Ln(g,[[x,1.45],[x,2.55]],INK,.26),Ln(g,[[x,1.45],[x,2.55]],'#7a5238',.14);
  paint(g,[[.7,2.05],[3.5,2.05],[3.5,2.2],[.7,2.2]],{c:'#6b4630',n:6,sharp:true,ang:0,ink:.05});
  paint(g,[[.2,1.05],[4,1.05],[3.8,1.5],[.4,1.5]],{c:'#a57a4e',l:'#ffd59a',d:'#4b2d3e',n:40,sharp:true,ang:0,len:.7,wid:.05});
  paint(g,[[2.6,.55],[3.3,.55],[3.3,1.05],[2.6,1.05]],{c:'#6a7080',sharp:true,n:10});paint(g,[[2.4,.32],[3.5,.32],[3.5,.56],[2.4,.56]],{c:'#8a90a0',sharp:true,n:6});
  Ln(g,[[.8,1],[1.6,.3]],INK,.2);Ln(g,[[.8,1],[1.6,.3]],'#8a6242',.1);P(g,[[1.3,.12],[1.9,.42],[1.7,.66],[1.15,.4]],'#a4a8b6');
  El(g,2.1,.86,.22,.2,'#c8693a');
});
const artPot=()=>art(2.4,2.3,g=>{
  for(const[x,y]of[[.42,2],[1.2,2.08],[1.98,2]])paint(g,ell(x,y,.3,.18,8),{c:'#8d8a98',n:4,ink:.05});
  paint(g,[[.32,1.02],[.46,1.7],[.8,1.94],[1.6,1.94],[1.94,1.7],[2.08,1.02]],{c:'#2c2a38',l:'#7a7a9a',d:'#0c0a14',n:30,len:.4,wid:.05,ang:1.3,rim:'#c6c0e0'});
  El(g,1.2,1.02,.9,.25,'#3e3b4c');El(g,1.2,1.02,.7,.16,'#7fd9a8',null);for(let i=0;i<5;i++)El(g,.8+R()*.8,1+R()*.06,.05,.04,'#d8ffe6',null);
});
const artFire=k=>art(2.4,3.4,g=>{
  const b=3.2,s=[1,.84,1.14][k],o=[0,.11,-.1][k];
  for(const[a,c]of[[[.5,b],[1.9,b-.32]],[[.5,b-.32],[1.9,b]]]){Ln(g,[a,c],INK,.3);Ln(g,[a,c],'#7a5238',.17)}
  const fl=(w,hh,c,lean)=>{const p=[[1.2-w,b-.2],[1.2-w*1.05,b-hh*.45],[1.2-w*.4+lean,b-hh*.72],[1.2+lean*1.6,b-hh],[1.2+w*.5+lean,b-hh*.62],[1.2+w*1.05,b-hh*.38],[1.2+w,b-.2]];traceSmooth(g,p);g.fillStyle=c;g.fill()};
  fl(.8,2.5*s+.12,INK,o);fl(.72,2.4*s,'#e8502a',o);fl(.52,1.75*s,'#ff9a2e',o*.7);fl(.32,1.15*s,'#ffd65a',o*.4);fl(.14,.7*s,'#fff6c8',0);
  for(let i=0;i<4;i++)El(g,.7+R()*1,b-2.3*s-R()*.5,.05,.05,'#ffd65a',null);
});
const artCrate=()=>art(2,1.8,g=>{paint(g,[[.2,.3],[1.8,.3],[1.8,1.6],[.2,1.6]],{c:'#b5875a',l:'#ffd59a',d:'#4b2d3e',n:30,sharp:true,ang:0,len:.5,wid:.05});Ln(g,[[.26,.36],[1.74,1.54]],'#6b4630',.12);Ln(g,[[.2,.95],[1.8,.95]],'#6b4630',.08)});
const artTreasure=()=>art(2.6,2.3,g=>{
  paint(g,[[.25,1.05],[2.35,1.05],[2.35,2.15],[.25,2.15]],{c:'#6b3f26',l:'#c98a50',d:'#2a1830',n:20,sharp:true,ang:0});
  paint(g,[[.25,1.1],[.6,.46],[1.3,.25],[2,.46],[2.35,1.1]],{c:'#8a5430',l:'#ffb878',d:'#3a2030',n:16,sharp:true,ang:0});
  for(const x of[.65,1.95])Ln(g,[[x,.5],[x,2.13]],'#f2c84e',.14);P(g,[[1.08,.95],[1.52,.95],[1.52,1.48],[1.08,1.48]],'#ffe27a');
  for(let i=0;i<6;i++){const x=.5+R()*1.6,y=.6+R()*.5;Ln(g,[[x-.1,y],[x+.1,y]],'#fff6c8',.03);Ln(g,[[x,y-.1],[x,y+.1]],'#fff6c8',.03)}
});
const artInlet=()=>art(2.4,2.8,g=>{
  paint(g,[[.4,.25],[2,.25],[1.45,1.3],[.95,1.3]],{c:'#c79a50',l:'#ffe6a0',d:'#5a3a3a',n:14,sharp:true,ang:1.3});El(g,1.2,.27,.8,.17,'#3d3030');
  Ln(g,[[1.2,1.3],[1.2,2.5]],INK,.3);Ln(g,[[1.2,1.3],[1.2,2.5]],'#6f5a44',.15);El(g,1.2,2.45,.7,.24,'#4a3a2e');El(g,1.2,2.45,.38,.11,'#2a2126');
});
const artDemon=up=>art(4.4,3.6,(g,w,h)=>{
  const cx=w/2,cy=2,wy=up?-1.1:.7;
  for(const s of[-1,1]){const pts=[[cx+s*.2,cy-.25],[cx+s*1.1,cy+wy*.6-.4],[cx+s*2.05,cy+wy],[cx+s*1.5,cy+wy*.5+.3],[cx+s*1.25,cy+wy*.3+.55],[cx+s*.8,cy+.2],[cx+s*.2,cy+.3]];paint(g,pts,{c:'#3a2f4a',l:'#7a6a9a',d:'#120a1e',n:20,sharp:true,len:.4,wid:.05,ang:s*.5})}
  paint(g,[[cx-.42,cy-.3],[cx+.42,cy-.3],[cx+.14,cy+1.4],[cx,cy+1.55],[cx-.14,cy+1.4]],{c:'#151019',l:'#3a2a4a',d:'#05030a',n:10,sharp:true});
  El(g,cx,cy-.55,.46,.46,'#151019');
  g.beginPath();g.ellipse(cx,cy-1.15,.5,.14,0,.4,5.6);g.strokeStyle='#ffe9a0';g.lineWidth=.11;g.stroke();
  for(const[x,r]of[[-.17,.09],[.15,.11],[0,.06]])El(g,cx+x,cy-.58+(x===0?.18:0),r,r,'#ff3a1f',null);
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
const artGull=up=>art(1.8,1,g=>{const y=up?.2:.72;Ln(g,[[.1,y],[.5,.5],[.9,.56],[1.3,.5],[1.7,y]],INK,.15);Ln(g,[[.1,y],[.5,.5],[.9,.56],[1.3,.5],[1.7,y]],'#ffffff',.08)});
const artFly=c=>art(.7,.6,g=>{for(const s of[-1,1])El(g,.35+s*.17,.28,.16,.2,c,INK,.03);Ln(g,[[.35,.14],[.35,.44]],INK,.05)});

/* ---------- пятна на земле ---------- */
const artShadow=()=>art(2,2,g=>{const k=g.createRadialGradient(1,1,.1,1,1,1);k.addColorStop(0,'rgba(24,18,60,.55)');k.addColorStop(.7,'rgba(24,18,60,.34)');k.addColorStop(1,'rgba(24,18,60,0)');g.fillStyle=k;g.fillRect(0,0,2,2)},32);
const artRing=()=>art(3,3,g=>{for(const[r,o]of[[1.3,.5],[.85,.8],[.42,.6]]){g.strokeStyle=`rgba(232,246,240,${o})`;g.lineWidth=.1;g.beginPath();g.arc(1.5,1.5,r,.3,5.6);g.stroke()}},32);
const artFoam=()=>art(2,2,g=>{const k=g.createRadialGradient(1,1,.1,1,1,1);k.addColorStop(0,'rgba(240,250,246,.8)');k.addColorStop(1,'rgba(240,250,246,0)');g.fillStyle=k;g.fillRect(0,0,2,2)},24);
const artDig=()=>art(3,2.2,g=>{El(g,1.5,1.1,1.25,.82,'rgba(70,44,50,.55)',null);for(const[a,b,c,d]of[[.8,.55,2.2,1.65],[2.2,.55,.8,1.65]]){Ln(g,[[a,b],[c,d]],INK,.38);Ln(g,[[a,b],[c,d]],'#ffd65a',.2)}});
const artPool=()=>art(4,2.6,g=>{paint(g,clump(2,1.3,1.8,1.05,9,.1),{c:'#3fa8b0',l:'#c8fff0',d:'#1a4a70',n:30,len:.5,wid:.05,ang:.1,ink:.06});for(let i=0;i<5;i++)El(g,1+R()*2,.9+R()*.9,.2,.05,'rgba(255,255,255,.7)',null)});
const artPath=()=>art(1.6,1.1,g=>{paint(g,clump(.8,.55,.66,.42,8,.08),{c:'#b5ad9c',l:'#fff0d4',d:'#5a5070',n:14,len:.2,ink:.05})});
const artDrop=()=>art(.5,.5,g=>El(g,.25,.25,.16,.16,'#a7ecec',INK,.05));
const artBubble=()=>art(.7,.7,g=>{El(g,.35,.35,.25,.25,null,'#e6f6f2',.06);El(g,.27,.27,.05,.05,'#ffffff',null)});
const artPuff=()=>art(1.6,1.6,g=>{for(const[x,y,r,c]of[[.55,.92,.34,'#b8aec8'],[1.05,.95,.32,'#b8aec8'],[.8,.62,.4,'#d8cedc'],[.62,.72,.28,'#f6ecdc'],[.98,.7,.26,'#f6ecdc'],[.78,.5,.2,'#ffffff']]){const k=g.createRadialGradient(x,y,.02,x,y,r);k.addColorStop(0,c);k.addColorStop(.72,c);k.addColorStop(1,rgba(c,0));g.fillStyle=k;g.beginPath();g.arc(x,y,r,0,6.3);g.fill()}},40);
const artFirefly=()=>art(1,1,g=>{const k=g.createRadialGradient(.5,.5,.02,.5,.5,.5);k.addColorStop(0,'rgba(255,250,170,1)');k.addColorStop(.25,'rgba(230,240,110,.55)');k.addColorStop(1,'rgba(200,230,80,0)');g.fillStyle=k;g.fillRect(0,0,1,1)},32);
const artCrack=()=>art(12.4,9.4,(g,w,h)=>{
  const cx=w/2,cy=h/2-.1,outer=[],hole=[];
  for(let i=0;i<18;i++){const a=i/18*6.283,q=.84+hash(i,11)*.16;outer.push([cx+Math.cos(a)*5.9*q,cy+Math.sin(a)*4.4*q])}
  paint(g,outer,{c:'#8d8a98',l:'#f2e6d2',d:'#3a3454',n:260,len:.7,wid:.1,sharp:true,ang:.3,ink:.12});
  g.save();tracePoly(g,outer);g.clip();
  for(let i=0;i<9;i++){const a=i/9*6.283+hash(i,3);Ln(g,[[cx+Math.cos(a)*2.6,cy+Math.sin(a)*1.6],[cx+Math.cos(a)*6.4,cy+Math.sin(a)*4.8]],'#4a4460',.07)}
  for(let i=0;i<30;i++)dab(g,cx+(R()-.5)*11,cy+(R()-.5)*8,.4,.1,R()*3,'#5fa84e',.6);
  g.restore();
  for(let i=0;i<24;i++){const a=i/24*6.283,k=(.86+hash(i,5)*.3)*(i%2?.82:1);hole.push([Math.cos(a)*3.5*k,Math.sin(a)*2*k])}
  P(g,hole.map(p=>[cx+p[0]*1.16,cy+p[1]*1.2]),'#3e3a4c',null);
  const gr=g.createRadialGradient(cx,cy,.1,cx,cy,3.6);gr.addColorStop(0,'#ffb04a');gr.addColorStop(.2,'#f0561e');gr.addColorStop(.5,'#8a2416');gr.addColorStop(.8,'#2c1018');gr.addColorStop(1,'#120a14');
  P(g,hole.map(p=>[cx+p[0],cy+p[1]]),gr,INK,.13);
  for(let b=0;b<8;b++){const a=b/8*6.283+hash(b,6)*.5,c=Math.cos(a),s=Math.sin(a),st=1.12,len=.5+hash(b,8)*.75,pts=[];
    for(let i=0;i<=5;i++){const t=st+i/5*len;pts.push([cx+c*3.5*t+(i%2?.14:-.14)*s,cy+s*2*t+(i%2?-.1:.1)*c])}
    Ln(g,pts,INK,.11)}
});

/* ---------- зверёк ---------- */
const TIER=[{b:'#d6a878',l:'#ffe0b0',d:'#8a5a4a',ear:'#f0a08e'},{b:'#b08860',l:'#f0c890',d:'#5a3a4a',ear:'#d88a78'},{b:'#94382c',l:'#ff8a5a',d:'#3a1228',ear:'#d8604a'}];
function drawMonster(g,tier,blink,open,happy){
  g.clearRect(0,0,4,4);R=rnd(5+tier);
  const c=TIER[tier],cx=2,cy=2.2;
  for(const s of[-1,1]){paint(g,[[cx+s*.55,cy-.8],[cx+s*1.3,cy-1.75],[cx+s*1.1,cy-.45]],{c:c.b,l:c.l,d:c.d,n:12,sharp:true,len:.3});P(g,[[cx+s*.72,cy-.85],[cx+s*1.2,cy-1.45],[cx+s*1.04,cy-.62]],c.ear,null)}
  if(tier>=2)for(const s of[-1,1])paint(g,[[cx+s*.3,cy-1],[cx+s*.42,cy-1.72],[cx+s*.62,cy-.95]],{c:'#231a2c',l:'#8a6a9a',sharp:true,n:6});
  paint(g,[[cx-1.2,4],[cx-1.3,2.8],[cx-1.12,1.8],[cx-.7,1.25],[cx,1.13],[cx+.7,1.25],[cx+1.12,1.8],[cx+1.3,2.8],[cx+1.2,4]],{c:c.b,l:c.l,d:c.d,n:90,len:.34,wid:.08,ang:1.3,rim:c.l});
  El(g,cx,cy+1.15,.72,.8,rgba(c.l,.5),null);
  for(const s of[-1,1]){
    if(blink){Ln(g,[[cx+s*.3,cy-.15],[cx+s*.82,cy-.15]],INK,.1);continue}
    if(happy){g.beginPath();g.arc(cx+s*.56,cy-.1,.3,3.5,5.9);g.strokeStyle=INK;g.lineWidth=.13;g.stroke();continue}
    El(g,cx+s*.56,cy-.15,.4,.46,'#fff8ec');El(g,cx+s*.5,cy-.1,.23,.27,'#141014',null);El(g,cx+s*.42,cy-.22,.09,.09,'#ffffff',null);El(g,cx+s*.56,cy-.02,.04,.04,'#ffffff',null);
  }
  for(const s of[-1,1])El(g,cx+s*.86,cy+.28,.16,.09,'rgba(255,120,120,.55)',null);
  if(open)El(g,cx,cy+.5,.28,.3,'#3a1014');else if(happy){g.beginPath();g.arc(cx,cy+.3,.22,.2,2.94);g.strokeStyle=INK;g.lineWidth=.1;g.stroke()}else Ln(g,[[cx-.15,cy+.42],[cx+.15,cy+.42]],INK,.09);
  const sh=g.createLinearGradient(0,2.25,0,3.05);sh.addColorStop(0,'rgba(40,14,14,0)');sh.addColorStop(1,'rgba(40,14,14,1)');
  g.globalCompositeOperation='source-atop';g.fillStyle=sh;g.fillRect(0,2.25,4,1.75);g.globalCompositeOperation='source-over';
  for(const s of[-1,1]){paint(g,ell(cx+s*1.12,2.86,.34,.2,10),{c:c.b,l:c.l,d:c.d,n:6,len:.15});for(const k of[-.13,.13])Ln(g,[[cx+s*1.12+k,2.76],[cx+s*1.12+k,2.92]],INK,.05)}
}

/* ---------- предметы в лапе ---------- */
const ITEM_DRAW={
  spoon(g,w){Ln(g,[[0,0],[0,-.62]],INK,.13);Ln(g,[[0,0],[0,-.62]],'#e8e6dc',.06);El(g,0,-.74,.15,.19,'#e8e6dc',INK,.06);if(w)El(g,0,-.74,.09,.12,'#6fe0e0',null)},
  ladle(g,w){Ln(g,[[0,0],[0,-.8]],INK,.14);Ln(g,[[0,0],[0,-.8]],'#e8e6dc',.07);El(g,0,-.95,.26,.24,'#c9c7bd',INK,.07);if(w)El(g,0,-.95,.18,.15,'#6fe0e0',null)},
  pot(g,w){P(g,[[-.42,-.5],[-.34,0],[.34,0],[.42,-.5]],'#9d9fa8',INK,.08);El(g,0,-.5,.42,.12,w?'#6fe0e0':'#3e3b41',INK,.07);Ln(g,[[.42,-.42],[.68,-.5]],INK,.1)},
  bucket(g,w){P(g,[[-.42,-.62],[-.3,0],[.3,0],[.42,-.62]],'#94704e',INK,.08);El(g,0,-.62,.42,.12,w?'#6fe0e0':'#3e3b41',INK,.07);g.beginPath();g.arc(0,-.62,.42,3.14,0);g.strokeStyle=INK;g.lineWidth=.06;g.stroke()},
  canister(g){P(g,[[-.44,-.92],[-.44,0],[.44,0],[.44,-.92]],'#b53a2a',INK,.08);P(g,[[-.12,-1.08],[-.12,-.92],[.12,-.92],[.12,-1.08]],'#3a3a3a',INK,.06);Ln(g,[[-.44,-.5],[.44,-.5]],'#7c2a1e',.06)},
  axe(g){Ln(g,[[0,.05],[0,-.9]],INK,.15);Ln(g,[[0,.05],[0,-.9]],'#8a6242',.08);P(g,[[.02,-.92],[.46,-1.05],[.46,-.56],[.02,-.7]],'#b4b8c6',INK,.07)},
  hose(g){El(g,0,-.3,.42,.32,null,INK,.2);El(g,0,-.3,.42,.32,null,'#6f5a44',.11)},
  berries(g){El(g,-.1,-.18,.14,.14,'#d62a50',INK,.05);El(g,.12,-.25,.14,.14,'#d62a50',INK,.05);El(g,.02,-.05,.14,.14,'#d62a50',INK,.05)},
  fish(g){P(g,[[-.34,-.15],[.1,-.34],[.3,-.15],[.1,.02]],'#9fb3c8',INK,.06);P(g,[[.3,-.15],[.5,-.3],[.5,0]],'#7f93a8',INK,.06)},
  food(g){P(g,[[-.34,-.15],[.1,-.34],[.3,-.15],[.1,.02]],'#c0803c',INK,.06);P(g,[[.3,-.15],[.5,-.3],[.5,0]],'#8a5a2a',INK,.06)},
  holy(g){P(g,[[-.14,-.6],[.14,-.6],[.2,0],[-.2,0]],'#a7d9f5',INK,.06);P(g,[[-.07,-.78],[.07,-.78],[.07,-.6],[-.07,-.6]],'#efdfa4',INK,.05)},
  wood(g){P(g,[[-.4,-.28],[.4,-.28],[.4,-.05],[-.4,-.05]],'#8a6242',INK,.06)},
  tmap(g){P(g,[[-.3,-.5],[.3,-.5],[.3,0],[-.3,0]],'#e9d9ad',INK,.06);Ln(g,[[-.12,-.34],[.1,-.14]],'#a53a2a',.06);Ln(g,[[.1,-.34],[-.12,-.14]],'#a53a2a',.06)},
};

/* ---------- волк в чёрном костюме, валет пик ---------- */
const FUR='#e9e5e6',FURL='#ffffff',FURD='#8f889f',FURS='#4e485c',SUIT='#1d1a23',SUITL='#5d5670',SUITD='#08060c',GOLD='#eac25a';
/* тонкие волоски: случайные штрихи в овале */
function furLines(g,n,x0,y0,rx,ry,ang,spread,col,a,len=.15,lw=.014){
  g.save();g.strokeStyle=col;g.lineWidth=lw/Math.sqrt(ARTQ);g.globalAlpha=a;
  for(let i=0,c=n*ARTQ;i<c;i++){const t=R()*6.283,r=Math.sqrt(R()),x=x0+Math.cos(t)*rx*r,y=y0+Math.sin(t)*ry*r,
    A=ang===null?Math.atan2(y-y0,x-x0)+(R()-.5)*.5:ang+(R()-.5)*spread,l=len*(.6+R()*.8),b=(R()-.5)*.07;
    g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(A)*l*.5-Math.sin(A)*b,y+Math.sin(A)*l*.5+Math.cos(A)*b,x+Math.cos(A)*l,y+Math.sin(A)*l);g.stroke()}
  g.restore();
}
function banknote(g,x,y,rot,w=.46,h=.27){
  g.save();g.translate(x,y);g.rotate(rot);
  for(const[o,c]of[[.06,'#7f8e6c'],[.03,'#a3b08c'],[0,'#cdd6b4']])P(g,[[-w/2+o,-h/2+o],[w/2+o,-h/2+o],[w/2+o,h/2+o],[-w/2+o,h/2+o]],c,INK,.025);
  g.strokeStyle='#4f6040';g.lineWidth=.012;g.strokeRect(-w/2+.03,-h/2+.03,w-.06,h-.06);
  El(g,0,0,.065,.085,'#93a37c','#3f5032',.015);for(const s of[-1,1]){El(g,s*w*.33,0,.03,.03,'#7f8e6c',null);Ln(g,[[s*w*.2,-h*.28],[s*w*.4,-h*.28]],'#5f7050',.012)}
  g.restore();
}
function clawPaw(g,x,y,ang=0){
  g.save();g.translate(x,y);g.rotate(ang);
  for(const k of[-.1,0,.1])P(g,[[k-.04,-.1],[k+.04,-.1],[k,-.28]],'#17121a','#000',.012);
  paint(g,ell(0,0,.18,.17,12),{c:FUR,l:FURL,d:FURD,n:10,len:.12,wid:.025,ink:.04});
  furLines(g,10,0,0,.15,.14,null,0,'#ffffff',.8,.07,.012);
  for(const k of[-.08,0,.08])Ln(g,[[k,-.13],[k,-.05]],FURD,.012);
  g.restore();
}
function lampAt(g,x,y,on){
  if(on){const k=g.createRadialGradient(x,y,.02,x,y,.55);k.addColorStop(0,'rgba(255,220,130,.8)');k.addColorStop(1,'rgba(255,200,90,0)');g.fillStyle=k;g.fillRect(x-.55,y-.55,1.1,1.1)}
  Ln(g,[[x,y-.24],[x,y-.36]],INK,.035);
  P(g,[[x-.13,y-.18],[x+.13,y-.18],[x+.15,y+.16],[x-.15,y+.16]],on?'#ffe9a0':'#54546a',INK,.035);
  P(g,[[x-.17,y-.24],[x+.17,y-.24],[x+.13,y-.18],[x-.13,y-.18]],'#3a3444',INK,.03);
  P(g,[[x-.17,y+.16],[x+.17,y+.16],[x+.17,y+.22],[x-.17,y+.22]],'#3a3444',INK,.03);
  Ln(g,[[x,y-.16],[x,y+.14]],'#3a3444',.02);
  if(on)El(g,x,y+.02,.05,.08,'#ff9a3a',null);
}
ITEM_DRAW.lantern=(g,on)=>lampAt(g,0,-.34,on);
ITEM_DRAW.skates=g=>{P(g,[[-.3,-.42],[.1,-.42],[.14,-.16],[.36,-.1],[.36,-.04],[-.3,-.04]],'#b8392e',INK,.05);for(const x of[-.2,.05,.28])El(g,x,.03,.07,.07,'#ffd65a',INK,.03)};
function shoeAt(g,x,y,o){
  if(o.skates)for(const k of[-.15,0,.15]){El(g,x+k,y+.1,.055,.055,'#ffd65a',INK,.025)}
  paint(g,ell(x,y,.26,.135,12),{c:'#141018',l:'#8a80a0',d:'#040208',n:7,len:.12,wid:.02,ink:.04});
  Ln(g,[[x-.14,y-.03],[x+.14,y-.03]],'#6a6080',.016);El(g,x-.09,y-.05,.05,.02,'rgba(255,255,255,.55)',null);
}
function wolfEye(g,x,y,s,blink){
  if(blink){Ln(g,[[x-s*.18,y+.05],[x+s*.2,y-.1]],INK,.05);return}
  const k=g.createRadialGradient(x,y,.01,x,y,.3);k.addColorStop(0,'rgba(255,70,30,.42)');k.addColorStop(1,'rgba(255,70,30,0)');g.fillStyle=k;g.fillRect(x-.3,y-.3,.6,.6);
  const pts=[[x-s*.18,y+.06],[x-s*.03,y-.06],[x+s*.2,y-.12],[x+s*.19,y-.01],[x+s*.03,y+.08]];
  const gr=g.createRadialGradient(x,y-.02,.01,x,y-.02,.2);gr.addColorStop(0,'#ffcf5a');gr.addColorStop(.35,'#ff4a1c');gr.addColorStop(1,'#7a0810');
  P(g,pts,gr,INK,.03);
  El(g,x+s*.01,y-.02,.03,.06,'#0c0408',null);El(g,x-s*.05,y-.045,.02,.02,'#fff4e0',null);El(g,x+s*.07,y+.01,.009,.009,'#ffe0c0',null);
  Ln(g,[[x-s*.2,y+.05],[x-s*.03,y-.08],[x+s*.22,y-.13]],'#08060c',.04);
}
function wolfFront(g,cx,cy,o){
  for(const s of[-1,1]){
    paint(g,[[cx+s*.18,cy-.42],[cx+s*.3,cy-.78],[cx+s*.5,cy-1.08],[cx+s*.62,cy-.7],[cx+s*.72,cy-.28]],{c:FUR,l:FURL,d:FURD,n:22,sharp:true,len:.2,wid:.03,ang:-1.3,rim:'#ffffff'});
    paint(g,[[cx+s*.31,cy-.42],[cx+s*.41,cy-.7],[cx+s*.5,cy-.9],[cx+s*.56,cy-.62],[cx+s*.6,cy-.36]],{c:'#2a2530',l:'#6a5a6a',d:'#100c14',n:10,sharp:true,ink:0});
    furLines(g,18,cx+s*.46,cy-.44,.13,.13,-1.57-s*.25,.5,'#efe9ea',.9,.16,.012);
  }
  const m=[[.08,-.62],[.2,-.57],[.3,-.63],[.42,-.54],[.52,-.56],[.6,-.4],[.72,-.38],[.7,-.24],[.88,-.18],[.74,-.08],[.94,.04],[.76,.1],[.9,.26],[.68,.26],[.74,.42],[.54,.38],[.54,.54],[.38,.46],[.32,.66],[.17,.56],[.08,.72],[0,.62]];
  const pts=[...m.map(p=>[cx+p[0],cy+p[1]]),...m.slice(0,-1).reverse().map(p=>[cx-p[0],cy+p[1]])];
  paint(g,pts,{c:FUR,l:FURL,d:'#a8a2b6',n:150,len:.2,wid:.022,sharp:true,rad:[cx,cy+.1],rim:'#ffffff'});
  g.save();tracePoly(g,pts);g.clip();
  furLines(g,110,cx,cy+.1,.9,.72,null,0,'#ffffff',.85,.2,.015);
  furLines(g,80,cx,cy+.34,.86,.36,null,0,FURD,.5,.18,.014);
  furLines(g,60,cx,cy-.36,.16,.24,1.57,.3,FURS,.75,.17,.016);
  for(const s of[-1,1]){furLines(g,44,cx+s*.36,cy-.14,.3,.16,s>0?-.4:3.54,.45,'#2a2530',.86,.15,.02);furLines(g,26,cx+s*.62,cy+.06,.2,.2,s>0?.2:2.94,.5,FURD,.5,.16,.013)}
  g.restore();
  for(const s of[-1,1]){
    wolfEye(g,cx+s*.3,cy-.1,s,o.blink);
    P(g,[[cx+s*.05,cy-.08],[cx+s*.3,cy-.27],[cx+s*.56,cy-.36],[cx+s*.58,cy-.27],[cx+s*.3,cy-.16],[cx+s*.1,cy-.02]],'#0d0a12',null);
    furLines(g,12,cx+s*.36,cy-.3,.2,.05,s>0?-.7:3.84,.3,'#d8d2dc',.8,.12,.012);
  }
  /* купюры зажаты в уголках рта */
  banknote(g,cx-.54,cy+.44,.22);banknote(g,cx-.46,cy+.5,-.1);banknote(g,cx+.54,cy+.44,-.22);banknote(g,cx+.46,cy+.5,.1);
  /* морда с закрытой пастью */
  paint(g,[[cx-.13,cy-.12],[cx+.13,cy-.12],[cx+.2,cy+.06],[cx+.33,cy+.24],[cx+.31,cy+.4],[cx+.14,cy+.5],[cx,cy+.53],[cx-.14,cy+.5],[cx-.31,cy+.4],[cx-.33,cy+.24],[cx-.2,cy+.06]],{c:'#f6f2ee',l:FURL,d:'#b4aec0',n:44,len:.14,wid:.018,ang:1.57,ink:0});
  furLines(g,34,cx,cy+.2,.3,.26,null,0,'#ffffff',.9,.1,.012);
  furLines(g,20,cx,cy+.44,.28,.09,1.57,.8,'#a39db4',.6,.08,.012);
  furLines(g,16,cx,cy+.0,.08,.12,1.57,.2,'#c0bac8',.6,.1,.012);
  paint(g,[[cx-.14,cy+.07],[cx-.06,cy+.02],[cx+.06,cy+.02],[cx+.14,cy+.07],[cx+.1,cy+.17],[cx+.02,cy+.2],[cx,cy+.23],[cx-.02,cy+.2],[cx-.1,cy+.17]],{c:'#17121a',l:'#7a7088',d:'#060408',n:5,len:.08,wid:.015,ink:.025,sharp:true});
  for(const s of[-1,1])El(g,cx+s*.06,cy+.13,.024,.018,'#040206',null);
  El(g,cx-.04,cy+.055,.035,.014,'rgba(255,255,255,.75)',null);
  Ln(g,[[cx,cy+.22],[cx,cy+.32]],INK,.024);
  g.beginPath();g.moveTo(cx-.34,cy+.35);g.quadraticCurveTo(cx-.18,cy+.37,cx,cy+.32);g.quadraticCurveTo(cx+.18,cy+.37,cx+.34,cy+.35);g.strokeStyle=INK;g.lineWidth=.03;g.stroke();
  for(const s of[-1,1]){for(const[a,b]of[[.1,.24],[.17,.27],[.13,.19],[.21,.21]])El(g,cx+s*a,cy+b,.009,.009,'#5a5468',null);
    for(const k of[0,1,2]){g.beginPath();g.moveTo(cx+s*.2,cy+.24+k*.02);g.quadraticCurveTo(cx+s*.42,cy+.2+k*.05,cx+s*.56,cy+.26+k*.09);g.strokeStyle='rgba(240,236,240,.6)';g.lineWidth=.006;g.stroke()}}
  furLines(g,16,cx,cy+.6,.14,.1,1.57,.6,'#f4f0f2',.9,.13,.014);
}
function wolfSide(g,cx,cy,o){
  paint(g,[[cx-.32,cy-.42],[cx-.2,cy-1.04],[cx+.16,cy-.46]],{c:FUR,l:FURL,d:FURD,n:16,sharp:true,len:.2,wid:.03,ang:-1.3,rim:'#ffffff'});
  paint(g,[[cx-.2,cy-.46],[cx-.17,cy-.84],[cx+.04,cy-.48]],{c:'#2a2530',n:6,sharp:true,ink:0});
  const pts=[[cx-.62,cy-.36],[cx-.74,cy-.26],[cx-.88,cy-.1],[cx-.68,cy-.02],[cx-.9,cy+.2],[cx-.6,cy+.22],[cx-.7,cy+.46],[cx-.34,cy+.42],[cx-.2,cy+.62],[cx+.08,cy+.46],[cx+.34,cy+.42],[cx+.82,cy+.36],[cx+.98,cy+.2],[cx+.92,cy+.04],[cx+.42,cy-.08],[cx+.3,cy-.4],[cx,cy-.58],[cx-.36,cy-.54]];
  paint(g,pts,{c:FUR,l:FURL,d:'#a8a2b6',n:130,len:.2,wid:.022,sharp:true,rad:[cx-.1,cy],rim:'#ffffff'});
  g.save();tracePoly(g,pts);g.clip();
  furLines(g,80,cx-.2,cy+.1,.75,.6,null,0,'#ffffff',.85,.2,.015);
  furLines(g,50,cx-.1,cy+.34,.8,.26,null,0,FURD,.5,.18,.014);
  furLines(g,40,cx+.24,cy-.14,.26,.16,-.2,.4,'#2a2530',.86,.15,.02);
  furLines(g,30,cx+.6,cy+.22,.38,.12,0,.3,'#ffffff',.9,.12,.012);
  g.restore();
  wolfEye(g,cx+.24,cy-.1,1,o.blink);
  P(g,[[cx+.04,cy-.24],[cx+.3,cy-.3],[cx+.46,cy-.22],[cx+.4,cy-.16],[cx+.1,cy-.16]],'#0d0a12',null);
  banknote(g,cx+.5,cy+.48,.14);banknote(g,cx+.3,cy+.52,-.14);
  g.beginPath();g.moveTo(cx+.2,cy+.38);g.quadraticCurveTo(cx+.55,cy+.4,cx+.94,cy+.3);g.strokeStyle=INK;g.lineWidth=.03;g.stroke();
  paint(g,[[cx+.82,cy+.03],[cx+.98,cy+.03],[cx+1.03,cy+.14],[cx+.94,cy+.22],[cx+.82,cy+.15]],{c:'#17121a',l:'#7a7088',n:4,len:.08,wid:.015,ink:.025,sharp:true});
  El(g,cx+.9,cy+.07,.03,.012,'rgba(255,255,255,.75)',null);El(g,cx+.96,cy+.15,.018,.014,'#040206',null);
  for(const[a,b]of[[.6,.22],[.68,.24],[.64,.17],[.74,.19]])El(g,cx+a,cy+b,.009,.009,'#5a5468',null);
}
function wolfBack(g,cx,cy){
  for(const s of[-1,1])paint(g,[[cx+s*.18,cy-.42],[cx+s*.5,cy-1.08],[cx+s*.72,cy-.28]],{c:FUR,l:FURL,d:FURD,n:18,sharp:true,len:.2,wid:.03,ang:-1.3,rim:'#ffffff'});
  const m=[[.1,-.6],[.3,-.6],[.42,-.54],[.62,-.3],[.82,-.2],[.68,-.04],[.88,.1],[.66,.2],[.74,.42],[.44,.42],[.34,.62],[.12,.54],[0,.68]];
  const pts=[...m.map(p=>[cx+p[0],cy+p[1]]),...m.slice(0,-1).reverse().map(p=>[cx-p[0],cy+p[1]])];
  paint(g,pts,{c:FUR,l:FURL,d:'#a8a2b6',n:130,len:.22,wid:.022,sharp:true,ang:1.57,rim:'#ffffff'});
  g.save();tracePoly(g,pts);g.clip();furLines(g,90,cx,cy,.85,.68,1.57,.7,'#ffffff',.85,.22,.015);furLines(g,50,cx,cy+.34,.8,.34,1.57,.6,FURD,.5,.2,.014);g.restore();
}
function wolfTail(g,x,y,lean){
  const p=[[x,y],[x+lean*.3,y-.25],[x+lean*.72,y-.3],[x+lean*.98,y-.58],[x+lean*.8,y-.12],[x+lean*.46,y+.14],[x+lean*.1,y+.18]];
  paint(g,p,{c:FUR,l:FURL,d:FURD,n:50,len:.18,wid:.022,ang:lean>0?-.5:3.6,rim:'#ffffff'});
  furLines(g,30,x+lean*.5,y-.1,.4,.2,lean>0?-.5:3.6,.5,'#ffffff',.8,.18,.014);
}
function trouser(g,x0,y0,x1,y1){Ln(g,[[x0,y0],[x1,y1]],INK,.34);Ln(g,[[x0,y0],[x1,y1]],'#1d1a23',.27);Ln(g,[[x0-.05,y0],[x1-.05,y1]],'#3a3546',.03);Ln(g,[[x0+.01,y0],[x1+.01,y1]],'#4a4458',.012)}
function suitFront(g,cx,by,withPaws){
  paint(g,[[cx-.42,by-1.46],[cx-.74,by-1.3],[cx-.8,by-.95],[cx-.72,by-.5],[cx-.62,by-.42],[cx+.62,by-.42],[cx+.72,by-.5],[cx+.8,by-.95],[cx+.74,by-1.3],[cx+.42,by-1.46]],{c:SUIT,l:SUITL,d:SUITD,n:90,len:.3,wid:.03,ang:1.4,sharp:true,rim:'#8a80a0',rimW:.05});
  furLines(g,30,cx,by-.9,.62,.42,1.5,.2,'#3a3546',.55,.22,.012);
  P(g,[[cx-.3,by-1.46],[cx,by-.76],[cx+.3,by-1.46]],'#26222e',null);
  P(g,[[cx-.17,by-1.46],[cx,by-1.02],[cx+.17,by-1.46]],'#141118',null);
  for(const s of[-1,1]){El(g,cx+s*.03,by-.95+.0,.012,.012,GOLD,null)}
  /* галстук */
  P(g,[[cx-.08,by-1.45],[cx+.08,by-1.45],[cx+.05,by-1.34],[cx-.05,by-1.34]],'#0a080e','#4a4458',.016);
  P(g,[[cx-.05,by-1.34],[cx+.05,by-1.34],[cx+.09,by-1.0],[cx,by-.88],[cx-.09,by-1.0]],'#0a080e','#4a4458',.016);
  Ln(g,[[cx-.02,by-1.3],[cx-.04,by-1]],'#5a5468',.012);
  for(const s of[-1,1]){
    paint(g,[[cx+s*.3,by-1.46],[cx+s*.52,by-1.3],[cx+s*.41,by-1.22],[cx+s*.5,by-1.13],[cx+s*.05,by-.72],[cx+s*.015,by-.8]],{c:'#2d2936',l:'#7a7090',d:'#0c0a12',n:16,sharp:true,len:.2,wid:.018,ang:s*1,ink:.028,rim:'#8a80a0',rimW:.025});
  }
  /* цепь и пиковый кулон */
  g.save();g.setLineDash([.035,.028]);Ln(g,[[cx-.3,by-1.38],[cx-.14,by-1.1],[cx,by-.96],[cx+.14,by-1.1],[cx+.3,by-1.38]],GOLD,.024);g.restore();
  const sx=cx,sy=by-.82,k=1.1;P(g,[[sx,sy-.15*k],[sx+.14*k,sy+.02*k],[sx+.065*k,sy+.09*k],[sx+.03*k,sy+.045*k],[sx+.065*k,sy+.16*k],[sx-.065*k,sy+.16*k],[sx-.03*k,sy+.045*k],[sx-.065*k,sy+.09*k],[sx-.14*k,sy+.02*k]],'#120e16',GOLD,.022);
  El(g,sx-.03,sy-.03,.012,.018,'rgba(255,240,190,.8)',null);
  /* платок, карман, пуговицы, полы */
  P(g,[[cx+.38,by-1.05],[cx+.44,by-1.13],[cx+.5,by-1.07],[cx+.55,by-1.14],[cx+.59,by-1.05]],'#f4eee2',INK,.016);
  Ln(g,[[cx+.34,by-1.04],[cx+.62,by-1.07]],'#5d5670',.02);Ln(g,[[cx-.6,by-.66],[cx-.32,by-.64]],'#47405a',.018);Ln(g,[[cx+.32,by-.64],[cx+.6,by-.66]],'#47405a',.018);
  for(const y of[.68,.57])El(g,cx+.06,by-y,.022,.022,'#0a080e','#5d5670',.012);
  Ln(g,[[cx+.03,by-.74],[cx-.1,by-.42]],'#47405a',.022);
}
function sleeve(g,x0,y0,x,y){
  Ln(g,[[x0,y0],[x,y]],INK,.33);Ln(g,[[x0,y0],[x,y]],SUIT,.25);Ln(g,[[x0-.05,y0],[x-.05,y]],'#5d5670',.022);
  const dx=x-x0,dy=y-y0,l=Math.hypot(dx,dy)||1,ax=x-dx/l*.08,ay=y-dy/l*.08;Ln(g,[[ax-dy/l*.11,ay+dx/l*.11],[ax+dy/l*.11,ay-dx/l*.11]],'#f4eee2',.06);
}
function drawHero(g,o){
  R=rnd(11);g.clearRect(0,0,3.2,3.2);
  const cx=1.6,by=3.08,st=o.step,up=o.dir==='up',side=o.dir==='side',pose=o.pose;
  if(pose==='roll'){
    g.save();g.translate(cx,by-.72);g.rotate(o.rollA||0);
    paint(g,ell(0,0,.72,.68,18),{c:SUIT,l:SUITL,d:SUITD,n:40,len:.3,wid:.03,ang:.5,rim:'#8a80a0'});
    furLines(g,30,0,0,.6,.56,null,0,'#3a3546',.5,.2,.012);
    paint(g,clump(.12,-.14,.52,.46,10,.2),{c:FUR,l:FURL,d:'#a8a2b6',n:50,len:.15,wid:.02,sharp:true,rad:[.1,-.1]});
    furLines(g,40,.12,-.14,.46,.4,null,0,'#ffffff',.85,.14,.013);
    El(g,.32,-.2,.07,.05,'#ff3a1a',null);P(g,[[-.5,.2],[-.1,.5],[.1,.3]],GOLD,null);
    g.restore();return;
  }
  const lean=pose==='atk'?(side?.14:0):pose==='charge'?-.1:pose==='hurt'?-.16:0;
  g.save();g.translate(cx,by);g.rotate(lean);g.translate(-cx,-by);
  const item=o.item&&ITEM_DRAW[o.item];
  const armY=pose==='scoop'?by-.5:pose==='pour'?by-1.28:pose==='chop'?by-1.42:by-.82;
  const tilt=pose==='scoop'?2.5:pose==='pour'?1.9:pose==='chop'?.9:.18;
  const hx=side?cx+.56:cx+.76;
  const hand=(x,y,ang,it)=>{
    if(it){g.save();g.translate(x,y);g.rotate(ang);item(g,o.water);g.restore()}
    clawPaw(g,x,y,it?0:ang);
  };
  if(o.lamp&&up)lampAt(g,cx-.76,by-.62,true);
  if(up)wolfTail(g,cx+.1,by-.56,.74);
  if(side)wolfTail(g,cx-.34,by-.6,-.9);
  if(up&&item){hand(hx,armY,tilt,true);if(o.dual)hand(cx-.76,armY,-tilt,true)}
  if(side){shoeAt(g,cx+st*.22,by-.08-Math.max(0,st)*.12,o);shoeAt(g,cx-st*.22,by-.08-Math.max(0,-st)*.12,o);for(const k of[st,-st])trouser(g,cx,by-.62,cx+k*.2,by-.2)}
  else for(const s of[-1,1]){const k=s*st;shoeAt(g,cx+s*.25,by-.08-Math.max(0,k)*.14,o);trouser(g,cx+s*.22,by-.62,cx+s*.24,by-.2-Math.max(0,k)*.1)}
  if(!up&&!side)suitFront(g,cx,by);
  else{
    const bw=side?.52:.78;
    paint(g,[[cx-bw*.6,by-1.46],[cx-bw,by-1.28],[cx-bw*1.02,by-.95],[cx-bw*.9,by-.5],[cx-bw*.76,by-.42],[cx+bw*.76,by-.42],[cx+bw*.9,by-.5],[cx+bw*1.02,by-.95],[cx+bw,by-1.28],[cx+bw*.6,by-1.46]],{c:SUIT,l:SUITL,d:SUITD,n:80,len:.3,wid:.03,ang:1.4,sharp:true,rim:'#8a80a0',rimW:.05});
    furLines(g,26,cx,by-.9,bw*.8,.42,1.5,.2,'#3a3546',.55,.22,.012);
    if(up){Ln(g,[[cx,by-1.42],[cx,by-.42]],'#47405a',.03);Ln(g,[[cx,by-.72],[cx,by-.42]],'#0a080e',.03);Ln(g,[[cx-.55,by-.8],[cx+.55,by-.8]],'#0a080e',.02);for(const s of[-1,1])El(g,cx+s*.12,by-.8,.02,.02,'#47405a',null)}
    else{Ln(g,[[cx+.14,by-1.42],[cx+.36,by-.98],[cx+.24,by-.46]],'#47405a',.03);P(g,[[cx+.3,by-1.42],[cx+.5,by-1.2],[cx+.36,by-.96],[cx+.12,by-1.4]],'#2d2936','#5d5670',.018);g.save();g.setLineDash([.03,.026]);Ln(g,[[cx+.14,by-1.32],[cx+.34,by-1.0]],GOLD,.02);g.restore();Ln(g,[[cx+.08,by-.9],[cx+.42,by-.92]],'#47405a',.018)}
  }
  const hy=by-1.86;
  if(up)wolfBack(g,cx,hy);else if(side)wolfSide(g,cx,hy,o);else wolfFront(g,cx,hy,o);
  if(o.lamp&&!up)lampAt(g,side?cx-.5:cx-.8,by-.56,true);
  if(!up){
    if(pose==='atk'){const ax=side?cx+.86:cx+.8,ay=side?by-1.02:by-1.3;sleeve(g,cx+.4,by-1.28,ax,ay);clawPaw(g,ax,ay,side?1.5:.4);if(!side){sleeve(g,cx-.54,by-1.28,cx-.8,by-.96);clawPaw(g,cx-.8,by-.88,3)}}
    else if(pose==='charge'){sleeve(g,cx+.52,by-1.28,cx+.92,by-1.62);clawPaw(g,cx+.94,by-1.68,.4);sleeve(g,cx-.52,by-1.28,cx-.92,by-1.62);clawPaw(g,cx-.94,by-1.68,-.4)}
    else{
      sleeve(g,cx+(side?.2:.6),by-1.28,hx,armY+.04);
      if(item)hand(hx,armY,tilt,true);else clawPaw(g,hx,armY,3);
      if(!side){sleeve(g,cx-.6,by-1.28,cx-.76,armY+.04);if(item&&o.dual)hand(cx-.76,armY,-tilt,true);else clawPaw(g,cx-.76,by-.82,3)}
    }
  }
  g.restore();
}
/* большой портрет для диалогов: тот же волк, только крупно и с гуще положенной шерстью */
function heroPortrait(px=640){
  const c=document.createElement('canvas');c.width=c.height=px;const g=c.getContext('2d'),u=px/3;g.scale(u,u);g.lineJoin=g.lineCap='round';
  const bg=g.createRadialGradient(1.5,1.2,.2,1.5,1.5,2.2);bg.addColorStop(0,'#6a4a78');bg.addColorStop(1,'#1a1024');g.fillStyle=bg;g.fillRect(0,0,3,3);
  R=rnd(23);ARTQ=3;
  g.save();g.translate(1.5,1.3);g.scale(1.42,1.42);suitFront(g,0,1.86);wolfFront(g,0,0,{});g.restore();
  ARTQ=1;return c;
}
function monsterPortrait(tier,shadow){
  const c=document.createElement('canvas');c.width=c.height=320;const g=c.getContext('2d');g.scale(80,80);g.lineJoin=g.lineCap='round';
  drawMonster(g,tier,false,!!shadow,false);
  if(shadow){g.globalCompositeOperation='source-in';g.fillStyle='#07040c';g.fillRect(0,0,4,4);g.globalCompositeOperation='source-over';
    for(const s of[-1,1]){El(g,2+s*.56,2.05,.17,.2,'#ff3a1a',null);El(g,2+s*.52,2.02,.05,.06,'#ffe0b0',null)}}
  return c;
}
/* транспорт и мост */
function artCar(view){return art(5.4,4,(g,w,h)=>{
  const body='#b8392e',lite='#ff8a5a',dk='#4a1420',b=h-.2;
  const wheel=(x,y,r=.55)=>{El(g,x,y,r,r,'#1d1420');El(g,x,y,r*.62,r*.62,'#c7b48a',INK,.04);for(let i=0;i<6;i++){const a=i/6*6.28;Ln(g,[[x,y],[x+Math.cos(a)*r*.6,y+Math.sin(a)*r*.6]],'#5a3e2c',.04)}El(g,x,y,.1,.1,'#5a3e2c',null)};
  const head=(x,y,k=1)=>{paint(g,clump(x,y,.42*k,.4*k,8,.18),{c:FUR,l:FURL,d:FURD,n:24,len:.12,wid:.02,sharp:true,rad:[x,y]});for(const s of[-1,1])P(g,[[x+s*.14*k,y-.3*k],[x+s*.32*k,y-.66*k],[x+s*.42*k,y-.24*k]],FUR);El(g,x-.13*k,y-.03*k,.05*k,.04*k,'#ff3a1a',null);El(g,x+.13*k,y-.03*k,.05*k,.04*k,'#ff3a1a',null);El(g,x,y+.14*k,.06*k,.05*k,'#17121a',null)};
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
function artCaveFloor(lv){const[c,l,d,acc]=CAVE_PAL[lv%8];return art(32,21,(g,w,h)=>{
  g.fillStyle=c;g.fillRect(0,0,w,h);
  for(let i=0;i<1500;i++){const x=R()*w,y=R()*h;dab(g,x,y,1.6,.26,R()*.6-.3,R()<.42?l:R()<.5?d:c,.13+R()*.16)}
  for(let i=0;i<34;i++){let x=R()*w,y=R()*h,a=R()*6.28;const p=[[x,y]];for(let k=0;k<6;k++){a+=(R()-.5)*1.3;x+=Math.cos(a)*.9;y+=Math.sin(a)*.6;p.push([x,y])}Ln(g,p,rgba(d,.75),.045)}
  for(let i=0;i<14;i++){const x=2+R()*(w-4),y=2+R()*(h-4);g.globalAlpha=.75;paint(g,clump(x,y,.7+R()*1.5,.34+R()*.7,8,.1),{c:mixc(c,'#2a5a80',.55),l:'#b8f0f0',d:d,n:12,len:.5,wid:.04,ang:.1,ink:0});g.globalAlpha=1}
  for(let i=0;i<60;i++)dab(g,R()*w,R()*h,.5,.16,R()*3,acc,.28);
  /* тёмный край зала и боковые стены */
  const v=g.createRadialGradient(w/2,h/2,5,w/2,h/2,18);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.7,'rgba(0,0,0,0)');v.addColorStop(1,rgba(d,.92));g.fillStyle=v;g.fillRect(0,0,w,h);
  for(const[x0,x1,sg]of[[0,2.2,1],[w,w-2.2,-1]]){for(let i=0;i<70;i++){const y=R()*h,xx=x0+sg*(R()*2.2);dab(g,xx,y,1.1,.34,1.57+(R()-.5)*.4,R()<.3?l:R()<.5?c:d,.8)}}
},30)}
function artCaveWall(lv){const[c,l,d,acc]=CAVE_PAL[lv%8];return art(32,9,(g,w,h)=>{
  const top=[];for(let i=0;i<=40;i++)top.push([i/40*w,.2+R()*.5]);
  paint(g,[[0,h],...top,[w,h]],{c,l,d,n:900,len:.9,wid:.16,ang:1.4,sharp:true,ink:0});
  for(let i=0;i<8;i++){const y=1.6+i*.95+R()*.3;const p=[];for(let x=-.5;x<w+.5;x+=1.1)p.push([x,y+Math.sin(x*.6+i)*.16+R()*.1]);Ln(g,p,rgba(d,.5),.07);Ln(g,p.map(q=>[q[0],q[1]+.07]),rgba(l,.25),.04)}
  for(let i=0;i<30;i++){const x=R()*w,ht=.6+R()*1.7,wd=.22+R()*.3;paint(g,[[x-wd,h+.1],[x,h-ht],[x+wd,h+.1]],{c:mixc(c,d,.3),l,d,n:7,sharp:true,ink:.05,len:.3,wid:.05,ang:1.5})}
  for(let i=0;i<40;i++)dab(g,R()*w,h-R()*2.4,.5,.14,-.2+R(),acc,.4);
  const sh=g.createLinearGradient(0,0,0,h);sh.addColorStop(0,'rgba(0,0,0,.72)');sh.addColorStop(.55,'rgba(0,0,0,.12)');sh.addColorStop(1,'rgba(0,0,0,0)');g.globalCompositeOperation='source-atop';g.fillStyle=sh;g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';
},30)}
const artCaveFront=lv=>{const[c,l,d]=CAVE_PAL[lv%8];return art(36,5,(g,w,h)=>{
  const pts=[[0,0],[w,0],[w,h*.4]];for(let x=w;x>=0;x-=1.2)pts.push([x,h*.36+R()*h*.5]);pts.push([0,h*.4]);
  paint(g,pts,{c:mixc(c,d,.72),l:c,d:'#05030a',n:220,len:.8,wid:.14,sharp:true,ink:0,ang:1.4});
},24)};
const artDoor=open=>art(6,6.4,(g,w,h)=>{
  paint(g,[[.2,h],[.4,2.4],[1.4,.8],[3,.3],[4.6,.8],[5.6,2.4],[5.8,h]],{c:'#7a7488',l:'#f2e6d2',d:'#2a2238',n:120,len:.6,wid:.12,ang:1.1,rim:'#ffe6b0'});
  paint(g,[[1.2,h],[1.3,2.8],[2,1.6],[3,1.3],[4,1.6],[4.7,2.8],[4.8,h]],{c:open?'#0c0814':'#1a1420',l:'#2a1f3a',d:'#04020a',n:14,ink:.1});
  if(!open){for(const x of[1.7,2.5,3.3,4.1])Ln(g,[[x,1.7+Math.abs(x-2.9)*.6],[x,h-.05]],INK,.2),Ln(g,[[x,1.7+Math.abs(x-2.9)*.6],[x,h-.05]],'#6a7080',.11);Ln(g,[[1.3,3.4],[4.7,3.4]],'#6a7080',.13)}
  else{const k=g.createRadialGradient(3,5.2,.2,3,5,2.6);k.addColorStop(0,'rgba(255,230,160,.42)');k.addColorStop(1,'rgba(255,230,160,0)');g.globalCompositeOperation='source-atop';g.fillStyle=k;g.fillRect(1,1,4,5.4);g.globalCompositeOperation='source-over'}
});
const artTorch=k=>art(1.4,3.4,g=>{
  Ln(g,[[.7,1.6],[.7,3.3]],INK,.24);Ln(g,[[.7,1.6],[.7,3.3]],'#7a5238',.12);
  const s=[1,.84,1.12][k],o=[0,.07,-.06][k],fl=(w,hh,c)=>{traceSmooth(g,[[.7-w,1.7],[.7-w,1.7-hh*.5],[.7+o,1.7-hh],[.7+w,1.7-hh*.5],[.7+w,1.7]]);g.fillStyle=c;g.fill()};
  fl(.4,1.5*s+.1,INK);fl(.34,1.45*s,'#ee6a2a');fl(.22,1*s,'#ffc04a');fl(.1,.55*s,'#fff6c8');
});
function artPillar(lv){const[c,l,d]=CAVE_PAL[lv%8];return art(3.4,4.6,(g,w,h)=>{paint(g,[[.3,h-.1],[.7,2.2],[1.3,.5],[1.8,.2],[2.3,.9],[2.8,2.6],[3.1,h-.1]],{c,l,d,n:80,len:.6,wid:.1,ang:1.4,sharp:false,rim:'#ffe6b0'})})}
const artSplat=c=>art(3,2,g=>{for(let i=0;i<16;i++)El(g,1.5+(R()-.5)*2.2,1+(R()-.5)*1.2,.1+R()*.34,.08+R()*.2,c,null)});
const artSlash=col=>art(4.4,2.6,g=>{
  g.beginPath();g.moveTo(.2,2.2);g.quadraticCurveTo(2.2,-.8,4.2,2.2);g.quadraticCurveTo(2.2,.5,.2,2.2);g.fillStyle=col;g.fill();
  for(let i=0;i<26;i++){const t=.1+R()*.8,x=.2+t*4,y=2.2-Math.sin(t*3.14)*1.5+R()*.3;dab(g,x,y,.6,.05,(t-.5)*1.6,'#ffffff',.8)}
},48);
const artSlam=()=>art(8,8,g=>{g.strokeStyle='#fff6c8';g.lineWidth=.3;g.beginPath();g.arc(4,4,3.5,0,6.283);g.stroke();for(let i=0;i<40;i++){const a=R()*6.28,r=2.6+R()*1.2;dab(g,4+Math.cos(a)*r,4+Math.sin(a)*r,.9,.1,a+1.57,R()<.5?'#ffd65a':'#ff8a3a',.8)}},32);
const artOrb=c=>art(1.2,1.2,g=>{const k=g.createRadialGradient(.6,.6,.04,.6,.6,.6);k.addColorStop(0,'#ffffff');k.addColorStop(.32,c);k.addColorStop(.72,rgba(c,.5));k.addColorStop(1,rgba(c,0));g.fillStyle=k;g.fillRect(0,0,1.2,1.2)},48);
const artCard=()=>art(.9,1.2,g=>{P(g,[[.1,.08],[.8,.08],[.8,1.12],[.1,1.12]],'#f6f0e4',INK,.05);const x=.45,y=.56;P(g,[[x,y-.24],[x+.2,y+.04],[x+.08,y+.12],[x+.05,y+.08],[x+.1,y+.24],[x-.1,y+.24],[x-.05,y+.08],[x-.08,y+.12],[x-.2,y+.04]],'#141014',null)},72);
const artIngot=()=>art(1.2,.8,g=>{P(g,[[.25,.12],[.95,.12],[1.15,.68],[.05,.68]],'#7a4a2a',INK,.05);P(g,[[.25,.12],[.95,.12],[.85,.32],[.35,.32]],'#b07a48',null);Ln(g,[[.4,.22],[.8,.22]],'#ffe27a',.04)},48);
const artHeart=half=>art(.9,.8,g=>{const p=[[.45,.74],[.08,.34],[.14,.12],[.32,.08],[.45,.22],[.58,.08],[.76,.12],[.82,.34]];traceSmooth(g,p);g.fillStyle='#e0304a';g.fill();g.strokeStyle=INK;g.lineWidth=.05;g.stroke();El(g,.28,.24,.07,.05,'#ffc0c8',null)},64);
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
