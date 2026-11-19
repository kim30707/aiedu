/* 국악 놀이터 모둠 조율 v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * 웹악기 0.12.2 my-tuning.js 의 부탁 카드·검사 규칙을 그대로 옮겼다(12줄·줄 이름 그대로·±200 cent·울림 0~2·JSON 하나).
 * - 앱은 AI에 연결되지 않는다. 카드는 복사만, 답은 학생이 붙여 넣는다. 붙여 넣은 글은 저장·전송하지 않는다.
 * - 교탁에는 자리·모둠 번호와 cent 12개·울림 숫자만 보낸다(/api/submit). 적용은 교탁(서버 컴퓨터)에서 선생님이.
 */
(()=>{'use strict';
const P=window.GugakPlay,$=id=>document.getElementById(id),C=window.GugakClass;
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'],REVERB_WORD=['없음','조금','많이'];
const REQUESTS=[
 {id:'up',label:'한 음 높이기',text:'노래하기 편하게 모든 줄을 한 음(온음) 높여 주세요.'},
 {id:'down',label:'반음 낮추기',text:'모든 줄을 반음 낮춰 주세요.'},
 {id:'fine',label:'5현만 조금 올리기',text:'5현이 조금 낮게 들려요. 5현만 10 cent 올려 주세요.'},
 {id:'room',label:'넓은 곳처럼 울리게',text:'넓은 홀에서 연주하는 것처럼 울림을 많이 해 주세요. 줄 높이는 그대로 두세요.'},
 {id:'reset',label:'처음 높이로',text:'모든 줄을 기본 높이로 되돌려 주세요.'}];
const PHRASE=()=>P.phrase('arirang',4),BEAT=.28/* 아리랑 첫 구절은 놀이·채점과 같은 악보(Astra 6) · 한 칸 = 8분음 */;
const EX=window.GugakTuneExamples||[];
const PII=/(이름|학교|초등|중학교|[0-9]+\s*반|[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}|@|주소|번지|아파트)/;/* 개인정보처럼 보이는 말(완전하지 않음 — 감독 선생님 확인이 먼저) */
const EASY=(()=>{const c=P.classCode();return !!(c.easy||c.one);})();
const st={judge:'',heardAfter:false,seat:P.Store.get('gugak-seat',0),group:P.Store.get('gugak-group',0),chosen:REQUESTS[0],pending:null,server:false,timers:[]};
const baseHz=k=>440*Math.pow(2,(P.G12[k]-69)/12),hzOf=(k,c)=>baseHz(k)*Math.pow(2,c/1200);
const noteOf=hz=>{const m=Math.round(69+12*Math.log2(hz/440));return NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1);};
const normNote=n=>String(n??'').trim().replace('♯','#').replace(/^([A-Ga-g])b(\d)$/,(x,l,o)=>{const i=NAMES.indexOf(l.toUpperCase());return NAMES[(i+11)%12]+(l.toUpperCase()==='C'?o-1:o);}).replace(/^([a-g])/,x=>x.toUpperCase());
const sign=v=>(v>0?'+':'')+v;
const summary=t=>{const ch=t.map((c,k)=>c?`${k+1}현 ${sign(c)}`:null).filter(Boolean);return ch.length?(ch.length===12&&t.every(c=>c===t[0])?`모든 줄 ${sign(t[0])} cent`:ch.slice(0,4).join(', ')+(ch.length>4?` 외 ${ch.length-4}줄`:'')+' cent'):'기본 높이';};
function current(){return{strings:P.Tune.cents.map((c,k)=>({name:(k+1)+'현',note:noteOf(hzOf(k,c)),hz:+hzOf(k,c).toFixed(2)})),reverb:P.Tune.reverb};}
function reqText(){const o=$('own').value.trim();return o||st.chosen.text;}
function card(){const base=P.G12.map((m,k)=>(k+1)+'현 '+baseHz(k).toFixed(2)).join(', ');
 return['우리는 초등학생이고, 국악 놀이터에서 가야금 12줄의 높이를 조율하고 있어요.',
 '아래 ‘지금 설정’을 우리 부탁대로 바꾼 새 설정을 JSON 하나로만 답해 주세요. JSON 밖에는 아무것도 쓰지 마세요.',
 '지킬 것:',
 '- strings는 12개 그대로 두고 name은 바꾸지 마세요. 바꿀 수 있는 것은 note(음 이름)와 hz(높이)뿐이에요.',
 '- hz는 기본 높이에서 위아래 '+P.TUNE_MAX+' cent(반음 '+(P.TUNE_MAX/100)+'개) 안에서만 바꿔요. 기본 높이(hz): '+base,
 '- reverb(울림)는 0(없음)·1(조금)·2(많이) 가운데 하나예요. 부탁이 없으면 그대로 두세요.',
 '- reason에는 무엇을 왜 바꿨는지 초등학생이 알 수 있게 한두 문장으로 써 주세요.',
 '- 이름·학교 같은 개인정보는 쓰지 마세요. 부탁이 조율·소리와 관계없으면 설정을 그대로 두고 reason에 까닭을 써 주세요.',
 '형식: {"strings":[{"name":"1현","note":"G2","hz":98.0}, …12개], "reverb":0, "reason":"…"}',
 '지금 설정:',JSON.stringify(current()),
 '우리 부탁: '+reqText()].join('\n');}
function check(text){
 const out={ok:false,problems:[],checks:[],tune:null,reverb:null,reason:'',rows:[]};
 let t=String(text||'').trim();
 if(!t){out.problems.push('붙여 넣은 답이 없어요.');return out;}
 if(t.length>20000){out.problems.push('붙여 넣은 글이 너무 길어요. AI 답의 { … } 부분만 붙여 넣어요.');return out;}
 const fence=t.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/);if(fence)t=fence[1].trim();
 let j=null;try{j=JSON.parse(t);}catch{const m=t.match(/\{[\s\S]*\}/);if(m){try{j=JSON.parse(m[0]);}catch{}}}
 if(!j||typeof j!=='object'||Array.isArray(j)){out.problems.push('설정(JSON) 모양이 아니에요. AI 답에서 { 로 시작해 } 로 끝나는 부분을 붙여 넣어요.');return out;}
 const s=j.strings;if(!Array.isArray(s)){out.problems.push('줄 정보(strings)가 없어요.');return out;}
 if(s.length!==12)out.problems.push('줄이 '+s.length+'개예요. 가야금은 12줄이에요.');
 const tune=[],lim=P.TUNE_MAX;
 s.slice(0,12).forEach((x,k)=>{const want=(k+1)+'현',name=String(x?.name??'').replace(/\s+/g,'');
  if(name!==want)out.problems.push(want+'의 이름이 ‘'+String(x?.name??'').slice(0,20)+'’(으)로 바뀌었어요. 줄 이름은 바꾸지 않아요.');
  const hz=Number(x?.hz);if(!Number.isFinite(hz)||hz<=0){out.problems.push(want+'의 높이(hz)가 숫자가 아니에요.');tune.push(0);return;}
  const c=Math.round(1200*Math.log2(hz/baseHz(k)));
  if(Math.abs(c)>lim)out.problems.push(want+'이(가) 기본 높이에서 '+sign(c)+' cent 바뀌었어요. '+lim+' cent까지만 바꿀 수 있어요.');
  const near=noteOf(hz),given=normNote(x?.note);if(given&&given!==near)out.checks.push(want+': 음 이름은 '+given+'인데 높이는 '+near+'에 가까워요. 귀로 확인해요.');
  tune.push(c);out.rows.push({name:want,beforeC:P.Tune.cents[k]||0,afterC:c,note:given||near,near});});
 if(j.reverb!==undefined){const r=Number(j.reverb);if([0,1,2].includes(r))out.reverb=r;else out.problems.push('울림(reverb)은 0·1·2 가운데 하나여야 해요.');}
 const extra=Object.keys(j).filter(k=>!['strings','reverb','reason'].includes(k));if(extra.length)out.checks.push('앱에 없는 설정('+extra.join(', ').slice(0,40)+')은 쓰지 않아요.');
 out.reason=typeof j.reason==='string'?j.reason.slice(0,240):'';
 if(!out.problems.length&&tune.length===12){out.ok=true;out.tune=tune;}
 return out;}
/* ── 화면 ── */
function fill(sel,n,v,label){sel.replaceChildren(new Option(label+' 고르기','0'));for(let i=1;i<n;i++)sel.append(new Option(i+'번',''+i));sel.value=String(v||0);}
function paintNow(){$('now').textContent=`지금 우리 모둠 조율: ${summary(P.Tune.cents)} · 울림 ${REVERB_WORD[P.Tune.reverb]||'없음'}${P.Tune.id?' (교탁이 적용한 것)':''}`;$('card').value=card();}
function renderReqs(){const box=$('reqs');box.replaceChildren();for(const r of REQUESTS){const b=document.createElement('button');b.textContent=r.label;b.dataset.req=r.id;b.setAttribute('aria-pressed',String(r===st.chosen&&!$('own').value.trim()));box.append(b);}}
function renderExamples(){const box=$('examples');box.replaceChildren();for(const e of EX){const b=document.createElement('button');b.textContent=e.label;b.dataset.ex=e.id;box.append(b);}}
function render(r){const box=$('result');box.replaceChildren();
 const add=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;box.append(el);return el;};
 add('p',r.ok?'state':'warn',r.ok?'형식·범위 검사 통과 — 앱에 넣을 수 있는 모양이에요. 부탁대로 바뀌었는지는 표와 귀로 우리가 판단해요.':'이 답은 쓸 수 없어요. 아래를 고쳐 달라고 AI에게 다시 부탁해요.');
 if(r.problems.length){const ul=add('ul','problems');r.problems.slice(0,8).forEach(p=>{const li=document.createElement('li');li.textContent=p;ul.append(li);});}
 if(r.checks.length){const ul=add('ul','checks');r.checks.slice(0,6).forEach(p=>{const li=document.createElement('li');li.textContent=p;ul.append(li);});}
 if(r.reason){if(PII.test(r.reason))add('p','warn','AI가 쓴 이유에 개인정보처럼 보이는 말이 있어요. 선생님께 보여 주고 지워요.');const q=add('p','reason');const b=document.createElement('b');b.textContent='AI가 쓴 이유(의견): ';const sp=document.createElement('span');sp.textContent=r.reason.replace(new RegExp(PII.source,'g'),'○○');/* 개인정보처럼 보이는 말은 가려서 보임(2차 N11) */q.append(b,sp);}
 if(r.rows.length){const tb=document.createElement('table');const holder=EASY?document.createElement('details'):null;if(holder){const sm=document.createElement('summary');sm.textContent='줄 12개 표 보기';holder.append(sm);}tb.innerHTML='<thead><tr><th>줄</th><th>지금</th><th>바꾼 뒤</th><th>음 이름</th></tr></thead>';const body=document.createElement('tbody');
  for(const x of r.rows){const tr=document.createElement('tr');if(x.beforeC!==x.afterC)tr.className='changed';for(const v of [x.name,sign(x.beforeC)+' cent',sign(x.afterC)+' cent',x.note+(x.note!==x.near?' (높이는 '+x.near+')':'')]){const td=document.createElement('td');td.textContent=v;tr.append(td);}body.append(tr);}
  tb.append(body);if(holder){holder.append(tb);box.append(holder);}else box.append(tb);}/* 저학년은 표를 접어 둔다(Astra 11) */
 if(r.ok){const ch=r.tune.filter((c,k)=>c!==P.Tune.cents[k]).length;add('p','note',`바뀌는 줄 ${ch}개 · ${summary(r.tune)}${r.reverb!=null?' · 울림 '+REVERB_WORD[r.reverb]:''}`);}
 st.pending=r.ok?{tune:r.tune,reverb:r.reverb??P.Tune.reverb}:null;st.judge='';st.heardAfter=false;$('after').disabled=!st.pending;gate();$('submit-state').textContent=P.NR?'':st.pending&&!st.server?'교실 서버가 없어서 보낼 수 없어요(들어 보기만 돼요)':st.pending&&!st.group?'모둠을 먼저 골라요':'';}
/* 보내기 단추: 검사 통과 + 바꾼 소리 듣기 + 우리 판단 + 서버·모둠(Astra 7) */
function gate(){const box=$('judge-box');box.hidden=!(st.pending&&st.heardAfter);for(const b of document.querySelectorAll('[data-judge]'))b.setAttribute('aria-pressed',String(b.dataset.judge===st.judge));
 $('submit').disabled=!(st.pending&&st.heardAfter&&st.judge&&(P.NR||(st.server&&st.group>0)));/* 기록 없는 판: 교탁에 보내지 않고 이 태블릿에만 적용 */
 if(st.pending&&!/보냈어요|적용했어요/.test($('submit-state').textContent))$('submit-state').textContent=P.NR?(!st.heardAfter?'‘바꾼 소리 듣기’를 먼저 들어요':!st.judge?'부탁대로 됐는지 골라요':''):!st.server?'교실 서버가 없어서 보낼 수 없어요(들어 보기만 돼요)':!st.group?'모둠을 먼저 골라요':!st.heardAfter?'‘바꾼 소리 듣기’를 먼저 들어요':!st.judge?'부탁대로 됐는지 골라요':'';}
function invalidate(){if(st.pending||$('result').childElementCount){st.pending=null;st.judge='';st.heardAfter=false;$('result').replaceChildren();const p=document.createElement('p');p.className='note';p.textContent='답이나 부탁이 바뀌었어요 · 다시 ‘검사하기’를 눌러요';$('result').append(p);$('after').disabled=true;$('submit').disabled=true;$('submit-state').textContent='';gate();}}/* 바뀌면 다시 검사(Astra 8) */
/* ── 듣기 ── */
let soundReady=null;
function prep(){if(!soundReady)soundReady=P.Sound.init(P.G12.map((m,k)=>P.hyeonSample(k))).catch(e=>{soundReady=null;throw e;});return soundReady;}
function stopPlay(){st.timers.forEach(clearTimeout);st.timers=[];P.Sound.stopAll();}
async function phrase(tune,label){stopPlay();try{await prep();await P.Sound.resume();}catch(e){$('listen-state').textContent='소리를 준비하지 못했어요';return;}
 const ctx=P.Sound.ctx,t0=ctx.currentTime+.15;let t=0;for(const n of PHRASE()){P.Sound.play(P.hyeonSample(n.k),{when:t0+n.t*BEAT,gain:.9,detune:tune[n.k]||0});t=Math.max(t,(n.t+n.len)*BEAT);}if(label.startsWith('바꾼'))st.heardAfter=true;
 $('listen-state').textContent=label+' 아리랑 첫 줄을 들려줘요…';st.timers.push(setTimeout(()=>$('listen-state').textContent=label+' 다 들었어요',t*1000+300));}
/* ── 보내기 ── */
async function submit(){if(P.NR&&st.pending){const t={id:'local',tune:st.pending.tune,reverb:st.pending.reverb,sid:P.Guard?P.Guard.sid??null:null};/* 수업 번호를 붙여 다른 수업에 넘어가지 않게(5차 N25) */P.Tune.set(t);try{sessionStorage.setItem('gugak-local-tune',JSON.stringify(t));}catch(e){}paintNow();$('submit-state').textContent='이 태블릿에 적용했어요 · 놀이·연주 채점의 가야금 소리가 바뀌어요(교탁에는 보내지 않아요 · 창을 닫으면 처음 소리로)';$('submit').disabled=true;return;}
 if(!st.pending||!st.server||!st.group)return;$('submit').disabled=true;
 try{const r=await P.post('api/submit',{group:st.group,seat:st.seat||0,tune:st.pending.tune,reverb:st.pending.reverb,judge:st.judge});if(!r.ok){const j=await r.json().catch(()=>({}));if(j.error){$('submit-state').textContent=j.error;$('submit').disabled=false;return;}throw new Error(r.status);}
  $('submit-state').textContent='교탁에 보냈어요 · 선생님이 들어 보고 적용하면 우리 모둠 소리가 바뀌어요';}
 catch(e){$('submit-state').textContent='보내지 못했어요 · 다시 눌러 보거나 선생님께 말해요';$('submit').disabled=false;}}
function checkPii(){const bad=PII.test($('own').value);const e=$('pii');e.hidden=!bad;e.textContent=bad?'개인정보처럼 보이는 말이 있어요(이름·학교·반·번호 등). 지우고 써요.':'';}
function bind(){document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.req){st.chosen=REQUESTS.find(r=>r.id===b.dataset.req);$('own').value='';renderReqs();paintNow();invalidate();checkPii();}
  else if(b.dataset.ex){const x=EX.find(v=>v.id===b.dataset.ex);if(x){const m=REQUESTS.find(r=>r.text===x.request);if(m){st.chosen=m;$('own').value='';renderReqs();paintNow();}/* 예시를 고르면 부탁도 그 예시의 부탁으로(2차 N06) */$('answer').value=x.answer;$('ex-source').textContent='부탁: '+x.request+' · 미리 받아 둔 AI 답('+x.got+' 받음)';render(check(x.answer));}}
  else if(b.id==='copy'){if(PII.test($('own').value)){$('copy-state').textContent='개인정보처럼 보이는 말이 있어요. 지우고 복사해요';return;}$('card').value=card();try{await navigator.clipboard.writeText($('card').value);$('copy-state').textContent='복사했어요. 학교 계정 AI 화면에 붙여 넣어요';}catch(err){$('card').select();$('copy-state').textContent='글을 길게 눌러 ‘복사’를 골라요';}}
  else if(b.id==='check')render(check($('answer').value));
  else if(b.id==='clear'){$('answer').value='';$('result').replaceChildren();st.pending=null;$('after').disabled=true;$('submit').disabled=true;}
  else if(b.id==='before')phrase(P.Tune.cents,'지금 소리:');
  else if(b.id==='after'&&st.pending){phrase(st.pending.tune,'바꾼 소리:').then(()=>gate());}
  else if(b.dataset.judge){st.judge=b.dataset.judge;gate();}
  else if(b.id==='clear-all'){$('own').value='';$('answer').value='';st.chosen=REQUESTS[0];renderReqs();paintNow();invalidate();$('result').replaceChildren();checkPii();}
  else if(b.id==='stop'){stopPlay();$('listen-state').textContent='';}
  else if(b.id==='submit')submit();});
 $('own').addEventListener('input',()=>{renderReqs();paintNow();invalidate();checkPii();});
 $('answer').addEventListener('input',invalidate);
 $('seat').addEventListener('change',e=>{st.seat=+e.target.value;P.Store.set('gugak-seat',st.seat);});
 $('group').addEventListener('change',e=>{st.group=+e.target.value;P.Store.set('gugak-group',st.group);gate();});}
document.addEventListener('DOMContentLoaded',async()=>{const CL=P.classCode();if(P.NR){$('submit').textContent='우리 태블릿에 적용(이 기기만)';}fill($('seat'),41,st.seat,'자리 번호');fill($('group'),(CL.groups||8)+1,st.group,'모둠');renderReqs();renderExamples();bind();paintNow();if(EASY)$('card-box').open=false;
 window.GugakTune={st,check,card,summary};
 if(C){C.on_('tune',()=>{paintNow();invalidate();});/* 교탁이 지금 조율을 바꾸면 다시 검사(2차 N06) */C.setPage('tune','gayageum');st.server=await C.start();st.ready=true;}});
})();
