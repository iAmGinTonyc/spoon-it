/* Сцена. Земля настоящая: каждый уровень воды оставил обрыв, поэтому новые места лежат всё ниже.
   Предметы это плоские рисунки, развёрнутые к камере. Кадр проходит через живописный фильтр */
let time=0;
const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false});
let pixelK=Math.min(devicePixelRatio,1.5);
renderer.setPixelRatio(pixelK);renderer.setSize(innerWidth,innerHeight,false);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x05040a);
const camera=new THREE.PerspectiveCamera(24,innerWidth/innerHeight,3,7000);
const worldG=new THREE.Group(),caveG=new THREE.Group();scene.add(worldG,caveG);caveG.visible=false;
let parentG=worldG;
/* камера: x,y,z куда смотрим, h высота кадра в метрах, p наклон, yaw поворот */
const CAM={x:0,y:2,z:2,h:88,p:1,yaw:0,fov:24};

/* ---------- общие параметры ---------- */
const MAXL=8,SUN=new THREE.Vector3(-.62,.7,.3).normalize();
const WU={uAmb:{value:new THREE.Vector3(1,1,1)},uL:{value:Array.from({length:MAXL},()=>new THREE.Vector4(0,0,1,0))},
  uLc:{value:Array.from({length:MAXL},()=>new THREE.Vector3())},uRight:{value:new THREE.Vector3(1,0,0)},uUp:{value:new THREE.Vector3(0,1,0)},
  uCamT:{value:new THREE.Vector2()},uFogD:{value:1e5},uFogC:{value:new THREE.Vector3(.7,.8,.85)},uShadeK:{value:1}};
function applyCam(){
  if(camera.fov!==CAM.fov){camera.fov=CAM.fov;camera.updateProjectionMatrix()}
  const d=CAM.h*.5/Math.tan(CAM.fov*Math.PI/360),cp=Math.cos(CAM.p),sp=Math.sin(CAM.p),sy=Math.sin(CAM.yaw),cy=Math.cos(CAM.yaw);
  camera.position.set(CAM.x-sy*cp*d,CAM.y+sp*d,CAM.z+cy*cp*d);
  camera.lookAt(CAM.x,CAM.y,CAM.z);camera.updateMatrixWorld();
  const e=camera.matrixWorld.elements;WU.uRight.value.set(e[0],e[1],e[2]);WU.uUp.value.set(e[4],e[5],e[6]);
  WU.uCamT.value.set(CAM.x,CAM.z);GU.uCamY.value=CAM.y;
}
const LIGHT_GLSL=`
uniform vec3 uAmb;uniform vec4 uL[${MAXL}];uniform vec3 uLc[${MAXL}];
vec3 lightAt(vec2 w){vec3 c=uAmb;for(int i=0;i<${MAXL};i++){float d=length(w-uL[i].xy)/uL[i].z;
  if(d<1.){float k=1.-d;k=k*k*(3.-2.*k);c+=uLc[i]*uL[i].w*k;}}return min(c,vec3(1.3));}`;

/* ---------- земля и вода ---------- */
const hData=new Uint16Array(HN*HN);for(let i=0;i<hData.length;i++)hData[i]=THREE.DataUtils.toHalfFloat(heightMap[i]);
const hTex=new THREE.DataTexture(hData,HN,HN,THREE.RedFormat,THREE.HalfFloatType);
hTex.minFilter=hTex.magFilter=THREE.LinearFilter;hTex.needsUpdate=true;
const BN=512,bData=new Uint8Array(BN*BN*4);
for(let j=0;j<BN;j++)for(let i=0;i<BN;i++){const b=biomeAt(((i+.5)/BN-.5)*WORLD,((j+.5)/BN-.5)*WORLD),a=(j*BN+i)*4;
  bData[a]=b[0]*255;bData[a+1]=b[1]*255;bData[a+2]=b[2]*255;bData[a+3]=255}
const bTex=new THREE.DataTexture(bData,BN,BN,THREE.RGBAFormat);bTex.minFilter=bTex.magFilter=THREE.LinearFilter;bTex.needsUpdate=true;
const GU={uAmb:WU.uAmb,uL:WU.uL,uLc:WU.uLc,uCamT:WU.uCamT,uFogD:WU.uFogD,uFogC:WU.uFogC,uShadeK:WU.uShadeK,uH:{value:hTex},uB:{value:bTex},uSea:{value:0},uSeaY:{value:0},uT:{value:0},uBlood:{value:0},uHot:{value:0},uHotR:{value:CFG.hotR},uWorld:{value:WORLD},uDrop:{value:CFG.drop},uCamY:{value:0},uSun:{value:SUN}};
const GROUND_V=`uniform float uSeaY;varying vec2 vW;varying float vY;
void main(){vec3 p=position;vY=p.y;p.y=max(p.y,uSeaY);vW=p.xz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}`;
const GROUND_F=`precision highp float;varying vec2 vW;varying float vY;
uniform sampler2D uH,uB;uniform float uSea,uSeaY,uT,uBlood,uHot,uHotR,uWorld,uDrop,uCamY,uFogD,uShadeK;uniform vec3 uSun,uFogC;uniform vec2 uCamT;
${LIGHT_GLSL}
const float STEP=${TERR.step.toFixed(2)},WF=${TERR.wall.toFixed(2)},TL=${TERR.tilt.toFixed(2)};
float T(float h){if(h>=0.)return h*1.3;float u=-h/uDrop,n=floor(u),f=u-n,y0=-STEP*n;
  if(f<WF){float t=f/WF;t=t*t*(3.-2.*t);return y0-STEP*(1.-TL)*t;}
  return y0-STEP*(1.-TL)-STEP*TL*(f-WF)/(1.-WF);}
float hs(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(hs(i),hs(i+vec2(1.,0.)),u.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){return vn(p)*.55+vn(p*2.1+7.)*.3+vn(p*4.3+3.)*.15;}
vec2 h2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
float cracks(vec2 p){vec2 i=floor(p),f=fract(p);float d1=8.,d2=8.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y)),r=g+h2(i+g)-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
  return sqrt(d2)-sqrt(d1);}
/* морские дуги-завитки, как на старых книжных картах */
float waves(vec2 p,float t){vec2 c=p;c.x+=floor(c.y)*.5;vec2 i=floor(c),f=fract(c)-vec2(.5,.62);float r=hs(i+3.);
  float d=abs(length(f*vec2(1.,1.5))-.34);float gate=step(f.y,.0)*step(.45,r);float blink=smoothstep(.1,.7,sin(t*.8+r*40.));
  return smoothstep(.05,.0,d)*gate*blink;}
const vec3 PS0=vec3(.97,.84,.56),PS1=vec3(.93,.72,.44),PS2=vec3(.86,.55,.36),PS3=vec3(.76,.46,.46),PS4=vec3(.60,.41,.56),PS5=vec3(.38,.45,.56),PS6=vec3(.28,.32,.52),PS7=vec3(.22,.21,.38);
vec3 pal(float i){if(i<.5)return PS0;if(i<1.5)return PS1;if(i<2.5)return PS2;if(i<3.5)return PS3;if(i<4.5)return PS4;if(i<5.5)return PS5;if(i<6.5)return PS6;return PS7;}
void main(){
  vec2 warp=vec2(vn(vW*.23+3.),vn(vW*.23+9.))-.5,w=vW+warp*.9,px=vec2(1.)/uWorld;
  vec2 uv=w/uWorld+.5;
  float wig=(vn(w*.6)-.5)*.08+(vn(w*1.9)-.5)*.03;
  float h=texture2D(uH,uv).r+wig,he=texture2D(uH,uv+vec2(1.,0.)*px).r+wig,hz=texture2D(uH,uv+vec2(0.,1.)*px).r+wig;
  float Y=T(h),Ye=T(he),Yz=T(hz);
  vec3 n=normalize(vec3(Y-Ye,1.,Y-Yz));
  float steep=smoothstep(.1,.5,1.-n.y);
  vec3 bio=texture2D(uB,uv).rgb;
  float d=uSea-h,g=fbm(w*.33),dry=smoothstep(.25,1.5,h-uSea);

  /* полки дна: каждый слой своего цвета, высохшая корка трескается */
  float lv=max(0.,-h/uDrop),idx=floor(lv+.72);
  vec3 land=pal(idx);
  land*=1.+(fbm(vec2(w.x*.13+w.y*.28,w.y*.8-w.x*.1))-.5)*.34;
  land=mix(land,land*vec3(1.06,.95,.86),vn(w*.05));
  if(h<0.){float c=cracks(w*.26+warp*.5);land*=mix(1.,mix(.62,1.,smoothstep(.0,.07,c)),dry*.8);}
  /* обрывы: пласты породы и потёки от ушедшей воды */
  float bands=sin(Y*3.1+fbm(vec2(w.x*.09,Y*.7))*5.),streak=vn(vec2(w.x*1.3+w.y*1.3,Y*.16));
  vec3 wall=pal(idx+1.)*mix(.5,.9,.5+.5*bands)*mix(.72,1.08,streak);
  wall=mix(wall,wall*vec3(.8,.88,1.1),smoothstep(.3,.7,fbm(w*.1)));
  land=mix(land,wall,steep);

  float rk=bio.g+(g-.5)*.45;
  land=mix(land,mix(vec3(.66,.63,.62),vec3(.50,.50,.58),vn(w*.2))*(1.+(fbm(w*.8)-.5)*.3),smoothstep(.46,.52,rk));
  float gr=bio.r+(g-.5)*.42;
  vec3 grass=mix(vec3(.50,.76,.30),vec3(.20,.56,.36),vn(w*.13));
  grass=mix(grass,vec3(.78,.84,.32),smoothstep(.62,.8,fbm(w*.09+5.))*.6);
  grass*=1.+(fbm(vec2(w.x*.9+w.y*.5,w.y*1.6-w.x*.4))-.5)*.5;
  land=mix(land,vec3(.21,.40,.33),smoothstep(.40,.46,gr)*(1.-steep));
  land=mix(land,grass,smoothstep(.47,.52,gr)*(1.-steep*.8));
  land=mix(land,mix(vec3(.16,.14,.22),vec3(.28,.24,.36),g),smoothstep(.46,.52,bio.b+(g-.5)*.4));
  land*=mix(1.,.66,smoothstep(.24,.0,h-uSea));

  /* солнце слева, тени от обрывов */
  float lit=clamp(dot(n,uSun)*1.15,0.,1.),sh=0.;
  for(int i=1;i<=3;i++){float q=float(i)*2.6;vec2 p2=w+normalize(uSun.xz)*q;float yq=T(texture2D(uH,p2/uWorld+.5).r);sh=max(sh,smoothstep(.2,1.6,yq-(Y+q*.72)));}
  vec3 tone=mix(vec3(.50,.52,.86),vec3(1.08,1.01,.90),lit*(1.-sh*.82));
  land*=mix(vec3(1.),tone,uShadeK);
  /* низины тонут в синеватой дымке, а верх остаётся ярким */
  land=mix(land,vec3(.42,.56,.78),smoothstep(3.,36.,uCamY-Y)*.5);
  land*=mix(1.,.8,clamp(-Y/34.,0.,1.));

  /* вода */
  float dp=max(d,0.),k=1.-exp(-dp*3.6);
  vec3 wc=mix(vec3(.38,.88,.78),vec3(.09,.56,.66),smoothstep(0.,.55,k));
  wc=mix(wc,vec3(.05,.26,.47),smoothstep(.5,1.,k));
  float nn=fbm(w*.03+vec2(uT*.02,uT*.012));
  wc+=(nn-.5)*.12;
  float band=floor((fbm(w*vec2(.05,.11)+vec2(uT*.03,uT*.05))+.12*sin(w.x*.02))*7.)/7.;
  wc*=.86+band*.32;
  wc+=waves(w*vec2(.085,.14)+vec2(uT*.03,0.),uT)*.42*(.25+k);
  wc+=waves(w*vec2(.19,.3)+vec2(-uT*.05,3.),uT+9.)*.2*(.25+k);
  float foamB=sin(dp*22.-uT*1.5+fbm(w*.3)*5.);
  float foam=smoothstep(.0,.03,dp)*smoothstep(.34,.02,dp)*smoothstep(.2,.8,foamB);
  wc=mix(wc,vec3(.97,.99,.95),foam*.8);
  wc=mix(wc,vec3(.5,.07,.08),uBlood*(.6+.4*nn));
  if(uHot>0.){float r=length(w),rr=smoothstep(uHotR,uHotR-16.,r);
    float boil=fbm(w*.1+vec2(uT*.13,-uT*.2)),ring=sin(r*.9-uT*1.6+boil*5.);
    wc=mix(wc,mix(vec3(.72,.20,.14),vec3(1.,.56,.22),boil),rr*.78);
    wc+=rr*smoothstep(.72,1.,ring)*vec3(.3,.16,.06);
    vec2 bc=w*.5+vec2(0.,-uT*.9),bi=floor(bc);float bd=length(fract(bc)-.5-(h2(bi)-.5)*.5);
    wc+=rr*step(.72,hs(bi+1.))*smoothstep(.2,.15,bd)*smoothstep(.06,.12,bd)*vec3(.5,.4,.3);
    wc=mix(wc,vec3(1.,.92,.84),rr*.5*smoothstep(.5,.72,fbm(w*.045+vec2(uT*.05,uT*.03))));}
  wc=mix(land*vec3(.72,.92,.96),wc,smoothstep(0.,.3,dp)*.92+.08);
  wc=mix(wc,vec3(.98,1.,.97),smoothstep(.0,.025,dp)*smoothstep(.09,.03,dp));

  vec3 col=mix(land,wc,smoothstep(-.01,.012,d));
  col*=1.-.12*smoothstep(.52,.74,fbm(vW*.011+vec2(uT*.012,uT*.007)));
  col=mix(col,vec3(.62,.74,.8),smoothstep(345.,425.,length(vW)));
  col*=lightAt(vW);
  float fd=length(vW-uCamT)/uFogD;col=mix(col,uFogC,1.-exp(-fd*fd));
  gl_FragColor=vec4(col,1.);
}`;
const groundMat=new THREE.ShaderMaterial({uniforms:GU,vertexShader:GROUND_V,fragmentShader:GROUND_F}),terr={};
{
  /* сетка только там, где когда-нибудь будет суша. Дальше глубокое море одной плоскостью */
  const n=Math.floor(WORLD)+1,idx=new Int32Array(n*n).fill(-1),pos=[],ind=[];terr.n=n;terr.idx=idx;
  const hAt=new Float32Array(n*n);for(let j=0;j<n;j++)for(let i=0;i<n;i++)hAt[j*n+i]=groundH(i-WORLD/2,j-WORLD/2);
  const vert=(i,j)=>{const a=j*n+i;if(idx[a]<0){idx[a]=pos.length/3;pos.push(i-WORLD/2,visY(hAt[a]),j-WORLD/2)}return idx[a]};
  for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){
    const a=j*n+i;if(Math.max(hAt[a],hAt[a+1],hAt[a+n],hAt[a+n+1])<-13.4)continue;
    const p=vert(i,j),q=vert(i,j+1),r=vert(i+1,j),s=vert(i+1,j+1);ind.push(p,q,r,r,q,s);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ind);terr.geo=g;
  const land=new THREE.Mesh(g,groundMat);land.frustumCulled=false;worldG.add(land);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(7000,7000).rotateX(-Math.PI/2).translate(0,-1e4,0),groundMat);sea.frustumCulled=false;worldG.add(sea);
}

/* ---------- небо ---------- */
const SKY={uFogC:WU.uFogC,uTop:{value:new THREE.Vector3(.3,.55,.85)},uNight:{value:0},uT:{value:0},uSun:{value:SUN}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(3200,24,16),new THREE.ShaderMaterial({uniforms:SKY,side:THREE.BackSide,depthTest:false,depthWrite:false,
vertexShader:`varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}`,
fragmentShader:`precision highp float;varying vec3 vD;uniform vec3 uFogC,uTop,uSun;uniform float uNight,uT;
float hs(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1.,0.)),u.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){return vn(p)*.5+vn(p*2.1+7.)*.3+vn(p*4.3+3.)*.2;}
void main(){vec3 d=normalize(vD);float y=max(d.y,0.);vec3 c=mix(uFogC,uTop,smoothstep(.0,.42,y));
  vec2 p=d.xz/(y+.16)*1.3+vec2(uT*.006,0.);float cl=fbm(p);float q=floor(smoothstep(.46,.72,cl)*4.)/4.;
  c=mix(c,mix(vec3(1.,.97,.9),uFogC,uNight*.9),q*.85*smoothstep(.0,.1,y));
  float s=max(dot(d,uSun),0.);c+=(1.-uNight)*(pow(s,380.)*vec3(1.,.9,.6)+pow(s,14.)*vec3(.28,.2,.08));
  if(uNight>.2){vec2 g=floor(d.xz/(y+.3)*90.);c+=uNight*step(.992,hs(g))*vec3(.9,.9,1.)*smoothstep(.0,.2,y);
    float m=max(dot(d,normalize(vec3(.4,.5,-.76))),0.);c+=uNight*(smoothstep(.9985,.999,m)*vec3(1.,.96,.8)+pow(m,60.)*vec3(.12,.14,.24));}
  gl_FragColor=vec4(c,1.);}`}));
sky.renderOrder=-1000;sky.frustumCulled=false;scene.add(sky);

/* ---------- спрайты ---------- */
const SPRITE_V=`varying vec2 vUv,vW;varying float vFog;uniform vec3 uRight,uUp;uniform vec2 uCamT;uniform float uFogD;
void main(){vUv=uv;vec4 a=modelMatrix*vec4(0.,0.,0.,1.);float sx=modelMatrix[0][0],sy=modelMatrix[1][1];
  vec3 p=a.xyz+uRight*position.x*sx+uUp*position.y*sy;
  vW=vec2(p.x,a.z);
  vec4 c=projectionMatrix*viewMatrix*vec4(p,1.),b=projectionMatrix*viewMatrix*vec4(a.xyz+vec3(0.,.6,0.),1.);
  c.z=b.z/b.w*c.w;gl_Position=c;
  float d=length(a.xz-uCamT)/uFogD;vFog=1.-exp(-d*d);}`;
const FLAT_V=`varying vec2 vUv,vW;varying float vFog;uniform float uShear;uniform vec2 uCamT;uniform float uFogD;
void main(){vUv=uv;vec3 q=position;q.x-=q.z*uShear;vec4 w=modelMatrix*vec4(q,1.);vW=w.xz;gl_Position=projectionMatrix*viewMatrix*w;
  float d=length(w.xz-uCamT)/uFogD;vFog=1.-exp(-d*d);}`;
const SPRITE_F=`precision highp float;varying vec2 vUv,vW;varying float vFog;uniform sampler2D map;uniform float uOp,uGlow,uFlash,uClip,uDark,uShadeK;uniform vec3 uFogC;${LIGHT_GLSL}
void main(){if(vUv.y<uClip)discard;vec4 t=texture2D(map,vUv);if(t.a<.02)discard;
  if(uDark>0.){gl_FragColor=vec4(.10,.08,.3,t.a*uDark*uShadeK*uOp*(1.-vFog));return;}
  vec3 l=lightAt(vW),c=t.rgb*mix(l,vec3(1.),uGlow);c=mix(c,vec3(1.,.96,.9),uFlash);c=mix(c,uFogC,vFog*(1.-uGlow*.5));
  gl_FragColor=vec4(c,t.a*uOp);}`;
function makeMat(tex,isFlat,o={}){
  const mask=o.mask?{blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneMinusSrcAlphaFactor,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneMinusSrcAlphaFactor}:{};
  return new THREE.ShaderMaterial({vertexShader:isFlat?FLAT_V:SPRITE_V,fragmentShader:SPRITE_F,transparent:true,depthWrite:false,side:THREE.DoubleSide,depthTest:!isFlat&&o.depth!==false,
    blending:o.add?THREE.AdditiveBlending:THREE.NormalBlending,...mask,
    uniforms:{uAmb:WU.uAmb,uL:WU.uL,uLc:WU.uLc,uRight:WU.uRight,uUp:WU.uUp,uCamT:WU.uCamT,uFogD:WU.uFogD,uFogC:WU.uFogC,uShadeK:WU.uShadeK,map:{value:tex},uOp:{value:o.op??1},uGlow:{value:o.glow??0},uFlash:{value:0},uClip:{value:0},uShear:{value:o.shear??0},uDark:{value:o.dark??0}}});
}
const spriteGeo=new THREE.PlaneGeometry(1,1).translate(0,.5,0),flatGeo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
const shadowGeo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2).translate(0,0,-.5);
const matS=new Map(),matF=new Map(),flatMats=new Set();
const regFlat=m=>{flatMats.add(m);return m};
const sharedMat=(a,isFlat)=>{const m=isFlat?matF:matS;if(!m.has(a)){const q=makeMat(a.tex,isFlat);m.set(a,q);if(isFlat)regFlat(q)}return m.get(a)};
function spr(a,x,z,scale=1,flip=false,mat,y){const m=new THREE.Mesh(spriteGeo,mat||sharedMat(a,false));m.position.set(x,y??Yat(x,z),z);m.scale.set(a.w*scale*(flip?-1:1),a.h*scale,1);parentG.add(m);return m}
function flat(a,x,z,sw,sd,dy=.05,mat,order=-10,y){const m=new THREE.Mesh(flatGeo,mat||sharedMat(a,true));m.position.set(x,(y??Yat(x,z))+dy,z);m.scale.set(sw,1,sd);m.renderOrder=order;parentG.add(m);return m}

const A={tree:[artTree(1,TREE_PAL[0]),artTree(2,TREE_PAL[1]),artTree(3,TREE_PAL[3]),artTree(4,TREE_PAL[2])],palm:[artPalm(4),artPalm(5)],bush:artBush(true),bushBare:artBush(false),stump:artStump(),
  rock:[artRock(2.6,false,true),artRock(4.2,false,false),artRock(3.2,false,true)],black:[artRock(3.4,true),artRock(5,true)],col:artColumn(false),colB:artColumn(true),ribL:artRib(false),ribR:artRib(true),
  wreck:artWreck(),cave:artCave(),tuft:artTuft(),flower:[artFlower('#ff7a5a'),artFlower('#ffd24a'),artFlower('#c86af0'),artFlower('#ffffff')],fern:artFern(),mush:artMush(),glow:artMush('#3ad8b0',true),
  shell:artShell(),star:artStar(),coral:artCoral(),kelp:artKelp(),drift:artDrift(),anchor:artAnchor(),bottle:artBottle(),boot:artBoot(),skull:artSkull(),fishbone:artFishBone(),amphora:artAmphora(),spike:artSpike(),chain:artChain(),
  fence:artFence(),sign:artSign(),barrel:artBarrel(),logs:artLogs(),well:artWell(),tent:artTent(),cart:artCart(),clothes:artClothes(),lamp:artLamp(),net:artNet(),scare:artScare(),hive:artHive(),
  house:artHouse(),floor:artFloor(),wall:artBackWall(),bed:artBed(),table:artTable(),chest:artChest(false),chestO:artChest(true),bench:artBench(),pot:artPot(),
  fire:[0,1,2].map(artFire),crate:artCrate(),treasure:artTreasure(),inlet:artInlet(),demon:[artDemon(true),artDemon(false)],
  gull:[artGull(true),artGull(false)],fly:[artFly('#ffb04a'),artFly('#ff7ab0'),artFly('#8ad8ff')],
  shadow:artShadow(),ring:artRing(),foam:artFoam(),dig:artDig(),pool:artPool(),path:artPath(),drop:artDrop(),bubble:artBubble(),puff:artPuff(),firefly:artFirefly(),crack:artCrack(),
  slash:[artSlash('#ffe9b0'),artSlash('#ff8a4a')],slam:artSlam(),orb:[artOrb('#7affe0'),artOrb('#ff5a3a')],card:artCard(),ingot:artIngot(),heart:artHeart(),
  torch:[0,1,2].map(artTorch),door:artDoor(false),doorO:artDoor(true),splat:[artSplat('#7a2a5a'),artSplat('#2a6a5a')],
  en:{grub:[drawEnemyArt('grub',0),drawEnemyArt('grub',1)],spitter:[drawEnemyArt('spitter',0),drawEnemyArt('spitter',1)],hopper:[drawEnemyArt('hopper',0),drawEnemyArt('hopper',1)],brute:[drawEnemyArt('brute',0),drawEnemyArt('brute',1)]}};
A.fishJ=art(1.6,.8,g=>{P(g,[[.1,.4],[.7,.14],[1.2,.4],[.7,.62]],'#9fd0e0');P(g,[[1.15,.4],[1.5,.16],[1.5,.64]],'#6fa0c0');El(g,.42,.36,.05,.05,INK,null)});

/* всё, что стоит на земле: видно, только когда это место вышло из воды */
const objs=[],solids=[];
function put(a,x,z,o={}){
  const s=o.scale||1,m=spr(a,x,z,s,o.flip),y=Yat(x,z);
  const e={x,z,m,sy:a.h*s,k:0,shadow:null,h:groundH(x,z),decor:!!o.decor};
  if(o.cast)e.shadow=(()=>{const q=new THREE.Mesh(shadowGeo,regFlat(makeMat(a.tex,true,{dark:.42,shear:1.05})));q.position.set(x,y+.06,z+.1);q.scale.set(a.w*s,1,a.h*s*.62);q.renderOrder=-9;parentG.add(q);return q})();
  else if(o.shadow!==false&&!o.decor)e.shadow=flat(A.shadow,x,z+.05,a.w*s*(o.sw||.62),a.w*s*(o.sw||.62)*.42,.06);
  if(o.solid){e.solid={x,z,r:o.solid};solids.push(e.solid)}
  m.visible=false;if(e.shadow)e.shadow.visible=false;
  objs.push(e);return e;
}
const flatLand=(x,z,r=2.4)=>{const y=Yat(x,z);return Math.abs(Yat(x+r,z)-y)+Math.abs(Yat(x-r,z)-y)+Math.abs(Yat(x,z+r)-y)+Math.abs(Yat(x,z-r)-y)<1.2};
/* спрятанная полоса за северным уступом: туда мелочи не ставим */
const hiddenLedge=(x,z)=>Yat(x,z+3.5)>Yat(x,z)+1.1;

/* ---------- лагерь ---------- */
const crackDecal=flat(A.crack,MOUTH.x,MOUTH.z,A.crack.w,A.crack.h,.08);
const monArt=art(4,4,null,64),monMat=makeMat(monArt.tex,false,{depth:false}),monM=spr(monArt,MOUTH.x,MOUTH.z+1.55,1,false,monMat);
let monKey='';
const HY=Yat(HOUSE.x,HOUSE.z);
flat(A.floor,HOUSE.x,HOUSE.z,9.6,7.6,.08,undefined,-8,HY);
put(A.wall,HOUSE.x,HOUSE.z-3.7,{shadow:false});
flat(A.bed,HOUSE.x-3.3,HOUSE.z-1.6,2.3,3.6,.1,undefined,-7,HY);
put(A.table,HOUSE.x+3,HOUSE.z-2,{shadow:false});
const chestE=put(A.chest,CHEST.x,CHEST.z+.3,{shadow:false});
const chestOpenM=spr(A.chestO,CHEST.x,CHEST.z+.3);chestOpenM.visible=false;
const roofMat=makeMat(A.house.tex,false);
const roof=spr(A.house,HOUSE.x,HOUSE.z+3.9,1,false,roofMat);
{const q=new THREE.Mesh(shadowGeo,regFlat(makeMat(A.house.tex,true,{dark:.4,shear:1.05})));q.position.set(HOUSE.x,HY+.07,HOUSE.z+4);q.scale.set(A.house.w,1,7);q.renderOrder=-9;worldG.add(q)}
put(A.bench,BENCH.x,BENCH.z,{solid:1.7});
put(A.pot,POT.x,POT.z,{solid:1.2});
for(const[a,x,z,o]of[[A.fence,-13.6,-1.8,{}],[A.fence,-1.6,-2.3,{flip:true}],[A.fence,1.6,-3,{}],[A.sign,3,1.6,{}],[A.logs,-14.5,-4,{solid:1}],[A.barrel,-1.4,-4.2,{solid:.7}],[A.barrel,-.2,-3.5,{solid:.7,scale:.8}],
  [A.lamp,-4.6,2,{}],[A.lamp,6,2.6,{}],[A.lamp,12,1,{}],[A.clothes,-16,-9,{}],[A.well,7,-6,{solid:1.3,cast:true}],[A.hive,-17,-5.8,{}],[A.scare,-6,6,{}],[A.cart,4,8,{solid:1.3}],[A.net,10,18,{}],[A.tent,-9,15,{solid:1.6,cast:true}]])
  if(groundH(x,z)>.05)put(a,x,z,o);
const pathStones=[];
for(let i=0;i<9;i++){const t=i/8,x=lerp(-4,12,t),z=lerp(-.4,4.4,t)+Math.sin(i*1.3)*.5;pathStones.push({x,z,m:flat(A.path,x,z,1.5,1,.09)})}
for(let i=0;i<7;i++){const t=i/6,x=lerp(-7,-2,t),z=lerp(-3,2+Math.sin(i),t);pathStones.push({x,z,m:flat(A.path,x,z,1.4,.95,.09)})}

/* костры */
const fires=[];
function addFire(x,z,base=false){
  const m=spr(A.fire[0],x,z+.2);
  flat(A.shadow,x,z+.25,2.4,1.1,.07);
  fires.push({x,z,m,base,ph:Math.random()*9});
}
addFire(BASEFIRE.x,BASEFIRE.z,true);

/* деревья, кусты, вход в пещеры */
const trees=[],bushes=[],fishSpots=[],crates=[],digs=[],wrecks=[],caveEnts=[];
for(const c of CAVES){const e=put(A.cave,c.x,c.z,{solid:3.1,cast:true});caveEnts.push({c,e})}
const nearCave=(x,z,r=7)=>CAVES.some(c=>Math.hypot(c.x-x,c.z-z)<r);
function addTree(x,z,palm){
  if(nearCave(x,z))return null;
  const set=palm?A.palm:A.tree,a=set[Math.floor(hash(x,z)*set.length)];
  const e=put(a,x,z,{flip:hash(z,x)>.5,solid:.7,cast:true,scale:.9+hash(x+1,z)*.24});
  const t={x,z,hp:3,e,shake:0};trees.push(t);return t;
}
function fellTree(t){
  t.e.m.visible=false;t.e.gone=true;if(t.e.shadow)t.e.shadow.visible=false;
  const i=solids.indexOf(t.e.solid);if(i>=0)solids.splice(i,1);
  put(A.stump,t.x,t.z,{shadow:false});puff(t.x,1.2,t.z,6);objBusy=true;
}
function addBush(x,z){
  const e=put(A.bush,x,z,{solid:.7,sw:.5}),bare=spr(A.bushBare,x,z);bare.visible=false;
  bushes.push({x,z,cd:0,e,bare});
}
for(const[x,z]of[[-18,6],[-4,12],[-20,-5],[5,-15],[13,-11],[-3,20],[8,16],[-12,8],[16,-4]])if(groundH(x,z)>.15)addTree(x,z,x>0);

function scatter(l,n,fn){for(let i=0;i<n;i++){
  const a=hash(i+l.seed,3)*6.283,r=l.r*(.1+.8*Math.sqrt(hash(i+l.seed,7))),x=l.x+Math.cos(a)*r,z=l.z+Math.sin(a)*r;
  if(locD(l,x,z)<.9)fn(x,z,i)}}
const L=id=>LOCS.find(l=>l.id===id);
{
  const o=L('otmel');scatter(o,9,(x,z,i)=>i%2?addTree(x,z,true):put(A.rock[i%3],x,z,{solid:1.1,cast:true}));
  const f=L('les');scatter(f,34,(x,z,i)=>{if(i%4===3)addBush(x,z);else addTree(x,z,i%6===0)});
  const g=L('gryada');scatter(g,24,(x,z,i)=>{if(i%5===0)addBush(x,z);else if(i%3===0)addTree(x,z,false);else put(A.rock[i%3],x,z,{solid:1.2,cast:true})});
  put(A.wreck,g.x+6,g.z+8,{solid:3,cast:true});
  const h=L('hram');scatter(h,18,(x,z,i)=>put(i%3===2?A.colB:A.col,x,z,{solid:.9,cast:true}));scatter(h,6,(x,z,i)=>put(A.rock[i%3],x+5,z-4,{solid:1.2}));
  const r=L('ryobra');for(let i=0;i<7;i++){const x=r.x-13+i*4.4,z=r.z-2+Math.sin(i)*1.4;put(A.ribL,x,z-1.8,{scale:1+i%2*.2,cast:true});put(A.ribR,x,z+1.8,{scale:1+i%2*.2,cast:true})}
  scatter(r,7,(x,z,i)=>put(A.rock[i%3],x,z+9,{solid:1.2}));
  const k=L('rif');scatter(k,26,(x,z,i)=>i%3?put(A.black[i%2],x,z,{solid:1.5,cast:true}):put(A.spike,x,z,{solid:.8,cast:true}));scatter(k,8,(x,z)=>put(A.glow,x+4,z+3,{decor:true}));
  const b=L('bereg');scatter(b,28,(x,z,i)=>{if(i%4===3)addBush(x,z);else addTree(x,z,i%2===0)});
}
/* мелочи: на траве, на песке и на дне каждого слоя свои */
const SEABED=[[A.shell,A.star,A.kelp,A.drift,A.bottle,A.coral,A.rock[0]],[A.shell,A.star,A.coral,A.kelp,A.boot,A.anchor,A.chain],[A.amphora,A.coral,A.fishbone,A.chain,A.star,A.rock[2]],[A.amphora,A.fishbone,A.skull,A.chain,A.rock[1]],[A.skull,A.fishbone,A.spike,A.glow,A.black[0]]];
for(let i=0;i<5200;i++){
  const a=hash(i,41)*6.283,r=7+Math.sqrt(hash(i,43))*345,x=Math.cos(a)*r,z=Math.sin(a)*r,h=groundH(x,z);
  if(h<-12.6||Math.hypot(x-MOUTH.x,z-MOUTH.z)<7.5||Math.hypot(x-HOUSE.x,z-HOUSE.z-1)<8.5||nearCave(x,z,5))continue;
  if(!flatLand(x,z,1.6)||hiddenLedge(x,z))continue;
  const b=biomeAt(x,z),k=hash(i,47),flip=i%2===0;
  if(h>.25&&b[0]>.55){put(k<.5?A.tuft:k<.72?A.flower[i%4]:k<.86?A.fern:A.mush,x,z,{decor:true,flip,scale:.9+k*.5})}
  else if(h>-.5){if(k<.5)put(k<.2?A.shell:k<.34?A.star:A.drift,x,z,{decor:true,flip})}
  else if(k<.62){const lvl=Math.min(4,Math.floor(-h/CFG.drop/1.6)),set=SEABED[lvl],q=set[i%set.length];put(q,x,z,{decor:true,flip,scale:.85+k*.6})}
  else if(k<.68){const m=flat(A.pool,x,z,3+k,2+k,.07);const e={x,z,m,sy:1,k:0,h,isFlat:true};m.visible=false;objs.push(e)}
}
/* рыбные места: ближние пересыхают, когда вода уходит */
for(let i=0;i<34;i++){const a=hash(i,31)*6.283,r=(i%2?52:135)+hash(i,32)*(i%2?90:240),x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(groundH(x,z)>-2.2)continue;
  const m=flat(A.ring,x,z,4,4,.05,regFlat(makeMat(A.ring.tex,true)),-10,0);fishSpots.push({x,z,cd:0,m,big:i%4===0,kind:i%3})}
for(let i=0;i<9;i++){const a=hash(i,61)*6.283,r=120+hash(i,62)*250,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(groundH(x,z)>-13)continue;
  const m=flat(A.ring,x,z,5,5,.05,regFlat(makeMat(A.ring.tex,true,{op:.5})),-10,0);wrecks.push({x,z,cd:0,m})}
function placeCrate(c){
  for(let i=0;i<40;i++){const a=Math.random()*6.283,r=45+Math.random()*335,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(groundH(x,z)<S.seaY-2&&Math.hypot(x-S.boat.x,z-S.boat.z)>30){c.x=x;c.z=z;return}}
}
for(let i=0;i<24;i++){const c={x:0,z:0,cd:0,m:spr(A.crate,0,0,1.25,false,undefined,0)};placeCrate(c);crates.push(c)}

/* машина и мосты */
const carSpr={side:spr(artCar('side'),0,0,1,false,undefined,0),front:spr(artCar('front'),0,0,1,false,undefined,0),back:spr(artCar('back'),0,0,1,false,undefined,0)};
for(const k in carSpr)carSpr[k].visible=false;
const carShadow=flat(A.shadow,0,0,5.4,2.2,.07,undefined,-6,0);carShadow.visible=false;
A.bridge=artBridge();A.post=artPost();
const bridgeMeshes=[];
function bridgeAt(x,z){for(const b of S.bridges){const dx=x-b.x,dz=z-b.z,u=dx*b.ux+dz*b.uz,v=-dx*b.uz+dz*b.ux;if(Math.abs(u)<b.len/2+.5&&Math.abs(v)<1.7)return b}return null}
function layBridge(b){
  const m=flat(A.bridge,b.x,b.z,3.4,b.len+1,.14,undefined,-6,b.y);m.rotation.y=Math.atan2(b.ux,b.uz);bridgeMeshes.push(m);
  for(const s of[-1,1])for(const k of[-1,1]){const x=b.x+b.ux*s*(b.len/2+.2)-b.uz*k*1.5,z=b.z+b.uz*s*(b.len/2+.2)+b.ux*k*1.5;bridgeMeshes.push(spr(A.post,x,z,1,false,undefined,b.y))}
}
/* разлом: земля проваливается ниже моря, вода заходит в трещину и делит остров */
function carveChasm(path,w){
  const pts=[];
  for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(l/2),nx=-(b[1]-a[1])/l,nz=(b[0]-a[0])/l;
    for(let k=0;k<n;k++){const t=k/n,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,o=vnoise(x*.09+7,z*.09)*2.2;pts.push([x+nx*o,z+nz*o])}}
  const R0=w+2,texel=WORLD/HN;
  for(const[x,z]of pts){
    const ci=Math.floor((x/WORLD+.5)*HN),cj=Math.floor((z/WORLD+.5)*HN),r=Math.ceil(R0/texel);
    for(let j=cj-r;j<=cj+r;j++)for(let i=ci-r;i<=ci+r;i++){
      if(i<0||j<0||i>=HN||j>=HN)continue;
      const wx=((i+.5)/HN-.5)*WORLD,wz=((j+.5)/HN-.5)*WORLD,d=Math.hypot(wx-x,wz-z),k=smooth(w+.9,w-.3,d);if(k<=0)continue;
      const a=j*HN+i,nh=lerp(heightMap[a],-32,k);if(nh<heightMap[a]){heightMap[a]=nh;hData[a]=THREE.DataUtils.toHalfFloat(nh)}
    }
  }
  hTex.needsUpdate=true;
  const pos=terr.geo.attributes.position,n=terr.n,idx=terr.idx,half=WORLD/2,seen=new Set();
  for(const[x,z]of pts){const ci=Math.round(x+half),cj=Math.round(z+half),r=Math.ceil(R0)+1;
    for(let j=cj-r;j<=cj+r;j++)for(let i=ci-r;i<=ci+r;i++){if(i<0||j<0||i>=n||j>=n)continue;const a=j*n+i;if(seen.has(a)||idx[a]<0)continue;seen.add(a);pos.setY(idx[a],visY(groundH(i-half,j-half)))}}
  pos.needsUpdate=true;
  /* что стояло на линии разлома, проваливается */
  for(const q of pathStones)if(groundH(q.x,q.z)<-1)q.m.visible=false;
  for(const o of objs){if(o.gone||groundH(o.x,o.z)>o.h-1.2)continue;o.gone=true;o.m.visible=false;if(o.shadow)o.shadow.visible=false;if(o.solid){const q=solids.indexOf(o.solid);if(q>=0)solids.splice(q,1)}}
  for(const t of trees)if(t.hp>0&&groundH(t.x,t.z)<t.e.h-1.2)t.hp=0;
  for(const d of[...digs])if(groundH(d.x,d.z)<-14)removeDig(d);
  return pts;
}

/* ---------- живность ---------- */
const gulls=Array.from({length:7},(_,i)=>({m:spr(A.gull[0],0,0,.8,false,makeMat(A.gull[0].tex,false),6),m2:spr(A.gull[1],0,0,.8,false,makeMat(A.gull[1].tex,false),6),a:i*.9,r:14+i*4,sp:.25+i*.03,y:6+i*.7,cx:i*9-20,cz:-i*7}));
const flies=Array.from({length:12},(_,i)=>({m:spr(A.fly[i%3],0,0,.9),a:i,cx:(i*7)%24-14,cz:(i*5)%22-8}));
const glows=Array.from({length:22},(_,i)=>({m:spr(A.firefly,0,0,1,false,makeMat(A.firefly.tex,false,{glow:1,add:true,op:0}),0),a:i*1.7,r:3+i*.9}));

/* ---------- герой ---------- */
const HERO_PX=640,heroCanvas=document.createElement('canvas');heroCanvas.width=heroCanvas.height=HERO_PX;
const heroArt={w:3.2,h:3.2,tex:new THREE.CanvasTexture(heroCanvas)};
/* волк рисуется мимо живописного фильтра: метка в альфе кадра, чтобы мелкие детали не смазывались */
const heroMat=makeMat(heroArt.tex,false,{mask:true});
const hero=new THREE.Mesh(spriteGeo,heroMat);scene.add(hero);hero.scale.set(3.2,3.2,1);
const heroShadow=new THREE.Mesh(flatGeo,regFlat(makeMat(A.shadow.tex,true)));heroShadow.renderOrder=-5;scene.add(heroShadow);
const ripple=new THREE.Mesh(flatGeo,regFlat(makeMat(A.ring.tex,true,{op:.8})));ripple.renderOrder=-5;ripple.visible=false;scene.add(ripple);
const heroFrames=new Map();let heroKey='';
function setHeroFrame(o){
  const key=[o.dir,o.step,o.pose,o.item,o.water,o.dual,o.blink,o.rollA,o.lamp,o.skates].join();
  if(key===heroKey)return;heroKey=key;
  let c=heroFrames.get(key);
  if(!c){if(heroFrames.size>220)heroFrames.clear();c=document.createElement('canvas');c.width=c.height=HERO_PX;const g=c.getContext('2d');g.scale(HERO_PX/3.2,HERO_PX/3.2);g.lineJoin=g.lineCap='round';drawHero(g,o);heroFrames.set(key,c)}
  const g=heroCanvas.getContext('2d');g.clearRect(0,0,HERO_PX,HERO_PX);g.drawImage(c,0,0);heroArt.tex.needsUpdate=true;
}

/* ---------- кораблик: настоящая модель, чтобы смотреть из-за кормы ---------- */
const BOAT_MAT=new THREE.ShaderMaterial({side:THREE.DoubleSide,uniforms:{uAmb:WU.uAmb,uL:WU.uL,uLc:WU.uLc,uCamT:WU.uCamT,uFogD:WU.uFogD,uFogC:WU.uFogC,uSun:{value:SUN}},
vertexShader:`attribute vec3 color;varying vec3 vC,vN;varying vec2 vW;varying float vFog,vL;uniform vec2 uCamT;uniform float uFogD;
void main(){vC=color;vN=normalize(mat3(modelMatrix)*normal);vL=position.y+position.z*.3;vec4 w=modelMatrix*vec4(position,1.);vW=w.xz;float d=length(w.xz-uCamT)/uFogD;vFog=1.-exp(-d*d);gl_Position=projectionMatrix*viewMatrix*w;}`,
fragmentShader:`precision highp float;varying vec3 vC,vN;varying vec2 vW;varying float vFog,vL;uniform vec3 uSun,uFogC;${LIGHT_GLSL}
void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float s=dot(n,uSun);vec3 c=vC*mix(vec3(.56,.56,.88),vec3(1.14,1.05,.92),smoothstep(-.2,.55,s));c*=.93+.07*sin(vL*22.);c*=lightAt(vW);gl_FragColor=vec4(mix(c,uFogC,vFog),1.);}`});
function tinted(geo,hexc){
  const g=geo.index?geo.toNonIndexed():geo;g.computeVertexNormals();const c=new THREE.Color(hexc),n=g.attributes.position.count,a=new Float32Array(n*3);
  for(let i=0;i<n;i++)a.set([c.r,c.g,c.b],i*3);g.setAttribute('color',new THREE.BufferAttribute(a,3));return g;
}
const boatG=new THREE.Group();worldG.add(boatG);
{
  /* корпус: кольца от кормы к носу */
  const st=16,prof=[[1,1.2],[.97,.74],[.74,.18],[.36,-.14],[0,-.3]],pos=[],col=[];
  const ringAt=i=>{const s=i/st,z=-3.7+s*7.9,w=1.55*Math.pow(1-Math.pow(s,2.6),.62)+.02,rise=.62*s*s;const r=[];
    for(let k=-4;k<=4;k++){const p=prof[4-Math.abs(k)],sg=Math.sign(k)||1;r.push([sg*p[0]*w,p[1]+rise*(p[1]>.5?1:.25),z])}return r};
  const red=new THREE.Color('#b8392e'),cream=new THREE.Color('#f0e0bc'),dark=new THREE.Color('#2a3a4a');
  for(let i=0;i<st;i++){const a=ringAt(i),b=ringAt(i+1);for(let k=0;k<8;k++){
    for(const v of[a[k],a[k+1],b[k+1],a[k],b[k+1],b[k]])pos.push(...v);
    const c=(k===0||k===7)?cream:(k===1||k===6)?red:dark;for(let t=0;t<6;t++)col.push(c.r,c.g,c.b)}}
  /* транец: плоская корма */
  {const r=ringAt(0),mid=[0,.72,r[0][2]];for(let k=0;k<8;k++){for(const v of[mid,r[k+1],r[k]])pos.push(...v);const c=k===0||k===7?cream:k===3||k===4?dark:red;for(let t=0;t<3;t++)col.push(c.r,c.g,c.b)}
   for(const v of[mid,r[0],r[8]])pos.push(...v);for(let t=0;t<3;t++)col.push(cream.r,cream.g,cream.b)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();
  boatG.add(new THREE.Mesh(g,BOAT_MAT));
  const part=(geo,hexc,x,y,z)=>{const m=new THREE.Mesh(tinted(geo,hexc),BOAT_MAT);m.position.set(x,y,z);boatG.add(m);return m};
  const shape=new THREE.Shape();shape.moveTo(-1.5,3.66);shape.lineTo(1.5,3.66);shape.lineTo(1.46,-1);shape.quadraticCurveTo(1,-3,0,-4.05);shape.quadraticCurveTo(-1,-3,-1.46,-1);shape.closePath();
  const deck=new THREE.Mesh(tinted(new THREE.ShapeGeometry(shape).rotateX(-Math.PI/2),'#d0a06a'),BOAT_MAT);deck.position.y=1.02;boatG.add(deck);
  for(let i=0;i<7;i++){const p=part(new THREE.BoxGeometry(2.9,.02,.04),'#8a6242',0,1.04,-3.3+i*.8)}
  part(new THREE.BoxGeometry(2,1.75,2.1),'#f2e6cc',0,1.9,-1.1);
  part(new THREE.BoxGeometry(2.3,.16,2.5),'#2f7a7a',0,2.84,-1.1);
  part(new THREE.BoxGeometry(1.6,.6,.06),'#ffd77a',0,2.2,-.03);
  for(const s of[-1,1])part(new THREE.BoxGeometry(.06,.55,1.1),'#ffd77a',s*1.02,2.2,-1.1);
  part(new THREE.BoxGeometry(.7,1.2,.05),'#7a3a30',0,1.6,-2.17);
  part(new THREE.CylinderGeometry(.17,.21,1.1,8),'#26222c',.5,3.4,-1.6);
  part(new THREE.CylinderGeometry(.2,.2,.18,8),'#b8392e',.5,3.74,-1.6);
  part(new THREE.CylinderGeometry(.07,.09,3.6,6),'#7a5238',0,2.8,1.5);
  const boom=part(new THREE.CylinderGeometry(.05,.06,3.2,6),'#7a5238',0,2.5,3);boom.rotation.x=1;
  part(new THREE.BoxGeometry(.9,.5,.7),'#a57a4e',-.6,1.26,.9);part(new THREE.BoxGeometry(.6,.6,.6),'#8a6242',.62,1.3,.4);
  part(new THREE.CylinderGeometry(.34,.34,1.2,10).rotateZ(1.57),'#c7b48a',0,1.4,2.2);
  part(new THREE.SphereGeometry(.2,8,6),'#ffe08a',0,4.7,1.5);
}
const boatLampPos=new THREE.Vector3();
const wake=Array.from({length:30},()=>{const m=flat(A.foam,0,0,2,2,.06,regFlat(makeMat(A.foam.tex,true,{op:0})),-6,0);m.visible=false;return{m,t:0}});
let wakeI=0,wakeCD=0;

/* ---------- демоны ---------- */
const demons=[];
for(let i=0;i<5;i++){
  const m=spr(A.demon[0],0,0,.68,false,makeMat(A.demon[0].tex,false),0),m2=spr(A.demon[1],0,0,.68,false,makeMat(A.demon[1].tex,false),0),sh=flat(A.shadow,0,0,2.4,1,.05,undefined,-5,0);
  m.visible=m2.visible=sh.visible=false;demons.push({m,m2,sh,a:i/5*6.28,r:4.6+i*1,sp:1.2+i*.2,fall:0});
}

/* ---------- шланг ---------- */
let hoseM=null,hoseInlet=null;
const hoseLine=regFlat(makeMat(art(.5,.5,g=>{g.fillStyle='#3b2d24';g.fillRect(0,0,.5,.5)},8).tex,true));
function layHose(){
  if(hoseM){worldG.remove(hoseM);hoseM.geometry.dispose();hoseM=null}
  if(hoseInlet){worldG.remove(hoseInlet);hoseInlet=null}
  const h=S.hose;if(!h.placed)return;
  hoseInlet=spr(A.inlet,h.x,h.z,1,false,undefined,Math.max(Yat(h.x,h.z),seaVis()));
  const dx=MOUTH.x-h.x,dz=MOUTH.z-h.z,len=Math.hypot(dx,dz)||1,nx=-dz/len*.16,nz=dx/len*.16,n=Math.ceil(len/1.2)+2,pos=[],idx=[],uv=[];
  for(let i=0;i<=n;i++){const t=i/n,w=Math.sin(t*9)*.5*Math.sin(t*3.14),x=h.x+dx*t+nx*w*6,z=h.z+dz*t+nz*w*6,y=Math.max(Yat(x,z),seaVis())+.14;
    pos.push(x+nx,y,z+nz,x-nx,y,z-nz);uv.push(0,t,1,t);if(i<n){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);
  hoseM=new THREE.Mesh(g,hoseLine);hoseM.renderOrder=-8;hoseM.frustumCulled=false;worldG.add(hoseM);
}

/* ---------- находки ---------- */
function addDig(x,z,opt){digs.push({x,z,m:flat(A.dig,x,z,2.6,1.9,.09),...opt})}
function removeDig(d){worldG.remove(d.m);digs.splice(digs.indexOf(d),1)}

/* сокровище: пузыри в точке и сундук при подъёме */
const treasBub=Array.from({length:6},(_,i)=>{const m=spr(A.bubble,0,0,1,false,undefined,0);m.visible=false;return{m,ph:i*1.3}});
const treasRing=flat(A.ring,0,0,6,6,.05,regFlat(makeMat(A.ring.tex,true,{op:.9})),-10,0);treasRing.visible=false;
const treasChest=spr(A.treasure,0,0,1,false,undefined,0);treasChest.visible=false;
let chestUp=0;

/* ---------- частицы ---------- */
const parts=Array.from({length:90},()=>{const m=new THREE.Mesh(spriteGeo,sharedMat(A.drop,false));m.visible=false;scene.add(m);return{m,mats:new Map(),life:0,vx:0,vy:0,vz:0,g:0,y:0}});
function emit(a,x,y,z,vx,vy,vz,life,g=12,size=1,abs=false){
  const p=parts.find(q=>q.life<=0);if(!p)return;
  const base=abs||S.inCave?0:Math.max(Yat(x,z),seaVis());
  if(!p.mats.has(a))p.mats.set(a,makeMat(a.tex,false));
  p.m.material=p.mats.get(a);p.m.scale.set(a.w*size,a.h*size,1);p.m.position.set(x,y+base,z);p.m.visible=true;
  Object.assign(p,{life,life0:life,grow:g===0?1:0,vx,vy,vz,g,y:y+base,floor:base});
}
const puff=(x,y,z,n=5)=>{for(let i=0;i<n;i++)emit(A.puff,x+(Math.random()-.5),y,z+(Math.random()-.5),(Math.random()-.5)*2,1.2+Math.random(),(Math.random()-.5)*2,.7,0,.9)};
const splash=(x,z,n=6)=>{for(let i=0;i<n;i++){const a=Math.random()*6.28;emit(A.drop,x,.2,z,Math.cos(a)*2.4,3+Math.random()*3,Math.sin(a)*1.6,.7)}};
function dropFrom(){emit(A.drop,S.x+S.fx*.5+(S.flip?-.4:.4),1.1+S.air,S.z+.1,(Math.random()-.5)*.8,.4,(Math.random()-.5)*.5,.55)}
function updateParts(dt){for(const p of parts)if(p.life>0){p.life-=dt;if(p.life<=0){p.m.visible=false;continue}
  p.vy-=p.g*dt;p.m.position.x+=p.vx*dt;p.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.m.position.y=p.y;if(p.g>0&&p.y<p.floor){p.life=0;p.m.visible=false}
  if(p.grow){const q=p.life/p.life0;p.m.material.uniforms.uOp.value=Math.min(1,q*1.6)*.8;const k=1+dt*.3;p.m.scale.x*=k;p.m.scale.y*=k}}}

/* ---------- живописный фильтр кадра ---------- */
const rtOpts={samples:4,depthBuffer:true};
let rt=new THREE.WebGLRenderTarget(4,4,rtOpts);
const postU={t:{value:rt.texture},res:{value:new THREE.Vector2(1,1)},uT:{value:0}};
const postScene=new THREE.Scene(),postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:postU,depthTest:false,depthWrite:false,
vertexShader:`varying vec2 vU;void main(){vU=uv;gl_Position=vec4(position.xy,0.,1.);}`,
fragmentShader:`precision highp float;varying vec2 vU;uniform sampler2D t;uniform vec2 res;uniform float uT;
float hs(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1.,0.)),u.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),u.x),u.y);}
/* сглаживание мазками: из каждой пары противоположных соседей берётся более близкий к центру.
   Края остаются чёткими, и в отличие от блочных фильтров квадратов не появляется */
vec3 paintK(vec2 u,vec2 px){
  vec3 c0=texture2D(t,u).rgb,sum=c0;
  for(int r=1;r<=2;r++){float k=float(r)*1.25;
    for(int i=0;i<4;i++){float a=float(i)*.7854+.39*float(r);vec2 d=vec2(cos(a),sin(a))*px*k;
      vec3 p=texture2D(t,u+d).rgb,q=texture2D(t,u-d).rgb;vec3 e=p-c0,f=q-c0;sum+=dot(e,e)<dot(f,f)?p:q;}}
  return sum/9.;}
void main(){
  float boil=floor(uT*7.);vec2 p=vU*res,px=1./res;
  vec2 wob=(vec2(vn(p*.05+boil*1.7),vn(p*.05+boil*2.3+7.))-.5)*1.7*px;
  vec4 raw=texture2D(t,vU);float keep=1.-raw.a;
  vec3 c=mix(paintK(vU+wob,px),raw.rgb,keep);
  float lum=dot(c,vec3(.3,.59,.11));
  float a=dot(p,vec2(.72,.69))+vn(p*.018)*14.;
  float hatch=smoothstep(.35,.7,sin(a*.82));
  c*=1.-(1.-smoothstep(.07,.3,lum))*hatch*.3*(1.-keep);
  c=mix(c,c*vec3(.84,.88,1.22),1.-smoothstep(.08,.5,lum));
  c=mix(c,c*vec3(1.1,1.03,.88),smoothstep(.5,1.,lum));
  float g=dot(c,vec3(.3,.59,.11));c=mix(vec3(g),c,1.2);
  c=(c-.5)*1.06+.5;
  float paper=vn(p*.5)*.5+vn(p*1.3)*.5;c*=1.+(paper-.5)*.075;
  vec2 v=vU-.5;c*=1.-dot(v,v)*.55;
  gl_FragColor=vec4(c,1.);}`})));
function fitRT(){
  const s=renderer.getDrawingBufferSize(new THREE.Vector2());
  rt.setSize(s.x,s.y);postU.res.value.copy(s);
}
fitRT();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);fitRT()});
function renderFrame(){
  postU.uT.value=time;
  renderer.setRenderTarget(rt);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCam);
}
/* если кадров мало, снижаем разрешение */
let perfT=0,perfN=0;
function adaptQuality(dt){perfT+=dt;perfN++;if(perfN<90)return;const avg=perfT/perfN;perfT=0;perfN=0;
  if(avg>.03&&pixelK>1){pixelK=Math.max(1,pixelK*.9);renderer.setPixelRatio(pixelK);renderer.setSize(innerWidth,innerHeight,false);fitRT()}}

/* ---------- время суток ---------- */
function nightness(){
  const t=S.t,d=CFG.dayLen,e=CFG.dayLen+CFG.nightLen,w=CFG.duskLen;
  if(t<w)return 1-smooth(0,w,t);
  if(t<d-w)return 0;
  if(t<d+w)return smooth(d-w,d+w,t);
  if(t<e-w)return 1;
  return 1-smooth(e-w,e,t);
}
const lightBuf=[];
const addL=(x,z,r,i,c)=>lightBuf.push({x,z,r,i,c,d:Math.hypot(x-CAM.x,z-CAM.z)});
function flushLights(){
  lightBuf.sort((a,b)=>a.d-b.d);
  for(let i=0;i<MAXL;i++){const l=lightBuf[i],v=WU.uL.value[i],c=WU.uLc.value[i];
    if(l){v.set(l.x,l.z,l.r,l.i);c.set(l.c[0],l.c[1],l.c[2])}else v.w=0}
  lightBuf.length=0;
}
function updateLights(n){
  const flick=1+Math.sin(time*7)*.07+Math.sin(time*13)*.05;
  addL(MOUTH.x,MOUTH.z,10,(.25+.85*n)*(S.thirsty?.25:1)*flick,[1,.32,.12]);
  addL(BASE.x,BASE.z+1,17,n*(S.thirsty?.2:.95)*flick,[1,.68,.38]);
  addL(HOUSE.x,HOUSE.z,8,n*.75,[1,.78,.5]);
  if(S.lanternOn){const p=me();addL(p.x,p.z,14,1.05*flick,[1,.8,.52])}
  if(S.onBoat)addL(S.boat.x,S.boat.z,16,n*.9,[1,.82,.55]);
  for(const f of fires)addL(f.x,f.z,13,(.2+.95*n)*flick,[1,.6,.28]);
  for(const c of CAVES)addL(c.x,c.z+3,7,n*.6,[1,.66,.3]);
  flushLights();
}

/* ---------- обновление картинки ---------- */
let seaLast=1e9,objBusy=true;
function updateObjs(dt){
  const sea=S.seaY;if(Math.abs(sea-seaLast)<.0006&&!objBusy)return;
  seaLast=sea;objBusy=false;
  const cine=S.mode==='cutscene';
  for(const o of objs){
    if(o.gone)continue;
    const up=o.h>sea-.02;
    if(up&&o.k<1){o.k=Math.min(1,o.k+dt*(cine?2.2:50));objBusy=true}else if(!up&&o.k>0){o.k=Math.max(0,o.k-dt*4);objBusy=true}
    const vis=o.k>.01;o.m.visible=vis;if(o.shadow)o.shadow.visible=vis;
    if(vis&&!o.isFlat){const b=o.k<1?1+Math.sin(o.k*3.14)*.14:1;o.m.scale.y=o.sy*o.k*b}
  }
}
function updateHero(dt,baseY){
  const b=S.boat,moved=S.moving&&!S.ui;
  const step=moved?Math.round(Math.sin(Math.floor(S.walkT*2.2)/2.2)*2)/2:0;
  const hh=S.onBoat||S.inCave?null:held(),item=hh&&hh!=='skates'&&(!TOOLS[hh]||S.have[hh])?hh:null,hasW=hh==='lantern'?S.lanternOn:!!(TOOLS[hh]&&S.water>0);
  const pose=S.rollT>0?'roll':S.hurtT>0?'hurt':S.atkT>0?'atk':S.chargeT>.18?'charge':S.mode==='wake'?'idle':S.scoopT>0?'scoop':S.chopT>.35?'chop':S.pourT>0?'pour':'idle';
  const bl=Math.sin(time*.9+1)>.992,dual=!!(TOOLS[hh]&&S.up[hh]&&S.up[hh].dual);
  const dir=S.onBoat?'up':S.dir;
  setHeroFrame({dir,step,pose,item,water:hasW,dual,blink:bl,rollA:pose==='roll'?Math.round(time*14)%8*.785:0,lamp:S.lanternOn&&hh!=='lantern',skates:S.skates.on&&!S.onBoat});
  const inCar=S.car.on&&!S.inCave;hero.visible=!inCar;
  if(S.onBoat){
    const q=boatG.localToWorld(boatLampPos.set(.55,1.05,-3));
    hero.position.set(q.x,q.y,q.z);hero.scale.set(1.7,1.7,1);heroShadow.visible=false;ripple.visible=false;heroMat.uniforms.uClip.value=0;return;
  }
  const depth=S.inCave||bridgeAt(S.x,S.z)?0:clamp(S.seaY-groundH(S.x,S.z),0,.42),bob=moved?Math.abs(step)*.09:0,squash=1+(moved?Math.abs(step)*.04:Math.sin(time*2)*.012);
  const cut=depth*1.3,up=WU.uUp.value;
  heroMat.uniforms.uClip.value=cut/3.2;
  hero.position.set(S.x-up.x*cut,baseY+S.air+bob-up.y*cut+.02,S.z+.02-up.z*cut);
  const fl=(S.flip&&S.dir==='side')?-1:1;
  hero.scale.set(3.2*fl*(2-squash),3.2*squash,1);
  heroShadow.visible=true;heroShadow.position.set(S.x,baseY+.08,S.z+.05);const sh=1.9*(1-Math.min(.5,S.air*.2));heroShadow.scale.set(sh,1,sh*.42);
  ripple.visible=depth>.03;if(ripple.visible){ripple.position.set(S.x,baseY+.09,S.z+.02);const s=2+Math.sin(time*3)*.25;ripple.scale.set(s,1,s*.62)}
}
function updateScene(dt){
  time+=dt;
  const n=S.inCave?0:nightness(),dusk=Math.max(0,1-Math.abs(n-.5)*2);
  if(!S.seaLocked)S.seaY+=(seaTarget()-S.seaY)*Math.min(1,dt*.8);
  GU.uT.value=time;SKY.uT.value=time;SKY.uNight.value=n;
  const sv=seaVis();
  if(S.inCave){
    WU.uAmb.value.set(.5,.46,.58);WU.uShadeK.value=1;WU.uFogD.value=1e5;
    updateCaveScene(dt);flushLights();updateHero(dt,0);updateParts(dt);return;
  }
  WU.uAmb.value.set(lerp(lerp(1.02,.2,n),1.04,dusk*.7),lerp(lerp(1,.25,n),.72,dusk*.7),lerp(lerp(.97,.45,n),.58,dusk*.7));
  WU.uShadeK.value=1-n*.8;
  WU.uFogC.value.set(lerp(lerp(.78,.08,n),.98,dusk*.8),lerp(lerp(.87,.11,n),.62,dusk*.8),lerp(lerp(.93,.2,n),.46,dusk*.8));
  SKY.uTop.value.set(lerp(lerp(.26,.02,n),.32,dusk*.6),lerp(lerp(.54,.04,n),.26,dusk*.6),lerp(lerp(.88,.12,n),.5,dusk*.6));
  /* на воде стоит дымка, а ночью туман подступает к самой лодке */
  const third=CAM.fov>30;WU.uFogD.value=third?lerp(300,110,n)*Math.max(1,CAM.h/40):1e5;
  sky.position.copy(camera.position);
  GU.uSea.value=S.seaY;GU.uSeaY.value=sv;GU.uBlood.value=clamp(S.debt/levelL()*2.2,0,.75);GU.uHot.value=hotOn()?1:0;
  updateLights(n);
  updateObjs(dt);
  for(const t of trees)if(t.shake>0&&!t.e.gone){t.shake=Math.max(0,t.shake-dt*4);t.e.m.position.x=t.x+Math.sin(time*40)*.09*t.shake}
  for(const b of bushes){b.bare.visible=b.e.m.visible&&b.cd>0;if(b.cd>0)b.e.m.visible=false;else if(b.e.k>.5)b.e.m.visible=true}
  for(const f of fires)f.m.material=sharedMat(A.fire[Math.floor(time*8+f.ph)%3],false);
  for(const f of fishSpots){f.dry=groundH(f.x,f.z)>S.seaY-.8;f.m.visible=!f.dry&&f.cd<=0;f.m.position.y=sv+.05;const s=(f.big?5.6:4)*(1+Math.sin(time*2.2+f.x)*.16);f.m.scale.set(s,1,s*.8);
    if(f.m.visible&&Math.hypot(f.x-CAM.x,f.z-CAM.z)<110&&Math.random()<dt*.5){emit(A.fishJ,f.x+(Math.random()-.5)*2,.1,f.z+(Math.random()-.5)*2,(Math.random()-.5)*2,6.5,(Math.random()-.5)*2,1.2,12,f.big?1.5:1)}}
  for(const w of wrecks){w.m.visible=w.cd<=0;w.m.position.y=sv+.05;if(w.cd<=0&&Math.hypot(w.x-CAM.x,w.z-CAM.z)<100&&Math.random()<dt*2)emit(A.bubble,w.x+(Math.random()-.5)*3,.1,w.z+(Math.random()-.5)*3,0,1.4,0,1.2,0,.8)}
  for(const c of crates){c.m.visible=c.cd<=0;c.m.position.set(c.x,sv+Math.sin(time*1.5+c.x)*.12-.15,c.z)}
  const inside=inHouse();roofMat.uniforms.uOp.value+=((inside?.08:1)-roofMat.uniforms.uOp.value)*Math.min(1,dt*7);
  chestE.gone=S.chestOpen;if(S.chestOpen){chestE.m.visible=false;chestOpenM.visible=true}
  if(Math.random()<dt*2.2)emit(A.puff,HOUSE.x+3.4,9.2,HOUSE.z+3.9,.4,1.3,0,3,0,.9+Math.random()*.6);

  /* зверёк сидит в щели и растёт с уровнем */
  const tier=S.level>=5?2:S.level>=3?1:0,blink=Math.sin(time*.7)>.985,open=S.thirsty||meterFull(),happy=S.bubbleT>.6;
  const key=[tier,blink,open,happy].join();
  if(key!==monKey){monKey=key;drawMonster(monArt.g,tier,blink,open,happy);monArt.tex.needsUpdate=true}
  S.monPop=Math.max(0,(S.monPop||0)-dt*1.4);
  const ms=(.62+S.level*.26)*(1+Math.sin(S.monPop*9)*S.monPop*.28),sq=1+Math.sin(time*1.6)*.025+(happy?Math.sin(time*11)*.03:0);
  const my=Yat(MOUTH.x,MOUTH.z),up0=WU.uUp.value,cutM=.92*ms*sq;
  monM.scale.set(4*ms*(2-sq),4*ms*sq,1);monMat.uniforms.uClip.value=.23;
  monM.position.set(MOUTH.x-up0.x*cutM,my-up0.y*cutM+.1,MOUTH.z+1.55-up0.z*cutM);

  /* кораблик качается на воде */
  const b=S.boat;
  boatG.position.set(b.x,sv+Math.sin(time*1.4)*.08+.05,b.z);boatG.rotation.set(Math.sin(time*.9)*.03-b.v*.004,b.h,Math.sin(time*1.1)*.035);
  boatG.updateMatrixWorld();
  if(Math.abs(b.v)>1.5){wakeCD-=dt;if(wakeCD<=0){wakeCD=.1;const w=wake[wakeI++%wake.length];w.t=1;
    w.m.position.set(b.x-Math.sin(b.h)*3.6+(Math.random()-.5)*.8,sv+.06,b.z-Math.cos(b.h)*3.6+(Math.random()-.5)*.8);w.m.visible=true}}
  for(const w of wake)if(w.t>0){w.t-=dt*.42;const s=1.8+(1-w.t)*5;w.m.scale.set(s,1,s);w.m.material.uniforms.uOp.value=Math.max(0,w.t)*.6;if(w.t<=0)w.m.visible=false}
  if(S.onBoat&&Math.random()<dt*2)emit(A.puff,b.x+Math.sin(b.h)*-1.6+.4,4.1,b.z+Math.cos(b.h)*-1.6,0,1.1,0,1.7,0,.42);

  const br=bridgeAt(S.x,S.z),ground=S.onBoat?sv:br?br.y:Math.max(Yat(S.x,S.z),sv-.1);
  S.y+=(ground-S.y)*Math.min(1,dt*14);
  updateHero(dt,S.y);
  /* машина: стоит, где оставили, или едет с героем */
  {const c=S.car,on=c.on,cx=on?S.x:c.x,cz=on?S.z:c.z,v=carSpr[on?(S.dir==='up'?'back':S.dir==='down'?'front':'side'):'side'];
   for(const k in carSpr)carSpr[k].visible=c.made&&carSpr[k]===v;
   if(c.made){v.position.set(cx,on?S.y:Yat(cx,cz),cz);v.scale.x=Math.abs(v.scale.x)*(on&&S.dir==='side'&&S.flip?-1:1);carShadow.visible=true;carShadow.position.set(cx,(on?S.y:Yat(cx,cz))+.07,cz+.1)}else carShadow.visible=false}

  /* чайки, бабочки, светлячки */
  for(const g of gulls){g.a+=dt*g.sp;const x=CAM.x+g.cx+Math.cos(g.a)*g.r,z=CAM.z+g.cz+Math.sin(g.a)*g.r,y=Math.max(CAM.y,sv)+g.y+Math.sin(g.a*3);const up=Math.floor(time*6+g.r)%2===0;g.m.visible=up&&n<.6;g.m2.visible=!up&&n<.6;for(const q of[g.m,g.m2])q.position.set(x,y,z)}
  const showFly=n<.5&&CAM.h<70&&!S.onBoat;
  for(const f of flies){f.m.visible=showFly;if(!showFly)continue;f.a+=dt*1.7;const x=f.cx+Math.sin(f.a)*2+Math.sin(f.a*.37)*5,z=f.cz+Math.cos(f.a*1.3)*1.6;f.m.position.set(x,Yat(x,z)+1.1+Math.sin(f.a*3)*.4,z);const s=Math.sin(time*18+f.a)>0?1:.5;f.m.scale.x=.63*s}
  for(const f of glows){const on=n>.35;f.m.visible=on;if(!on)continue;f.a+=dt*.5;const x=CAM.x+Math.cos(f.a*.7+f.r)*f.r*2.2,z=CAM.z+Math.sin(f.a+f.r)*f.r*1.3;f.m.position.set(x,Math.max(Yat(x,z),sv)+1+Math.sin(f.a*2)*.6,z);f.m.material.uniforms.uOp.value=.5+.5*Math.sin(time*2+f.r)}

  /* демоны падают с неба и кружат вокруг цели */
  const p=me(),attack=S.attacking,py=S.onBoat?sv+1:S.y;
  for(const d of demons){
    d.fall=attack?Math.min(1,d.fall+dt*.8):Math.max(0,d.fall-dt*1.4);
    const on=d.fall>.01;d.sh.visible=on;if(!on){d.m.visible=d.m2.visible=false;continue}
    d.a+=dt*d.sp;const x=p.x+Math.cos(d.a)*d.r,z=p.z+Math.sin(d.a)*d.r*.62,y=py+2.6+Math.sin(time*2.1+d.r)*.8+(1-d.fall)*(1-d.fall)*38;
    const up=Math.floor(time*9+d.r)%2===0;d.m.visible=up;d.m2.visible=!up;
    const f=Math.cos(d.a)<0?-1:1;for(const q of[d.m,d.m2]){q.position.set(x,y,z);q.scale.x=Math.abs(q.scale.x)*f}
    d.sh.position.set(x,py+.06,z);const s=2.6-Math.min(1.8,(y-py)*.1);d.sh.scale.set(s,1,s*.42);
  }
  if(AC&&snd.choir)snd.choir.gain.setTargetAtTime(attack?.05:0,AC.currentTime,.5);

  /* точка сокровища */
  const near=S.onBoat?nearestMap(32):null;
  treasRing.visible=!!near;
  if(near){treasRing.position.set(near.x,sv+.05,near.z);const s=5+Math.sin(time*2.4)*.8;treasRing.scale.set(s,1,s*.8)}
  for(const t of treasBub){t.m.visible=!!near;if(near){const q=(time*.6+t.ph)%1;t.m.position.set(near.x+Math.sin(t.ph*5)*2.2,sv+q*2.2,near.z+Math.cos(t.ph*3)*1.4);const s=.5+q*.8;t.m.scale.set(.7*s,.7*s,1)}}
  if(chestUp>0){chestUp=Math.max(0,chestUp-dt*.42);treasChest.visible=chestUp>0;const q=1-chestUp;treasChest.position.y=sv+Math.min(1,q*2.6)*2.6+Math.sin(time*2)*.05;const f=clamp(chestUp*3,0,1);treasChest.scale.set(2.6*f,2.3*f,1)}

  updateParts(dt);
}
