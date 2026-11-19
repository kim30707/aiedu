/* 국악 공연실 혼자 보기. 서버 없이 이 폴더의 파일만 쓴다.
   - 연주자 영상 무대(video-stage.js)는 교실 공연실 장면 B와 같은 방식으로, 소리가 나는 자리만 연주 조각을 보인다.
   - 소리는 국립국악원 국악기 디지털 음원(공공누리 제1유형)을 이 폴더에서 읽어 브라우저 안에서 낸다.
   - 이름·사진을 받지 않고, 저장하지 않으며, 바깥으로 요청을 보내지 않는다. */
import {createVideoStage} from './video-stage.js';

const $=id=>document.getElementById(id);
const SEATS=[{seat:1,instrument:'gayageum',label:'가야금'},{seat:2,instrument:'haegeum',label:'해금'},{seat:3,instrument:'janggu',label:'장구'}];
const MANIFEST='assets/manifest.json';
const GAYAGEUM_MIDIS=[43,48,50,55,57,60,62,64,67,69,72,74];
// 아리랑: 전래 민요를 앱 가야금 조율 4~10현(G3 A3 C4 D4 E4 G4 A4)에 맞춰 수업용으로 새로 적은 악보. 한 마디는 8분음표 9칸.
const DEG={sol:3,la:4,do:5,re:6,mi:7,Sol:8,La:9};
const ARIRANG=['아:sol5|리:la1|랑:sol2,la1','아:do5|리:re1|랑:do3','아:mi3|라:re3|리:do2,la1','요:sol6|r3',
 '아:do5|리:re1|랑:do3','고:mi3|개:do2,la1|로:sol3','넘:do5|어:re1|간:do3','다:do6|r3',
 '나:Sol6|를:Sol3','버:Sol3|리:mi3|고:re3','가:mi3|시:re2|는:mi1|님:do3','은:sol6|r3',
 '십:do5|리:re1|도:do3','못:mi3|가:do2,la1|서:sol3','발:do5|병:re1|난:do3','다:do6|r3'];
const PHRASES=['아리랑 아리랑 아라리요','아리랑 고개로 넘어간다','나를 버리고 가시는 님은','십리도 못 가서 발병 난다'];
const BAR=9,TEMPO=50,EIGHTH=60000/(TEMPO*3);
const SEMACHI=[[0,'deong'],[3,'deong'],[5,'deok'],[6,'kung'],[7,'deok']];
const PAD_NOTES=[['sol','솔'],['la','라'],['do','도'],['re','레'],['mi','미'],['Sol','높은 솔'],['La','높은 라']];
const STROKES=[['deong','덩'],['deok','덕'],['kung','쿵']];

const state={manifest:null,picks:{1:'gayageum-1',2:'haegeum-1',3:'janggu-1'},stage:null,building:null,raf:0,
 audio:null,engines:new Map(),seatGain:new Map(),samples:new Map(),demo:null,serial:0};

function say(text){$('status').textContent=text||'';}
function parse(){
 const notes=[];
 ARIRANG.forEach((bar,b)=>{let t=b*BAR;
  for(const group of bar.split('|')){const [syl,seq]=group.includes(':')?group.split(':'):['',group];
   seq.split(',').forEach((tok,k)=>{const m=/^([a-zA-Z]+)(\d+)$/.exec(tok),len=Number(m[2]);
    if(m[1]!=='r')notes.push({t,len,string:DEG[m[1]],syl:k?'':syl,bar:b});t+=len;});}
 });
 return notes;
}
const MELODY=parse();
if(MELODY.some(n=>n.string===undefined))throw Error('아리랑 악보를 읽지 못했습니다.');

/* ── 연주자 고르기 ── */
function performersFor(instrument){return state.manifest.performers.filter(p=>p.instrument===instrument);}
function renderSeats(){
 const box=$('seats');box.textContent='';
 for(const seat of SEATS){
  const col=document.createElement('div');col.className='seat';
  const h=document.createElement('h3');h.textContent=seat.seat+'번 자리 · '+seat.label;col.append(h);
  const cards=document.createElement('div');cards.className='cards';
  for(const p of performersFor(seat.instrument)){
   const b=document.createElement('button');b.type='button';b.className='card';b.dataset.seat=seat.seat;b.dataset.id=p.id;
   b.setAttribute('aria-pressed',String(state.picks[seat.seat]===p.id));
   const img=document.createElement('img');img.src='assets/thumbs/'+p.id+'.jpg';img.alt='';img.loading='lazy';img.width=480;img.height=270;
   const name=document.createElement('span');name.textContent=p.name;
   b.append(img,name);b.onclick=()=>pick(seat.seat,p.id);
   cards.append(b);
  }
  col.append(cards);box.append(col);
 }
}
async function pick(seat,id){
 if(state.picks[seat]===id)return;
 state.picks[seat]=id;
 document.querySelectorAll(`.card[data-seat="${seat}"]`).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===id)));
 if(state.stage||state.building)await buildStage();
}

/* ── 무대 ── */
async function buildStage(){
 const want=JSON.stringify(state.picks);
 if(state.building?.want===want)return state.building.promise;
 const job={want};
 job.promise=(async()=>{
  say('연주자 영상을 불러오는 중…');
  const seats=SEATS.map(s=>({...s,performer:state.picks[s.seat]}));
  const stage=await createVideoStage({seats,width:1280,height:720,mode:'live',manifestUrl:MANIFEST});
  if(state.building!==job){stage.dispose();return;}
  const old=state.stage;state.stage=stage;
  const box=$('stage-box');box.querySelector('canvas')?.remove();
  stage.canvas.setAttribute('aria-label','공연실 화면: '+SEATS.map(s=>s.label+' '+performersFor(s.instrument).find(p=>p.id===state.picks[s.seat])?.name).join(', '));
  stage.canvas.setAttribute('role','img');
  box.prepend(stage.canvas);
  old?.dispose();
  if(!state.raf)loop();
  say(state.demo?'':'준비됐어요.');
 })().catch(error=>{if(state.building===job)say('영상을 불러오지 못했어요. 새로 고침 뒤 다시 눌러 주세요.');console.error(error);})
  .finally(()=>{if(state.building===job)state.building=null;});
 state.building=job;
 return job.promise;
}
function loop(){
 state.raf=requestAnimationFrame(loop);
 state.stage?.render(performance.now(),{name:'front'});
}

/* ── 소리 ── */
async function openSound(){
 if(state.audio)return state.audio.context.resume();
 const context=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
 const limiter=context.createDynamicsCompressor();
 limiter.threshold.value=-5;limiter.knee.value=4;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.1;
 const bus=context.createGain();bus.gain.value=1.6;bus.connect(limiter);limiter.connect(context.destination);
 state.audio={context,bus};
 for(const s of SEATS){
  const gain=context.createGain();gain.connect(bus);state.seatGain.set(s.seat,gain);
  state.engines.set(s.seat,new window.GugakEngine({context,output:gain}));
 }
 await context.resume();
 await Promise.all([...state.engines.values()].map(e=>e.ready()));
 const list=window.GUGAK_BANK.samples;
 const first=state.engines.get(1);
 let done=0;
 for(let i=0;i<list.length;i+=6){
  const batch=list.slice(i,i+6);
  const buffers=await Promise.all(batch.map(s=>first.decode(s)));
  buffers.forEach((buffer,k)=>state.samples.set(batch[k].id,{...batch[k],buffer,peak:peakOf(buffer)}));
  done+=batch.length;say(`소리 불러오는 중 ${done} / ${list.length}`);
 }
 for(const engine of state.engines.values()){const decode=engine.decode.bind(engine);engine.decode=s=>state.samples.has(s.id)?Promise.resolve(state.samples.get(s.id).buffer):decode(s);}
 // 악기마다 음원 크기가 달라 한쪽으로 쏠리지 않게 자리별 음량을 맞춘다.
 for(const s of SEATS){
  const peaks=[...state.samples.values()].filter(x=>x.instrument===s.instrument).map(x=>x.peak).sort((a,b)=>a-b);
  const middle=peaks[peaks.length>>1]||.5;
  state.seatGain.get(s.seat).gain.value=Math.max(.5,Math.min(3,.62/middle));
 }
}
function peakOf(buffer){const d=buffer.getChannelData(0);let p=0;for(let i=0;i<d.length;i+=4)p=Math.max(p,Math.abs(d[i]));return p;}
function gayageumSample(string){const midi=GAYAGEUM_MIDIS[string];return [...state.samples.values()].find(s=>s.instrument==='gayageum'&&s.officialMidi===midi);}
function haegeumSample(string){
 const hz=440*Math.pow(2,(GAYAGEUM_MIDIS[string]-69)/12);
 let best=null;
 for(const s of state.samples.values())if(s.instrument==='haegeum'&&s.estimatedHz){const d=Math.abs(Math.log2(hz/s.estimatedHz));if(!best||d<best.d)best={s,d,cents:1200*Math.log2(hz/s.estimatedHz)};}
 return best;
}
function jangguSample(technique){return [...state.samples.values()].find(s=>s.instrument==='janggu'&&s.technique===technique);}

/* 한 음: 소리를 예약하고 무대에 같은 시각(접촉)을 알린다. at은 performance.now() 기준 ms. */
function strike(seat,{string,technique,hold=0,at=performance.now()+30,key}){
 const engine=state.engines.get(seat);if(!engine||!state.audio)return null;
 const instrument=SEATS[seat-1].instrument;
 let sample,p;
 if(instrument==='gayageum'){sample=gayageumSample(string);p={strength:.7};}
 else if(instrument==='haegeum'){const h=haegeumSample(string);if(!h)return null;sample=h.s;p={strength:.65,bend:h.cents,sustain:true};}
 else{sample=jangguSample(technique);p={strength:.75};}
 if(!sample)return null;
 key=key||'n'+(++state.serial);
 const now=performance.now(),ctx=state.audio.context;
 const when=ctx.currentTime+Math.max(0,at-now)/1000;
 engine.note(sample,{...p,instrument,technique:sample.technique},'sample',key,{at:when,offset:0}).catch(()=>{});
 state.stage?.noteOn(seat,{key,contact:at,sustain:!!p.sustain});
 if(hold>0)setTimeout(()=>release(seat,key),Math.max(0,at+hold-now));
 return key;
}
function release(seat,key){state.engines.get(seat)?.release(key);state.stage?.noteOff(seat,key,performance.now());}

/* ── 본보기 연주 ── */
function demoEvents(){
 const out=[];
 for(const n of MELODY){
  out.push({t:n.t,seat:1,string:n.string});
  out.push({t:n.t,seat:2,string:n.string,hold:n.len*EIGHTH-60});
 }
 for(let b=0;b<ARIRANG.length;b++)for(const [pos,technique] of SEMACHI)out.push({t:b*BAR+pos,seat:3,technique});
 return out.sort((a,b)=>a.t-b.t);
}
function startDemo(){
 stopDemo(true);
 const events=demoEvents(),start=performance.now()+400;
 const demo={events,start,i:0,timer:0,keys:[]};
 const total=ARIRANG.length*BAR*EIGHTH;
 const tick=()=>{
  const now=performance.now();
  while(demo.i<events.length&&start+events[demo.i].t*EIGHTH<now+300){
   const e=events[demo.i++];
   const key=strike(e.seat,{string:e.string,technique:e.technique,hold:e.hold,at:start+e.t*EIGHTH});
   if(key&&e.hold)demo.keys.push([e.seat,key]);
  }
  const bar=Math.floor((now-start)/(BAR*EIGHTH));
  $('caption').textContent=bar>=0&&bar<ARIRANG.length?PHRASES[Math.floor(bar/4)]:'';
  if(now>start+total+800){stopDemo();return;}
  demo.timer=setTimeout(tick,40);
 };
 state.demo=demo;$('stop').disabled=false;say('아리랑 본보기 연주 중');
 tick();
}
function stopDemo(quiet){
 const demo=state.demo;if(!demo)return;
 clearTimeout(demo.timer);state.demo=null;
 for(const e of state.engines.values())e.allOff();
 for(const s of SEATS)state.stage?.clear(s.seat,performance.now());
 $('caption').textContent='';$('stop').disabled=true;
 if(!quiet)say('준비됐어요.');
}

/* ── 직접 쳐 보기 ── */
const held=new Map();// 누르고 있는 단추의 멈춤 함수 → 그 손가락(pointerId, 키보드는 null)
const releaseHeld=e=>{for(const [up,id] of [...held])if(!e||e.type==='blur'||id===null||id===e.pointerId)up();};
for(const type of ['pointerup','pointercancel'])window.addEventListener(type,releaseHeld,true);
window.addEventListener('blur',releaseHeld);
function renderPads(){
 const box=$('pads');box.textContent='';
 const row=(seat,title,items,onDown,onUp)=>{
  const r=document.createElement('div');r.className='pad-row';
  const h=document.createElement('h3');h.textContent=title;r.append(h);
  const keys=document.createElement('div');keys.className='keys';
  for(const [value,label] of items){
   const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=true;b.dataset.pad='1';
   let key=null,limit=0;
   const up=()=>{clearTimeout(limit);held.delete(up);if(!b.classList.contains('on'))return;b.classList.remove('on');if(key&&onUp)onUp(key);key=null;};
   // 손을 뗀 신호를 놓쳐도 소리가 남지 않게: 창 어디서든 손을 떼면 멈추고, 10초가 넘으면 저절로 멈춘다.
   const press=(id=null)=>{b.classList.add('on');key=onDown(value);held.set(up,id);limit=setTimeout(up,10000);};
   const down=e=>{e.preventDefault();if(b.disabled||b.classList.contains('on'))return;stopDemo(true);press(e.pointerId);try{b.setPointerCapture(e.pointerId);}catch{}};
   b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);
   b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat&&!b.classList.contains('on')){e.preventDefault();press();}});
   b.addEventListener('blur',up);
   b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')up();});
   keys.append(b);
  }
  r.append(keys);box.append(r);
 };
 row(1,'1번 자리 · 가야금',PAD_NOTES,v=>strike(1,{string:DEG[v]}));
 row(2,'2번 자리 · 해금 (누르고 있기)',PAD_NOTES,v=>strike(2,{string:DEG[v]}),key=>release(2,key));
 row(3,'3번 자리 · 장구',STROKES,v=>strike(3,{technique:v}));
}
function enable(on){for(const b of document.querySelectorAll('[data-pad]'))b.disabled=!on;$('demo').disabled=!on;}

$('open').onclick=async()=>{
 const button=$('open');button.disabled=true;
 try{
  await openSound();
  await buildStage();
  if(!state.stage)throw Error('stage');
  $('stage-cover').remove();enable(true);say('준비됐어요.');
 }catch(error){button.disabled=false;say('공연실을 열지 못했어요. 다시 눌러 주세요.');console.error(error);}
};
$('demo').onclick=()=>startDemo();
$('stop').onclick=()=>stopDemo();
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopDemo(true);releaseHeld();}});

(async()=>{
 try{
  state.manifest=await (await fetch(MANIFEST)).json();
  renderSeats();renderPads();
 }catch(error){say('연주자 목록을 읽지 못했어요. 새로 고침해 주세요.');console.error(error);}
})();
