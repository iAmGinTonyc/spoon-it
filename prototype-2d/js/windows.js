/* окна: древо навыков, верстак, инвентарь. Перенесены из первого прототипа */
/* ---------- окна: древо навыков и инвентарь ---------- */
const cost=(c0,n)=>Math.ceil(c0*Math.pow(CFG.g,n+1));
function openUI(kind){
  S.ui=kind;S.scoopT=0;
  $('menu').hidden=!(kind==='tree'||kind==='bench');$('inv').hidden=kind!=='inv';$('map').hidden=kind!=='map';
  if(kind==='tree')renderTree();else if(kind==='bench')renderBench();else if(kind==='map')drawMap();else{S.invSlot=S.sel;renderInv()}
}
function closeUI(){S.ui=null;$('menu').hidden=true;$('inv').hidden=true;$('map').hidden=true}
function toggleUI(kind){if(S.mode!=='play')return;if(S.ui===kind)closeUI();else openUI(kind)}

const pipsHtml=(n,max)=>max>1?`<div class="pips">${Array.from({length:max},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</div>`:'';
function skillCost(it){return Math.ceil(it.c0*Math.pow(1.4,S.sk[it.id]))}
function renderTree(){
  const box=$('menuBox');box.innerHTML='';
  box.insertAdjacentHTML('beforeend',`<div class="head"><h2>Древо навыков</h2><small>Навыки покупаются за опыт. У тебя: ${Math.floor(S.xp)}</small></div>`);
  const tree=document.createElement('div');tree.className='tree';box.append(tree);
  for(const g of SKILLS){
    const col=document.createElement('div');tree.append(col);
    col.insertAdjacentHTML('beforeend',`<div class="root">${g.group}<small>${g.note}</small></div>`);
    for(const it of g.items){
      const n=S.sk[it.id],done=n>=it.max,price=skillCost(it),lockedBy=it.req&&!S.sk[it.req]?g.items.find(x=>x.id===it.req):null;
      const b=document.createElement('button');b.className='skill'+(done?' done':'');
      b.disabled=done||!!lockedBy||S.xp<price;
      b.innerHTML=`${it.name}<small>${it.text}</small>${pipsHtml(n,it.max)}<span class="price">${done?'Изучено':lockedBy?`Сначала: ${lockedBy.name}`:price+' опыта'}</span>`;
      b.onclick=()=>{S.xp-=price;S.sk[it.id]++;blip(640,.1);renderTree()};col.append(b);
    }
  }
  const close=document.createElement('button');close.className='closeBtn';close.textContent='Закрыть (T)';close.onclick=closeUI;box.append(close);
}
function renderBench(){
  const box=$('menuBox');box.innerHTML='';
  box.insertAdjacentHTML('beforeend',`<div class="head"><h2>Верстак</h2><small>Тара и лодка прокачиваются за shilver. У тебя: ${S.shilver}</small></div>`);
  const tree=document.createElement('div');tree.className='tree';box.append(tree);
  const node=(col,title,sub,n,max,price,buy)=>{
    const done=n>=max,b=document.createElement('button');
    b.className='skill'+(done?' done':'');b.disabled=done||S.shilver<price;
    b.innerHTML=`${title}<small>${sub}</small>${pipsHtml(n,max)}<span class="price">${done?'Готово':price+' shilver'}</span>`;
    b.onclick=()=>{S.shilver-=price;buy();blip(640,.1);renderBench()};col.append(b);
  };
  box.insertAdjacentHTML('beforeend',`<div class="head"><small>Дров: ${S.wood}. Монстр даёт чертёж, а тару ты делаешь здесь.</small></div>`);
  box.append(tree);
  for(const t of Object.keys(TOOLS)){
    const T=TOOLS[t],u=S.up[t],col=document.createElement('div');tree.append(col);
    const capNow=T.cap*Math.pow(1.45,u.vol)*(u.dual?2:1);
    if(!S.have[t]){
      if(t==='spoon'){col.insertAdjacentHTML('beforeend',`<div class="root locked">${T.name}<small>Лежит в сундуке дома</small></div>`);continue}
      if(!S.bp[t]){col.insertAdjacentHTML('beforeend',`<div class="root locked">${T.name}<small>Чертёж на уровне ${T.level}</small></div>`);continue}
      const[sh,w]=T.craft;
      col.insertAdjacentHTML('beforeend',`<div class="root">${T.name}<small>Чертёж есть, вместимость ${fmtL(T.cap)} л</small></div>`);
      const b=document.createElement('button');b.className='skill';b.disabled=S.shilver<sh||S.wood<w;
      b.innerHTML=`Сделать<small>Нужно дров: ${w}</small><span class="price">${sh} shilver</span>`;
      b.onclick=()=>{craft(t);renderBench()};col.append(b);
      continue;
    }
    col.insertAdjacentHTML('beforeend',`<div class="root">${T.name}<small>Вместимость ${fmtL(capNow)} л</small></div>`);
    node(col,'Вместимость',`${fmtL(capNow)} → ${fmtL(capNow*1.45)} л`,u.vol,5,cost(T.c0,u.vol),()=>{u.vol++});
    node(col,'Хват','На 20% быстрее зачерпывать',u.grip,5,cost(T.c0,u.grip),()=>{u.grip++});
    node(col,'Двуручное использование','Тара в каждой руке: вместимость вдвое',u.dual?1:0,1,T.c0*6,()=>{u.dual=true});
  }
  const col=document.createElement('div');tree.append(col);
  col.insertAdjacentHTML('beforeend','<div class="root">Лодка<small>Шлюпка с вёслами</small></div>');
  const n=S.up.boat.speed;
  node(col,'Скорость','Лодка идёт быстрее',n,5,cost(60,n),()=>{S.up.boat.speed++});
  const hc=document.createElement('div');tree.append(hc);
  if(!S.bp.hose)hc.insertAdjacentHTML('beforeend','<div class="root locked">Шланг<small>Чертёж на уровне 4</small></div>');
  else if(S.hose.made)hc.insertAdjacentHTML('beforeend','<div class="root">Шланг<small>Уже сделан, занимает 3 клетки</small></div>');
  else{
    hc.insertAdjacentHTML('beforeend','<div class="root">Шланг<small>Чертёж есть, занимает 3 клетки</small></div>');
    const b=document.createElement('button');b.className='skill';b.disabled=S.shilver<CFG.hoseCost||S.wood<CFG.hoseCraftWood;
    b.innerHTML=`Сделать<small>Нужно дров: ${CFG.hoseCraftWood}</small><span class="price">${CFG.hoseCost} shilver</span>`;
    b.onclick=()=>{craftHose();renderBench()};hc.append(b);
  }
  const tr=document.createElement('div');tree.append(tr);
  tr.insertAdjacentHTML('beforeend','<div class="root">Транспорт<small>Быстрее по острову</small></div>');
  const make=(title,sub,done,[sh,w],fn)=>{const b=document.createElement('button');b.className='skill'+(done?' done':'');b.disabled=done||S.shilver<sh||S.wood<w;
    b.innerHTML=`${title}<small>${sub}</small><span class="price">${done?'Готово':`${sh} shilver, дров: ${w}`}</span>`;b.onclick=()=>{fn();renderBench()};tr.append(b)};
  make('Ролики',`Быстрее на ${Math.round((CFG.skatesK-1)*100)}%, надеваются клавишей V`,S.skates.made,CFG.skatesCost,craftSkates);
  make('Машина','Втрое быстрее бега, стоит там, где её оставили',S.car.made,CFG.carCost,craftCar);
  const ax=document.createElement('div');tree.append(ax);
  if(!S.axe)ax.insertAdjacentHTML('beforeend','<div class="root locked">Топор<small>Лежит в находке на Отмели: плыви туда на лодке</small></div>');
  else{
    const a=S.up.axe;
    ax.insertAdjacentHTML('beforeend','<div class="root">Топор<small>Рубит деревья</small></div>');
    node(ax,'Острота','Больше дров с удара',a.sharp,5,cost(20,a.sharp),()=>{a.sharp++});
    node(ax,'Рукоять','Рубишь быстрее',a.grip,5,cost(20,a.grip),()=>{a.grip++});
  }
  const close=document.createElement('button');close.className='closeBtn';close.textContent='Закрыть (Esc)';close.onclick=closeUI;box.append(close);
}

let drag=null;
function gridPlace(el,x,y,w,h){el.style.left=x*CELL+'px';el.style.top=y*CELL+'px';el.style.width=w*CELL+'px';el.style.height=h*CELL+'px'}
function dragMove(px,py){
  const d=drag;d.px=px;d.py=py;
  const x=Math.round((px-d.r.left)/CELL-d.w/2),y=Math.round((py-d.r.top)/CELL-d.h/2);d.cx=x;d.cy=y;
  d.el.style.left=(px-d.r.left-d.w*CELL/2)+'px';d.el.style.top=(py-d.r.top-d.h*CELL/2)+'px';
  d.el.style.width=d.w*CELL+'px';d.el.style.height=d.h*CELL+'px';
  d.ok=cellsFree(d.it,x,y,d.w,d.h);d.ghost.style.display='block';d.ghost.className=d.ok?'':'bad';gridPlace(d.ghost,x,y,d.w,d.h);
}
function clickItem(id){
  const at=S.hot.indexOf(id);
  if(at>=0)S.hot[at]=null;
  if(at!==S.invSlot){S.hot[S.invSlot]=id;if(S.invSlot===S.sel)selectSlot(S.sel)}
}
function renderInv(){
  const box=$('invBox');box.innerHTML='';
  box.insertAdjacentHTML('beforeend','<div class="head"><h2>Инвентарь</h2><small>Перетаскивай предметы мышью, R поворачивает. Лут с собой могут унести демоны</small></div>');
  const title=t=>{const h=document.createElement('h3');h.textContent=t;box.append(h)};
  const tile=(g,o)=>{
    const b=document.createElement('button');b.className='tile'+(o.active?' active':'');
    b.innerHTML=`<small>${o.name}</small><b>${o.value}</b><small>${o.note||''}</small>`;
    if(o.click)b.onclick=()=>{o.click();renderInv()};else b.style.cursor='default';
    g.append(b);
  };
  const grid=cols=>{const g=document.createElement('div');g.className='tiles';if(cols)g.style.gridTemplateColumns=`repeat(${cols},1fr)`;box.append(g);return g};
  title('Панель снизу: выбери слот, потом нажми на предмет в сетке');
  const sl=grid(4);
  S.hot.forEach((h,i)=>{
    const inf=itemInfo(h);
    tile(sl,{name:`Слот ${i+1}`,value:h?inf.name:'Пусто',note:S.invSlot===i?(h?'Нажми ещё раз, чтобы убрать':'Выбран'):'',active:S.invSlot===i,
      click(){if(S.invSlot===i&&S.hot[i])S.hot[i]=null;else S.invSlot=i}});
  });
  title(`Сетка ${GW}×${GH}`);
  const wrap=document.createElement('div');wrap.id='grid';wrap.style.width=GW*CELL+'px';wrap.style.height=GH*CELL+'px';box.append(wrap);
  const ghost=document.createElement('div');ghost.id='ghost';wrap.append(ghost);
  for(const it of S.inv){
    const el=document.createElement('div');el.className='gitem';el.dataset.id=it.id;gridPlace(el,it.x,it.y,it.w,it.h);
    const inf=itemInfo(it.id),at=S.hot.indexOf(it.id);
    el.innerHTML=`<b>${inf.name}</b><span>${it.id==='wood'?`${woodIn(it)} / ${CFG.woodStack}`:inf.short}</span>${at>=0?`<i>${at+1}</i>`:''}`;
    el.onpointerdown=e=>{e.preventDefault();try{el.setPointerCapture(e.pointerId)}catch(_){}
      drag={it,el,ghost,w:it.w,h:it.h,r:wrap.getBoundingClientRect(),sx:e.clientX,sy:e.clientY,moved:false,ok:false};el.classList.add('drag')};
    el.onpointermove=e=>{if(!drag||drag.el!==el)return;
      if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>6)drag.moved=true;if(drag.moved)dragMove(e.clientX,e.clientY)};
    el.onpointerup=()=>{if(!drag||drag.el!==el)return;const d=drag;drag=null;
      if(!d.moved)clickItem(it.id);else if(d.ok){it.x=d.cx;it.y=d.cy;it.w=d.w;it.h=d.h}
      renderInv()};
    wrap.append(el);
  }
  title('Запасы');
  const st=grid();
  tile(st,{name:'Shilver',value:S.shilver});
  tile(st,{name:'Находки',value:S.finds});
  tile(st,{name:'Тайник на базе',value:S.stash.base});
  tile(st,{name:'Тайник в лодке',value:S.stash.boat});
  {const live=activeMaps();if(live.length){title('Карты сокровищ');const mg=grid();live.forEach((m,i)=>tile(mg,{name:`Карта ${m.n}`,value:coord(m.x,m.z),note:'Плыви туда и держи E'}))}}
  const close=document.createElement('button');close.className='closeBtn';close.textContent='Закрыть (I)';close.onclick=closeUI;box.append(close);
}
