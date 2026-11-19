/* 국악 놀이터 교탁 v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * 서버를 켠 컴퓨터(127.0.0.1)에서 연다. 자리 현황 · 모두 같이 시작(반주·세기는 교탁에서만, 빈자리 악기 몫 채우기) · 모둠 조율 받은 함(들어 보기·적용) · 태블릿 여는 QR.
 * AI·외부 인터넷 연결 없음. 받는 값은 자리·모둠 번호·화면·악기·cent 숫자뿐.
 */
(()=>{'use strict';
const P=window.GugakPlay,C=window.GugakClass,X=window.GugakArcade,$=id=>document.getElementById(id);
const CLASS=P.classCode(),HASH=location.hash.replace(/^#/,''),GROUPS=CLASS.groups||8;
const ORDER=['J1','J2','J3','J4','G1','G2','G3','G4'];
const PHRASE=()=>P.phrase('arirang',4),BEAT=.28/* 아리랑 첫 구절은 놀이·채점과 같은 악보(Astra 6) · 한 칸 = 8분음 */;
const REVERB_WORD=['없음','조금','많이'];
const st={state:null,local:false,run:null,timers:[],hands:[],handRound:null};
const sign=v=>(v>0?'+':'')+v;
const summary=t=>{const ch=t.map((c,k)=>c?`${k+1}현 ${sign(c)}`:null).filter(Boolean);return ch.length?(ch.length===12&&t.every(c=>c===t[0])?`모든 줄 ${sign(t[0])} cent`:ch.slice(0,4).join(', ')+(ch.length>4?` 외 ${ch.length-4}줄`:'')+' cent'):'기본 높이';};
let ready=null;
function prep(){if(!ready){const ids=new Set(Object.values(P.STROKES).map(s=>s.sample));for(const s of P.STRINGS)ids.add(P.gayaSample(s.deg));P.G12.forEach((m,k)=>ids.add(P.hyeonSample(k)));ids.add('janggu-04-deok-medium');ready=P.Sound.init([...ids]).catch(e=>{ready=null;throw e;});}return ready;}
const post=(u,b,ms=6000)=>{const o={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)};if(!ms)return fetch(u,o);const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);return fetch(u,{...o,signal:ac.signal}).finally(()=>clearTimeout(t));};
/* 보내기도 답 본문까지 같은 시간 제한(6차 N36) */
const postJ=async(u,b,ms=8000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b),signal:ac.signal});return await r.json();}finally{clearTimeout(t);}};
const del=(u,ms=6000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);return fetch(u,{method:'DELETE',signal:ac.signal}).finally(()=>clearTimeout(t));};
const getJ=async(u,ms=6000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);try{return await (await fetch(u,{cache:'no-store',signal:ac.signal})).json();}finally{clearTimeout(t);}};/* 교탁 조회도 시간 제한(5차 N24) */
/* ── 자리 현황 ── */
const PAGE_WORD={home:'첫 화면',dress:'꾸미기',rhythm:'놀이',perform:'채점',tune:'조율',desk:'교탁',g3:'세종'};
/* 같이 시작에 들어올 태블릿: 놀이 화면·그 악기·소리 준비됨·다른 판 안 하는 중(Astra 9) */
/* 기기 수: 자리 주인 + 같은 번호를 골라 막힌 기기(총괄창 11/16 — 빈자리 판단은 기기 수로) */
function devices(){return (st.state?.seats||[]).concat(st.state?.dups||[]);}
function players(game){return devices().filter(s=>s.page==='rhythm'&&s.inst===game&&s.ready&&!s.busy);}
function notReady(){return devices().filter(s=>s.page==='rhythm'&&(!s.ready||s.busy));}
function renderSeats(){const box=$('seats'),seats=new Map((st.state?.seats||[]).map(s=>[s.seat,s]));box.replaceChildren();
 const dup=new Map();for(const x of (st.state?.dups||[]))dup.set(x.seat,(dup.get(x.seat)||0)+1);
 for(let i=1;i<=40;i++){const s=seats.get(i),d=document.createElement('div');d.className='seat'+(s?' on '+(s.inst||''):'')+(dup.has(i)?' dup':'');d.innerHTML=`<b>${i}</b>`;if(dup.has(i)){const w=document.createElement('em');w.textContent=`같은 번호 ${(s?1:0)+dup.get(i)}대`;d.append(w);}if(s){const sp=document.createElement('span');sp.textContent=`${s.group}모둠 · ${PAGE_WORD[s.page]||''}${s.inst?' · '+(s.inst==='janggu'?'장구':'가야금'):''}${s.page==='rhythm'&&!s.ready?' · 소리 꺼짐':''}`;d.append(sp);if(s.page==='rhythm'&&!s.ready)d.classList.add('nr');}box.append(d);}
 const nd=[...dup.values()].reduce((a,b)=>a+b,0),n=seats.size+nd,j=players('janggu').length,g=players('gayageum').length,nr=notReady().length;
 let line=`켜진 태블릿 ${n}대(교실 연결 화면에서 최근 10초 — 첫 화면·꾸미기는 세지 않음)`+(nd?` (같은 번호 ${dup.size}자리 · 번호를 다시 고르게 해요)`:'')+` · 같이 시작 준비 장구 ${j} · 가야금 ${g}`+(nr?` · 준비 안 됨 ${nr}대(소리 켜기 전이거나 다른 판 중)`:'');
 if(st.run){const jn=devices().filter(s=>s.joined===st.run.id).length;line+=` · 이번 판 합류 ${jn}/${st.run.expect}`;}
 $('seat-sum').textContent=line;}
/* ── 조율 받은 함 ── */
function renderSubs(){const subs=(st.state?.submits||[]).slice().reverse(),box=$('subs');if(!subs.length){/* 비면 화면도 비운다(‘수업 끝’ 뒤 옛 제출이 남지 않게 · 3차 A3) */box.innerHTML='<p class="note">아직 없어요. 태블릿 ‘모둠 조율’ 화면에서 보내면 여기 와요.</p>';$('sub-sum').textContent='';return;}box.replaceChildren();
 for(const s of subs.slice(0,30)){const d=document.createElement('div');d.className='sub '+s.status;const w=document.createElement('div');w.className='what';
  const t=new Date(s.t),hh=t.toTimeString().slice(0,8);
  w.innerHTML=`<b>${s.group}모둠</b>${s.seat?` · ${s.seat}번`:''} <span class="note">${hh}</span> `;const tg=document.createElement('span');tg.className='tag '+s.status;tg.textContent=s.status==='applied'?'적용 중':s.status==='old'?'전에 적용':'새로 옴';w.append(tg);
  const p=document.createElement('div');p.textContent=summary(s.tune)+' · 울림 '+(REVERB_WORD[s.reverb]||'없음')+' · 모둠 판단: '+({yes:'부탁대로 됐어요',no:'부탁과 달라요',unsure:'잘 모르겠어요'}[s.judge]||'—');w.append(p);d.append(w);
  const l=document.createElement('button');l.className='btn ghost small';l.textContent='들어 보기';l.dataset.listen=s.id;d.append(l);
  if(s.status!=='applied'){const a=document.createElement('button');a.className='btn small';a.textContent='적용';a.dataset.apply=s.id;a.disabled=!st.local;d.append(a);}
  box.append(d);}
 $('sub-sum').textContent=`${subs.length}개`;}
async function listen(id){const s=(st.state?.submits||[]).find(x=>x.id===id);if(!s)return;stopAll();try{await prep();await P.Sound.resume();}catch(e){return;}
 const t0=P.Sound.ctx.currentTime+.15;for(const n of PHRASE())P.Sound.play(P.hyeonSample(n.k),{when:t0+n.t*BEAT,gain:.9,detune:s.tune[n.k]||0});$('sub-state').textContent=`${s.group}모둠 조율로 아리랑 첫 줄`;}
async function apply(id){const r=await post('api/apply',{id});$('sub-state').textContent=r.ok?'적용했어요 · 2초 안에 그 모둠 태블릿에 들어가요':'적용하지 못했어요';}
/* ── 같이 시작 ── */
function stopAll(){st.timers.forEach(clearTimeout);st.timers=[];P.Sound.stopAll();}
async function go(){const level=$('level').value,tempo=Math.max(30,Math.min(90,Math.round(+$('tempo').value||45))),delay=+$('delay').value;
 if(!st.local){$('go-state').textContent='교탁(127.0.0.1)에서만 시작할 수 있어요';return;}
 $('go').disabled=true;stopAll();
 try{await prep();await P.Sound.resume();}catch(e){$('go-state').textContent='소리를 준비하지 못했어요: '+e.message;$('go').disabled=false;return;}
 let r;try{r=await (await post('api/session',{level,tempo,delay})).json();}catch(e){r=null;}
 if(!r||!r.session){$('go-state').textContent='시작하지 못했어요(서버 확인)';$('go').disabled=false;return;}
 const s=r.session,ch=P.chart(level,tempo,!!CLASS.easy),game=ch.L.game,ctx=P.Sound.ctx,ahead=(s.startAt-C.serverNow())/1000,t0=ctx.currentTime+ahead;
 // 반주·세기(교탁에서만)
 for(const b of ch.backing)b.deg?P.playString(b.deg,{when:t0+b.t/1000,gain:b.gain,dur:b.dur||0}):P.Sound.play(b.id,{when:t0+b.t/1000,gain:b.gain,dur:b.dur||0});
 X?.SFX?.jing?.(t0+P.BAR*ch.e8/1000-0.02);
 // 빈자리 채우기: 이 판의 악기를 치는 태블릿이 없으면 교탁이 그 몫을 친다 / 안내 소리는 작게
 const empty=players(game).length===0,fill=$('fill').checked&&empty,gain=fill?.8:$('guide').checked?.25:0;
 if(gain)for(const n of ch.notes){if(game==='janggu')P.Sound.play(P.STROKES[n.stroke].sample,{when:t0+n.t/1000,gain});else P.playString(n.deg,{when:t0+n.t/1000,gain,dur:n.len/1000});}
 st.run={id:s.id,startAt:s.startAt,end:s.startAt+ch.end+400,expect:players(game).length};
 const who=players(game).length;$('go-state').textContent=`${ch.L.title} · ♩.=${ch.tempo} · ${who?`준비된 ${game==='janggu'?'장구':'가야금'} 태블릿 ${who}대`:'준비된 태블릿 없음'}${fill?' · 교탁이 학생 몫도 쳐요(빈자리)':gain?' · 학생 몫 안내 소리':''}`;
 const tick=()=>{if(!st.run||st.run.id!==s.id)return;const left=st.run.startAt-C.serverNow();$('count').textContent=left>0?Math.ceil(left/1000)+'초':C.serverNow()<st.run.end?'연주 중':'';if(C.serverNow()<st.run.end)st.timers.push(setTimeout(tick,200));else{$('go').disabled=false;st.run=null;}};tick();}
async function halt(){stopAll();st.run=null;$('count').textContent='';$('go').disabled=false;try{await del('api/session');}catch(e){}$('go-state').textContent='멈췄어요 · 태블릿도 보통 2초 안에 멈춰요';}
/* ── G3 모둠 대결 ── */
const G3K={pitch:'높이 문제',semitone:'반음 낮은 줄',fine:'조금 어긋난 줄'},CLUEW={high:'높이',wobble:'떨림',next:'옆 줄 비교',song:'아리랑 가락'};
function g3puzzle(kind,seed){const w=1+(seed%8);return{wrong:w,off:kind==='pitch'?1200:kind==='semitone'?-100:(seed%2?30:-30)};}
function renderG3(){const g=st.state?.g3;if(!g)return;const r=g.round,solves=new Map((g.solves||[]).map(s=>[s.group,s])),tot=g.totals||{};
 const t=$('g3-table');t.innerHTML='<tr><th>모둠</th><th>이번 문제</th><th>시간</th><th>확인</th><th>단서</th><th>누적 점수</th></tr>';
 const best=Math.max(0,...Object.values(tot));
 for(let i=1;i<=GROUPS;i++){const s=solves.get(i),tr=document.createElement('tr');if(best&&tot[i]===best)tr.className='top';for(const v of [i+'모둠',s?s.rank+'등 · '+s.points+'점':'—',s?(s.ms/1000).toFixed(1)+'초':'—',s?s.tries+'번':'—',s?CLUEW[s.clue]||'':'—',(tot[i]||0)+'점']){const td=document.createElement('td');td.textContent=v;tr.append(td);}t.append(tr);}
 $('g3-sum').textContent=r?`${r.id}번 문제 · ${G3K[r.kind]}${r.closed?' · 끝':' · 진행 중'} ${P.NR?'':' · 되돌린 모둠 '+solves.size}`:'';
 if(r&&r.closed){const p=g3puzzle(r.kind,r.seed);$('g3-answer').textContent=`정답: ${p.wrong+1}현이 ${p.off>0?'+':''}${p.off} cent 어긋나 있었어요`;}else $('g3-answer').textContent=r?'정답은 ‘끝내기’를 누르면 보여요':'';}
async function g3(cmd){if(!st.local){$('g3-answer').textContent='교탁(127.0.0.1)에서만 돼요';return;}
 if(cmd==='go'){const r=await post('api/g3/round',{kind:$('g3-kind').value,delay:3});if(!r.ok)$('g3-answer').textContent='문제를 내지 못했어요';}
 else if(cmd==='end')await post('api/g3/end',{});
 else if(cmd==='clear'){if(!confirm('모둠 대결 점수를 모두 지울까요?\n지우기 전에 점수표를 확인(사진·칠판)했나요? 지우면 모든 태블릿이 기본 조율(합주용)로 돌아가요.'))return;/* 자료 검증 1번: 기록 확인 뒤 지우고, 태블릿은 바로잡은 기본 조율로 */try{await del('api/g3');}catch(e){}}
 const gen=C?C.gen:0;try{const j=await getJ('api/class');if(C&&gen!==C.gen)return;/* 그사이 ‘수업 끝’을 눌렀으면 늦은 답은 버림(5차 N24) */st.state=j;renderG3();}catch(e){}}
/* 기록 없는 판: 손 든 순서를 선생님이 누른다(이 화면 메모리만) */
function renderHands(){const r=st.state?.g3?.round;if(r&&r.id!==st.handRound){st.handRound=r.id;st.hands=[];}
 const box=$('g3-hand-btns');if(!box.childElementCount)for(let g=1;g<=GROUPS;g++){const b=document.createElement('button');b.className='btn ghost';b.dataset.hand=g;b.textContent=g+'모둠';box.append(b);}
 for(const b of box.children)b.disabled=st.hands.includes(+b.dataset.hand);
 $('g3-hand-order').textContent=st.hands.length?st.hands.map((g,i)=>`${i+1}등 ${g}모둠`).join(' · ')+'  (점수는 선생님이 칠판에)':'';}
async function endClass(){if(!st.local){$('end-state').textContent='교탁(127.0.0.1)에서만 돼요';return;}
 if(!confirm('수업 끝: 교탁·서버의 점수·자리·조율·대결 기록을 모두 지울까요?\n되돌릴 수 없어요. 남길 것은 지우기 전에 칠판·종이로 옮겨요(자리 번호는 옮기지 않아요).'))return;
 if(st.ending)return;st.ending=true;$('endclass').disabled=true;/* 한 번씩만(4차 N7) */
 const Gd=window.GugakGuard;try{
 stopAll();st.run=null;if(Gd)Gd.holdSid=true;/* 이 창은 다시 열지 않고 알림을 보인다 */let r=null;try{r=await postJ('api/endclass',{},8000);}catch(e){}
 if(!r||!r.ok){$('end-state').textContent='지웠는지 확인하지 못했어요(서버가 답하지 않음) · 한 번 더 누르거나, 서버 창을 닫으면(Ctrl+C) 서버 기록은 모두 사라져요';return;}
 if(C)C.gen++;/* 앞서 보낸 조회의 늦은 답은 버림 */st.state={seats:[],dups:[],submits:[],g3:{round:null,solves:[],totals:{}}};st.hands=[];st.handRound=null;if(C)C.state=st.state;/* 교탁 화면의 옛 자리·조율·대결 표를 바로 비운다(4차 N7) */renderSeats();renderSubs();renderG3();renderHands();
 if(Gd)Gd.adoptSid(r.sid);/* 이 창은 새 번호로. 다른 창·태블릿은 3초마다 묻는 지킴이가 바뀐 번호를 보고 지운다(11/17: 창 맞추기 알림은 뺌) */
 const c=r.cleared||{};$('end-state').textContent=`지웠어요 · 서버 점수 ${c.scores||0}건 · 자리 ${c.seats||0}대 · 조율 제출 ${c.submits||0}건 · 대결 ${c.g3||0}건 · 열린 다른 창(점수판 등)과 교실 화면이 열린 태블릿은 서버에 다음에 물을 때(3초쯤) 지워요(꺼져 있었거나 와이파이가 끊긴 태블릿은 다음에 교실 서버에 닿을 때, 서버를 그 전에 끄면 2분 뒤 그 화면에서 지우고 가려요) · 새 반은 새 QR로`;
 const gen=C?C.gen:0;try{const j=await getJ('api/class');if(j&&j.sid===r.sid&&(!C||gen===C.gen)){st.state=j;if(!P.NR){renderSeats();renderSubs();}renderG3();}}catch(e){}
 }finally{if(Gd)Gd.holdSid=false;st.ending=false;$('endclass').disabled=false;}renderQr();}
/* ── QR ── */
async function renderQr(){let info=null;try{info=await getJ('api/info',5000);}catch(e){}
 const box=$('qrs');box.replaceChildren();const NRM=info?.mode==='norecord',lan=info?.lan,KEYP=NRM?'nr':info?.key?'x'+info.key:'',HK=[HASH.split('.').filter(x=>x&&x!=='nr'&&!/^x[0-9a-f]{6}$/.test(x)).join('.'),KEYP].filter(Boolean).join('.');
 if(!lan){$('qr-note').textContent='QR은 서버를 --lan 으로 켰을 때 나와요(지금은 이 컴퓨터에서만 열려요). 켤 때 화면에 나온 ‘태블릿’ 주소를 칠판에 적어도 돼요.';return;}
 $('qr-note').textContent=NRM?`태블릿은 같은 와이파이에서 카메라로 찍어 열어요(기록 없는 판 · 주소 끝 #nr). 주소: ${lan}#${HK}`:`태블릿은 같은 와이파이에서 카메라로 찍어 열어요(QR 주소에 이번 수업 열쇠 ${info.key}가 들어 있어요. 서버를 끄거나 ‘수업 끝 · 모두 지우기’를 누르면 바뀌어요). 주소: ${lan}#${HK}`;
 const h=HK?HK+'.':'';const items=[['놀이터 첫 화면',lan+'#'+HK],['장단·가락 놀이',lan+'rhythm.html#'+HK]];
 items.push(['세종대왕을 찾아라',lan+'g3.html#'+HK]);
 items.push(['정간보 놀이',lan+'jeonggan.html#'+HK],['행진 장단',lan+'march.html#'+HK]);
 if(NRM)items.push(['모둠 조율(이 기기만 적용)',lan+'tune.html#'+HK]);else for(let g=1;g<=GROUPS;g++)items.push([`${g}모둠 조율`,lan+'tune.html#'+h+'m'+g]);
 for(const [label,url] of items){const d=document.createElement('div');d.className='qr';const b=document.createElement('b');b.textContent=label;d.append(b);
  if(new TextEncoder().encode(url).length<=100){const img=document.createElement('img');img.alt=label+' QR';img.src='api/qr?text='+encodeURIComponent(url);d.append(img);}
  const u=document.createElement('div');u.className='note';u.style.wordBreak='break-all';u.textContent=url.replace(/^https?:\/\//,'');d.append(u);box.append(d);}}
/* ── 시작 ── */
function init(){
 for(const id of ORDER){const L=P.LEVELS[id];$('level').append(new Option(`${L.game==='janggu'?'장구':'가야금'} ${id.slice(1)}단계 · ${L.title}`,id));}
 $('level').value=ORDER[Math.max(0,((CLASS.levels||[1])[0])-1)];$('tempo').value=CLASS.tempo||45;
 for(let g=1;g<=GROUPS;g++)$('reset-group').append(new Option(g+'모둠',''+g));
 const hw=(HASH?HASH+'.':'')+'whole';$('whole').href='rhythm.html#'+hw;$('whole-demo').href='rhythm.html#'+hw+'.demo';$('g3-whole').href='g3.html#'+hw;
 const kl=CLASS.kinds||2;[...$('g3-kind').options].forEach((o,i)=>o.disabled=i>=kl);
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='go')go();else if(b.id==='halt')halt();
  else if(b.id==='release'){if(confirm('모든 자리 번호의 기기 연결을 풀까요? (태블릿을 바꿀 때)'))post('api/release',{}).then(r=>$('go-state').textContent=r.ok?'자리 연결을 모두 풀었어요':'풀지 못했어요');}
  else if(b.id==='endclass')endClass();
  else if(b.dataset.hand){if(!st.hands.includes(+b.dataset.hand))st.hands.push(+b.dataset.hand);renderHands();}
  else if(b.id==='g3-go')g3('go');else if(b.id==='g3-end')g3('end');else if(b.id==='g3-clear')g3('clear');
  else if(b.dataset.listen)listen(+b.dataset.listen);else if(b.dataset.apply)apply(+b.dataset.apply);
  else if(b.id==='reset')post('api/apply',{group:+$('reset-group').value,reset:true}).then(r=>$('sub-state').textContent=r.ok?$('reset-group').value+'모둠을 기본 높이로 되돌렸어요':'되돌리지 못했어요');});
  if(P.NR){$('fill').checked=false;$('g3-clear').hidden=true;}
 renderSeats();}
document.addEventListener('DOMContentLoaded',async()=>{init();
 const on=C?await C.start():false;if(!on){$('noserver').hidden=false;return;}
 try{const i=await getJ('api/info',5000);st.local=!!i.local;}catch(e){}
 $('nolocal').hidden=st.local;C.setPage('desk','');
 C.on_('state',s=>{st.state=s;if(P.NR){renderG3();renderHands();return;}renderSeats();renderSubs();renderG3();});renderQr();
 window.GugakDesk={st,go,halt,players};});
})();
