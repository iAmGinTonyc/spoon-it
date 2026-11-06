/* Spoon It 2D: настройки, данные и состояние. Баланс совпадает с первым прототипом */
const CFG = {
  dayLen: 20*60, nightLen: 6*60, duskLen: 45,
  g: 1.2, payK: 13.4, payP: .66, nightPay: 2,
  drop: 1.6, hotR: 112, hotFromLevel: 5,
  hungry: 25, fed: 50, darkLimit: 10,
  satDecay: 100/(14*60), stealEvery: 1.4,
  nightCapShare: .25, bleedSeconds: 20,
  lanternDrain: 100/300, lanternStep: 25, lanternPrice: 5,
  hoseBurn: 30, hoseRate: 1, hoseTick: 3, hoseCost: 120, hoseCraftWood: 2, firePrice: 2,
  /* карта сокровищ: доля шкалы уровня, которую надо влить, чтобы монстр отдал карту */
  mapEvery: .35, haulTime: 3, treasureReach: 7,
  woodStack: 40, bridgeWood: 6, skatesCost: [60,2], carCost: [300,10], carSpeed: 15, skatesK: 1.6,
  viewFoot: 19, viewBoat: 92, viewCave: 25, pitchFoot: .93, pitchBoat: 1.12,
  zoomMin: .6, zoomMax: 3.4, caveEvery: 1,
};
const LEVELS = [
  {monster:'Зверёк',  liters:1,    bp:'Половник', tool:'ladle',    text:'Тара на 0,3 л. Сделай её на верстаке из shilver и дров.'},
  {monster:'Зверёк',  liters:12,   bp:'Кастрюля', tool:'pot',      text:'Тара на 1 л. Сделай её на верстаке из shilver и дров.'},
  {monster:'Зверёк',  liters:60,   bp:'Ведро',    tool:'bucket',   text:'Тара на 5 л. Сделай её на верстаке из shilver и дров.'},
  {monster:'Зверёк',  liters:300,  bp:'Шланг',    text:'Сделай его на верстаке. Он занимает 3 клетки, ставится где угодно и принимает воду вместо монстра.'},
  {monster:'Зверёк',  liters:800,  bp:'Тачка',    text:'На суше ты теперь ходишь быстрее.'},
  {monster:'Бесёнок', liters:2500, bp:'Канистра', tool:'canister', text:'Тара на 50 л. Сделай её на верстаке из shilver и дров.'},
  {monster:'Бесёнок', liters:8000, bp:null,       text:''},
];
const TOOLS = {
  spoon:   {name:'Ложка',    cap:.02, scoop:.7,  c0:5},
  ladle:   {name:'Половник', cap:.3,  scoop:1,   c0:15,  craft:[20,1],  level:1},
  pot:     {name:'Кастрюля', cap:1,   scoop:1.3, c0:25,  craft:[60,2],  level:2},
  bucket:  {name:'Ведро',    cap:5,   scoop:1.6, c0:40,  craft:[150,3], level:3},
  canister:{name:'Канистра', cap:50,  scoop:3,   c0:300, craft:[600,5], level:6},
};
const SKILLS=[
  {group:'Тело',note:'Бег, кувырок, силы',items:[
    {id:'steady',name:'Твёрдая рука',text:'При ходьбе проливается на 20% меньше',max:5,c0:8},
    {id:'run',name:'Быстрый бег',text:'Бег быстрее на 8%',max:5,c0:10},
    {id:'endur',name:'Выносливость',text:'Бег тратит на 12% меньше сил',max:5,c0:10,req:'run'},
    {id:'jump',name:'Кувырок',text:'Кувырок дальше и дешевле',max:3,c0:12,req:'run'}]},
  {group:'Выживание',note:'Лес, голод, темнота',items:[
    {id:'gut',name:'Крепкий желудок',text:'Голод приходит на 12% медленнее',max:5,c0:12},
    {id:'dark',name:'Привычка к темноте',text:'+3 с без света до демонов',max:3,c0:20,req:'gut'}]},
  {group:'Мореход',note:'Лодка и рыба',items:[
    {id:'row',name:'Гребец',text:'Грести легче на 15%',max:5,c0:10},
    {id:'fisher',name:'Рыбак',text:'Шанс вытащить вторую рыбу',max:3,c0:15,req:'row'}]},
];
SKILLS.push({group:'Боец',note:'Когти и карты в пещерах',items:[
  {id:'claw',name:'Острые когти',text:'Удары сильнее на 25%',max:5,c0:14},
  {id:'hide',name:'Толстая шкура',text:'Ещё одно сердце',max:3,c0:30,req:'claw'},
  {id:'deck',name:'Краплёная колода',text:'Карты бьют сильнее и тратят меньше азарта',max:3,c0:20,req:'claw'}]});
const PHRASES=[
  {idle:['Помогите, хочу пить','Здесь так сухо…','Есть тут кто?','Хоть глоточек…'],thanks:['Спасибо!','Вкусно!','Ещё капельку!','Ты добрый!']},
  {idle:['Ты вернулся!','Ещё водички?','Я чуть-чуть подрос','Не уходи надолго'],thanks:['Спасибо, друг!','Обожаю воду!','Ты лучший!','Ещё, ещё!']},
  {idle:['Мне уже лучше','Посмотри, какой я!','Вода такая вкусная','Давай ещё?'],thanks:['Ура, вода!','Какая прохладная!','Спасибо-спасибо!','Ты мой друг!']},
  {idle:['Я так рад, что ты есть','Хочу расти дальше','А море большое?','Ты не устал?'],thanks:['Мур-мур!','Ещё глоточек!','С тобой хорошо','Спасибо, родной!']},
  {idle:['Мне тесно в щели','Я скоро вылезу','Слышишь, как я расту?','Ещё немного'],thanks:['Ммм…','Ещё','Как же вкусно','Не останавливайся']},
  {idle:['Мало','Принеси больше','Ты вкусно пахнешь','Мне всё ещё мало'],thanks:['Хорошо','Ещё','Мне нужно больше','Вкус моря…']},
];
const FOODS={food:{name:'Жареная рыба',sat:35,buff:true,heal:2},berries:{name:'Ягоды',sat:14,heal:1},fish:{name:'Сырая рыба',sat:10,heal:1}};
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s)};
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,
  u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);
  return (a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v)*2-1}
const fmtL=v=>v<10?String(+v.toFixed(v<.1?3:2)).replace('.',','):Math.round(v).toLocaleString('ru-RU');
const mmss=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
const SHAPES={spoon:[1,1],ladle:[1,2],pot:[2,1],bucket:[2,1],canister:[2,2],axe:[1,2],hose:[3,1],berries:[1,1],fish:[1,1],food:[1,1],holy:[1,1],wood:[1,1],tmap:[1,1],lantern:[1,1],skates:[2,1]};
const GW=6,GH=4,CELL=62;
const coord=(x,z)=>`${z<=0?'С':'Ю'} ${Math.abs(Math.round(z))} · ${x>=0?'В':'З'} ${Math.abs(Math.round(x))}`;

/* ---------- базовый лагерь. x вправо, z к камере ---------- */
const MOUTH={x:18,z:6};
const HOUSE={x:-8,z:-8};
const houseW=(lx,lz)=>({x:HOUSE.x+lx,z:HOUSE.z+lz});
const houseL=(x,z)=>({x:x-HOUSE.x,z:z-HOUSE.z});
const BASE=houseW(0,5.5), BENCH=houseW(4.4,5.4), POT=houseW(-3.8,5.4), CHEST=houseW(-1.3,-2.75), BASEFIRE=houseW(-1.6,8.4);
const HOUSE_BOX=[[-4.8,4.8,-3.8,-3.5],[-4.8,-4.5,-3.8,3.8],[4.5,4.8,-3.8,3.8],[-4.8,-.95,3.5,3.8],[.95,4.8,3.5,3.8],
  [-4.3,-2.3,-3.3,.1],[-1.95,-.65,-3.3,-2.35],[2.2,3.8,-2.7,-1.7]];

/* ---------- локации, которые поднимаются из воды. lv: на каком уровне монстра ---------- */
const LOCS=[
  {id:'otmel', name:'Отмель находки',  lv:1,x:124, z:46,  r:17,grass:.62,rock:.25,dark:0,seed:11},
  {id:'les',   name:'Лесистый остров', lv:2,x:-132,z:98,  r:31,grass:1,  rock:0,  dark:0,seed:23},
  {id:'gryada',name:'Каменная гряда',  lv:3,x:54,  z:-172,r:25,grass:.4, rock:1,  dark:0,seed:37},
  {id:'hram',  name:'Затонувший храм', lv:4,x:222, z:-84, r:29,grass:.12,rock:.85,dark:0,seed:41},
  {id:'ryobra',name:'Китовые рёбра',   lv:5,x:-70, z:238, r:27,grass:0,  rock:.3, dark:0,seed:53},
  {id:'rif',   name:'Чёрный риф',      lv:6,x:-262,z:-48, r:31,grass:0,  rock:.4, dark:1,seed:67},
  {id:'bereg', name:'Дальний берег',   lv:7,x:268, z:196, r:36,grass:.75,rock:.2, dark:0,seed:71},
];

/* ---------- состояние ---------- */
const S={
  mode:'start',ui:null,t:70,day:1,level:0,meter:0,debt:0,nightBlood:0,baseSea:0,seaY:0,
  shilver:0,xp:0,stash:{base:0,boat:0},water:0,berries:0,fish:0,food:0,wood:0,finds:0,holy:0,tmap:0,blessedDay:-1,
  sat:82,stam:100,lantern:100,buff:0,darkT:0,attacking:false,bleeding:false,stealT:0,
  thirsty:false,pouredToday:false,lit:true,safe:false,chestOpen:false,inv:[],hot:[null,null,null,null],sel:0,invSlot:0,firsts:{},bubbleT:0,thanksText:'',phraseI:0,phraseT:7,payFrac:0,wakeT:0,
  sk:{steady:0,run:0,endur:0,jump:0,gut:0,dark:0,row:0,fisher:0,claw:0,hide:0,deck:0},
  hp:6,azart:40,inCave:false,zoomFoot:1,zoomBoat:1,caves:{},run:null,rollT:0,iframe:0,y:0,
  onBoat:false,x:0,z:0,air:0,vy:0,fx:0,fz:1,dir:'down',flip:false,walkT:0,moving:false,running:false,
  boat:{x:0,z:0,h:0,v:0},tool:'spoon',scoopT:0,pourT:0,
  up:{spoon:{vol:0,grip:0,dual:false},ladle:{vol:0,grip:0,dual:false},pot:{vol:0,grip:0,dual:false},bucket:{vol:0,grip:0,dual:false},canister:{vol:0,grip:0,dual:false},boat:{speed:0},axe:{sharp:0,grip:0}},
  have:{spoon:false,ladle:false,pot:false,bucket:false,canister:false,lantern:false},bp:{},axe:false,woodFrac:0,chopT:0,
  tachka:false,hose:{made:false,placed:false,burn:0,tick:0,x:0,z:0},
  maps:[],mapCharge:0,mapN:0,haul:0,opened:[],lanternOn:false,skates:{made:false,on:false},car:{made:false,on:false,x:0,z:0},quakes:0,quakeT:150,shakeT:0,bridges:[],talked:{},
};
const levelL=()=>LEVELS[Math.min(S.level,LEVELS.length-1)].liters;
const isNight=()=>S.t>=CFG.dayLen;
const meterFull=()=>S.meter>=levelL();
const seaTarget=()=>S.baseSea+CFG.drop*Math.min(1,S.debt/levelL());
function toolCap(){const t=TOOLS[S.tool],u=S.up[S.tool];
  return t.cap*Math.pow(1.45,u.vol)*(u.dual?2:1)*(S.buff>0?1.1:1)}
const toolScoop=()=>TOOLS[S.tool].scoop*Math.pow(.8,S.up[S.tool].grip);
const spillRate=()=>(S.running?.07:.03)*Math.pow(.8,S.sk.steady);
const hotOn=()=>S.level>=CFG.hotFromLevel;
const hotAt=(x,z)=>hotOn()&&Math.hypot(x,z)<CFG.hotR;
const dist2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const me=()=>S.onBoat?S.boat:S;
const activeMaps=()=>S.maps.filter(m=>!m.done);
const hpMax=()=>6+S.sk.hide*2+(S.run?S.run.hp:0);
