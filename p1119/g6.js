/* 교과서 속 우리 음악 · 도라지타령 v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션 하위 작업)
 * G6 「교과서 속 우리 음악」 첫 제재(대표 결정 2026-11-16 12:4x: 도라지타령 먼저 · 앱에 있는 세마치로 · 다음은 강강술래).
 * 흐름: ① 교과서 감상(앱은 소리를 틀지 않음) ② 세마치 장단 장구로 ③ 도라지타령 한 구절 가야금으로
 *       ④ AI 장면(모둠 역할 나누기 카드 복사 → 답 붙여 넣기 → 모둠이 정함) ⑤ 모둠 연습·반 합주 ⑥ 원곡과 비교·정리.
 * - 기록 없는 판: 자리 번호를 고르지 않음 · 점수 없음 · 서버로 보내는 것 없음(교실 서버가 있으면 ‘같이 시작’ 시각만 받음, GC.noHello).
 *   이 기기에는 고른 단추(느낌·역할·비교 등)만 남긴다. 붙여 넣은 AI 답·‘더 부탁할 것’ 글은 남기지 않는다.
 * - 학생 앱에 AI 연결 없음. 카드는 복사만, 답은 사람이 붙여 넣는다. AI 답은 의견으로만 보여 준다.
 * - 가락은 gugak-data.js SONGS.doraji(셈제작소가 가야금 4~10현에 맞춰 새로 적은 8장단), 장단은 SEMACHI. 표기·빠르기는 국악 강사 확인 전.
 * - 화면 강조: 칸이 1초에 3번 넘게 바뀌거나 ‘움직임 줄이기’면 박마다만 옮긴다.
 * 2026-11-16 13:5x 고침(Claude Opus 5.5, 3차 Astra 지적 B1~B6): (가) 교탁은 가상 학급 예시 카드만 · 개인정보처럼 보이는 답은 보여 주지 않음 ·
 *   맡을 것을 앱 역할로 한정 · 누름 밝기 1초 3번 이하(움직임 줄이기면 끔) · 같이 시작은 G4·J2만, 교탁과 같은 빠르기 · 소리 준비 중 멈춤도 받음.
 */
(()=>{'use strict';
const P=window.GugakPlay,$=id=>document.getElementById(id);
const PII=/(이름|학교|초등|중학교|[0-9]+\s*반|[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}|@|주소|번지|아파트)/;/* march.js와 같은 거름(완전하지 않음) */
const mask=t=>String(t||'').replace(new RegExp(PII.source,'g'),'○○');
const BAR=P.BAR,SONG=P.SONGS.doraji,MEL=SONG.melody;
const CL=P.classCode(),H=String(location.hash||'').replace(/^#/,'').split(/[.&]/),has=t=>H.includes(t);
const EX=window.G6_EXAMPLES||[];
const SAVE='gugak-g6';
const KNUM={2:'두',3:'세',4:'네',5:'다섯',6:'여섯',7:'일곱',8:'여덟'};
const STR=deg=>P.STRINGS.find(x=>x.deg===deg);
const noteName=deg=>(deg>=8?'높은 ':'')+STR(deg).name;
const hy=deg=>STR(deg).hyeon;
const DEGS=[3,4,5,6,7,8,9];
const FAST_MS=340;/* 칸 간격이 이보다 짧으면(1초에 3번 남짓) 박마다만 강조 */

/* ── 고를 것 ── */
const SPEEDS=[[40,'아주 느리게'],[45,'느리게 · 앱 기본'],[60,'조금 빠르게'],[80,'빠르게']];
const PHRASES={p1:{name:'1구절',from:0,bars:4,words:SONG.phrases[0]},p2:{name:'2구절',from:4,bars:4,words:SONG.phrases[1]}};
const ALL8=[0,1,2,3,4,5,6,7];
const ROLES=[
 {id:'janggu',name:'장구 장단',bars:ALL8,kind:'janggu'},
 {id:'gaya1',name:'가야금 1구절',bars:[0,1,2,3],kind:'gaya'},
 {id:'gaya2',name:'가야금 2구절',bars:[4,5,6,7],kind:'gaya'},
 {id:'gayaAll',name:'가야금 8장단',bars:ALL8,kind:'gaya'},
 {id:'song',name:'노래',bars:ALL8,kind:'voice'},
 {id:'clap',name:'손뼉 박',bars:ALL8,kind:'clap'},
 {id:'gueum',name:'구음',bars:ALL8,kind:'gueum'}];
const FEEL=['흥겨워요','밝아요','신나요','차분해요','부드러워요','씩씩해요','슬퍼요','잘 모르겠어요'];
const HEARD=['노래 소리','장구 소리','다른 악기 소리','같은 말이 되풀이돼요','잘 모르겠어요'];
const BEATFEEL=['하나 둘 셋으로 느껴져요','하나 둘로 느껴져요','잘 모르겠어요'];
const WISH=['모든 모둠이 한 번은 소리를 내요','장구는 두 모둠이 함께 쳐요','1구절과 2구절을 다른 모둠이 맡아요','다 함께 노래하는 곳이 있어요'];
const HOW=['AI 의견 그대로 했어요','AI 의견을 조금 바꿨어요','AI 의견과 다르게 정했어요','AI 없이 정했어요'];
const WHY=['우리 모둠이 잘하는 것','반 소리가 고르게 나게','모두 한 번씩 해 보려고','강사 선생님과 정했어요'];
const SAME=['세마치장단이에요','가사가 같아요','가락이 비슷해요','빠르기 느낌이 비슷해요','흥겨운 느낌이 같아요'];
const DIFF=['원곡은 사람이 노래해요','원곡에는 다른 악기도 있어요','원곡이 더 빨라요','원곡이 더 느려요','원곡은 떠는 소리·꾸밈이 많아요','우리는 여러 모둠이 나눠 쳤어요','우리는 태블릿 소리예요'];
const NEXT=['더 빠르게 쳐 보기','노래하며 치기','실제 장구·가야금으로 치기','다른 민요도 해 보기'];
const MODES=[['teach','(가) 강사가 교탁에서 한 번에'],['self','(나) 모둠이 학교 계정 AI에 직접'],['none','오늘은 AI 없이']];

/* ── 상태(이 기기에는 고른 단추만) ── */
const SAVED=['step','feel','heard','beat','tempo','phrase','mode','wish','groups','roles','how','why','same','diff','next'];
const st={step:1,feel:[],heard:[],beat:'',tempo:45,phrase:'p1',mode:'',wish:[],groups:6,roles:[],how:'',why:[],same:[],diff:[],next:[],
 ans:'',src:'',parsed:null,run:null,gen:0,si:0,session:null,pend:null};
{const sv=P.Store.get(SAVE,null);if(sv&&typeof sv==='object'){
 const arr=(v,L,max)=>Array.isArray(v)?v.filter(x=>L.includes(x)).slice(0,max):[];
 st.step=[1,2,3,4,5,6].includes(sv.step)?sv.step:1;st.feel=arr(sv.feel,FEEL,3);st.heard=arr(sv.heard,HEARD,9);st.beat=BEATFEEL.includes(sv.beat)?sv.beat:'';
 st.tempo=Number.isFinite(+sv.tempo)?Math.max(30,Math.min(90,Math.round(+sv.tempo))):45;st.phrase=sv.phrase in PHRASES?sv.phrase:'p1';st.mode=MODES.some(m=>m[0]===sv.mode)?sv.mode:'';
 st.wish=arr(sv.wish,WISH,9);st.groups=KNUM[sv.groups]&&sv.groups>=4?+sv.groups:6;st.roles=arr(sv.roles,ROLES.map(r=>r.id),2);st.how=HOW.includes(sv.how)?sv.how:'';
 st.why=arr(sv.why,WHY,9);st.same=arr(sv.same,SAME,9);st.diff=arr(sv.diff,DIFF,9);st.next=arr(sv.next,NEXT,9);}}
/* 주소 # 뒤 수업 설정이 있으면 그것을 따른다: c45(빠르기) · g6(모둠 수) · teach / self / noai(AI 방식) */
if(CL.tempo)st.tempo=CL.tempo;if(CL.groups&&CL.groups>=4)st.groups=CL.groups;
if(has('teach'))st.mode='teach';else if(has('self'))st.mode='self';else if(has('noai'))st.mode='none';
const keep=()=>{const o={};for(const k of SAVED)o[k]=st[k];P.Store.set(SAVE,o);};

/* ── 소리 ── */
let soundP=null;
function sound(){if(!soundP)soundP=P.Sound.init([...DEGS.map(P.gayaSample),...['덩','쿵','덕'].map(s=>P.STROKES[s].sample)]).catch(e=>{soundP=null;throw e;});return soundP;}
async function ready(){await sound();await P.Sound.resume();}
const strike=(s,when=0,gain=.9)=>P.Sound.play(P.STROKES[s].sample,{when,gain});
const pluck=(deg,when=0,gain=.9,dur=0)=>P.playString(deg,{when,gain,dur});
const soundErr=(el,e)=>{if(el)el.textContent='소리를 준비하지 못했어요: '+(e&&e.message||e);};

/* ── 재생 하나(칸마다 소리·화면) ── */
function clearNow(){document.querySelectorAll('.now').forEach(e=>e.classList.remove('now'));const b=$('bar-now');if(b)b.textContent='';}
function stopRun(msg,el){st.gen++;const E=st.run?st.run.o.stateEl:el;if(st.run){cancelAnimationFrame(st.run.raf);st.run=null;}if(E&&msg!=null)E.textContent=msg;st.session=null;st.pend=null;P.Sound.stopAll();clearNow();}
/* o: {tempo, cells, startPerf?(첫 칸 시각, performance 기준), count?(세기 한 마디), sounds:[{cell,play(when)}], onCell(c,fine), stateEl, wait(left), endMsg, onEnd} */
async function run(o){stopRun();const g=st.gen;try{await ready();}catch(e){soundErr(o.stateEl,e);return null;}if(g!==st.gen)return null;
 const e8=P.e8(o.tempo),ctx=P.Sound.ctx;let start=o.startPerf;
 if(start==null)start=performance.now()+300+(o.count?BAR*e8:0);
 const ctxAt=perf=>ctx.currentTime+(perf-performance.now())/1000;
 if(o.count&&o.startPerf==null)for(const k of [0,3,6])strike('덕',ctxAt(start-BAR*e8+k*e8),.3);
 for(const s of o.sounds||[]){const at=start+s.cell*e8;if(at<performance.now()-30)continue;s.play(Math.max(ctx.currentTime,ctxAt(at)));}
 const fine=e8>=FAST_MS&&!P.reduceMotion();
 const R={start,e8,raf:0,last:-1,o,fine};st.run=R;
 const loop=()=>{if(st.run!==R)return;const now=performance.now();
  if(now<start){if(o.stateEl)o.stateEl.textContent=o.wait?o.wait(Math.ceil((start-now)/1000)):`곧 시작 · ${Math.ceil((start-now)/1000)}초`;R.raf=requestAnimationFrame(loop);return;}
  const c=Math.floor((now-start)/e8);
  if(c>=o.cells){st.run=null;st.session=null;clearNow();if(o.stateEl)o.stateEl.textContent=o.endMsg||'끝';if(o.onEnd)o.onEnd();return;}
  const shown=fine?c:c-(c%3);
  if(shown!==R.last){R.last=shown;if(o.onCell)o.onCell(shown,fine);}
  R.raf=requestAnimationFrame(loop);};
 loop();return R;}
/* 칸 강조: fine이면 그 칸만, 아니면 그 박의 세 칸 */
function markCells(sel,c,fine){document.querySelectorAll(sel+' .now').forEach(e=>e.classList.remove('now'));for(let i=0;i<(fine?1:3);i++){const td=document.querySelector(`${sel} td[data-c="${c+i}"]`);if(td)td.classList.add('now');}}

/* ── 단추 묶음 ── */
function chips(box,items,isOn,onPick){box.replaceChildren();for(const it of items){const [k,t]=Array.isArray(it)?it:[it,it];const b=document.createElement('button');b.type='button';b.textContent=t;b.dataset.k=k;b.setAttribute('aria-pressed',String(!!isOn(k)));b.addEventListener('click',()=>onPick(k));box.append(b);}}
function multi(id,list,key,max,after){const box=$(id);chips(box,list,k=>st[key].includes(k),k=>{st[key]=st[key].includes(k)?st[key].filter(x=>x!==k):[...st[key],k].slice(-max);keep();multi(id,list,key,max,after);if(after)after();});}
function single(id,list,key,after){const box=$(id);chips(box,list,k=>st[key]===k,k=>{st[key]=st[key]===k?'':k;keep();single(id,list,key,after);if(after)after();});}

/* ── 장구 패드 · 가야금 줄 ── */
let lastFlash=-1e9;
function flash(b){if(P.reduceMotion())return;const now=performance.now();if(now-lastFlash<FAST_MS)return;lastFlash=now;b.classList.add('hit');setTimeout(()=>b.classList.remove('hit'),150);}/* 누를 때만 · 1초에 3번 이하 · 움직임 줄이기면 끔(3차 B4) */
function onTap(b,fn){b.addEventListener('pointerdown',e=>{e.preventDefault();fn();});b.addEventListener('click',e=>{if(e.detail===0)fn();});}/* 글쇠(엔터·스페이스)로도 */
function pads(box,stateEl){box.className='pads';box.replaceChildren();for(const [s,side] of [['쿵','궁편(왼쪽)'],['덩','두 편 함께'],['덕','채편(오른쪽)']]){const b=document.createElement('button');b.type='button';b.className='pad';b.dataset.s=s;b.setAttribute('aria-label',`장구 ${s} · ${side}`);b.innerHTML=`<b>${s}</b><small>${side}</small>`;
  onTap(b,()=>{flash(b);ready().then(()=>strike(s)).catch(e=>soundErr(stateEl,e));});box.append(b);}}
function strings(box,stateEl,onPluck){box.className='strings';box.replaceChildren();for(const d of DEGS){const b=document.createElement('button');b.type='button';b.className='str';b.dataset.deg=d;b.setAttribute('aria-label',`가야금 ${hy(d)}현 ${noteName(d)}`);b.innerHTML=`<b>${hy(d)}현</b><small>${noteName(d)}</small>`;
  onTap(b,()=>{flash(b);ready().then(()=>pluck(d)).catch(e=>soundErr(stateEl,e));if(onPluck)onPluck(d);});box.append(b);}}

/* ── ② 세마치 ── */
const SEMA={};for(const [p,s] of P.SEMACHI)SEMA[p]=s;
const SEMA_TEXT=[...Array(BAR)].map((_,i)=>SEMA[i]||'·').join(' ');/* 덩 · · 덩 · 덕 쿵 덕 · */
function semaSounds(bars,gain=.9){const out=[];for(const b of bars)for(const [p,s] of P.SEMACHI)out.push({cell:b*BAR+p,play:w=>strike(s,w,gain)});return out;}
function drawSemachi(){const t=$('sm-row');t.replaceChildren();const hd=document.createElement('tr');hd.append(document.createElement('th'));for(let i=0;i<BAR;i++){const th=document.createElement('th');th.textContent=i%3===0?(i/3+1)+'박':'';hd.append(th);}t.append(hd);
 const tr=document.createElement('tr');const th=document.createElement('th');th.className='bar';th.textContent='장구';tr.append(th);
 for(let i=0;i<BAR;i++){const td=document.createElement('td');td.dataset.c=i;if(i%3===0)td.classList.add('beat');const s=SEMA[i];if(s){td.classList.add('on-note');td.innerHTML=`<b>${s}</b><small>${P.STROKES[s].sign} ${P.STROKES[s].say}</small>`;}else{td.classList.add('dash');td.textContent='·';}td.setAttribute('aria-label',`${i+1}째 칸 ${s||'쉼'}`);tr.append(td);}t.append(tr);}
function speedChips(){const L=SPEEDS.some(s=>s[0]===st.tempo)?SPEEDS:[...SPEEDS,[st.tempo,'수업 설정']];
 chips($('speeds'),L.map(([v,n])=>[String(v),`${n} ♩.=${v}`]),k=>+k===st.tempo,k=>{st.tempo=+k;keep();speedChips();if(st.run&&!st.session)stopRun('빠르기를 바꿨어요 · 다시 눌러요');});
 $('speed-note').textContent=`지금 ♩.=${st.tempo} · 한 칸 ${Math.round(P.e8(st.tempo))}ms. 민요 세마치는 ♩.=80~90쯤으로 친다고 알려져 있어요. 처음엔 느리게 익히고, 수업 빠르기는 국악 강사가 정해요.`;}
function smPlay(){run({tempo:st.tempo,cells:4*BAR,count:true,sounds:semaSounds([0,1,2,3]),stateEl:$('sm-state'),endMsg:'4장단 끝 · 이제 따라 쳐 봐요',
 onCell:(c,f)=>{markCells('#sm-row',c%BAR,f);$('sm-state').textContent=`${Math.floor(c/BAR)+1}장단 / 4`;}});}
function smTurn(){run({tempo:st.tempo,cells:8*BAR,count:true,sounds:semaSounds([0,2,4,6]),stateEl:$('sm-state'),endMsg:'번갈아 치기 끝 · 잘했어요',
 onCell:(c,f)=>{const b=Math.floor(c/BAR);markCells('#sm-row',c%BAR,f);$('sm-state').textContent=b%2?`우리 차례 — 쳐 봐요! (${(b+1)/2}/4)`:`앱 차례 — 들어요 (${b/2+1}/4)`;}});}

/* ── ③ 도라지타령 한 구절 ── */
function phraseNotes(id){const p=PHRASES[id];return MEL.filter(m=>m.bar>=p.from&&m.bar<p.from+p.bars).map(m=>({...m,g:m.t-p.from*BAR}));}
function drawPhrase(){const p=PHRASES[st.phrase],notes=phraseNotes(st.phrase),t=$('dr-table');t.replaceChildren();
 const cell=Array(p.bars*BAR).fill(null);notes.forEach((n,i)=>{cell[n.g]={n,i};for(let k=1;k<n.len;k++)cell[n.g+k]={dash:true};});
 const hd=document.createElement('tr');hd.append(document.createElement('th'));for(let i=0;i<BAR;i++){const th=document.createElement('th');th.textContent=i%3===0?(i/3+1)+'박':'';hd.append(th);}t.append(hd);
 for(let b=0;b<p.bars;b++){const tr=document.createElement('tr');const th=document.createElement('th');th.className='bar';th.textContent=`${p.from+b+1}장단`;tr.append(th);
  for(let i=0;i<BAR;i++){const g=b*BAR+i,x=cell[g],td=document.createElement('td');td.dataset.c=g;if(i%3===0)td.classList.add('beat');
   if(x&&x.n){td.classList.add('on-note');td.dataset.n=x.i;td.innerHTML=`<b>${hy(x.n.deg)}</b><small>${noteName(x.n.deg)}${x.n.syl?' · '+x.n.syl:''}</small>`;td.setAttribute('aria-label',`${hy(x.n.deg)}현 ${noteName(x.n.deg)}${x.n.syl?' 가사 '+x.n.syl:''}`);}
   else if(x&&x.dash){td.classList.add('dash');td.textContent='-';td.setAttribute('aria-label','앞 음 이어서');}
   else{td.classList.add('dash');td.textContent='쉼';}
   tr.append(td);}t.append(tr);}
 paintNext();}
function paintNext(){document.querySelectorAll('#dr-table .next,#dr-strings .next').forEach(e=>e.classList.remove('next'));const notes=phraseNotes(st.phrase),n=notes[st.si];if(!n)return;
 const td=document.querySelector(`#dr-table td[data-n="${st.si}"]`);if(td)td.classList.add('next');const b=document.querySelector(`#dr-strings .str[data-deg="${n.deg}"]`);if(b)b.classList.add('next');}
/* 다음 칸 강조도 1초에 3번 이하로 옮긴다(3차 재검증 B4) */
let lastNext=-1e9,nextT=0;
function paintNextSoon(){clearTimeout(nextT);const w=FAST_MS-(performance.now()-lastNext);if(w<=0){lastNext=performance.now();paintNext();}else nextT=setTimeout(()=>{lastNext=performance.now();paintNext();},w);}
function onStep(deg){if(st.run)return;/* 들어 보는 중에는 한 칸씩 세지 않음 */const notes=phraseNotes(st.phrase),n=notes[st.si];if(!n)return;const S=$('dr-state');
 if(deg===n.deg){st.si++;if(st.si>=notes.length){st.si=0;S.textContent=`${PHRASES[st.phrase].name} 끝까지 쳤어요! ‘들어 보기’와 견줘 봐요`;}else{const m=notes[st.si];S.textContent=`좋아요 · 다음은 ${hy(m.deg)}현(${noteName(m.deg)})`;}}
 else S.textContent=`다음은 ${hy(n.deg)}현(${noteName(n.deg)})이에요`;
 paintNextSoon();}
function drListen(){const p=PHRASES[st.phrase],notes=phraseNotes(st.phrase),e8=P.e8(st.tempo);const snd=notes.map(n=>({cell:n.g,play:w=>pluck(n.deg,w,.9,n.len*e8/1000)}));
 if($('dr-jang').checked)snd.push(...semaSounds([0,1,2,3],.35));
 document.querySelectorAll('#dr-table .next,#dr-strings .next').forEach(e=>e.classList.remove('next'));
 run({tempo:st.tempo,cells:p.bars*BAR,count:true,sounds:snd,stateEl:$('dr-state'),endMsg:'다 들었어요 · 이제 한 칸씩 쳐 봐요',onEnd:paintNext,
  onCell:(c,f)=>{markCells('#dr-table',c,f);$('dr-state').textContent=`${p.from+Math.floor(c/BAR)+1}장단`;}});}

/* ── ④ AI 부탁 카드 ── */
function extraText(){const v=$('extra').value.trim().slice(0,40);return PII.test(v)?'':v;}
const TEACH_N=6;/* (가) 교탁: 대표 결정 — 교탁 AI에는 가상 예시·공통 글만(모둠 수·바라는 것·자유 글을 넣지 않음, 3차 B1) */
const ROLE_LINE='- 맡을 것은 장구 장단(1~8장단), 가야금 1구절(1~4장단), 가야금 2구절(5~8장단), 가야금 8장단(1~8장단), 노래(1~8장단), 손뼉 박(1~8장단), 구음(1~8장단) 가운데서 한두 가지를 골라 주세요.';/* 앱 역할·구간으로만(3차 B3) */
const ansN=()=>st.mode==='teach'?TEACH_N:st.groups;
function card(){const T=st.mode==='teach',n=T?TEACH_N:st.groups;const L=[T?'[국악 놀이터 · 교과서 속 우리 음악 부탁 카드 · 가상 학급 예시]':'[국악 놀이터 · 교과서 속 우리 음악 부탁 카드]',
 T?'가상의 한 반이 민요 도라지타령을 세마치장단에 맞춰 반 전체가 함께 연주하려고 해요.':'우리 반은 민요 도라지타령을 세마치장단에 맞춰 반 전체가 함께 연주하려고 해요.',
 `- 모둠: ${n}모둠`,
 '- 쓸 수 있는 것: 태블릿 장구(덩·쿵·덕), 태블릿 가야금(솔·라·도·레·미·높은 솔·높은 라), 노래, 손뼉, 구음(장단을 입으로 말하기)',
 '- 곡: 도라지타령 8장단. 1구절 “도라지 도라지 백도라지”(1~4장단), 2구절 “심심산천에 백도라지”(5~8장단)',
 '- 세마치장단은 한 장단이 세 박이에요.'];
 if(!T&&st.wish.length)L.push('- 우리 반이 바라는 것: '+WISH.filter(w=>st.wish.includes(w)).join(', '));
 const ex=T?'':extraText();if(ex)L.push('- 더 부탁할 것: '+ex);
 L.push('',`부탁: 이 장단으로 ${T?'이 반':'우리 반'} ${KNUM[n]} 모둠이 함께 연주할 수 있게 역할을 나눠 주세요.`,
  `- 한 모둠에 한 줄씩, 아래 형식으로 ${n}줄만 써 주세요.`,'1모둠: 맡을 것 / 언제(몇 장단)',ROLE_LINE,
  '- 위에 없는 악기는 넣지 마세요.','- 정답이 아니라 의견으로, 초등학생이 알기 쉬운 말로 써 주세요.');
 return L.join('\n');}
function piiCheck(){const bad=st.mode!=='teach'&&PII.test($('extra').value);$('pii').hidden=!bad;$('pii').textContent=bad?'개인정보처럼 보이는 말이 있어요(이름·학교·반·번호 등). 지우고 써요. 이 글은 카드에 넣지 않았어요.':'';return bad;}
function paintCard(){$('card').value=card();}
function cardChanged(){paintCard();$('copy-state').textContent='';}/* 카드가 바뀌면 지난 복사 안내를 지움 */
function paintWays(){document.querySelectorAll('#ways .way').forEach(w=>{w.classList.toggle('pick',w.dataset.way===st.mode);w.classList.toggle('dim',!!st.mode&&w.dataset.way!==st.mode);});
 const T=st.mode==='teach';$('class-only').hidden=T;$('teach-note').hidden=!T;$('extra').disabled=T;}

/* ── ④ 받은 답 살펴보기(의견으로만) ── */
const NOINST=/(꽹과리|징|북(?!편)|소고|피리|대금|소금|해금|아쟁|단소|태평소|좌고|리코더|멜로디언|실로폰|탬버린|트라이앵글|캐스터네츠|피아노|드럼)/g;
function tagsOf(s){const t=[];if(/장구/.test(s))t.push('장구');
 if(/가야금/.test(s)){const a=/전체|내내|8\s*장단|1\s*[~∼\-]\s*8/.test(s),one=/1\s*구절|1\s*[~∼\-]\s*4/.test(s),two=/2\s*구절|5\s*[~∼\-]\s*8/.test(s);t.push(one&&!two?'가야금 1구절':two&&!one?'가야금 2구절':a||(one&&two)?'가야금 8장단':'가야금');}
 if(/노래|부르/.test(s))t.push('노래');if(/손뼉|박수/.test(s))t.push('손뼉');if(/구음|입으로/.test(s))t.push('구음');return t;}
function parseAnswer(text,n){const src=String(text||'').slice(0,2000),rows={},extra=[],dup=[],other=[],noinst=[];
 for(const raw of src.split(/\r?\n/)){const s=raw.trim();if(!s)continue;const m=/^[-*•]?\s*\**\s*(\d{1,2})\s*모둠\s*\**\s*[:：\-–]\s*(.+)$/.exec(s);
  if(!m){other.push(s);continue;}const k=+m[1],body=m[2].trim();
  if(k<1||k>n){extra.push(k);continue;}if(rows[k]){dup.push(k);continue;}
  rows[k]={text:body,tags:tagsOf(body)};for(const w of new Set(body.match(NOINST)||[]))noinst.push([w,k]);}
 const found=Object.keys(rows).map(Number),missing=[];for(let k=1;k<=n;k++)if(!rows[k])missing.push(k);
 const T=found.flatMap(k=>rows[k].tags),issues=[];
 if(!found.length)issues.push('‘1모둠: …’ 꼴의 줄을 찾지 못했어요. 카드의 형식대로 다시 부탁하거나 강사와 정해요.');
 else{if(missing.length)issues.push(`빠진 모둠: ${missing.map(k=>k+'모둠').join(', ')}`);
  if(extra.length)issues.push(`우리 반 모둠 수(${n})보다 큰 번호: ${extra.map(k=>k+'모둠').join(', ')}`);
  if(dup.length)issues.push(`두 번 나온 모둠: ${dup.map(k=>k+'모둠').join(', ')}(앞 줄만 봐요)`);
  for(const [w,k] of noinst)issues.push(`이 화면에 없는 악기: ${w}(${k}모둠) — 쓸지 강사와 정해요`);
  if(!T.includes('장구'))issues.push('장구 장단을 맡은 모둠이 없어요');
  if(!T.some(x=>x==='가야금 1구절'||x==='가야금 8장단'||x==='가야금'))issues.push('1구절 가락(1~4장단)을 맡은 모둠이 없어요');
  if(!T.some(x=>x==='가야금 2구절'||x==='가야금 8장단'||x==='가야금'))issues.push('2구절 가락(5~8장단)을 맡은 모둠이 없어요');}
 return {rows,missing,extra,dup,noinst,other:other.length,issues,pii:PII.test(src)};}
function showAnswer(){const box=$('result');box.replaceChildren();const txt=$('answer').value;st.ans=txt;updVeil();
 const add=(cls,t,tag='p')=>{const e=document.createElement(tag);e.className=cls;e.textContent=t;box.append(e);return e;};
 if(!txt.trim()){add('note','답을 먼저 붙여 넣거나 연습용 예시를 골라요');st.parsed=null;return;}
 const r=parseAnswer(txt,ansN());
 if(r.pii){st.parsed=null;st.ans='';$('answer').value='';add('warn','개인정보처럼 보이는 말이 있어 답을 보여 주지 않아요 · 감독 선생님이 그 말을 지운 뒤 다시 붙여 넣어요');return;}/* 낱말만 가리면 이름이 남을 수 있어 답 전체를 보이지 않음(3차 B2) */
 /* 붙여 넣은 AI 답은 검사를 통과해도 바로 크게 보이지 않는다: 선생님이 AI 화면(큰 화면을 잠시 끄거나 멈추고)에서 먼저 읽은 뒤 ‘큰 화면에 보이기’(3차 재검증 B2) */
 if(!st.okShown&&!String(st.src||'').startsWith('셈제작소')){st.parsed=null;add('ok','개인정보처럼 보이는 말은 찾지 못했어요');add('note','선생님이 AI 화면에서 답을 먼저 읽어 보고(큰 화면을 잠시 끄거나 멈추고), 괜찮으면 아래 단추를 눌러요. 붙여 넣은 글은 그 전까지 흐리게 가려 둬요.');const b=add('btn','큰 화면에 보이기','button');b.type='button';b.id='approve';b.onclick=()=>{st.okShown=true;showAnswer();};return;}
 st.parsed=r;
 add('note','답 출처: '+(st.src||'붙여 넣은 답')+(st.mode==='teach'?' · 가상 학급(6모둠) 답이에요 — 우리 반에 맞게 고쳐 정해요':''));
 add('note','AI의 의견이에요. 정답이 아니에요. 아래를 참고해서 우리 반과 모둠이 역할을 정해요.');
 if(Object.keys(r.rows).length){const t=document.createElement('table');t.className='ans';t.innerHTML='<thead><tr><th>모둠</th><th>AI 의견</th><th>화면이 찾은 것</th></tr></thead>';const tb=document.createElement('tbody');
  for(let k=1;k<=ansN();k++){const tr=document.createElement('tr'),x=r.rows[k];const a=document.createElement('td');a.textContent=k+'모둠';const b=document.createElement('td');b.textContent=x?mask(x.text).slice(0,120):'(없음)';const c=document.createElement('td');
   for(const g of x?x.tags:[]){const s=document.createElement('span');s.className='tag';s.textContent=g;c.append(s);}tr.append(a,b,c);tb.append(tr);}t.append(tb);box.append(t);}
 if(r.issues.length){add('lab','살펴볼 점');const ul=document.createElement('ul');for(const i of r.issues){const li=document.createElement('li');li.textContent=i;ul.append(li);}box.append(ul);}
 else add('ok','살펴볼 점이 없어요 · 그래도 정하는 것은 우리 반이에요');
 if(r.other)add('note',`모둠 줄이 아닌 글 ${r.other}줄은 건너뛰었어요`);}

/* 붙여 넣은 답 칸은 늘 흐리게: 글자 수만 보인다(3차 재검증 B2) */
function updVeil(){const a=$('answer'),n=a.value.trim().length,el=$('answer-len');if(el)el.textContent=n?`붙여 넣은 글 ${n}자 · 흐리게 가려 둬요`:'';}

/* ── ⑤ 모둠 연습 · 반 합주 ── */
const role=id=>ROLES.find(r=>r.id===id);
function barLabel(R,b){if(!R.bars.includes(b))return '쉬어요';
 if(R.kind==='janggu')return '덩··덩·덕쿵덕·';if(R.kind==='clap')return '짝 짝 짝';if(R.kind==='gueum')return '덩 덩 덕쿵덕';
 const ns=MEL.filter(m=>m.bar===b);if(R.kind==='gaya')return ns.map(m=>hy(m.deg)).join(' ');return ns.map(m=>m.syl).join('')||'·';}
function drawTimeline(){const box=$('timeline');box.replaceChildren();const head=document.createElement('div');head.className='tl-row head';head.innerHTML='<span class="who"></span>'+ALL8.map(b=>`<span class="bx" data-b="${b}">${b+1}장단</span>`).join('');box.append(head);
 for(const id of st.roles){const R=role(id),row=document.createElement('div');row.className='tl-row';const w=document.createElement('span');w.className='who';w.textContent=R.name;row.append(w);
  for(const b of ALL8){const x=document.createElement('span');x.className='bx'+(R.bars.includes(b)?' on':'');x.dataset.b=b;x.textContent=barLabel(R,b);row.append(x);}box.append(row);}
 $('role-note').textContent=st.roles.length?'초록 칸이 우리 차례예요. 숫자는 가야금 줄 번호, ‘덩··덩·덕쿵덕·’는 세마치 한 장단이에요.':'④에서(또는 위에서) 우리 모둠 역할을 골라요. 고르지 않아도 박과 장단 수는 보여요.';
 const inst=$('pr-inst');inst.replaceChildren();const kinds=new Set(st.roles.map(id=>role(id).kind));
 if(kinds.has('janggu')){const d=document.createElement('div');inst.append(d);pads(d,$('pr-state'));}
 if(kinds.has('gaya')){const d=document.createElement('div');d.style.marginTop='10px';inst.append(d);strings(d,$('pr-state'));}
 if(kinds.has('voice')||kinds.has('clap')||kinds.has('gueum')){const p=document.createElement('p');p.className='note';p.textContent='노래·손뼉·구음은 태블릿 없이 해요. 위 칸을 보며 박에 맞춰요.';inst.append(p);}}
function roleSounds(gain=.9){const out=[],e8=P.e8(st.tempo);for(const id of st.roles){const R=role(id);
  if(R.kind==='janggu')out.push(...semaSounds(R.bars,gain));
  if(R.kind==='gaya')for(const m of MEL)if(R.bars.includes(m.bar))out.push({cell:m.t,play:w=>pluck(m.deg,w,gain,m.len*e8/1000)});}return out;}
function prCell(c){const b=Math.floor(c/BAR),beat=Math.floor((c%BAR)/3);
 document.querySelectorAll('#timeline .bx.now,#dots span.now').forEach(e=>e.classList.remove('now'));document.querySelectorAll(`#timeline .bx[data-b="${b}"]`).forEach(e=>e.classList.add('now'));
 const d=$('dots').querySelectorAll('span')[beat];if(d)d.classList.add('now');
 const ours=st.roles.some(id=>role(id).bars.includes(b));$('bar-now').textContent=`${b+1}장단 / 8 · ${st.roles.length?(ours?'우리 차례':'쉬어요'):''}`;}
function practice(){const model=$('pr-model').checked;run({tempo:st.tempo,cells:8*BAR,count:true,sounds:model?roleSounds(.9):[],stateEl:$('pr-state'),endMsg:'8장단 끝',onCell:c=>prCell(c)});}
/* 교탁 ‘모두 같이 시작’: 시각만 받는다(자리·모둠 번호는 보내지 않음) */
const FIT=['G4','J2'];/* 도라지타령·세마치 판만 받는다(3차 B5) */
const SESS_NO='이 판은 도라지타령 합주 판이 아니에요 · 선생님께 가야금 4단계 또는 장구 2단계를 부탁해요';
function sessNote(t){const e=$('sess-note');e.textContent=t||'';e.hidden=!t;}
function onSession(s){const GC=window.GugakClass;
 if(!FIT.includes(s.level)||!P.LEVELS[s.level]){sessNote(SESS_NO);return;}
 sessNote('');const ch=P.chart(s.level,s.tempo||45),tempo=ch.tempo,bars=Math.min(8,ch.L.bars);/* 교탁과 같은 빠르기 계산(P.chart) */
 goStep(5);const start=GC.toPerf(s.startAt)+BAR*ch.e8;/* 교탁의 세기 한 마디 뒤 */
 const keepTempo=st.tempo;st.tempo=tempo;const snd=$('pr-model-s').checked?roleSounds(.35):[];st.tempo=keepTempo;
 const pr=run({tempo,cells:bars*BAR,startPerf:start,sounds:snd,stateEl:$('pr-state'),endMsg:'같이 시작 끝',onCell:c=>prCell(c),
  wait:left=>`선생님이 ‘같이 시작’을 눌렀어요 · ${left}초 뒤 · ♩.=${tempo}`});
 st.pend=s.id;st.pendTempo=tempo;$('pr-state').textContent='선생님이 ‘같이 시작’을 눌렀어요 · 소리 준비 중';/* 소리 준비 중에도 멈춤을 받는다(3차 B6) */
 pr.then(R=>{if(st.pend!==s.id)return;st.pend=null;if(R)st.session=s.id;});}

/* ── ⑥ 정리 ── */
function summary(){const R=st.roles.map(id=>role(id).name),j=a=>a.length?a.join(', '):'(안 골랐어요)';
 return ['[교과서 속 우리 음악 · 도라지타령 · 우리 모둠 정리]',
  `처음 들은 느낌: ${j(st.feel)}`,`들린 것: ${j(st.heard)}`,`박을 세어 보니: ${st.beat||'(안 골랐어요)'}`,
  `우리 모둠 역할: ${j(R)}`,`역할 정하기: ${st.how||'(안 골랐어요)'}${st.why.length?' · 까닭: '+st.why.join(', '):''}`,
  `원곡과 같은 점: ${j(st.same)}`,`원곡과 다른 점: ${j(st.diff)}`,`다음에 해 보고 싶은 것: ${j(st.next)}`].join('\n');}
const paintSummary=()=>{$('summary').value=summary();};

/* ── 화면 ── */
function goStep(n){if(st.step!==n||!st.session)stopRun();st.step=n;keep();
 document.querySelectorAll('.g6-step').forEach(s=>s.hidden=+s.dataset.step!==n);document.querySelectorAll('#steps button').forEach(b=>b.setAttribute('aria-current',+b.dataset.step===n?'step':'false'));
 if(n===3)drawPhrase();if(n===4)paintCard();if(n===5){rolesChips();drawTimeline();}if(n===6)paintSummary();window.scrollTo({top:0});}
function rolesChips(){for(const id of ['roles4','roles5'])chips($(id),ROLES.map(r=>[r.id,r.name]),k=>st.roles.includes(k),k=>{st.roles=st.roles.includes(k)?st.roles.filter(x=>x!==k):[...st.roles,k].slice(-2);keep();rolesChips();if(st.step===5&&!st.run)drawTimeline();});}
async function copy(text,el,okMsg,area){try{await navigator.clipboard.writeText(text);el.textContent=okMsg;}catch(e){if(area)area.select();el.textContent='복사가 막혔어요. 글을 길게 눌러 직접 복사해요';}}

function init(){
 document.querySelectorAll('#steps button').forEach(b=>b.addEventListener('click',()=>goStep(+b.dataset.step)));
 document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>goStep(+b.dataset.go)));
 // ①
 multi('feel',FEEL,'feel',3);multi('heard',HEARD,'heard',9);single('beatfeel',BEATFEEL,'beat');
 // ②
 drawSemachi();speedChips();pads($('sm-pads'),$('sm-state'));
 $('sm-play').onclick=smPlay;$('sm-turn').onclick=smTurn;$('sm-stop').onclick=()=>stopRun('멈췄어요');
 // ③
 chips($('phrases'),Object.entries(PHRASES).map(([k,p])=>[k,`${p.name} · ${p.words}`]),k=>k===st.phrase,function pick(k){stopRun();st.phrase=k;st.si=0;keep();chips($('phrases'),Object.entries(PHRASES).map(([k2,p])=>[k2,`${p.name} · ${p.words}`]),k2=>k2===st.phrase,pick);drawPhrase();$('dr-state').textContent='';});
 strings($('dr-strings'),$('dr-state'),onStep);
 $('dr-listen').onclick=drListen;$('dr-stop').onclick=()=>{stopRun('멈췄어요');paintNext();};$('dr-reset').onclick=()=>{stopRun();st.si=0;paintNext();const n=phraseNotes(st.phrase)[0];$('dr-state').textContent=`처음부터 · 첫 음은 ${hy(n.deg)}현(${noteName(n.deg)})`;};
 // ④
 chips($('modes'),MODES,k=>k===st.mode,function pick(k){st.mode=st.mode===k?'':k;keep();chips($('modes'),MODES,k2=>k2===st.mode,pick);paintWays();piiCheck();cardChanged();if(st.parsed)showAnswer();});paintWays();
 chips($('groups'),[4,5,6,7,8].map(v=>[String(v),v+'모둠']),k=>+k===st.groups,function pick(k){st.groups=+k;keep();chips($('groups'),[4,5,6,7,8].map(v=>[String(v),v+'모둠']),k2=>+k2===st.groups,pick);cardChanged();if(st.parsed)showAnswer();});
 multi('wish',WISH,'wish',9,cardChanged);
 $('extra').addEventListener('input',()=>{piiCheck();cardChanged();});
 $('copy').onclick=()=>{if(piiCheck()){$('copy-state').textContent='개인정보처럼 보이는 말이 있어요. 지우고 복사해요';return;}paintCard();
  copy($('card').value,$('copy-state'),st.mode==='teach'?'복사했어요 · 교탁 AI에 한 번 넣어요':st.mode==='self'?'복사했어요 · 감독 선생님이 정한 학교 계정 AI 화면에 붙여 넣어요':'복사했어요',$('card'));};
 $('answer').addEventListener('input',()=>{st.src='붙여 넣은 답';st.okShown=false;st.parsed=null;$('result').replaceChildren();updVeil();});
 $('show').onclick=showAnswer;
 $('ex').innerHTML='<option value="">연습용 예시 고르기(AI 답 아님)</option>'+EX.map(E=>`<option value="${E.id}">${E.label}</option>`).join('');
 $('ex').onchange=()=>{const E=EX.find(x=>x.id===$('ex').value);$('ex').value='';if(!E)return;if($('answer').value.trim()&&!confirm('붙여 넣은 답을 지우고 연습용 예시로 바꿀까요?'))return;
  $('answer').value=E.text;st.okShown=false;st.src=`셈제작소가 만든 연습용 글(AI 답 아님)${E.groups!==st.groups?` · ${E.groups}모둠 반 기준이에요`:''}`;showAnswer();};
 $('clear-ans').onclick=()=>{$('answer').value='';st.ans='';st.src='';st.okShown=false;st.parsed=null;$('result').replaceChildren();updVeil();};
 rolesChips();single('how',HOW,'how');multi('why',WHY,'why',9);
 // ⑤
 $('pr-play').onclick=practice;$('pr-stop').onclick=()=>stopRun('멈췄어요');
 // ⑥
 multi('same',SAME,'same',9,paintSummary);multi('diff',DIFF,'diff',9,paintSummary);multi('next',NEXT,'next',9,paintSummary);
 $('copy-sum').onclick=()=>{paintSummary();copy($('summary').value,$('sum-state'),'복사했어요',$('summary'));};
 $('reset').onclick=()=>{if(!confirm('이 기기의 ‘교과서 속 우리 음악’ 기록(고른 단추)을 지울까요?'))return;P.Store.set(SAVE,null);/* 기록 없는 판의 메모리도 */try{localStorage.removeItem(SAVE);}catch(e){}location.reload();};
 goStep(st.step);
 /* 교실 연결: 같이 시작 시각만 받는다(자리·모둠을 보내지 않음) */
 const GC=window.GugakClass;if(GC){GC.noHello=true;GC.setPage('g6');GC.on_('session',onSession);GC.on_('cancel',()=>{sessNote('');if(st.session||st.pend){stopRun('선생님이 멈췄어요',$('pr-state'));}});
  GC.start().then(on=>{$('class-line').textContent=on?'교실 연결: 선생님 ‘모두 같이 시작’을 받을 수 있어요(이 화면은 자리·모둠을 보내지 않아요)':'';});}
}
window.GugakG6={st,card,SESS_NO,ROLE_LINE,parseAnswer,summary,ROLES,PHRASES,SPEEDS,phraseNotes,goStep,stopRun,onSession,SEMA_TEXT,EX};
document.addEventListener('DOMContentLoaded',init);
})();
