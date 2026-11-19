/* 국악 놀이터 판·수업 지킴이 v0.3 (2026-11-17 구조 줄이기, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * 모든 화면에서 다른 스크립트보다 먼저 읽는다. AI·외부 인터넷 연결 없음.
 * 6차 재검증 뒤 총괄창 방향(11/17): 길을 하나씩 막지 않고 기능을 줄인다.
 * ① 교실 서버 주소(http)로 연 화면은 서버가 판(기록 없는 판 / 교실 서버판)과 수업 번호를 알려 줄 때까지 화면 전체를 가린다.
 *    그동안 보이기·저장(화면 메모리에만)·보내기(기다림)·소리를 모두 막는다. 서버 답의 모양이 맞을 때만 푼다.
 * ② 서버의 수업 번호가 이 화면을 연 때의 번호와 다르면, 기기에 적힌 번호가 아직 새 번호가 아닐 때만 지난 수업 값을 지우고 다시 연다
 *    (지우기는 수업 번호마다 한 번: 다른 창이 먼저 새 번호로 바꿨으면 그 창이 새로 쓴 값은 지우지 않는다).
 * ③ 판을 확인한 뒤 교실 서버판에서 서버가 2분 넘게 닿지 않으면 이 기기의 놀이터 값을 지우고, 이 화면을 가린 채 멈춘다(소리·타이머·그림·입력).
 *    저절로 다시 열거나 되살리지 않는다. 선생님이 서버를 다시 켠 뒤 가림 화면의 ‘새로 고침’을 누른다.
 * ④ api/info가 없으면(404) 판을 바꾸지 않고 가린 채 안내한다(교실 서버로 열기 · 서버 없이 쓰려면 파일을 바로 연다).
 * ⑤ 다른 창 맞추기(BroadcastChannel·storage 알림)는 뺐다. 열린 화면마다 3초마다 서버에 수업 번호를 묻는다.
 * 남기는 것: 설정(소리 크기·효과음·가볍게 보기·손 방향·반주 켬·박마다 강조), 캐릭터(gugak-avatar-v1), 수업 번호(gugak-sid, 서버가 정한 아무 뜻 없는 수).
 */
(()=>{'use strict';
const KEEP=new Set(['gugak-vol','gugak-sfx','gugak-nofx','gugak-lite','gugak-hand','gugak-perf-beat','gugak-march-beatonly','gugak-avatar-v1','gugak-sid']);
const NRH=/(^|[#.&])nr($|[.&])/;
const hashNR=()=>{try{return NRH.test(decodeURIComponent(location.hash||''));}catch(e){return false;}};
const HTTP=false/* 11/19 임시 웹 시연판: 서버 없이 여는 방식으로 고정 */,DESK=/desk\.html$/.test(location.pathname);
const G={KEEP,hashNR,mode:null,sid:null,onReady:[],epoch:0,holdSid:false};
const ss={get(k){try{return sessionStorage.getItem(k);}catch(e){return null;}},set(k,v){try{sessionStorage.setItem(k,v);return sessionStorage.getItem(k)===v;}catch(e){return false;}},del(k){try{sessionStorage.removeItem(k);return sessionStorage.getItem(k)==null;}catch(e){return false;}}};
/* 놀이터가 기기에 남긴 값 가운데 KEEP 밖의 것을 모두 지운다. 지운 개수를 돌려준다 */
function classKeys(){try{return Object.keys(localStorage).filter(k=>k.startsWith('gugak-')&&!KEEP.has(k));}catch(e){return [];}}
function wipeClass(withTune=true){let n=0;for(const k of classKeys()){try{localStorage.removeItem(k);n++;}catch(e){}}
 if(withTune&&ss.get('gugak-local-tune')!=null){ss.del('gugak-local-tune');n++;}return n;}
/* 기록 없는 판 표시를 탭에 적는다. 못 적으면 주소(#…nr)로 표시한다 */
function setNoRecord(on){if(on){if(ss.set('gugak-nr','1'))return true;
  const h=(location.hash||'').replace(/^#/,'');try{history.replaceState(null,'',location.pathname+location.search+'#'+(h?h+'.nr':'nr'));}catch(e){return false;}return hashNR();}
 const ok=ss.del('gugak-nr');ss.del('gugak-local-tune');return ok;}
const NR=(()=>{let on=hashNR();if(on)ss.set('gugak-nr','1');else on=ss.get('gugak-nr')==='1';if(on)wipeClass(false);/* 이 탭에 적용한 조율은 수업 번호가 바뀔 때만 지운다 */return on;})();
const storedSid=()=>{try{return JSON.parse(localStorage.getItem('gugak-sid')||'null');}catch(e){return null;}};
const keepSid=sid=>{try{localStorage.setItem('gugak-sid',JSON.stringify(sid));}catch(e){}};
const startSid=storedSid();
const hadOld=classKeys().length>0||ss.get('gugak-local-tune')!=null;/* 이 화면을 열 때 기기에 지난 놀이터 값이 있었나(없으면 읽은 것도 없다) */
let pending=HTTP&&!NR,readyFn;const ready=new Promise(r=>readyFn=r);if(!pending)readyFn();
let docSid=null,lastOk=Date.now(),blocked=false,dead=false,timer=null,firstSeen=!HTTP;const firstFns=[];
const firstDone=()=>{if(firstSeen)return;firstSeen=true;firstFns.splice(0).forEach(f=>{try{f();}catch(e){console.error(e);}});};
G.whenFirst=f=>{if(firstSeen)f();else firstFns.push(f);};/* 기록 없는 판: 서버에 처음 물은 뒤(답이 없어도) 탭 조율을 맞춘다 */
/* 멈춘 뒤에는 놀이 타이머·그림 그리기를 부르지 않는다(6차 N31). 지킴이 자신은 원래 함수를 쓴다 */
const T0={st:window.setTimeout.bind(window),si:window.setInterval.bind(window),ci:window.clearInterval.bind(window),raf:window.requestAnimationFrame?window.requestAnimationFrame.bind(window):null};
const wrap=f=>typeof f==='function'?function(...a){if(!dead)return f.apply(this,a);}:f;
window.setTimeout=(f,...a)=>T0.st(wrap(f),...a);window.setInterval=(f,...a)=>T0.si(wrap(f),...a);
if(T0.raf)window.requestAnimationFrame=f=>T0.raf(wrap(f));
/* 소리 멈추기: 이 화면이 만든 소리 장치를 모두 기억해 둔다 */
const ACS=[];for(const n of ['AudioContext','webkitAudioContext']){const A0=window[n];if(typeof A0==='function'){try{window[n]=class extends A0{constructor(...a){super(...a);ACS.push(this);}};}catch(e){}}}
/* ── 가림 화면 ── 가리는 동안 다른 화면 요소는 보이지 않고(visibility) 눌리지 않는다. 가림 안 ‘새로 고침’ 단추는 실제로 눌린다(6차 N33) */
const css=document.createElement('style');css.textContent='html.gugak-cover body>*:not(#class-off){visibility:hidden!important}#class-off{position:fixed;inset:0;z-index:200;background:#075753;color:#fff;display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;text-align:center;padding:24px;font:800 20px/1.4 system-ui,sans-serif}#class-off p{margin:0;max-width:40em}#class-off .sub{font-size:16px;font-weight:600}#class-off button{font:inherit;font-size:18px;padding:10px 22px;border-radius:14px;border:0;background:#fff;color:#075753;cursor:pointer}';
(document.head||document.documentElement).append(css);
const TXT={wait:['교실 서버에 판을 묻는 중이에요','잠시 기다려요. 오래 걸리면 선생님이 교실 서버가 켜져 있는지 확인한 뒤 ‘새로 고침’을 눌러요.'],
 nf:['이 주소에는 놀이터 교실 서버가 없어요','교탁 컴퓨터에서 「교실서버판_켜기」나 「기록없는판_켜기」로 켠 뒤 교탁 QR로 다시 열어요. 서버 없이 쓰려면 놀이터 파일(index.html)을 바로 열어요.'],
 store:['이 브라우저에서는 놀이터를 열 수 없어요','기기 저장이 막혀 있어 지난 수업 기록을 정리할 수 없어요. 개인 정보 보호(사생활) 모드를 끄거나 다른 브라우저로 교탁 QR을 다시 찍어요.'],
 off:['교실 서버에 닿지 않아요','서버가 꺼졌거나 와이파이가 끊겼어요. 이 기기에 남은 놀이터 기록(자리·모둠·점수 등)을 지우고 놀이·소리를 멈췄어요. 설정과 캐릭터는 남아요.<br>선생님이 서버를 다시 켠 뒤 ‘새로 고침’을 눌러요. 자리 번호는 다시 골라요. 서버를 새로 켰으면 교탁 QR을 다시 찍어요.']};
let coverKind=null;
function showCover(kind){coverKind=kind;document.documentElement.classList.add('gugak-cover');
 const put=()=>{if(coverKind!==kind)return;let d=document.getElementById('class-off');
  if(!d){d=document.createElement('div');d.id='class-off';d.setAttribute('role','alertdialog');d.setAttribute('aria-modal','true');
   for(const t of ['keydown','keyup','keypress','pointerdown','pointerup','click','touchstart'])d.addEventListener(t,e=>e.stopPropagation());/* 가림 안 입력은 단추까지만, 놀이 단축키로는 안 넘긴다 */
   document.body.append(d);}
  const [h,s]=TXT[kind];d.dataset.kind=kind;d.innerHTML=`<p>${h}</p><p class="sub">${s}</p>`;
  const b=document.createElement('button');b.type='button';b.textContent='새로 고침';b.addEventListener('click',()=>location.reload());d.append(b);
  if(kind!=='wait')try{b.focus();}catch(e){}};
 if(document.body)put();else document.addEventListener('DOMContentLoaded',put);}
function hideCover(){coverKind=null;document.documentElement.classList.remove('gugak-cover');const d=document.getElementById('class-off');if(d)d.remove();}
/* 가린 동안 가림 밖으로 가는 키·누름은 놀이에 넘기지 않는다(Tab은 단추로 가도록 둔다) */
for(const t of ['keydown','keyup','keypress','pointerdown','pointerup','click','touchstart'])addEventListener(t,e=>{if(!coverKind)return;const inside=e.target&&e.target.closest&&e.target.closest('#class-off');if(inside||e.key==='Tab')return;e.stopImmediatePropagation();e.preventDefault();},true);
if(pending)showCover('wait');
function stopAll(){dead=true;blocked=true;T0.ci(timer);for(const c of ACS){try{c.suspend();}catch(e){}}try{window.GugakPlay&&GugakPlay.Sound.stopAll();}catch(e){}}
/* 서버가 정한 수업 번호로 바꾼다: 기기에 적힌 번호가 새 번호가 아니면 지난 값을 지우고 새 번호를 적는다(번호마다 한 번) · 이 화면 메모리는 옮기지 않고 다시 연다 */
const note=()=>ss.set('gugak-newclass-note','1');
function switchTo(sid){G.epoch++;blocked=true;dead=true;if(storedSid()!==sid){wipeClass();keepSid(sid);}
 if(storedSid()!==sid){T0.ci(timer);showCover('store');return;}/* 기기 저장이 막힌 브라우저: 다시 열기를 되풀이하지 않고 멈춘다 */
 note();location.reload();}
/* 교탁 ‘수업 끝’: 누른 창은 다시 열지 않고 새 번호를 쓴다(다른 창·태블릿은 3초 물음에서 바뀐 번호를 본다) */
G.adoptSid=sid=>{G.epoch++;/* 이 앞에 보낸 물음의 늦은 답은 버린다 */G.holdSid=false;docSid=sid;G.sid=sid;if(storedSid()!==sid){wipeClass();keepSid(sid);}};
function cover(){if(dead)return;stopAll();if(storedSid()===docSid)wipeClass();showCover('off');dispatchEvent(new Event('gugak-blocked'));}
const validSid=s=>(typeof s==='string'&&/^[A-Za-z0-9_-]{1,40}$/.test(s))||(Number.isInteger(s)&&s>=0);
async function check(){if(dead)return;const ep=G.epoch,ac=new AbortController(),to=T0.st(()=>ac.abort(),5000);/* 답이 없어도 5초면 끊는다 */
 let r=null,j=null;try{r=await fetch('api/info',{cache:'no-store',signal:ac.signal});if(r.ok)j=await r.json();}catch(e){}clearTimeout(to);
 if(dead||ep!==G.epoch)return;/* 교탁 ‘수업 끝’ 전에 보낸 물음의 답은 버린다 */
 const good=!!j&&['server','norecord'].includes(j.mode)&&validSid(j.sid);
 if(NR){/* 기록 없는 판: 기기에 남기는 값이 없다. 서버판으로 켜진 서버면 판을 바꾸고, 수업 번호가 바뀌면 탭 조율만 지운다 */
  if(good){if(j.mode==='server'&&!hashNR()){if(setNoRecord(false))location.reload();return;}
   if(G.sid!=null&&j.sid!==G.sid){ss.del('gugak-local-tune');note();location.reload();return;}G.mode=j.mode;G.sid=j.sid;}
  else if(r&&r.status===404){G.mode='none';T0.ci(timer);}
  firstDone();return;}
 if(!good){if(pending&&r&&r.status===404){showCover('nf');T0.ci(timer);return;}/* 판을 바꾸지 않고 안내만(6차 N34) */return off();}
 lastOk=Date.now();
 if(j.mode==='norecord'){if(setNoRecord(true))location.reload();return;}
 G.mode='server';
 if(pending){if(j.sid!==startSid){if(hadOld)return switchTo(j.sid);/* 지난 값을 읽었을 수 있는 화면: 지우고 다시 연다 */
   if(storedSid()!==j.sid){wipeClass();keepSid(j.sid);}if(storedSid()!==j.sid){blocked=dead=true;T0.ci(timer);showCover('store');return;}}/* 처음 여는 기기: 읽은 지난 값이 없으니 번호만 적고 그대로 */
  docSid=j.sid;G.sid=j.sid;pending=false;hideCover();G.onReady.forEach(f=>{try{f();}catch(e){console.error(e);}});readyFn();firstDone();return;}
 if(j.sid!==docSid&&!G.holdSid)switchTo(j.sid);}
function off(){if(NR||dead||pending||G.mode!=='server')return;/* 판 확인 중이면 처음 가림(기다림) 그대로 */if(Date.now()-lastOk>(window.GUGAK_OFF_MS||120000))cover();/* GUGAK_OFF_MS는 자동 검사용 */}
if(HTTP){check();timer=T0.si(check,3000);}
/* 열린 화면에서 주소에 #nr을 넣거나 빼면 판을 다시 정한다 */
addEventListener('hashchange',()=>{const h=hashNR();if(h&&!NR){setNoRecord(true);location.reload();}else if(!h&&NR){if(setNoRecord(false))location.reload();}});
/* 새 수업 알림(지운 뒤 다시 연 화면) */
document.addEventListener('DOMContentLoaded',()=>{const on=ss.get('gugak-newclass-note')==='1';ss.del('gugak-newclass-note');
 if(!on)return;const d=document.createElement('div');d.className='newclass-note';d.setAttribute('role','status');d.textContent=NR?'새 수업이에요 · 이 탭의 지난 조율을 지웠어요':'새 수업이에요 · 지난 기록을 지웠어요 · 자리 번호와 모둠을 다시 골라요';d.style.cssText='position:fixed;left:50%;top:64px;transform:translateX(-50%);background:#0b7a75;color:#fff;padding:10px 16px;border-radius:12px;font-weight:800;z-index:50';document.body.append(d);T0.st(()=>d.remove(),6000);});
Object.assign(G,{NR,DESK,HTTP,wipeClass,setNoRecord,ready,pending:()=>pending,blocked:()=>blocked||dead});
window.GugakGuard=G;
})();
