/* 국악 놀이터 교실 연결 v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * 교실 시연 서버(demo_server.py)가 있을 때만 켜진다. 없으면(파일로 열기·공개 주소) 아무것도 하지 않는다.
 * - 자리 현황: 2초마다 자리 번호·모둠 번호·지금 화면·악기만 보낸다(이름 없음).
 * - 시각 맞추기: /api/time 을 몇 번 물어 서버 시각과의 차이를 잰다 → 교탁이 정한 '같이 시작' 시각에 모든 태블릿이 함께 시작.
 * - 모둠 조율: 교탁이 적용한 우리 모둠 조율(cent 12개)을 받아 가야금 소리에 더한다(GugakPlay.Tune).
 * AI·외부 인터넷 연결 없음.
 */
(()=>{'use strict';
const P=window.GugakPlay;
// QR로 연 주소에 모둠(m3 등)이 있고 이 기기에 아직 모둠이 없으면 넣어 둔다(페이지가 읽기 전에)
{const c=P.classCode();if(c.group)P.Store.set('gugak-group',c.group);}/* QR의 모둠 번호가 이 기기의 옛 모둠보다 먼저(Astra 18) */
// 새 수업(서버를 다시 켬·교탁 ‘수업 끝’)의 지우기·알림은 class-guard.js가 화면마다 맡는다(3차 재검증 A4·N2)
const L={busy:false,joined:0,sid:null,on:false,off:0,rtt:9e9,page:/desk\.html$/.test(location.pathname)?'desk':'home',inst:'',session:null,seenSession:P.Store.get('gugak-seen-session',0),tuneId:null,handlers:{session:[],tune:[],state:[],cancel:[],hello:[]},state:null};
const fire=(k,v)=>L.handlers[k].forEach(f=>{try{f(v);}catch(e){console.error(e);}});
L.serverNow=()=>Date.now()+L.off;
/* 모든 조회에 시간 제한(6차 N36): 답 본문을 다 받을 때까지 ms 안에 끝나지 않으면 끊는다 */
const getJ=async(u,ms=5000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);try{const r=await fetch(u,{cache:'no-store',signal:ac.signal});return {ok:r.ok,j:await r.json().catch(()=>null)};}finally{clearTimeout(t);}};
L.toPerf=serverMs=>performance.now()+(serverMs-L.serverNow());
L.on_=(k,f)=>L.handlers[k].push(f);
L.setPage=(page,inst='')=>{L.page=page;L.inst=inst;};
async function sync(){for(let i=0;i<5;i++){const t0=Date.now();try{const {j}=await getJ('api/time',3000);if(!j)throw 0;const t1=Date.now(),rtt=t1-t0;if(rtt<L.rtt){L.rtt=rtt;L.off=j.t-(t0+t1)/2;}}catch(e){return false;}}return true;}
/* 같은 자리 번호를 다른 태블릿이 먼저 쓰면: 어느 화면에서든 위에 알리고 번호를 다시 고르게 한다(총괄창 11/16) */
function dupBanner(msg){let b=document.getElementById('class-dup');if(!msg){if(b)b.remove();return;}
 if(!b){b=document.createElement('div');b.id='class-dup';b.setAttribute('role','alert');b.style.cssText='position:fixed;left:8px;right:8px;top:8px;z-index:99;background:#fff4ef;color:#7a2412;border-radius:12px;padding:10px 12px;box-shadow:0 0 0 3px #e8562f,0 6px 18px rgba(0,0,0,.18);font-weight:800;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
  const t=document.createElement('span');t.className='msg';const k=document.createElement('button');k.type='button';k.className='btn small';k.textContent='번호 다시 고르기';
  k.onclick=()=>{P.Store.set('gugak-seat',0);location.reload();};b.append(t,k);document.body.append(b);}
 b.querySelector('.msg').textContent=msg;}
L.gen=0;/* 교탁 '수업 끝'이 올리면 그 앞에 보낸 조회의 늦은 답은 버린다(4차 N7) */
async function tick(){const seat=P.Store.get('gugak-seat',0),group=P.Store.get('gugak-group',0),gen=L.gen;
 try{const {j}=await getJ('api/class?key='+encodeURIComponent(P.classKey()));if(!j)return;/* 수업 열쇠 없는 기기에는 시계만 온다(2차 N04) */
  if(gen!==L.gen||(P.Guard&&P.Guard.blocked&&P.Guard.blocked()))return;
  /* 판 바꾸기(기록 없는 판 ↔ 서버판)는 class-guard.js 한 곳에서만 한다(5차 N16: 저장 실패 때 다시 열기 되풀이 막기) */
  if(j.sid)L.sid=j.sid;
  /* 자리 현황은 서버가 ‘교실 서버판’이라고 알려 준 뒤에만 보낸다 — 판을 모를 때 지난 자리·모둠을 싣지 않기(3차 A2) */
  if(j.mode==='server'&&!P.NR){if(seat>0&&group>0&&L.page!=='desk'&&!L.noHello){/* ‘함께 악기’처럼 자리를 보내지 않는 화면은 건너뜀 *//* 교탁 화면은 자리로 세지 않음(총괄창 11/16 확인 ②) */const r=await P.post('api/hello',{seat,group,page:L.page,inst:L.inst,ready:!!(P.Sound.ctx&&P.Sound.ctx.state==='running'),busy:!!L.busy,joined:L.joined||0});const hj=r.ok?{}:await r.json().catch(()=>({}));L.helloError=r.ok?'':(hj.error||'');dupBanner(r.status===409?L.helloError:'');fire('hello',L.helloError);}}
  L.state=j;fire('state',j);
  // 우리 모둠 조율
  const t=group>0?(j.tunes||{})[String(group)]:null,id=t?t.id:null;if(id!==L.tuneId){L.tuneId=id;P.Tune.set(t);fire('tune',t);}
  // 같이 시작(아직 안 한 것, 시작 시각이 지나지 않은 것)
  const s=j.session;
  // 교탁이 멈춤(또는 새 판)을 누르면 하던 같이 시작 판을 멈춘다
  if(L.session&&(!s||s.id!==L.session.id)){const old=L.session;L.session=null;fire('cancel',old);}
  if(s&&s.id!==L.seenSession&&s.startAt>L.serverNow()+400){L.seenSession=s.id;P.Store.set('gugak-seen-session',s.id);L.session=s;fire('session',s);}
 }catch(e){}}
L.start=async()=>{if(true)return false;/* 11/19 임시 웹 시연판 */await (P.Guard?P.Guard.ready:Promise.resolve());/* 판을 안 뒤에 교실 조회를 시작한다(3차 재검증 A2) */try{const r=await getJ('api/ping',4000);if(!r.ok)return false;}catch(e){return false;}
 L.on=true;await sync();await tick();setInterval(tick,2000);setInterval(()=>{L.rtt=9e9;sync();},60000);return true;};
L.noHello=!!P.NR;/* 기록 없는 판: 자리 현황을 보내지 않는다 */
window.GugakClass=L;
})();
