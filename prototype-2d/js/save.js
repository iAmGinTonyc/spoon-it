/* Сохранение в браузере: герой, вещи, уровень и всё изменённое в мире. Пещеру и заставки не сохраняем */
const SAVE_KEY='spoonit2d-save-1';
const SAVE_SKIP=new Set(['ui','mode','scoopT','pourT','rollT','iframe','inCave','run','attacking','bleeding','shakeT','quakeFire','moving','running','hurtT','atkT','chargeT','cardT','bubbleT','smile','monPop','scoopSpot','scoopWet','winded','monJump','hopT','monSink']);
let lastSave=0,noSave=false;
function packFog(){let s='';for(let i=0;i<mapFog.length;i+=8){let b=0;for(let k=0;k<8;k++)if(mapFog[i+k])b|=1<<k;s+=String.fromCharCode(b)}return btoa(s)}
function unpackFog(t){const s=atob(t);for(let i=0;i<s.length;i++){const v=s.charCodeAt(i);for(let k=0;k<8;k++)mapFog[i*8+k]=(v>>k)&1}}
function saveGame(){
  if(noSave||S.mode!=='play'||S.inCave||cut||MG.on)return false;
  const s={};for(const k in S)if(!SAVE_SKIP.has(k))s[k]=S[k];
  const data={v:1,at:Date.now(),S:s,trees:trees.map(t=>t.hp),bushes:bushes.map(b=>Math.max(0,b.cd)),crates:crates.map(c=>Math.max(0,c.cd)),
    fish:fishSpots.map(f=>Math.max(0,f.cd)),wrecks:wrecks.map(w=>Math.max(0,w.cd)),locs:LOCS.map(l=>!!l.found),digs:digs.map(({m,...o})=>o),fog:packFog()};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(data));lastSave=Date.now();return true}catch(e){return false}
}
function readSave(){try{const t=localStorage.getItem(SAVE_KEY);return t?JSON.parse(t):null}catch(e){return null}}
function mergeInto(a,b){for(const k in b){const v=b[k];if(v&&typeof v==='object'&&!Array.isArray(v)&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k]))mergeInto(a[k],v);else a[k]=v}}
function loadGame(d){
  mergeInto(S,d.S);
  {const s=SLITS.find(q=>q.id===S.monAt)||SLITS[0];MOUTH.x=s.x;MOUTH.z=s.z}
  Object.assign(S,{mode:'play',ui:null,wakeT:99,inCave:false,scoopT:0,pourT:0,attacking:false,bleeding:false});
  for(let i=0;i<Math.min(S.quakes,QUAKES.length);i++)carveChasm(QUAKES[i],2.6);
  trees.forEach((t,i)=>{const hp=d.trees[i];if(hp==null)return;if(hp<=0&&t.hp>0){t.hp=0;fellTree(t)}else t.hp=hp});
  bushes.forEach((b,i)=>b.cd=d.bushes[i]||0);crates.forEach((c,i)=>c.cd=d.crates[i]||0);
  fishSpots.forEach((f,i)=>f.cd=d.fish[i]||0);wrecks.forEach((w,i)=>w.cd=d.wrecks[i]||0);
  LOCS.forEach((l,i)=>l.found=!!d.locs[i]);
  for(const g of[...digs])removeDig(g);for(const g of d.digs)addDig(g.x,g.z,g);
  if(d.fog)unpackFog(d.fog);MV.sea=null;
  for(const b of S.bridges)layBridge(b);
  if(S.hose.placed)layHose();
  const p=me();CAM.x=p.x;CAM.z=p.z;
}
function openPause(){
  if(S.mode!=='play')return;
  const ok=saveGame();S.ui='pause';$('pause').hidden=false;$('pmRestart').classList.remove('sure');$('pmRestart').textContent='Начать заново';
  $('pmSaved').textContent=S.inCave?'В пещере игра не сохраняется: сохранится после выхода':ok?'Игра сохранена':'Игра сохраняется сама каждые 15 секунд';
}
$('pmResume').onclick=closeUI;
$('pmRestart').onclick=()=>{const b=$('pmRestart');
  if(!b.classList.contains('sure')){b.classList.add('sure');b.textContent='Точно? Весь прогресс пропадёт';return}
  noSave=true;try{localStorage.removeItem(SAVE_KEY)}catch(e){}location.reload();
};
/* стартовый экран: продолжить сохранённую игру или начать новую */
{
  const sv=readSave(),intro=$('startBtn').onclick;
  if(sv){
    $('startBtn').textContent='Продолжить';$('newBtn').hidden=false;
    $('startBtn').onclick=()=>{initAudio();$('start').hidden=true;loadGame(sv);toast('Игра загружена')};
    $('newBtn').onclick=()=>{try{localStorage.removeItem(SAVE_KEY)}catch(e){}intro()};
  }
}
setInterval(saveGame,15000);
addEventListener('visibilitychange',()=>{if(document.hidden)saveGame()});
addEventListener('beforeunload',()=>{saveGame()});
