/* Диалоги. Говорит кто-то один: герой слева с текстом справа от него, собеседник справа с текстом слева */
const DLG={on:null};
const FACES={};
function faceOf(who){
  if(who==='hero')return heroImg.complete?(FACES.hero||(FACES.hero=heroPortrait(480))):heroPortrait(240);
  const k=who==='shadow'?'shadow':'m'+monStage();
  if(!FACES[k])FACES[k]=who==='shadow'?monsterPortrait(0,true):monsterPortrait(monStage(),false);
  return FACES[k];
}
const whoName=who=>who==='hero'?'Ты':who==='shadow'?'???':LEVELS[Math.min(S.level,LEVELS.length-1)].monster;
function say(lines,done){
  DLG.on={lines,i:0,done,shown:0};S.ui='dialog';S.scoopT=0;$('dialog').hidden=false;showLine();
}
function showLine(){
  const d=DLG.on,l=d.lines[d.i];d.shown=0;
  const box=$('dialog');box.className=l.who==='hero'?'':'right';if(l.shout)box.classList.add('shout');
  const c=$('dlgFace'),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.drawImage(faceOf(l.who),0,0,c.width,c.height);
  $('dlgName').textContent=whoName(l.who);$('dlgLine').textContent='';
  {const im=$('dlgItem');im.hidden=!l.item;if(l.item)im.src=INGOT_ICON}
  if(l.who!=='hero')blip(l.shout?150:300,.14,'triangle',.05);
}
function dlgNext(){
  const d=DLG.on;if(!d)return;const l=d.lines[d.i];
  if(d.shown<l.t.length){d.shown=l.t.length;$('dlgLine').textContent=l.t;return}
  d.i++;if(d.i<d.lines.length)return showLine();
  DLG.on=null;$('dialog').hidden=true;S.ui=null;if(d.done)d.done();
}
function updateDialog(dt){
  const d=DLG.on;if(!d)return;const l=d.lines[d.i];
  if(d.shown<l.t.length){d.shown=Math.min(l.t.length,d.shown+dt*48);$('dlgLine').textContent=l.t.slice(0,Math.floor(d.shown))}
}
$('dialog').addEventListener('click',dlgNext);

const INTRO=[
  {who:'hero',t:'Мм… Голова раскалывается.'},
  {who:'hero',t:'Где я? Ничего не помню. Кровать, сундук, чужой остров.'},
  {who:'shadow',t:'Помогите!.. Хочу пить!..',shout:true},
  {who:'hero',t:'Кто здесь? Голос идёт снаружи.'},
];
/* монстр впервые выпрыгнул из щели на другом острове */
const HOP_TALK=[
  {who:'hero',t:'Погоди… Ты что тут делаешь?'},
  {who:'monster',t:'Сижу. Пить хочу.'},
  {who:'hero',t:'Ты же застрял в щели за домом.'},
  {who:'monster',t:'Застрял. А теперь застрял тут. Щели под дном соединены.'},
  {who:'hero',t:'И ты просто прыгнул за мной?'},
  {who:'monster',t:'Одному страшно. Не уходи без меня.'},
];
/* разговор зависит от уровня монстра, новый разговор один раз на уровень */
const TALK=[
  [{who:'hero',t:'Это ты кричал?'},{who:'monster',t:'Помогите, хочу пить…'},{who:'hero',t:'Ты застрял в щели?'},{who:'monster',t:'Здесь так сухо. Море рядом, а я не достаю.'},{who:'hero',t:'У меня только ложка.'},{who:'monster',t:'Ложка подойдёт! Пожалуйста!'}],
  [{who:'monster',t:'Ты вернулся! Я чуть-чуть подрос.'},{who:'hero',t:'А вода вокруг острова ушла. Это из-за тебя?'},{who:'monster',t:'Не знаю. Я просто пью.'}],
  [{who:'monster',t:'Смотри, какой я! Вода такая вкусная.'},{who:'hero',t:'Откуда у тебя карты сокровищ?'},{who:'monster',t:'Они лежат на дне. Я всё там слышу.'}],
  [{who:'monster',t:'Мне уже тесно. Ты не устал?'},{who:'hero',t:'Море всё ниже. Ты столько не выпьешь.'},{who:'monster',t:'Выпью. Принеси ещё.'}],
  [{who:'monster',t:'Слышишь, как внизу стучит?'},{who:'hero',t:'Это не ты?'},{who:'monster',t:'Может быть, и я.'}],
  [{who:'monster',t:'Мало.'},{who:'hero',t:'Ты изменился.'},{who:'monster',t:'Ты вкусно пахнешь. Неси ещё.'}],
];
function talkMonster(){
  S.talked=S.talked||{};const i=Math.min(S.level,TALK.length-1);
  if(!S.talked[i]){S.talked[i]=true;say(TALK[i]);return}
  const set=PHRASES[Math.min(S.level,PHRASES.length-1)];say([{who:'monster',t:set.idle[Math.floor(Math.random()*set.idle.length)]}]);
}
