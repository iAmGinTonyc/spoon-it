/* Рельеф: высоты считаются один раз, вода только опускается.
   Высота 0 это стартовый уровень моря, каждый уровень монстра опускает воду на CFG.drop */
const WORLD=860,HN=1024,heightMap=new Float32Array(HN*HN);
/* как высота выглядит на экране: каждый уровень воды оставляет обрыв и широкую полку под ним */
const TERR={step:4.5,wall:.28,tilt:.1};
function visY(h){
  if(h>=0)return h*1.3;
  const u=-h/CFG.drop,n=Math.floor(u),f=u-n,y0=-TERR.step*n;
  if(f<TERR.wall){const t=f/TERR.wall;return y0-TERR.step*(1-TERR.tilt)*t*t*(3-2*t)}
  return y0-TERR.step*(1-TERR.tilt)-TERR.step*TERR.tilt*(f-TERR.wall)/(1-TERR.wall);
}
/* радиус берега родного острова на каждом уровне воды */
const SHORE=[26,37,48,59,70,83,96,110];
function homeR(x,z){
  const a=Math.atan2(z,x);
  return Math.hypot(x,z)/(1+.15*Math.sin(2*a+.7)+.08*Math.sin(3*a-1.1)+.05*Math.sin(5*a+2)+vnoise(x*.025,z*.025)*.07);
}
function homeH(R){
  if(R<SHORE[0])return 2.4*smooth(SHORE[0],SHORE[0]-12,R);
  for(let k=1;k<SHORE.length;k++)if(R<SHORE[k])return -CFG.drop*(k-1+(R-SHORE[k-1])/(SHORE[k]-SHORE[k-1]));
  return -CFG.drop*7-(R-SHORE[7])*.13;
}
function locD(l,x,z){
  const dx=x-l.x,dz=z-l.z,a=Math.atan2(dz,dx);
  return Math.hypot(dx,dz)/(l.r*(1+.2*Math.sin(3*a+l.seed)+.1*Math.sin(5*a+l.seed*2)+vnoise(x*.05+l.seed,z*.05)*.12));
}
/* вершина спрятана на метр под водой, поэтому до своего уровня локацию не видно */
function locH(l,x,z){
  const lim=l.r*5;if(Math.abs(x-l.x)>lim||Math.abs(z-l.z)>lim)return -99;
  const d=locD(l,x,z),sea=-CFG.drop*l.lv;
  return d<1?sea+.6*(1-d*d):sea-4.6*(d-1);
}
function rawH(x,z){
  let h=homeH(homeR(x,z));
  for(const l of LOCS){const v=locH(l,x,z);if(v>h)h=v}
  h+=vnoise(x*.09,z*.09)*.1+(h<-.2&&h>-13?vnoise(x*.032+4,z*.032)*.34:0);
  return Math.max(h,-18+vnoise(x*.02,z*.02)*1.2);
}
for(let j=0;j<HN;j++)for(let i=0;i<HN;i++){
  heightMap[j*HN+i]=rawH(((i+.5)/HN-.5)*WORLD,((j+.5)/HN-.5)*WORLD);
}
function groundH(x,z){
  const u=(x/WORLD+.5)*HN-.5,v=(z/WORLD+.5)*HN-.5;
  if(u<0||v<0||u>=HN-1||v>=HN-1)return -18;
  const i=Math.floor(u),j=Math.floor(v),fu=u-i,fv=v-j,a=j*HN+i;
  return heightMap[a]*(1-fu)*(1-fv)+heightMap[a+1]*fu*(1-fv)+heightMap[a+HN]*(1-fu)*fv+heightMap[a+HN+1]*fu*fv;
}
/* где что растёт: трава, камень, чёрный камень */
function biomeAt(x,z){
  let g=smooth(23,15,homeR(x,z)),r=0,k=0;
  for(const l of LOCS){
    if(Math.abs(x-l.x)>l.r*1.8||Math.abs(z-l.z)>l.r*1.8)continue;
    const d=locD(l,x,z);
    g=Math.max(g,l.grass*smooth(.86,.5,d));r=Math.max(r,l.rock*smooth(1.05,.55,d+vnoise(x*.09,z*.09)*.25));k=Math.max(k,l.dark*smooth(1.1,.6,d));
  }
  return[g,r,k];
}
const Yat=(x,z)=>visY(groundH(x,z));
const seaVis=()=>visY(S.seaY);
/* вход в пещеру есть на каждом острове */
const CAVES=[{id:'home',name:'Пещера под домом',lv:0,x:-17,z:13},...LOCS.map(l=>({id:l.id,name:`Пещера: ${l.name}`,lv:l.lv,x:l.x-4,z:l.z-l.r*.42,loc:l}))];
/* щели: за домом и на каждом острове, на другой стороне от входа в пещеру. Монстр сидит в одной и выныривает там, куда подошёл волк */
const SLITS=[{id:'home',x:MOUTH.x,z:MOUTH.z},...LOCS.map(l=>{const c=CAVES.find(q=>q.id===l.id),dx=c.x-l.x,dz=c.z-l.z,d=Math.hypot(dx,dz)||1;return{id:l.id,x:l.x-dx/d*l.r*.4,z:l.z-dz/d*l.r*.4}})];
function shorePoint(angle,from=20){
  for(let r=from;r<400;r++){const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    if(groundH(x,z)<S.baseSea-.7)return{x,z,r}}
  return null;
}
{const q=houseW(-3.3,-1.4);S.x=q.x;S.z=q.z}
{const a=1.5,p=shorePoint(a);S.boat.x=p.x;S.boat.z=p.z;S.boat.h=0}
