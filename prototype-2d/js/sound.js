/* ---------- звук ---------- */
let AC=null;const snd={};
function initAudio(){
  if(AC)return;
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    const len=AC.sampleRate*3,buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
    const n=AC.createBufferSource();n.buffer=buf;n.loop=true;
    const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=380;
    const g=AC.createGain();g.gain.value=.05;n.connect(lp).connect(g).connect(AC.destination);n.start();
    const shape=AC.createWaveShaper(),curve=new Float32Array(1024);
    for(let i=0;i<1024;i++){const x=i/512-1;curve[i]=Math.tanh(x*4)}shape.curve=curve;
    const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=900;bp.Q.value=.8;
    snd.choir=AC.createGain();snd.choir.gain.value=0;
    for(const f of[196,247,294,311]){const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=Math.random()*30-15;
      const t=AC.createOscillator();t.frequency.value=5+Math.random()*2;const td=AC.createGain();td.gain.value=24;t.connect(td).connect(o.detune);t.start();o.connect(shape);o.start()}
    shape.connect(bp).connect(snd.choir).connect(AC.destination);
  }catch(e){AC=null}
}
function blip(f,dur=.16,type='sine',vol=.07){
  if(!AC)return;const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(vol,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+dur);
  o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+dur)}
/* слиток высеребра: коричневый, с радужным бликом */
const INGOT=`<img class="ingot" src="${INGOT_ICON}" alt="">`;
const floats=[];
function showGain(n){
  const el=document.createElement('div');el.className='float';el.innerHTML=`+${n} ${INGOT}`;$('floats').append(el);
  floats.push({el,start:time,side:(floats.length%3-1)*42});
}
function showHearts(){
  for(let i=0;i<3;i++){
    const el=document.createElement('div');el.className='float heart';el.textContent='♥';el.style.opacity=0;$('floats').append(el);
    floats.push({el,start:time+i*.14,side:(Math.random()-.5)*130,heart:true});
  }
}
/* гул, пока уходит вода */
function rumble(sec){
  if(!AC)return;
  const n=AC.createBufferSource(),len=AC.sampleRate*Math.ceil(sec+1),buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  n.buffer=buf;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=160;
  const g=AC.createGain(),t=AC.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.22,t+sec*.35);g.gain.linearRampToValueAtTime(0,t+sec);
  n.connect(lp).connect(g).connect(AC.destination);n.start();n.stop(t+sec+.1);
}
