/* 국악 놀이터 G3 「세종대왕을 찾아라」 v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * 웹악기 lesson.js GugakLab(0.11~)의 문제 규칙을 따른다: 높이(+1200 cent)·반음 낮음(−100)·조금 어긋남(문제 번호 홀수 +30·짝수 −30).
 *   틀린 줄 = 2~9현 가운데 (문제 번호 % 8). 손잡이 단위: 높이·반음 100 cent, 조금 어긋남 10 cent.
 * - 연습 판: 이 기기에서만, 점수 없음. 모둠 대결: 교탁이 연 문제(같은 번호)를 모든 모둠이 풀고, 되돌린 시각은 서버 시계로 잰다.
 * - 바로 열기: g3.html#G3.c45.g6.k2 (k1 높이만 · k2 높이+반음 · k3 세 가지). whole = 교탁 화면만으로(기록 없음, 정답 보기 단추).
 * - 보내는 값: 대결 번호·모둠·자리 번호·확인 횟수·단서(4가지 중 하나)뿐. AI·외부 연결 없음.
 */
(()=>{'use strict';
const P=window.GugakPlay,C=window.GugakClass,$=id=>document.getElementById(id);
const CLASS=P.classCode(),H=location.hash;
const KLV=+((/(?:^|[#.&])k([123])(?=$|[.&])/.exec(H)||[])[1]||2);
const KINDS=[['pitch','높이 문제'],['semitone','반음 낮은 줄'],['fine','조금 어긋난 줄']];
const ALLOWED=KINDS.slice(0,KLV).map(k=>k[0]);
const STEP={pitch:100,semitone:100,fine:10},RANGE={pitch:1200,semitone:300,fine:100};
const CLUES=[['high','높이가 달라요'],['wobble','떨려요(울렁거려요)'],['next','옆 줄과 비교했어요'],['song','아리랑 가락이 이상해요']];
const PHRASE=()=>P.phrase('arirang',4),BEAT=.28/* 아리랑 첫 구절은 놀이·채점과 같은 악보(Astra 6) · 한 칸 = 8분음 */;
/* 문제 만들기(교탁·태블릿·검사가 같은 규칙) */
function puzzle(kind,seed){const w=1+(seed%8),off=Array(12).fill(0);off[w]=kind==='pitch'?1200:kind==='semitone'?-100:(seed%2?30:-30);return{kind,seed,wrong:w,off};}
const st={seat:P.Store.get('gugak-seat',0),group:P.Store.get('gugak-group',0),kind:ALLOWED.includes('semitone')&&KLV===2?'pitch':ALLOWED[0],pz:null,adj:Array(12).fill(0),sel:-1,clue:'',tries:0,t0:0,done:false,battle:null,seenRound:0,timers:[],whole:!!CLASS.whole};
const sign=v=>(v>0?'+':'')+v;
/* ── 소리 ── */
let ready=null;
function prep(){if(!ready)ready=P.Sound.init(P.G12.map((m,k)=>P.hyeonSample(k))).catch(e=>{ready=null;throw e;});return ready;}
function cents(k){return (st.pz?st.pz.off[k]:0)+st.adj[k];}
function pluck(k,when=0){P.Sound.play(P.hyeonSample(k),{when,gain:.95,detune:cents(k)});const el=document.querySelector(`.str[data-k="${k}"]`);if(el){const d=when?Math.max(0,(when-P.Sound.ctx.currentTime)*1000):0;st.timers.push(setTimeout(()=>{el.classList.remove('play');void el.offsetWidth;el.classList.add('play');},d));}}
async function ensure(){try{await prep();await P.Sound.resume();return true;}catch(e){say('소리를 준비하지 못했어요','no');return false;}}
let gen=0;/* 재생 요청 번호: 소리 준비를 기다린 뒤 멈춤·새 문제가 있었으면 울리지 않음(2차 N26) */
function stopAll(){gen++;st.timers.forEach(clearTimeout);st.timers=[];P.Sound.stopAll();}
async function arirang(){stopAll();const g=gen;if(!await ensure()||g!==gen)return;const t0=P.Sound.ctx.currentTime+.12;for(const n of PHRASE())pluck(n.k,t0+n.t*BEAT);}
async function scale(){stopAll();const g=gen;if(!await ensure()||g!==gen)return;const t0=P.Sound.ctx.currentTime+.12;for(let k=0;k<12;k++)pluck(k,t0+k*.5);}
/* ── 화면 ── */
function say(t,cls=''){const e=$('say');e.textContent=t;e.className=cls;}
function fill(sel,n,v,label){sel.replaceChildren(new Option(label+' 고르기','0'));for(let i=1;i<n;i++)sel.append(new Option(i+'번',''+i));sel.value=String(v||0);}
function renderKinds(){const box=$('kinds');box.replaceChildren();for(const [id,label] of KINDS){const b=document.createElement('button');b.textContent=label;b.dataset.kind=id;b.disabled=!ALLOWED.includes(id)||!!st.battle;b.setAttribute('aria-pressed',String(st.kind===id));box.append(b);}}
function renderStrings(){const g=$('gaya');g.replaceChildren();for(let k=0;k<12;k++){const b=document.createElement('button');b.className='str'+(k===st.sel?' sel':'');b.dataset.k=k;b.setAttribute('aria-label',(k+1)+'현');b.innerHTML=`<span class="line"></span><span class="anjok"></span><span class="lab">${k+1}현</span><span class="adj">${st.adj[k]?'손잡이 '+sign(st.adj[k]):''}</span>`;g.append(b);}}
function renderKnob(){const r=$('adj'),k=st.sel,kind=st.pz?.kind||st.kind;r.step=STEP[kind];r.min=-RANGE[kind];r.max=RANGE[kind];
 if(k<0||st.done){r.disabled=true;$('knob-title').textContent=st.done?'다 되돌렸어요':'줄을 먼저 골라요';$('adj-val').textContent='—';}
 else{r.disabled=false;r.value=st.adj[k];$('knob-title').textContent=`${k+1}현 높이 손잡이`;$('adj-val').textContent=st.adj[k]?`${st.adj[k]>0?'▲ 높게':'▼ 낮게'} ${Math.abs(st.adj[k])} cent`:'그대로';}
 $('knob-note').textContent=kind==='fine'?'조금씩(10 cent) 움직여요. 옆 줄과 번갈아 들으며 울렁거림이 없어질 때까지.':kind==='semitone'?'반음(100 cent)씩 움직여요.':'100 cent씩 움직여요. 1200 cent = 한 옥타브.';}
function renderClues(){const box=$('clues');box.replaceChildren();for(const [id,label] of CLUES){const b=document.createElement('button');b.textContent=label;b.dataset.clue=id;b.setAttribute('aria-pressed',String(st.clue===id));box.append(b);}}
function renderStat(){const sec=st.t0?Math.round(((st.doneAt||performance.now())-st.t0)/1000):0;$('stat').textContent=st.pz?`${st.battle?'대결 '+st.battle.id+'번':'연습'} · ${KINDS.find(k=>k[0]===st.pz.kind)[1]} · 확인 ${st.tries}번 · ${sec}초`:'';}
function renderAll(){renderKinds();renderStrings();renderKnob();renderClues();renderStat();$('reveal').hidden=!(st.whole||(!st.battle&&st.tries>=5));}
/* ── 문제 ── */
function load(kind,seed,battle=null){stopAll();st.pz={...puzzle(kind,seed),battleId:battle?battle.id:0};st.kind=kind;st.adj=Array(12).fill(0);st.sel=-1;st.clue='';st.tries=0;st.t0=performance.now();st.doneAt=0;st.done=false;st.battle=battle;
 document.querySelectorAll('.str.reveal').forEach(e=>e.classList.remove('reveal'));
 say(battle?`대결 ${battle.id}번 · ${KINDS.find(k=>k[0]===kind)[1]} — 어느 줄일까요?`:`연습 · ${KINDS.find(k=>k[0]===kind)[1]} — 들어 보고 틀린 줄을 찾아요`);renderAll();}
function normalTune(){stopAll();st.pz=null;st.adj=Array(12).fill(0);st.sel=-1;st.done=false;st.t0=0;say('바로잡은 기본 조율이에요. 이대로 합주할 수 있어요 · 혼자 연습은 ‘혼자 연습 · 새 문제’','ok');renderAll();}
function newPractice(){if(st.battle)return;load(st.kind,Math.floor(Math.random()*1e6));}
async function check(){if(!st.pz||st.done)return;if(st.battle&&st.pz.battleId!==st.battle.id)return;
 if(!st.clue){say('먼저 “무엇을 듣고 찾았나요?”에서 하나를 골라요','no');return;}
 if(st.battle&&C&&C.on&&!st.whole&&!P.NR&&!(st.seat>0)){say('대결 기록은 자리 번호가 있어야 해요 · 위에서 자리 번호를 골라요','no');return;}
 st.tries++;const ok=st.adj.every((a,k)=>cents(k)===0);
 if(!ok){const touched=st.adj.some(a=>a!==0);say(!touched?'아직 손잡이를 움직이지 않았어요':st.adj[st.pz.wrong]===0?'다른 줄을 바꿨어요. 바꾼 줄은 손잡이를 0으로 되돌리고 다시 찾아봐요':'거의 왔어요! 높이를 조금 더 맞춰 봐요','no');renderStat();renderAll();return;}
 st.done=true;st.doneAt=performance.now();const sec=Math.round((st.doneAt-st.t0)/1000);
 if(st.battle&&P.NR){say(`다 되돌렸어요! 손을 들어 선생님께 알려요${st.group?' · 우리 '+st.group+'모둠':''} · 확인 ${st.tries}번 · ${sec}초`,'ok');}/* 기록 없는 판: 교탁에 보내지 않고 선생님이 손 든 순서를 누른다 */
 else if(st.battle&&C&&C.on&&st.group>0){say('되돌렸어요! 교탁에 알리는 중…','ok');try{const resp=await P.post('api/g3/solve',{round:st.battle.id,group:st.group,seat:st.seat||0,tries:Math.min(99,st.tries),clue:st.clue,adj:st.adj.slice()}),r=await resp.json();if(!resp.ok){say(r.error||'교탁에 알리지 못했어요','no');st.done=false;st.tries--;renderAll();return;}
   say(r.rank?`되돌렸어요! 우리 모둠 ${r.rank}등 · ${(r.ms/1000).toFixed(1)}초 · ${r.points}점`:'되돌렸어요! (대결이 끝난 뒤라 점수에는 안 들어가요)','ok');}catch(e){st.done=false;st.tries--;say('되돌렸지만 교탁에 알리지 못했어요 · ‘확인’을 다시 눌러 보내요(안 되면 선생님께 손 들기)','no');renderAll();return;}}/* 2차 N17: 다시 보낼 수 있게 */
 else{say(`되돌렸어요! ${st.pz.wrong+1}현이 ${sign(st.pz.off[st.pz.wrong])} cent 어긋나 있었어요 · 확인 ${st.tries}번 · ${sec}초`,'ok');if(!st.battle&&!st.whole){const rec=P.Store.get('gugak-g3-log',[]);rec.push({kind:st.pz.kind,tries:st.tries,sec,clue:st.clue});P.Store.set('gugak-g3-log',rec.slice(-30));}}
 renderAll();}
function reveal(){if(!st.pz)return;const el=document.querySelector(`.str[data-k="${st.pz.wrong}"]`);el&&el.classList.add('reveal');say(`정답: ${st.pz.wrong+1}현이 ${sign(st.pz.off[st.pz.wrong])} cent 어긋나 있어요. 손잡이를 ${sign(-st.pz.off[st.pz.wrong])}로 맞춰요`);}
/* ── 모둠 대결(교탁) ── */
function onState(s){const g=s.g3;if(!g)return;renderBattle(g);const r=g.round;
 if(r&&!r.closed&&r.id!==st.seenRound&&!st.whole){st.seenRound=r.id;const left=r.startAt-C.serverNow();$('banner').hidden=false;$('banner-title').textContent=`모둠 대결 ${r.id}번`;$('banner-sub').textContent=KINDS.find(k=>k[0]===r.kind)[1]+(st.group?` · 우리 ${st.group}모둠`:' · 모둠을 먼저 골라요');
  const go=()=>{const l=r.startAt-C.serverNow();if(l>0){$('count').textContent=Math.ceil(l/1000)+'초';st.btimer=setTimeout(go,200);}/* 소리 타이머와 따로(듣기·멈춤이 시작을 지우지 않게, 2차 N16) */else{$('count').textContent='시작!';load(r.kind,r.seed,{id:r.id});st.t0=C.toPerf(r.startAt);}};
  stopAll();clearTimeout(st.btimer);st.battle={id:r.id};st.pz=null;st.done=false;st.sel=-1;say('곧 대결 문제가 열려요. 귀를 준비해요!');renderAll();go();}/* 기다리는 동안 연습 문제로 점수를 얻지 않게 */
 if(st.battle&&r&&(r.closed||r.id!==st.battle.id)&&st.battle.id===st.seenRound){if(r.closed&&!st.done){clearTimeout(st.btimer);stopAll();st.done=true;st.doneAt=performance.now();st.sel=-1;say('대결이 끝났어요. 선생님이 정답을 알려 줘요');renderAll();}}/* 2차 N17: 끝나면 소리·손잡이·시간을 멈춤 */
 if(st.battle&&!r){clearTimeout(st.btimer);st.battle=null;$('banner').hidden=true;normalTune();}/* 교탁 ‘모두 되돌리기’ 뒤에는 바로잡은 기본 조율로(합주용) — 자료 검증 1번 */}
function renderBattle(g){const box=$('battle-box');const totals=g.totals||{};const has=g.round||Object.keys(totals).length;box.hidden=!has||st.whole;if(!has)return;
 const n=CLASS.groups||8,solves=new Map((g.solves||[]).map(s=>[s.group,s]));const t=$('battle');t.innerHTML='<tr><th>모둠</th><th>이번 문제</th><th>시간</th><th>누적 점수</th></tr>';
 for(let i=1;i<=n;i++){const s=solves.get(i),tr=document.createElement('tr');if(i===st.group)tr.className='me';for(const v of [i+'모둠',s?s.rank+'등 · '+s.points+'점':'—',s?(s.ms/1000).toFixed(1)+'초':'—',(totals[i]||0)+'점']){const td=document.createElement('td');td.textContent=v;tr.append(td);}t.append(tr);}
 $('battle-sum').textContent=g.round?`${g.round.id}번 문제${g.round.closed?' · 끝':''}`:'';}
/* ── 연결 ── */
function bind(){document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.classList.contains('str')){const k=+b.dataset.k;if(!st.pz){ensure().then(ok=>ok&&pluck(k));return;}/* 대결을 기다리는 동안은 소리만(2차 N16) */st.sel=k;ensure().then(ok=>ok&&pluck(k));renderStrings();renderKnob();}
  else if(b.dataset.kind&&!b.disabled){st.kind=b.dataset.kind;newPractice();}
  else if(b.dataset.clue){st.clue=b.dataset.clue;renderClues();}
  else if(b.id==='arirang')arirang();else if(b.id==='scale')scale();else if(b.id==='stop')stopAll();
  else if(b.id==='new')newPractice();else if(b.id==='check')check();else if(b.id==='reveal')reveal();});
 $('adj').addEventListener('input',e=>{if(st.sel<0||st.done||!st.pz)return;st.adj[st.sel]=Math.max(-RANGE[st.pz.kind],Math.min(RANGE[st.pz.kind],+e.target.value));renderKnob();const s=document.querySelector(`.str[data-k="${st.sel}"] .adj`);if(s)s.textContent=st.adj[st.sel]?'손잡이 '+sign(st.adj[st.sel]):'';});
 $('adj').addEventListener('change',()=>{if(st.sel>=0)ensure().then(ok=>ok&&pluck(st.sel));});
 $('seat').addEventListener('change',e=>{st.seat=+e.target.value;P.Store.set('gugak-seat',st.seat);});
 $('group').addEventListener('change',e=>{st.group=+e.target.value;P.Store.set('gugak-group',st.group);});
 setInterval(()=>{if(st.pz&&!st.done)renderStat();},1000);}
document.addEventListener('DOMContentLoaded',async()=>{if(P.NR)$('group').classList.add('nr-keep');fill($('seat'),41,st.seat,'자리 번호');fill($('group'),(CLASS.groups||8)+1,st.group,'모둠');$('whole-line').hidden=!st.whole;if(st.whole){$('seat').hidden=$('group').hidden=true;}
 bind();load(st.kind,Math.floor(Math.random()*1e6));
 window.GugakG3={st,puzzle,load,check,cents,ALLOWED};
 if(C){C.on_('state',onState);C.setPage('g3','gayageum');await C.start();}});
})();
