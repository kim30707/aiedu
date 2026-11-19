/* 국악 놀이터 공통 자료 v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * - 장단·곡 자료는 웹악기 0.12.2 songs.js와 같은 수업용 악보(전래 민요를 셈제작소가 가야금 4~10현에 맞춰 새로 적음)를 옮긴 것이다.
 * - 세마치장단 기본형: 덩 · · 덩 · 덕 쿵 덕 · (8분음표 9칸). ♩. = 빠르기, 8분음표 = 60000/(빠르기×3) ms.
 * - 소리는 국립국악원 국악기 디지털 음원(공공누리 제1유형)을 웹악기와 같은 audio/bank-*.js에서 읽는다. AI·네트워크 없음.
 * - 장단·기호·빠르기는 국악 강사 확인 전 교육용(확인 필요).
 */
(()=>{'use strict';
const DEG={sol:3,la:4,do:5,re:6,mi:7,Sol:8,La:9};
// 가야금 4~10현(앱 조율) — 화면 줄 순서(위=낮은 음, 웹악기 가야금과 같음). 웹악기 0.12.2 songs.js MIDI 표와 같다.
const STRINGS=[
 {deg:3,midi:55,name:'솔',note:'G3',hyeon:4},{deg:4,midi:57,name:'라',note:'A3',hyeon:5},
 {deg:5,midi:60,name:'도',note:'C4',hyeon:6},{deg:6,midi:62,name:'레',note:'D4',hyeon:7},
 {deg:7,midi:64,name:'미',note:'E4',hyeon:8},{deg:8,midi:67,name:'솔',note:'G4',hyeon:9},
 {deg:9,midi:69,name:'라',note:'A4',hyeon:10}];
// 장구 기호: 정간보 장구 기호(덩 ⦶ · 쿵 ○ · 덕 | · 기덕 ⁝) — 표기는 강사 확인 필요.
const STROKES={
 '덩':{sides:['gung','chae'],sample:'janggu-00-deong-medium',sign:'⦶',say:'두 편을 함께'},
 '쿵':{sides:['gung'],sample:'janggu-02-kung-medium',sign:'○',say:'궁편(북편)'},
 '덕':{sides:['chae'],sample:'janggu-04-deok-medium',sign:'|',say:'채편'},
 '기덕':{sides:['chae'],sample:'janggu-01-gideok-medium',sign:'⁝',say:'채편 꾸밈'}};
const SEMACHI=[[0,'덩'],[3,'덩'],[5,'덕'],[6,'쿵'],[7,'덕']],BAR=9;
const SONGS={
 arirang:{name:'아리랑',bars:[
  '아:sol5|리:la1|랑:sol2,la1','아:do5|리:re1|랑:do3','아:mi3|라:re3|리:do2,la1','요:sol6|r3',
  '아:do5|리:re1|랑:do3','고:mi3|개:do2,la1|로:sol3','넘:do5|어:re1|간:do3','다:do6|r3',
  '나:Sol6|를:Sol3','버:Sol3|리:mi3|고:re3','가:mi3|시:re2|는:mi1|님:do3','은:sol6|r3',
  '십:do5|리:re1|도:do3','못:mi3|가:do2,la1|서:sol3','발:do5|병:re1|난:do3','다:do6|r3'],
  phrases:['아리랑 아리랑 아라리요','아리랑 고개로 넘어간다','나를 버리고 가시는 님은','십리도 못 가서 발병 난다']},
 doraji:{name:'도라지타령',bars:[
  '도:mi3|라:mi3|지:mi3','도:mi5|라:re1|지:do3','백:Sol6|도:La2,Sol1','라:mi5,re1|지:do3',
  '심:re3|심:mi6','산:re3|천:re2,do1|에:la1,sol2','백:la3|도:do5|라:la1','지:sol6|r3'],
  phrases:['도라지 도라지 백도라지','심심산천에 백도라지']}};
function parse(song){const notes=[];song.bars.forEach((bar,b)=>{let t=b*BAR;for(const group of bar.split('|')){const [syl,seq]=group.includes(':')?group.split(':'):['',group];seq.split(',').forEach((tok,k)=>{const m=/^([a-zA-Z]+)(\d+)$/.exec(tok),len=Number(m[2]);if(m[1]!=='r'){if(!(m[1] in DEG))throw new Error(song.name+' 음 '+tok);notes.push({t,len,deg:DEG[m[1]],syl:k?'':syl,bar:b});}t+=len;});}if(t!==(b+1)*BAR)throw new Error(song.name+' '+(b+1)+'마디 길이 '+(t-b*BAR));});return notes;}
for(const s of Object.values(SONGS))s.melody=parse(s);
// 장단 만들기: pattern = [[칸,'덩'],…], bars = 마디 수
function jangdan(pattern,bars,from=0){const out=[];for(let b=0;b<bars;b++)for(const [pos,stroke] of pattern)out.push({t:(from+b)*BAR+pos,stroke,bar:from+b});return out;}
const e8=tempo=>60000/(tempo*3);

/* ── 소리: GUGAK_BANK의 dataUri를 Web Audio로 풀어 둔다 ── */
/* ── 놀이 단계 ── */
// 놀이 단계(리듬 게임). 교탁 화면(desk.html)도 같은 값으로 반주를 만든다.
const LEVELS={
 J1:{game:'janggu',title:'덩 찾기',desc:'마디 첫 박 “덩”만 쳐요',bars:8,pattern:[[0,'덩']],tempo:-5,easy:true},
 J2:{game:'janggu',title:'세마치 장단',desc:'덩 · · 덩 · 덕 쿵 덕 ·',bars:8,pattern:'semachi',tempo:0},
 J3:{game:'janggu',title:'아리랑과 함께',desc:'가야금 아리랑에 맞춰 세마치',bars:16,pattern:'semachi',tempo:0,backing:'arirang'},
 J4:{game:'janggu',title:'빠른 세마치',desc:'조금 더 빠르게',bars:16,pattern:'semachi',tempo:12,backing:'arirang'},
 G1:{game:'gayageum',title:'아리랑 1구절',desc:'아리랑 아리랑 아라리요',song:'arirang',from:0,bars:4,tempo:-5,easy:true},
 G2:{game:'gayageum',title:'아리랑 1~2구절',desc:'… 아리랑 고개로 넘어간다',song:'arirang',from:0,bars:8,tempo:0},
 G3:{game:'gayageum',title:'아리랑 전체',desc:'네 구절 모두',song:'arirang',from:0,bars:16,tempo:0},
 G4:{game:'gayageum',title:'도라지타령',desc:'도라지 도라지 백도라지 …',song:'doraji',from:0,bars:8,tempo:0}};

/* ── 가야금 12줄 조율(모둠 제출 → 교탁 적용). 기본 높이 1현 G2 ~ 12현 D5(웹악기 0.12와 같음) ── */
const G12=[43,48,50,55,57,60,62,64,67,69,72,74],TUNE_MAX=200;
const Tune={cents:Array(12).fill(0),reverb:0,id:null,set(t){const ok=t&&Array.isArray(t.tune)&&t.tune.length===12;this.cents=ok?t.tune.map(c=>Math.max(-TUNE_MAX,Math.min(TUNE_MAX,Math.round(+c||0)))):Array(12).fill(0);this.reverb=ok?(+t.reverb||0):0;this.id=ok?t.id||null:null;}};

const Sound={ctx:null,master:null,buffers:new Map(),ready:false,
 async init(ids){if(GD.blocked())throw new Error('교실 서버에 닿지 않아 소리를 멈췄어요');/* 가린 뒤에는 소리 준비도 하지 않는다(5차 N19) */
  if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});this.master=this.ctx.createGain();this.master.gain.value=Store.get('gugak-vol',.8);this.master.connect(this.ctx.destination);}
  const bank=window.GUGAK_BANK?.samples||[];const want=ids.filter(id=>!this.buffers.has(id));
  await Promise.all(want.map(async id=>{const s=bank.find(x=>x.id===id);if(!s)throw new Error('소리 자료 없음: '+id);const buf=await (await fetch(s.dataUri)).arrayBuffer();this.buffers.set(id,await this.ctx.decodeAudioData(buf));}));
  this.ready=true;return this;},
 async resume(){if(GD.blocked()||GD.pending())return;/* 판 확인 중·멈춘 뒤에는 소리를 내지 않는다 */if(this.ctx&&this.ctx.state==='suspended')await this.ctx.resume();},
 play(id,{when=0,gain=1,dur=0,detune=0}={}){if(GD.blocked()||GD.pending())return null;const b=this.buffers.get(id);if(!b||!this.ctx)return null;const src=this.ctx.createBufferSource(),g=this.ctx.createGain();src.buffer=b;if(detune)src.detune.value=detune;g.gain.value=gain;src.connect(g).connect(this.master);const t=when||this.ctx.currentTime;src.start(t);if(dur){g.gain.setValueAtTime(gain,t+dur);g.gain.linearRampToValueAtTime(0,t+dur+.25);src.stop(t+dur+.3);}this.live.add(src);src.onended=()=>this.live.delete(src);return src;},
 live:new Set(),
 stopAll(){for(const s of this.live){try{s.stop();}catch(e){}}this.live.clear();},
 // 출력 지연(초): 기기마다 다르다. 판정은 이 값과 사용자 맞춤값을 함께 쓴다.
 latency(){const c=this.ctx;return c?(c.outputLatency||0)+(c.baseLatency||0):0;}};
/* 아리랑 첫 구절: 놀이·채점과 같은 악보(SONGS)에서 줄 번호로 — 조율 듣기·교탁·G3가 함께 씀(Astra 6) */
function phrase(song='arirang',bars=4){const s=SONGS[song];return s.melody.filter(m=>m.bar<bars).map(m=>({k:STRINGS.find(x=>x.deg===m.deg).hyeon-1,t:m.t,len:m.len}));}
const gayaSample=deg=>{const s=STRINGS.find(x=>x.deg===deg);return 'gayageum-'+String(s.midi-39).padStart(2,'0')+'-basic-medium';};
// 가야금 줄 소리: 모둠 조율(교탁이 적용한 값)을 cent로 더한다
const playString=(deg,opt={})=>{const s=STRINGS.find(x=>x.deg===deg);return Sound.play(gayaSample(deg),{...opt,detune:(Tune.cents[s.hyeon-1]||0)});};
const hyeonSample=k=>'gayageum-'+String(G12[k]-39).padStart(2,'0')+'-basic-medium';

/* ── 저장: 이 기기 안에서만(자리 번호·모둠 번호·점수. 이름 없음) ── */
/* 기록 없는 판(11/16 대표 결정 '두 판' · 정규 수업 기본): 주소 #nr 이거나 교실 서버가 '기록 없는 판'이라고 알리면 켜진다.
 * 자리·모둠·기기 표·수업 열쇠·최고 점수·대결 기록·점수판 코드는 기기에 쓰지 않고 이 화면 메모리에만 둔다(창을 닫으면 사라짐). */
/* 기기에 남겨도 학생과 이어지지 않는 설정만(소리 크기·효과·가볍게 보기·손 방향·반주 켬·박마다 강조). 캐릭터는 avatar.js가 따로 둠(gugak-avatar-v1).
 * 기록 없는 판에서는 이 밖의 놀이터 값(자리·모둠·점수·대결·정간보·행진·G6 응답·박자 보정 등)을 모두 화면 메모리에만 둔다(3차 A1). */
/* 판·수업 번호·지우기는 class-guard.js(모든 화면 맨 앞)가 맡는다. 판을 서버에 묻기 전(pending)에도 기록 없는 판처럼 메모리에만 두고,
 * 교실 서버판으로 확인되면 그때 기기에 옮겨 쓴다(3차 재검증 A2). */
const GD=window.GugakGuard||{NR:false,KEEP:new Set(),wipeClass(){return 0;},setNoRecord(){},ready:Promise.resolve(),pending:()=>false,blocked:()=>false,onReady:[],whenFirst:f=>f(),sid:null};
const KEEP=GD.KEEP,NR=GD.NR,wipeClass=GD.wipeClass,setNoRecord=GD.setNoRecord;
const MEM=new Map();
const memOnly=k=>(NR||GD.pending())&&!KEEP.has(k);
/* 기록 없는 판에서 '우리 태블릿에 적용'한 조율은 이 탭(sessionStorage)에만 — 놀이·채점 화면으로 가도 이어지고, 탭을 닫거나 새 수업이면 지운다 */
/* 기록 없는 판의 탭 조율: 서버가 알려 준 수업 번호(서버 없으면 없음)와 같을 때만 적용, 서버가 다른 번호를 알려 주면 지운다(6차 N37) */
function localTune(){if(!NR)return;try{const t=JSON.parse(sessionStorage.getItem('gugak-local-tune')||'null');if(!t)return;const cur=GD.sid??null,ts=t.sid??null;if(ts===cur)Tune.set(t);else if(cur!=null)sessionStorage.removeItem('gugak-local-tune');}catch(e){}}
GD.whenFirst(localTune);
/* 판을 묻는 동안(v0.3): 화면은 가려져 보이지 않고, 쓰는 값은 메모리에만 둔다. 서버가 다른 수업 번호를 알려 주면 지킴이가 지난 값을 지우고 다시 열어
 * 메모리는 버리고, 같은 수업이면 메모리를 기기에 옮긴다. 서버에 2분 넘게 안 닿아 가린 뒤에는 쓰지 않는다. */
const Store={get(k,d){if(memOnly(k)){if(MEM.has(k))return MEM.get(k);if(NR)return d;}try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){if(GD.blocked()&&!KEEP.has(k))return;if(memOnly(k)){MEM.set(k,v);return;}try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
/* 교실 서버판(또는 서버 없음)으로 확인되면 판을 묻는 동안 메모리에 둔 값을 기기에 옮긴다 */
GD.onReady.push(()=>{if(NR)return;for(const [k,v] of MEM)try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}MEM.clear();});
if(NR)document.addEventListener('DOMContentLoaded',()=>{document.body.classList.add('nr');const bar=document.querySelector('header.topbar');const b=document.createElement('p');b.className='nr-banner';b.setAttribute('role','note');b.innerHTML='<b>기록 없는 판</b> · 자리 번호를 고르지 않아요. 점수와 결과는 이 화면에만 보이고, 기기·교탁 어디에도 남지 않아요.';if(bar)bar.after(b);else document.body.prepend(b);});

/* ── 결과 코드: 서버가 없을 때 점수를 말·글로 옮긴다. 자리-모둠-판-점수-정확도-검사 글자 ── */
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ';
function check(str){let h=7;for(const ch of str)h=(h*31+ch.charCodeAt(0))%CODE_CHARS.length;return CODE_CHARS[h];}
function resultCode(r){const body=[r.seat,r.group,r.level,r.score,r.acc].join('-');return body+'-'+check(body);}
function parseResultCode(code){const m=/^\s*(\d{1,2})-(\d{1,2})-([A-Z]\d)-(\d{1,6})-(\d{1,3})-([A-Z])\s*$/i.exec(code||'');if(!m)return null;const body=[m[1],m[2],m[3].toUpperCase(),m[4],m[5]].join('-');if(check(body)!==m[6].toUpperCase())return null;const r={seat:+m[1],group:+m[2],level:m[3].toUpperCase(),score:+m[4],acc:+m[5]};return validResult(r)?r:null;}
// 서버(demo_server.py clean)와 같은 범위: 자리 1~40·모둠 1~8·단계 J/G1~4(놀이)·P1~5(연주 채점 0~100점)·정확도 0~100
function validResult(r){const lv=/^([JG][1-4]|P[1-5])$/.test(r.level);return lv&&r.seat>=1&&r.seat<=40&&r.group>=1&&r.group<=8&&r.acc>=0&&r.acc<=100&&r.score>=0&&r.score<=(r.level[0]==='P'?100:200000);}

/* ── 수업 설정(프로그램 코드): 주소 # 뒤에 넣는다. 예) #G2.c50.g6 ── */
function classCode(hash=location.hash){const out={};let h=String(hash||'').replace(/^#/,'');try{h=decodeURIComponent(h);}catch(e){out.bad=true;}for(const part of h.split(/[.&]/)){if(!part)continue;let m;if(/^G\d$/.test(part))out.program=part;else if((m=/^c(\d{2,3})$/.exec(part)))out.tempo=Math.max(30,Math.min(90,+m[1]));else if((m=/^g(\d)$/.exec(part)))out.groups=Math.max(2,Math.min(8,+m[1]));else if((m=/^l(\d)(?:-(\d))?$/.exec(part)))out.levels=[+m[1],+(m[2]||m[1])];else if(part==='demo')out.demo=true;else if(part==='left')out.hand='left';else if(part==='easy')out.easy=true;else if(part==='lite')out.lite=true;else if(part==='one')out.one=true;else if(part==='whole')out.whole=true;else if(part==='nofx')out.nofx=true;else if((m=/^x([0-9a-f]{6})$/.exec(part)))out.key=m[1];else if((m=/^m(\d)$/.exec(part))&&+m[1]>=1)out.group=+m[1];else if((m=/^k([123])$/.exec(part)))out.kinds=+m[1];else if(part==='server')out.server=true;else if(part==='nr')out.nr=true;}return out;}

// 수업 설정(# 뒤)을 놀이터 안 다른 화면으로 갈 때도 그대로 넘긴다(11/16 Codex 지적 11)
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href]');if(!a||!location.hash)return;const h=a.getAttribute('href');if(/^[\w.-]+\.html$/.test(h))a.setAttribute('href',h+location.hash);},true);
const reduceMotion=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};
/* 악보 만들기(놀이 화면·교탁 반주가 같은 악보를 쓴다) — rhythm.js 에서 옮김 */
function chart(id,base=45,easy=false){const L=LEVELS[id],tempo=Math.max(30,base+(L.tempo||0)),E8=e8(tempo);const lead=(L.easy||easy)?2400:1900;const count=BAR;// 한 마디 세기
 let notes=[],backing=[];
 if(L.game==='janggu'){const pat=L.pattern==='semachi'?SEMACHI:L.pattern;notes=jangdan(pat,L.bars).map(n=>({t:(n.t+count)*E8,stroke:n.stroke,sides:STROKES[n.stroke].sides.slice(),lanes:STROKES[n.stroke].sides.map(s=>s==='gung'?0:1)}));
  if(L.backing){const s=SONGS[L.backing];backing=s.melody.filter(m=>m.bar<L.bars).map(m=>({t:(m.t+count)*E8,id:gayaSample(m.deg),deg:m.deg,gain:.55,dur:m.len*E8/1000}));}}
 else{const s=SONGS[L.song];notes=s.melody.filter(m=>m.bar>=L.from&&m.bar<L.from+L.bars).map(m=>({t:(m.t-L.from*BAR+count)*E8,deg:m.deg,syl:m.syl,len:m.len*E8,lanes:[STRINGS.findIndex(x=>x.deg===m.deg)]}));
  backing=jangdan(SEMACHI,L.bars).map(n=>({t:(n.t+count)*E8,id:STROKES[n.stroke].sample,gain:.42}));}
 // 세기: 첫 마디 세 박에 작은 덕
 const tick=[0,3,6].map(k=>({t:k*E8,id:'janggu-04-deok-medium',gain:.35,tick:true}));
 const end=(L.bars+count/BAR)*BAR*E8;
 const W=(L.easy||easy)?[110,220]:[80,160];
 return{id,L,tempo,e8:E8,lead,notes:notes.map((n,i)=>({...n,i,state:'wait',hits:{}})),backing:tick.concat(backing),end,W};}


/* 교실 서버로 보내기: 수업 열쇠(QR 주소의 x……)와 이 기기 표(did, 아무 뜻 없는 8글자)를 붙인다 — 다른 기기의 자리 사칭 막기(Astra 16) */
const classKey=()=>{const c=classCode();if(c.key){Store.set('gugak-key',c.key);return c.key;}return Store.get('gugak-key','');};
function deviceId(){let d=Store.get('gugak-did','');if(!/^[a-z0-9]{8}$/.test(d)){d='';while(d.length<8)d+=Math.random().toString(36).slice(2);d=d.slice(0,8);Store.set('gugak-did',d);}return d;}
function post(url,body){if(GD.blocked())return Promise.resolve(new Response(JSON.stringify({error:'교실 서버에 닿지 않아요'}),{status:503,headers:{'Content-Type':'application/json'}}));/* 가린 뒤에는 보내지 않는다(4차 N6) */if(GD.pending())return GD.ready.then(()=>post(url,body));/* 판을 알기 전에는 보내지 않고 기다린다(3차 재검증 A2) */if(NR)return Promise.resolve(new Response(JSON.stringify({error:'기록 없는 판이에요 · 이 화면에만 보여요',norecord:true}),{status:403,headers:{'Content-Type':'application/json'}}));/* 기록 없는 판은 기기에서부터 보내지 않는다(3차 A2) */return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,key:classKey(),did:deviceId()})});}
/* 소리 크기·효과음 공통 단추: 윗줄(topbar)에 붙는다(Astra 13) */
function volumeUI(){const bar=document.querySelector('header.topbar');if(!bar||bar.querySelector('.vol'))return;const w=document.createElement('label');w.className='vol';w.title='소리 크기';w.innerHTML='<span aria-hidden="true">🔈</span>';const r=document.createElement('input');r.type='range';r.min='0';r.max='1';r.step='0.1';r.value=String(Store.get('gugak-vol',.8));r.setAttribute('aria-label','소리 크기');r.addEventListener('input',()=>{Store.set('gugak-vol',+r.value);if(Sound.master)Sound.master.gain.value=+r.value;});w.append(r);bar.append(w);}
document.addEventListener('DOMContentLoaded',volumeUI);
window.GugakPlay={NR,setNoRecord,wipeClass,Guard:GD,post,classKey,deviceId,phrase,volumeUI,chart,LEVELS,G12,TUNE_MAX,Tune,playString,hyeonSample,DEG,STRINGS,STROKES,SEMACHI,BAR,SONGS,jangdan,e8,Sound,gayaSample,Store,resultCode,parseResultCode,validResult,classCode,reduceMotion};
})();
