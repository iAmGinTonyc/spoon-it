/* Сцена. Земля настоящая: каждый уровень воды оставил обрыв, поэтому новые места лежат всё ниже.
   Предметы это плоские рисунки, развёрнутые к камере. Кадр проходит через живописный фильтр */
let time=0;
const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false});
/* пешком всё, что южнее на земле, рисуется поверх. На лодке камера крутится, там порядок идёт от глубины */
renderer.setTransparentSort((a,b)=>a.groupOrder-b.groupOrder||a.renderOrder-b.renderOrder||(S.onBoat?b.z-a.z:a.object.position.z-b.object.position.z)||a.id-b.id);
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
const vec3 PS0=vec3(.46,.40,.34),PS1=vec3(.42,.34,.30),PS2=vec3(.39,.30,.29),PS3=vec3(.36,.27,.31),PS4=vec3(.32,.25,.34),PS5=vec3(.26,.25,.34),PS6=vec3(.20,.21,.31),PS7=vec3(.15,.14,.24);
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
  land*=1.+(fbm(vec2(w.x*.13+w.y*.28,w.y*.8-w.x*.1))-.5)*.5;
  land=mix(land,land*vec3(.92,.86,.94),vn(w*.05));
  /* мелкая грязь, камешки и пепельные пятна */
  land*=1.+(fbm(w*1.3)-.5)*.3;
  land*=1.+(fbm(w*5.1)-.5)*.22;
  land=mix(land,land*vec3(1.14,1.12,1.18),smoothstep(.4,.8,fbm(w*.17+21.))*.5);
  {vec2 q=w*vec2(1.5,2.1),ci=floor(q);vec2 o=fract(q)-.5-(h2(ci)-.5)*.5;float z=hs(ci+9.)*.09+.07,on=step(.9,hs(ci+5.));land*=1.-on*.4*smoothstep(z,z*.6,length(o-vec2(.02,.05)));land=mix(land,land*1.3,on*smoothstep(z,z*.6,length(o)));}
  if(h<0.){float c=cracks(w*.26+warp*.5);land*=mix(1.,mix(.62,1.,smoothstep(.0,.07,c)),dry*.8);}
  /* обрывы: пласты породы и потёки от ушедшей воды */
  float bands=sin(Y*3.1+fbm(vec2(w.x*.09,Y*.7))*5.),streak=vn(vec2(w.x*1.3+w.y*1.3,Y*.16));
  vec3 wall=pal(idx+1.)*mix(.5,.9,.5+.5*bands)*mix(.72,1.08,streak);
  wall=mix(wall,wall*vec3(.8,.88,1.1),smoothstep(.3,.7,fbm(w*.1)));
  land=mix(land,wall,steep);

  float rk=bio.g+(g-.5)*.45;
  land=mix(land,mix(vec3(.34,.32,.34),vec3(.25,.24,.31),vn(w*.2))*(1.+(fbm(w*.8)-.5)*.5),smoothstep(.46,.52,rk));
  float gr=bio.r+(g-.5)*.42;
  vec3 grass=mix(vec3(.24,.29,.17),vec3(.14,.23,.18),vn(w*.13));
  grass=mix(grass,vec3(.36,.33,.19),smoothstep(.56,.76,fbm(w*.09+5.))*.7);
  grass*=1.+(fbm(vec2(w.x*.9+w.y*.5,w.y*1.6-w.x*.4))-.5)*.55;
  grass*=mix(.76,1.14,fbm(w*1.6+4.));
  grass*=1.+(vn(vec2(w.x*5.2,w.y*1.3))-.5)*.3;
  land=mix(land,vec3(.17,.19,.16),smoothstep(.40,.46,gr)*(1.-steep));
  land=mix(land,grass,smoothstep(.47,.52,gr)*(1.-steep*.8));
  land=mix(land,mix(vec3(.11,.10,.15),vec3(.21,.18,.27),g),smoothstep(.46,.52,bio.b+(g-.5)*.4));
  land*=mix(1.,.66,smoothstep(.24,.0,h-uSea));

  /* солнце слева, тени от обрывов */
  float lit=clamp(dot(n,uSun)*1.15,0.,1.),sh=0.;
  for(int i=1;i<=3;i++){float q=float(i)*2.6;vec2 p2=w+normalize(uSun.xz)*q;float yq=T(texture2D(uH,p2/uWorld+.5).r);sh=max(sh,smoothstep(.2,1.6,yq-(Y+q*.72)));}
  vec3 tone=mix(vec3(.52,.50,.74),vec3(1.06,.98,.90),lit*(1.-sh*.82));
  land*=mix(vec3(1.),tone,uShadeK);
  /* низины тонут в синеватой дымке, а верх остаётся ярким */
  land=mix(land,vec3(.17,.20,.31),smoothstep(3.,36.,uCamY-Y)*.5);
  land*=mix(1.,.8,clamp(-Y/34.,0.,1.));

  /* вода */
  float dp=max(d,0.),k=1.-exp(-dp*3.6);
  vec3 wc=mix(vec3(.24,.46,.44),vec3(.08,.36,.44),smoothstep(0.,.55,k));
  wc=mix(wc,vec3(.05,.26,.47),smoothstep(.5,1.,k));
  float nn=fbm(w*.03+vec2(uT*.02,uT*.012));
  wc+=(nn-.5)*.12;
  float band=floor((fbm(w*vec2(.05,.11)+vec2(uT*.03,uT*.05))+.12*sin(w.x*.02))*7.)/7.;
  wc*=.86+band*.32;
  wc+=waves(w*vec2(.085,.14)+vec2(uT*.03,0.),uT)*.42*(.25+k);
  wc+=waves(w*vec2(.19,.3)+vec2(-uT*.05,3.),uT+9.)*.2*(.25+k);
  float foamB=sin(dp*22.-uT*1.5+fbm(w*.3)*5.);
  float foam=smoothstep(.0,.03,dp)*smoothstep(.34,.02,dp)*smoothstep(.2,.8,foamB);
  wc=mix(wc,vec3(.62,.68,.66),foam*.7);
  wc=mix(wc,vec3(.5,.07,.08),uBlood*(.6+.4*nn));
  if(uHot>0.){float r=length(w),rr=smoothstep(uHotR,uHotR-16.,r);
    float boil=fbm(w*.1+vec2(uT*.13,-uT*.2)),ring=sin(r*.9-uT*1.6+boil*5.);
    wc=mix(wc,mix(vec3(.72,.20,.14),vec3(1.,.56,.22),boil),rr*.78);
    wc+=rr*smoothstep(.72,1.,ring)*vec3(.3,.16,.06);
    vec2 bc=w*.5+vec2(0.,-uT*.9),bi=floor(bc);float bd=length(fract(bc)-.5-(h2(bi)-.5)*.5);
    wc+=rr*step(.72,hs(bi+1.))*smoothstep(.2,.15,bd)*smoothstep(.06,.12,bd)*vec3(.5,.4,.3);
    wc=mix(wc,vec3(1.,.92,.84),rr*.5*smoothstep(.5,.72,fbm(w*.045+vec2(uT*.05,uT*.03))));}
  wc=mix(land*vec3(.72,.92,.96),wc,smoothstep(0.,.3,dp)*.92+.08);
  wc=mix(wc,vec3(.42,.46,.44),smoothstep(.0,.025,dp)*smoothstep(.09,.03,dp));

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
  if(uDark>0.){gl_FragColor=vec4(.04,.03,.07,t.a*uDark*uShadeK*uOp*(1.-vFog));return;}
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

const A={tree:[sheetArt('tree0',7.8),sheetArt('tree1',5.6),sheetArt('tree2',7.6),sheetArt('tree3',5.6)],palm:[sheetArt('palm0',7.6),sheetArt('palm1',6.8)],bush:sheetArt('bush',3.1),bushBare:sheetArt('bushBare',3.1),stump:sheetArt('stump',2.8),
  rock:[sheetArt('rock0',2.8),sheetArt('rock2',3.9),sheetArt('rock1',3.3)],black:[sheetArt('black0',3.5),sheetArt('black1',4.6)],
  cave:sheetArt('dDoorO',7.2),tuft:sheetArt('tuft',1.5),flower:['flower0','flower1','flower2','flower3'].map(n=>sheetArt(n,1.3)),fern:sheetArt('fern',2),mush:sheetArt('mush',1.2),glow:sheetArt('glow',1.5),
  
  fence:sheetArt('fence',3.6),sign:sheetArt('sign',2),barrel:sheetArt('barrel',1.8),logs:sheetArt('logs',3.4),well:sheetArt('well',3.6),tent:sheetArt('tent',5),cart:sheetArt('cart',4.2),clothes:sheetArt('clothes',5),lamp:sheetArt('lamp',1.9),net:sheetArt('net',3.4),scare:sheetArt('scare',3.2),hive:sheetArt('hive',2.3),
  house:sheetArt('house',12),floor:artFloor(),wall:artBackWall(),bed:sheetArt('bed',3.3),table:sheetArt('table',2.6),chest:sheetArt('chest',2.1),chestO:sheetArt('chestO',2.2),bench:sheetArt('bench',4.4),pot:sheetArt('pot2',2.6),
  fire:[sheetArt('fire1',2.5),sheetArt('fire2',2.5),sheetArt('fire1',2.5)],crate:sheetArt('barrel',1.5),treasure:sheetArt('chest',2.6),
  bird:{gull:[0,1,2,3,4,5,6,7].map(i=>sheetArt('bG'+i,1.5)),crow:[0,1,2,3,4,5,6,7].map(i=>sheetArt('bR'+i,1.5))},
  shadow:artShadow(),ring:artRing(),foam:artFoam(),dig:artDig(),pool:artPool(),path:sheetArt('path',2.6),dropF:[0,1,2].map(artDropF),dropRing:artDropRing(),wet:artWet(),bubble:artBubble(),puff:artPuff(),crack:artCrack(),crackLip:artCrackLip(),
  slash:[0,1,2,3,4,5,6].map(i=>sheetArt('dSlash'+i,5)),slam:artSlam(),rock2:[sheetArt('dRockG',2.5),sheetArt('dRockR',2.5)],paw:[sheetArt('dPawG',.8),sheetArt('dPawR',.8)],card:sheetArt('card',.95),ingot:sheetArt('ingot',1.2),heart:sheetArt('heart',.9),
  torch:[0,1,2,1].map(i=>sheetArt('dTorch'+i,2.1)),door:sheetArt('dDoor',6.2),doorO:sheetArt('dDoorO',6.2),splat:[artSplat('#7a2a5a'),artSplat('#2a6a5a')],
  en:{grub:[drawEnemyArt('grub',0),drawEnemyArt('grub',1)],spitter:[drawEnemyArt('spitter',0),drawEnemyArt('spitter',1)],hopper:[drawEnemyArt('hopper',0),drawEnemyArt('hopper',1)]}};
A.drop=A.dropF[0];
A.fishJ=sheetArt('herring',1.3);

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
const crackLip=spr(A.crackLip,MOUTH.x,MOUTH.z+1,1,false,makeMat(A.crackLip.tex,false,{depth:false}));
const monArt=art(MON_M,MON_M,null,96),monMat=makeMat(monArt.tex,false,{depth:false}),monM=spr(monArt,MOUTH.x,MOUTH.z+1,1,false,monMat);
/* нижняя часть овцы внутри щели: кадр спущен под землю и там обрезан */
const MON_SINK=.03,monBodyH=st=>MF[st][0].by*MON_K,monGeos=[0,1,2,3].map(st=>new THREE.PlaneGeometry(1,1).translate(0,.5-MON_SINK*monBodyH(st)/MON_M,0));
let crackK=0;
/* пустые щели, где монстра сейчас нет: видны, только когда остров вышел из воды */
const slitFx=SLITS.map(s=>({s,dec:flat(A.crack,s.x,s.z,A.crack.w,A.crack.h,.08),lip:spr(A.crackLip,s.x,s.z+1,1,false,makeMat(A.crackLip.tex,false,{depth:false}))}));
let monKey='';
const monBase=()=>1.2+S.level*.06;
const monScale=()=>monBase()*(1+Math.sin((S.monPop||0)*9)*(S.monPop||0)*.28);
const monHeight=()=>monBodyH(monStage())*monScale()*(1-MON_SINK)+.25;
const crackTarget=()=>MF[monStage()][0].w*MON_K*monBase()*1.08/(2*CRACK_A);
const HY=Yat(HOUSE.x,HOUSE.z);
flat(A.floor,HOUSE.x,HOUSE.z,9.6,7.6,.08,undefined,-8,HY);
const wallMat=makeMat(A.wall.tex,false,{op:0});put(A.wall,HOUSE.x,HOUSE.z-3.7,{shadow:false}).m.material=wallMat;
put(A.bed,HOUSE.x-3.2,HOUSE.z+.2,{shadow:false});
put(A.table,HOUSE.x+3,HOUSE.z-2,{shadow:false});
const chestE=put(A.chest,CHEST.x,CHEST.z+.3,{shadow:false});
const chestOpenM=spr(A.chestO,CHEST.x,CHEST.z+.3);chestOpenM.visible=false;
const roofMat=makeMat(A.house.tex,false);
const roof=spr(A.house,HOUSE.x,HOUSE.z+3.9,1,false,roofMat);
{const q=new THREE.Mesh(shadowGeo,regFlat(makeMat(A.house.tex,true,{dark:.4,shear:1.05})));q.position.set(HOUSE.x,HY+.07,HOUSE.z+4);q.scale.set(A.house.w,1,7);q.renderOrder=-9;worldG.add(q)}
const houseDoor=spr(sheetArt('door',1.7),HOUSE.x+.45,HOUSE.z+3.95,1,false,undefined,HY);
put(A.bench,BENCH.x,BENCH.z,{solid:1.7});
put(A.pot,POT.x,POT.z,{solid:1.2});
for(const[a,x,z,o]of[[A.fence,-13.6,-1.8,{}],[A.fence,-1.6,-2.3,{flip:true}],[A.fence,1.6,-3,{}],[A.sign,3,1.6,{}],[A.logs,-3.4,-2.8,{solid:1}],[A.barrel,-1.4,-4.2,{solid:.7}],[A.barrel,-.2,-3.5,{solid:.7,scale:.8}],
  [A.lamp,-4.6,2,{}],[A.lamp,6,2.6,{}],[A.lamp,12,1,{}],[A.clothes,-16,-9,{}],[A.well,7,-6,{solid:1.3,cast:true}],[A.hive,-20,-9.5,{}],[A.scare,-6,6,{}],[A.cart,4,8,{solid:1.3}],[A.net,10,18,{}],[A.tent,-9,15,{solid:1.6,cast:true}]])
  if(groundH(x,z)>.05)put(a,x,z,o);
const pathStones=[];
/* тропа от двери вокруг дома к монстру */
for(let i=0;i<9;i++){const t=i/8,x=lerp(-3.5,-.2,t)+Math.sin(t*3.14)*1.6,z=lerp(-3.2,-15,t);pathStones.push({x,z,m:flat(A.path,x,z,2.2,1.5,.09)})}
for(let i=0;i<7;i++){const t=i/6,x=lerp(-7,-2,t),z=lerp(-3,2+Math.sin(i),t);pathStones.push({x,z,m:flat(A.path,x,z,2.1,1.4,.09)})}

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
/* ---------- лут на земле: дрова из деревьев падают рядом и ждут, пока их подберут кнопкой Q ---------- */
const DROP_ART={wood:sheetArt('logs0',.95)};
const groundDrops=[];
function dropLoot(kind,x,z,n=1,instant=false){
  for(let i=0;i<n;i++){
    let tx=x,tz=z;
    if(!instant)for(let k=0;k<8;k++){const a=Math.random()*6.28,r=1+Math.random()*1.3,qx=x+Math.cos(a)*r,qz=z+Math.sin(a)*r*.7+.9;if(groundH(qx,qz)>S.seaY+.1){tx=qx;tz=qz;break}}
    const y0=Yat(x,z)+1.6,m=spr(DROP_ART[kind],x,z,1,Math.random()<.5,undefined,y0);
    groundDrops.push({kind,x0:x,z0:z,x:tx,z:tz,y0,t:instant?1:0,m});
  }
}
function updateDrops(dt){for(const d of groundDrops){const ly=Yat(d.x,d.z);
  if(d.t<1){d.t=Math.min(1,d.t+dt*2.4);const k=d.t;d.m.position.set(lerp(d.x0,d.x,k),lerp(d.y0,ly,k)+Math.sin(k*3.14)*1.1,lerp(d.z0,d.z,k))}
  else d.m.position.set(d.x,ly+.05+Math.max(0,Math.sin(time*3+d.x))*.08,d.z)}}
function addBush(x,z){
  const e=put(A.bush,x,z,{solid:.7,sw:.5}),bare=spr(A.bushBare,x,z);bare.visible=false;
  bushes.push({x,z,cd:0,e,bare});
}
for(const[x,z]of[[-18,6],[-4,12],[-20,-5],[5,-15],[13,-11],[-3,20],[8,16],[-12,8],[16,-4]])if(groundH(x,z)>.15)addTree(x,z,x>0);

function scatter(l,n,fn){for(let i=0;i<n;i++){
  const a=hash(i+l.seed,3)*6.283,r=l.r*(.1+.8*Math.sqrt(hash(i+l.seed,7))),x=l.x+Math.cos(a)*r,z=l.z+Math.sin(a)*r;
  if(locD(l,x,z)<.9&&!SLITS.some(s=>Math.hypot(s.x-x,s.z-z)<6))fn(x,z,i)}}
const L=id=>LOCS.find(l=>l.id===id);
{
  const o=L('otmel');scatter(o,9,(x,z,i)=>i%2?addTree(x,z,true):put(A.rock[i%3],x,z,{solid:1.1,cast:true}));
  const f=L('les');scatter(f,34,(x,z,i)=>{if(i%4===3)addBush(x,z);else addTree(x,z,i%6===0)});
  const g=L('gryada');scatter(g,24,(x,z,i)=>{if(i%5===0)addBush(x,z);else if(i%3===0)addTree(x,z,false);else put(A.rock[i%3],x,z,{solid:1.2,cast:true})});
  const h=L('hram');scatter(h,18,(x,z,i)=>put(A.black[i%2],x,z,{solid:1.2,cast:true}));scatter(h,6,(x,z,i)=>put(A.rock[i%3],x+5,z-4,{solid:1.2}));
  const r=L('ryobra');
  scatter(r,7,(x,z,i)=>put(A.rock[i%3],x,z+9,{solid:1.2}));
  const k=L('rif');scatter(k,26,(x,z,i)=>put(A.black[i%2],x,z,{solid:1.5,cast:true}));scatter(k,8,(x,z)=>put(A.glow,x+4,z+3,{decor:true}));
  const b=L('bereg');scatter(b,28,(x,z,i)=>{if(i%4===3)addBush(x,z);else addTree(x,z,i%2===0)});
}
/* мелочи: на траве, на песке и на дне каждого слоя свои */
const SEABED=[[A.rock[0],A.tuft],[A.rock[1],A.rock[2]],[A.rock[2],A.black[1]],[A.rock[1],A.black[0]],[A.glow,A.black[0]]];
for(let i=0;i<5200;i++){
  const a=hash(i,41)*6.283,r=7+Math.sqrt(hash(i,43))*345,x=Math.cos(a)*r,z=Math.sin(a)*r,h=groundH(x,z);
  if(h<-12.6||SLITS.some(s=>Math.hypot(x-s.x,z-s.z)<7.5)||Math.hypot(x-HOUSE.x,z-HOUSE.z-1)<8.5||nearCave(x,z,5))continue;
  if(!flatLand(x,z,1.6)||hiddenLedge(x,z))continue;
  const b=biomeAt(x,z),k=hash(i,47),flip=i%2===0;
  if(h>.25&&b[0]>.55){put(k<.5?A.tuft:k<.72?A.flower[i%4]:k<.86?A.fern:A.mush,x,z,{decor:true,flip,scale:.9+k*.5})}
  else if(h>-.5)continue;
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
/* птицы: днём чайки, ночью вороны. В сумерках одни растворяются, другие проявляются */
const birds=Array.from({length:4},(_,i)=>{const mat=makeMat(A.bird.gull[0].tex,false,{glow:.3});const m=spr(A.bird.gull[0],0,0,1,false,mat,6);m.renderOrder=30;return{mat,m,a:i*1.6,r:16+i*7,sp:.25+i*.04,y:6+i*.9,cx:i*15-20,cz:-i*10,ph:i*1.7}});

/* ---------- герой ---------- */
const HERO_PPM=150,heroCanvas=document.createElement('canvas');heroCanvas.width=HERO_W*HERO_PPM;heroCanvas.height=HERO_H*HERO_PPM;
const heroArt={w:HERO_W,h:HERO_H,tex:new THREE.CanvasTexture(heroCanvas)};const heroG=heroCanvas.getContext('2d');heroG.scale(HERO_PPM,HERO_PPM);heroG.lineJoin=heroG.lineCap='round';
/* волк рисуется мимо живописного фильтра: метка в альфе кадра, чтобы мелкие детали не смазывались */
const heroMat=makeMat(heroArt.tex,false,{mask:true});
const hero=new THREE.Mesh(spriteGeo,heroMat);scene.add(hero);hero.scale.set(HERO_W,HERO_H,1);
const heroShadow=new THREE.Mesh(flatGeo,regFlat(makeMat(A.shadow.tex,true)));heroShadow.renderOrder=-5;scene.add(heroShadow);
const ripple=new THREE.Mesh(flatGeo,regFlat(makeMat(A.ring.tex,true,{op:.8})));ripple.renderOrder=-5;ripple.visible=false;scene.add(ripple);
let heroKey='';
function setHeroFrame(o){
  const key=[o.group,o.fi,o.tilt,o.view,o.pose,o.item,o.water,o.dual,o.rollA,o.lamp,o.skates,o.wobble,heroImg.complete].join();
  if(key===heroKey)return;heroKey=key;
  drawHero(heroG,o);heroArt.tex.needsUpdate=true;
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
/* ночные демоны: кадры из листа, у каждого свой холст на кадр не нужен, меняется только текстура */
const demonImg=new Image();demonImg.src=DEMON_SHEET;
const DK=.0225,DT={};
function demonPart(r){const c=document.createElement('canvas');c.width=r.w;c.height=r.h;const tex=new THREE.CanvasTexture(c),draw=()=>{c.getContext('2d').drawImage(demonImg,r.x,r.y,r.w,r.h,0,0,r.w,r.h);tex.needsUpdate=true};if(demonImg.complete&&demonImg.naturalWidth)draw();else demonImg.addEventListener('load',draw);return{tex,w:r.w*DK,h:r.h*DK,c}}
for(const k in DF)if(k!=='angel')DT[k]=DF[k].map(demonPart);
const demons=[];
for(let i=0;i<5;i++){
  const mat=makeMat(DT.hover[0].tex,false,{glow:.5}),m=spr(DT.hover[0],0,0,1,false,mat,0),sh=flat(A.shadow,0,0,2.4,1,.05,undefined,-5,0);
  m.renderOrder=25;m.visible=sh.visible=false;demons.push({m,mat,sh,a:i/5*6.28,r:4.6+i*1,sp:1.2+i*.2,fall:0,cyc:i*1.3});
}

/* ---------- шланг ---------- */
let hoseM=null,hoseInlet=null;
const hoseLine=regFlat(makeMat(art(.5,.5,g=>{g.fillStyle='#3b2d24';g.fillRect(0,0,.5,.5)},8).tex,true));
function layHose(){
  if(hoseM){worldG.remove(hoseM);hoseM.geometry.dispose();hoseM=null}
  if(hoseInlet){worldG.remove(hoseInlet);hoseInlet=null}
  const h=S.hose;if(!h.placed)return;
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
const parts=Array.from({length:170},()=>{const m=new THREE.Mesh(spriteGeo,sharedMat(A.drop,false));m.visible=false;scene.add(m);return{m,mats:new Map(),life:0,vx:0,vy:0,vz:0,g:0,y:0}});
function emit(a,x,y,z,vx,vy,vz,life,g=12,size=1,abs=false,wait=0){
  const p=parts.find(q=>q.life<=0);if(!p)return;
  const base=abs||S.inCave?0:Math.max(Yat(x,z),seaVis());
  const drop=a===A.drop;if(!p.mats.has(a))p.mats.set(a,makeMat(a.tex,false,drop?{mask:true,glow:.35}:{}));
  p.m.material=p.mats.get(a);p.m.scale.set(a.w*size,a.h*size,1);p.m.position.set(x,y+base,z);p.m.visible=!wait;
  if(drop)p.m.material.uniforms.uOp.value=1;
  Object.assign(p,{life,life0:life,grow:g===0?1:0,vx,vy,vz,g,y:y+base,floor:base,drop,size,wait,gen:0,ph:Math.random()*6});return p;
}
/* круги и мокрые пятна там, где упала капля */
const rips=Array.from({length:44},()=>{const m=new THREE.Mesh(flatGeo,regFlat(makeMat(A.dropRing.tex,true,{op:0})));m.visible=false;m.renderOrder=-5;scene.add(m);return{m,t:0,life:1,r:0,wet:false}});
let ripI=0;
function dropRip(x,y,z,r,wet){const p=rips[ripI++%rips.length];p.t=p.life=wet?2.4:.5;p.r=r;p.wet=wet;p.m.material.uniforms.map.value=(wet?A.wet:A.dropRing).tex;p.m.position.set(x,y+.05,z);p.m.scale.set(wet?r:.1,1,wet?r:.1);p.m.visible=true}
function dropLand(p){
  const x=p.m.position.x,z=p.m.position.z,land=S.inCave||Yat(x,z)>seaVis()+.02,sz=p.size;
  dropRip(x,p.floor,z,.3+sz*.42,false);if(land&&sz>.6)dropRip(x,p.floor,z,.26+sz*.34,true);
  if(p.gen||sz<.55)return;
  for(let i=0,n=1+Math.floor(Math.random()*3);i<n;i++){const a=Math.random()*6.28,s=.5+Math.random()*1.1,q=emit(A.drop,x,p.floor+.03,z,Math.cos(a)*s,1.6+Math.random()*1.6,Math.sin(a)*s*.7,.7,14,sz*.5,true);if(q){q.floor=p.floor;q.gen=1}}
}
const puff=(x,y,z,n=5)=>{for(let i=0;i<n;i++)emit(A.puff,x+(Math.random()-.5),y,z+(Math.random()-.5),(Math.random()-.5)*2,1.2+Math.random(),(Math.random()-.5)*2,.7,0,.9)};
const splash=(x,z,n=6)=>{dropRip(x,Math.max(Yat(x,z),seaVis()),z,1.1,false);for(let i=0;i<n*3;i++){const a=Math.random()*6.28,s=.7+Math.random()*2.3;emit(A.drop,x,.15,z,Math.cos(a)*s,2.4+Math.random()*3.8,Math.sin(a)*s*.66,1.3,12,.45+Math.random()*.6,false,i*.006)}};
/* вода из ложки летит к щели каплями, а не появляется там сразу */
function pourArc(){
  const my=Yat(MOUTH.x,MOUTH.z),nz=MOUTH.z+CRACK_B*crackK,mouthY=my+monBodyH(monStage())*monScale()*.3,dir=S.flip?-1:1;
  const x0=S.x+dir*.85,z0=S.z,y0=Yat(S.x,S.z)+.95;
  for(let i=0;i<16;i++){const tx=MOUTH.x+(Math.random()-.5)*.5,tz=nz+.05,ty=mouthY+(Math.random()-.5)*.25,t=.22+Math.random()*.1;
    const q=emit(A.drop,x0,y0,z0,(tx-x0)/t,(ty-y0+6*t*t)/t,(tz-z0)/t,t,12,.45+Math.random()*.45,true,i*.02);if(q)q.floor=-99}
  /* брызги от морды, как только вода долетела */
  for(let i=0;i<5;i++){const a=Math.random()*6.28,q=emit(A.drop,MOUTH.x,mouthY,nz+.1,Math.cos(a)*1.2,1+Math.random()*1.5,.6+Math.random()*.8,1,12,.4+Math.random()*.3,true,.3+i*.03);if(q)q.floor=my}
}
function dropFrom(){emit(A.drop,S.x+S.fx*.5+(S.flip?-.4:.4),1.1+S.air,S.z+.1,(Math.random()-.5)*.8,.4,(Math.random()-.5)*.5,1,12,.55+Math.random()*.45)}
function updateParts(dt){
  for(const p of parts)if(p.life>0){
    if(p.wait>0){p.wait-=dt;if(p.wait<=0)p.m.visible=true;continue}
    p.life-=dt;if(p.life<=0){p.m.visible=false;continue}
    p.vy-=p.g*dt;p.m.position.x+=p.vx*dt;p.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.m.position.y=p.y;
    if(p.drop){const v=Math.abs(p.vy),f=p.vy<-6.5?2:p.vy<-2?1:0,s=p.size*A.drop.w,w=f?1:1+Math.sin(p.life*46+p.ph)*.1;
      p.m.material.uniforms.map.value=A.dropF[f].tex;p.m.scale.set(s*w*(1-Math.min(.25,v*.02)),s/w*(1+Math.min(.5,v*.045)),1);p.m.material.uniforms.uOp.value=Math.min(1,p.life*7)}
    if(p.g>0&&p.y<p.floor){p.life=0;p.m.visible=false;if(p.drop)dropLand(p)}
    if(p.grow){const q=p.life/p.life0;p.m.material.uniforms.uOp.value=Math.min(1,q*1.6)*.8;const k=1+dt*.3;p.m.scale.x*=k;p.m.scale.y*=k}
  }
  for(const p of rips)if(p.t>0){p.t-=dt;const q=Math.max(0,p.t/p.life);if(p.t<=0){p.m.visible=false;continue}
    if(p.wet)p.m.material.uniforms.uOp.value=.55*Math.min(1,q*2.4);else{const r=.1+(1-q*q)*p.r;p.m.scale.set(r,1,r);p.m.material.uniforms.uOp.value=q*.75}}
}

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
  if(S.lanternOn){const p=me();addL(p.x,p.z,14+3*S.up.lantern.radius,1.05*flick,[1,.8,.52])}
  else if(n>.05){const p=me();addL(p.x,p.z,7,n*.42,[.62,.68,.92])}
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
  const step=moved?Math.sin(S.walkT*.7):0;
  const hh=S.onBoat||S.inCave?null:held(),item=hh&&hh!=='skates'&&(!TOOLS[hh]||S.have[hh])?hh:null,hasW=hh==='lantern'?S.lanternOn:!!(TOOLS[hh]&&S.water>0);
  const pose=S.rollT>0?'roll':S.hurtT>0?'hurt':S.atkT>0?'atk':S.chargeT>.18?'charge':S.mode==='wake'?'idle':S.scoopT>0?'scoop':S.chopT>.35?'chop':S.pourT>0?'pour':'idle';
  const dual=!!(TOOLS[hh]&&S.up[hh]&&S.up[hh].dual);
  const fight=pose==='atk'||pose==='charge'||pose==='hurt';
  /* какой ряд кадров показать: зависит от направления, скорости и того, что в лапе */
  const spoon=S.inCave||(hh==='spoon'&&S.have.spoon),water=hh==='spoon'&&S.have.spoon&&S.water>0,d=S.dir;
  /* на листах нет отдельных кадров удара и кувырка, они собраны из бега с ложкой */
  let group,fi=0,tilt=0,view=d==='up'?'up':d==='down'?'down':'side',sideFrame=view==='side';
  if(pose==='roll'){group=spoon?'spRunS':'walkS';fi=2;sideFrame=true;view='atk'}
  else if(fight){group='spRunS';sideFrame=true;view='atk';
    if(pose==='atk'){const p=1-S.atkT/(S.atkDur||.3),seq=[[7,1,3],[7,3,5],[0,1,3,5]][(C.combo||0)%3];fi=seq[Math.min(seq.length-1,Math.floor(p*seq.length))];tilt=p<.3?-.2:.22*(1-(p-.3)/.7)}
    else if(pose==='charge'){fi=7;tilt=-.26}
    else fi=7;}
  else if(S.onBoat){group='idle';fi=1;view='up';sideFrame=false}
  else if(!moved&&hh==='spoon'&&(pose==='scoop'||(pose==='pour'&&S.chopT<=0))){
    const p=pose==='scoop'?1-S.scoopT/toolScoop():1-S.pourT/POUR_T;
    group=(pose==='scoop'?'sc':'po')+(d==='up'?'U':d==='down'?'D':'S');fi=clamp(Math.floor(p*8),0,7);
  }
  else if(moved&&d!=='up'&&d!=='down'){
    const fast=S.running;
    group=water?(fast?'wRunS':'wWalkS'):spoon?(fast?'spRunS':'spWalkS'):fast?'runS':'walkS';
    fi=Math.floor(S.walkT*.75);view='run';sideFrame=true;
  }else if(moved){
    const fast=S.running,D=d==='down',pre=water?'w':spoon?'sp':'';
    /* нижний ряд листа обрезан, поэтому бег вверх с водой идёт кадрами ходьбы */
    if(water&&!D)group='wWalkU';else group=(pre?pre+(fast?'Run':'Walk'):(fast?'run':'walk'))+(D?'D':'U');
    fi=Math.floor(S.walkT*.75);
  }
  else if(d==='up'){group='idle';fi=1}
  else if(d==='down'){group=water?'wIdle':spoon?'spIdle':'idle';fi=water?Math.floor(time*1.1)%2:0}
  else{group=water?'wWalkS':spoon?'spIdle':'idle';fi=water?0:3}
  const over=hh==='spoon'||S.inCave?null:item;
  setHeroFrame({group,fi,tilt,view,pose,item:over,water:hasW,dual,rollA:pose==='roll'?Math.round(time*14)%8*.785:0,lamp:S.lanternOn&&hh!=='lantern',skates:S.skates.on&&!S.onBoat,wobble:moved?Math.round(time*10):0});
  const inCar=S.car.on&&!S.inCave;hero.visible=!inCar;
  if(S.onBoat){
    const q=boatG.localToWorld(boatLampPos.set(.55,1.05,-3));
    hero.position.set(q.x,q.y,q.z);hero.scale.set(HERO_W*.56,HERO_H*.56,1);heroShadow.visible=false;ripple.visible=false;heroMat.uniforms.uClip.value=0;return;
  }
  const depth=S.inCave||bridgeAt(S.x,S.z)?0:clamp(S.seaY-groundH(S.x,S.z),0,.42),bob=moved?Math.abs(step)*.09:0,squash=1+(moved?Math.abs(step)*.04:Math.sin(time*2)*.012);
  const cut=depth*1.3,up=WU.uUp.value;
  heroMat.uniforms.uClip.value=cut/HERO_H;
  hero.position.set(S.x-up.x*cut,baseY+S.air+bob-up.y*cut+.02,S.z+.02-up.z*cut);
  const fl=S.flip&&sideFrame?-1:1;
  hero.scale.set(HERO_W*fl*(2-squash),HERO_H*squash,1);
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
  updateDrops(dt);
  for(const c of crates){c.m.visible=c.cd<=0;c.m.position.set(c.x,sv+Math.sin(time*1.5+c.x)*.12-.15,c.z)}
  houseDoor.visible=!S.doorOpen;
  const inside=inHouse();roofMat.uniforms.uOp.value+=((inside?.08:1)-roofMat.uniforms.uOp.value)*Math.min(1,dt*7);wallMat.uniforms.uOp.value=(1-roofMat.uniforms.uOp.value)/.92;
  chestE.gone=S.chestOpen;if(S.chestOpen){chestE.m.visible=false;chestOpenM.visible=true}
  if(Math.random()<dt*2.2)emit(A.puff,HOUSE.x+3.4,9.2,HOUSE.z+3.9,.4,1.3,0,3,0,.9+Math.random()*.6);

  /* зверёк сидит в щели и растёт с уровнем */
  /* улыбка: туда и обратно по 4 кадрам ряда */
  let smile=0;
  if(S.smile!=null){S.smile+=dt;const t=S.smile;smile=t<.1?1:t<.2?2:t<.8?3:t<.9?2:t<1?1:0;if(t>=1)S.smile=null}
  const st=monStage(),key=[st,smile,monImg.complete].join();
  if(key!==monKey){monKey=key;drawSheep(monArt.g,st,smile);monArt.tex.needsUpdate=true}
  S.monPop=Math.max(0,(S.monPop||0)-dt*1.4);
  const sq=1+Math.sin(time*1.6)*.02+(smile?.025:0),my=Yat(MOUTH.x,MOUTH.z);
  const ms=monScale();
  monM.scale.set(MON_M*ms*(2-sq),MON_M*ms*sq*(1-(S.monSink||0)),1);
  {const st=monStage(),tk=crackTarget(),nz=()=>MOUTH.z+CRACK_B*crackK;crackK=crackK?crackK+(tk-crackK)*Math.min(1,dt*1.4):tk;
    monM.geometry=monGeos[st];monMat.uniforms.uClip.value=MON_SINK*monBodyH(st)/MON_M;monM.position.set(MOUTH.x,my+.1,nz());
    crackDecal.position.set(MOUTH.x,my+.08,MOUTH.z);crackDecal.scale.set(A.crack.w*crackK,1,A.crack.h*crackK);
    for(const f of slitFx){const s=f.s,on=s.x!==MOUTH.x||s.z!==MOUTH.z?groundH(s.x,s.z)>S.seaY+.15:false,sy=Yat(s.x,s.z);f.dec.visible=f.lip.visible=on;if(!on)continue;
      f.dec.scale.set(A.crack.w*crackK,1,A.crack.h*crackK);f.lip.position.set(s.x,sy,s.z+CRACK_B*crackK-.1);f.lip.scale.set(A.crackLip.w*crackK,A.crackLip.h*crackK,1)}crackLip.position.set(MOUTH.x,my,nz()-.1);crackLip.scale.set(A.crackLip.w*crackK,A.crackLip.h*crackK,1)}

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

  /* птицы */
  {const crow=n>=.5,f=A.bird[crow?'crow':'gull'],op=Math.min(1,Math.abs(n-.5)*8),a=f[0];
    for(const g of birds){g.a+=dt*g.sp;const x=CAM.x+g.cx+Math.cos(g.a)*g.r,z=CAM.z+g.cz+Math.sin(g.a)*g.r,y=Math.max(CAM.y,sv)+g.y+Math.sin(g.a*3);
      g.m.position.set(x,y,z);g.mat.uniforms.uOp.value=op;g.mat.uniforms.map.value=f[Math.floor(time*(crow?10:12)+g.ph)%8].tex;g.m.scale.set(a.w*(Math.sin(g.a)>0?-1:1),a.h,1)}}

  /* демоны падают с неба и кружат вокруг цели */
  const p=me(),attack=S.attacking,py=S.onBoat?sv+1:S.y;
  for(const d of demons){
    d.fall=attack?Math.min(1,d.fall+dt*.8):Math.max(0,d.fall-dt*1.4);
    const on=d.fall>.01;d.sh.visible=on;d.m.visible=on;if(!on)continue;
    d.a+=dt*d.sp;const x=p.x+Math.cos(d.a)*d.r,z=p.z+Math.sin(d.a)*d.r*.62,y=py+2.6+Math.sin(time*2.1+d.r)*.8+(1-d.fall)*(1-d.fall)*38;
    /* что он делает: падает с неба, кружит и уносит вещи, тянет кровь, а святая вода рассыпает его */
    let act='fly',fi=Math.floor(time*10+d.r),toHero=false;
    if(attack){
      if(d.fall<.85){act='dive';fi=Math.min(5,Math.floor(d.fall/.85*6))}
      else if(S.bleeding){act='blood';fi=3+Math.floor(time*5+d.r)%3;toHero=true}
      else{d.cyc+=dt;const c=d.cyc%7;if(c>=5.8){act='flee';fi=Math.floor((c-5.8)*5)}else if(c>=4.6){act='steal';fi=Math.floor((c-4.6)*5);toHero=true}}
    }else if(S.blessedDay===S.day){act='repel';fi=Math.min(5,Math.floor((1-d.fall)*6));if(Math.random()<dt*5)emit(DT.ash[Math.floor(time*6)%4],x,y,z,(Math.random()-.5)*2,1,(Math.random()-.5)*2,.9,0,1,true)}
    else{act='flee';fi=Math.floor(time*9+d.r)}
    const l=DT[act],a=l[fi%l.length],dir=toHero?(Math.cos(d.a)>0?-1:1):(Math.sin(d.a)>0?-1:1);
    d.mat.uniforms.map.value=a.tex;d.m.position.set(x,y-a.h/2,z);d.m.scale.set(a.w*dir,a.h,1);
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
