/* v0.12(2026-11-05, Claude) G1 「우리 모둠 가야금 조율」 — AI에게 조율을 부탁하고, 받은 '조율 설정'을 붙여 넣어 검사·듣기·적용.
 * 흐름: ① 부탁 고르기 → ② 부탁 카드 복사(학교 계정 AI에 붙여 넣기) → ③ AI 답 붙여 넣기 → ④ 앱이 검사하고, 바꾸기 전·후를 들어 본 뒤 학생이 '적용'.
 * - 앱은 AI에 연결되지 않는다. 카드는 복사만 하고, 답은 학생이 붙여 넣는다. 붙여 넣은 글은 저장하지 않는다(적용한 cent 숫자만 이 기기에 저장, app.js saveKit).
 * - 검사(check): JSON 하나, 줄 12개, 줄 이름 그대로(1현~12현), hz는 기본 높이에서 ±TUNE_MAX cent 안, 울림은 0·1·2. 하나라도 어기면 적용할 수 없다.
 *   음 이름과 hz가 서로 맞지 않으면 '확인' 표시(적용은 가능, 귀로 확인). 앱에 없는 항목은 쓰지 않고 알려 준다.
 * - 2026-11-05 시험(…194633_국악_학생용기본악기코드_악기시험대_AI조율요청시험): 큰 AI는 같은 형식에서 4/4, 작은 AI는 음 이름만 맞고 hz가 틀리거나 친구 이름을 넣었다 → 검사와 귀 확인이 필요.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id),app=()=>window.gugakApp;
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const REVERB_WORD=['없음','조금','많이'];
const REQUESTS=[
 {id:'up',label:'노래하기 편하게 한 음 높이기',text:'노래하기 편하게 모든 줄을 한 음(온음) 높여 주세요.'},
 {id:'down',label:'모든 줄 반음 낮추기',text:'모든 줄을 반음 낮춰 주세요.'},
 {id:'fine',label:'5현만 조금 올리기',text:'5현이 조금 낮게 들려요. 5현만 10 cent 올려 주세요.'},
 {id:'room',label:'넓은 곳처럼 울리게',text:'넓은 홀에서 연주하는 것처럼 울림을 많이 해 주세요. 줄 높이는 그대로 두세요.'},
 {id:'reset',label:'처음 높이로 되돌리기',text:'모든 줄을 기본 높이로 되돌려 주세요.'}
];
// 미리 받아 둔 예시 답: 이 앱의 부탁 카드를 그대로 AI에게 넣고 받은 답(2026-11-05). AI 없이 할 때·틀린 답 찾기 활동에 쓴다.
const EXAMPLES=window.GugakTuneExamples||[];
const ARIRANG=[[4,5],[5,1],[4,2],[5,1],[6,5],[7,1],[6,2],[7,1],[8,3],[7,1],[8,1],[7,1],[6,2],[5,1],[4,5],[5,1],[4,1],[5,1]],BEAT=.28;
let chosen=REQUESTS[0],pending=null,timers=[],exampleSource='';

function midis(){return app().tuneOptions.midis;}
function max(){return app().tuneOptions.max;}
function baseHz(k){return 440*Math.pow(2,(midis()[k]-69)/12);}
function hzOf(k,c){return baseHz(k)*Math.pow(2,c/1200);}
function noteOf(hz){const m=Math.round(69+12*Math.log2(hz/440));return NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1);}
function normNote(n){return String(n??'').trim().replace('♯','#').replace(/^([A-Ga-g])b(\d)$/,(x,l,o)=>{const i=NAMES.indexOf(l.toUpperCase());return NAMES[(i+11)%12]+(l.toUpperCase()==='C'?o-1:o);}).replace(/^([a-g])/,x=>x.toUpperCase());}
function sign(v){return (v>0?'+':'')+v;}
function current(){const a=app(),t=a.state.kit.tune||Array(12).fill(0);return{strings:t.map((c,k)=>({name:(k+1)+'현',note:noteOf(hzOf(k,c)),hz:+hzOf(k,c).toFixed(2)})),reverb:a.state.kit.reverb};}

function card(){const a=app(),who=a.state.grade==='middle'?'중학생':'초등학생',base=midis().map((m,k)=>(k+1)+'현 '+baseHz(k).toFixed(2)).join(', ');
 return['우리는 '+who+'이고, 국악 웹악기에서 가야금 12줄의 높이를 조율하고 있어요.',
 '아래 ‘지금 설정’을 우리 부탁대로 바꾼 새 설정을 JSON 하나로만 답해 주세요. JSON 밖에는 아무것도 쓰지 마세요.',
 '지킬 것:',
 '- strings는 12개 그대로 두고 name은 바꾸지 마세요. 바꿀 수 있는 것은 note(음 이름)와 hz(높이)뿐이에요.',
 '- hz는 기본 높이에서 위아래 '+max()+' cent(반음 '+(max()/100)+'개) 안에서만 바꿔요. 기본 높이(hz): '+base,
 '- reverb(울림)는 0(없음)·1(조금)·2(많이) 가운데 하나예요. 부탁이 없으면 그대로 두세요.',
 '- reason에는 무엇을 왜 바꿨는지 초등학생이 알 수 있게 한두 문장으로 써 주세요.',
 '- 이름·학교 같은 개인정보는 쓰지 마세요. 부탁이 조율·소리와 관계없으면 설정을 그대로 두고 reason에 까닭을 써 주세요.',
 '형식: {"strings":[{"name":"1현","note":"G2","hz":98.0}, …12개], "reverb":0, "reason":"…"}',
 '지금 설정:',JSON.stringify(current()),
 '우리 부탁: '+chosen.text].join('\n');}

// 검사: 학생이 붙여 넣은 글 → {ok, problems[], checks[], tune[], reverb, reason, rows[]}
function check(text){
 const out={ok:false,problems:[],checks:[],tune:null,reverb:null,reason:'',rows:[]};
 let t=String(text||'').trim();
 if(!t){out.problems.push('붙여 넣은 답이 없어요.');return out;}
 const fence=t.match(/```(?:json|JSON)?\s*\n?([\s\S]*?)```/);if(fence)t=fence[1].trim();
 let j=null;try{j=JSON.parse(t);}catch{const m=t.match(/\{[\s\S]*\}/);if(m){try{j=JSON.parse(m[0]);}catch{}}}
 if(!j||typeof j!=='object'||Array.isArray(j)){out.problems.push('설정(JSON) 모양이 아니에요. AI 답에서 { 로 시작해 } 로 끝나는 부분을 붙여 넣어요.');return out;}
 const s=j.strings;
 if(!Array.isArray(s)){out.problems.push('줄 정보(strings)가 없어요.');return out;}
 if(s.length!==12)out.problems.push('줄이 '+s.length+'개예요. 가야금은 12줄이에요.');
 const tune=[],lim=max();
 s.slice(0,12).forEach((x,k)=>{
  const want=(k+1)+'현',name=String(x?.name??'').replace(/\s+/g,'');
  if(name!==want)out.problems.push(want+'의 이름이 ‘'+String(x?.name??'').slice(0,20)+'’(으)로 바뀌었어요. 줄 이름은 바꾸지 않아요.');
  const hz=Number(x?.hz);
  if(!Number.isFinite(hz)||hz<=0){out.problems.push(want+'의 높이(hz)가 숫자가 아니에요.');tune.push(0);return;}
  const c=Math.round(1200*Math.log2(hz/baseHz(k)));
  if(Math.abs(c)>lim)out.problems.push(want+'이(가) 기본 높이에서 '+sign(c)+' cent 바뀌었어요. '+lim+' cent까지만 바꿀 수 있어요.');
  const near=noteOf(hz),given=normNote(x?.note);
  if(given&&given!==near)out.checks.push(want+': 음 이름은 '+given+'인데 높이는 '+near+'에 가까워요. 귀로 확인해요.');
  tune.push(c);
  out.rows.push({k,name:want,beforeC:(app().state.kit.tune||[])[k]||0,afterC:c,note:given||near,near,hz});
 });
 if(j.reverb!==undefined){const r=Number(j.reverb);if([0,1,2].includes(r))out.reverb=r;else out.problems.push('울림(reverb)은 0·1·2 가운데 하나여야 해요.');}
 const extra=Object.keys(j).filter(k=>!['strings','reverb','reason'].includes(k));
 if(extra.length)out.checks.push('앱에 없는 설정('+extra.join(', ').slice(0,40)+')은 쓰지 않아요.');
 out.reason=typeof j.reason==='string'?j.reason.slice(0,240):'';
 if(!out.problems.length&&tune.length===12){out.ok=true;out.tune=tune;}
 return out;}

// 미리 듣기: 그 음에만 조율 값(tuneCents)을 넘긴다. 앱의 조율 상태는 바꾸지 않아서, 듣는 동안 학생이 줄을 뜯어도 지금 조율로 난다.
function stopPreview(){timers.forEach(clearTimeout);timers=[];}
function note(k,tune){const a=app();return a.play(a.groupOfString(k),{instrument:'gayageum',sustain:false,gestureGain:1,tuneCents:tune[k]||0}).catch(()=>{});}
function playPhrase(tune,label){
 stopPreview();let t=0;
 for(const [num,len] of ARIRANG){timers.push(setTimeout(()=>note(num-1,tune),t*1000));t+=len*BEAT;}
 timers.push(setTimeout(()=>status(label+' 아리랑 첫 줄을 다 들었어요.'),t*1000+200));
 status(label+' 아리랑 첫 줄을 들려줘요…');}
function playOne(k,tune){stopPreview();note(k,tune);}

function status(t){const e=$('tune-status');if(e)e.textContent=t;}
function paintNow(){const a=app();if(!$('tune-now'))return;$('tune-now').textContent='지금: '+a.tuneSummary(a.state.kit.tune)+' · 울림 '+REVERB_WORD[a.state.kit.reverb];$('tune-card').value=card();
 document.querySelectorAll('[data-tune-req]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tuneReq===chosen.id)));}

function render(r){
 const box=$('tune-result');box.replaceChildren();box.hidden=false;pending=r.ok?r:null;
 const head=document.createElement('p');head.className='tune-verdict '+(r.ok?'ok':'bad');
 head.textContent=r.ok?(r.checks.length?'검사 통과 · 확인할 것이 있어요':'검사 통과'):'적용할 수 없어요';box.append(head);
 const ul=document.createElement('ul');ul.className='tune-notes';
 for(const p of r.problems){const li=document.createElement('li');li.className='bad';li.textContent=p;ul.append(li);}
 for(const c of r.checks){const li=document.createElement('li');li.className='warn';li.textContent=c;ul.append(li);}
 if(ul.children.length)box.append(ul);
 if(exampleSource){const w=document.createElement('p');w.className='kit-hint tune-source';w.textContent='누가 쓴 답: '+exampleSource;box.append(w);}
 if(r.reason){const q=document.createElement('p');q.className='tune-reason';const b=document.createElement('b');b.textContent='AI가 쓴 이유(의견): ';const sp=document.createElement('span');sp.textContent=r.reason;q.append(b,sp);box.append(q);}
 if(r.ok){
  const changed=r.rows.filter(x=>x.afterC!==x.beforeC);
  const tbl=document.createElement('table');tbl.className='tune-table';tbl.innerHTML='<thead><tr><th>줄</th><th>지금</th><th>바꾼 뒤</th><th>음 이름</th><th>들어 보기</th></tr></thead>';
  const tb=document.createElement('tbody');
  for(const x of r.rows){const tr=document.createElement('tr');if(x.afterC!==x.beforeC)tr.className='changed';
   for(const v of [x.name,sign(x.beforeC)+' cent',sign(x.afterC)+' cent',x.note+(x.note!==x.near?' (높이는 '+x.near+')':'')]){const td=document.createElement('td');td.textContent=v;tr.append(td);}
   const td=document.createElement('td');const b1=document.createElement('button');b1.type='button';b1.className='kit-soft tune-mini';b1.textContent='지금';b1.dataset.tuneOne='before:'+x.k;const b2=b1.cloneNode();b2.textContent='바꾼 뒤';b2.dataset.tuneOne='after:'+x.k;td.append(b1,b2);tr.append(td);tb.append(tr);}
  tbl.append(tb);
  const sum=document.createElement('p');sum.className='kit-hint';sum.textContent=changed.length?'바뀌는 줄 '+changed.length+'개 · '+app().tuneSummary(r.tune)+(r.reverb!==null?' · 울림 '+REVERB_WORD[r.reverb]:''):'줄 높이는 그대로예요'+(r.reverb!==null&&r.reverb!==app().state.kit.reverb?' · 울림 '+REVERB_WORD[r.reverb]+'(으)로':'')+'.';
  box.append(sum,tbl);
 }
 $('tune-before').disabled=false;$('tune-after').disabled=!r.ok;$('tune-apply').disabled=!r.ok;
 status(r.ok?'바꾸기 전·후를 들어 보고, 우리 부탁대로 바뀌었는지 확인한 뒤 적용해요.':'AI에게 이 까닭을 알려 주고 다시 부탁해 보세요.');}

function apply(){if(!pending)return;const a=app(),patch={tune:pending.tune};if(pending.reverb!==null)patch.reverb=pending.reverb;stopPreview();
 if(!a.setKit(patch,{quiet:true})){status('적용하지 못했어요. 다시 검사해 주세요.');return;}
 if(a.state.instrument!=='gayageum')a.selectInstrument('gayageum');
 status('적용했어요 · '+a.tuneSummary(a.state.kit.tune)+' · 울림 '+REVERB_WORD[a.state.kit.reverb]+'. 가야금을 쳐 보세요.');pending=null;$('tune-apply').disabled=true;$('tune-after').disabled=true;paintNow();}
function reset(){const a=app();stopPreview();a.setKit({tune:Array(12).fill(0)},{quiet:true});status('조율을 기본 높이로 되돌렸어요.');paintNow();}
async function copyCard(){const t=$('tune-card');t.value=card();try{await navigator.clipboard.writeText(t.value);status('부탁 카드를 복사했어요. 학교 계정 AI 화면에 붙여 넣어요. 앱이 AI에 보내지 않아요.');}catch{$('tune-card-box').open=true;t.focus();t.select();status('자동 복사가 막혀서 카드 글을 선택했어요. 길게 눌러 복사하세요.');}}

function build(){
 const sheet=document.querySelector('#kit-sheet .kit-sheet');if(!sheet||$('tune-box'))return;
 const box=document.createElement('details');box.id='tune-box';box.className='kit-part kit-tune';
 box.innerHTML=`<summary><span class="tune-title">조율</span> <small>AI에게 부탁하고, 받은 조율 설정을 붙여 넣어요</small></summary>
 <p class="kit-hint" id="tune-now"></p>
 <ol class="tune-steps">
 <li><b>① 부탁 고르기</b><div class="kit-ideas" role="group" aria-label="부탁 보기">${REQUESTS.map(r=>`<button type="button" class="kit-chip" data-tune-req="${r.id}">${r.label}</button>`).join('')}</div><p class="kit-hint">다른 부탁은 AI 화면에서 카드 끝의 ‘우리 부탁’을 고쳐 써요. 이름·학교는 쓰지 않아요.</p></li>
 <li><b>② 부탁 카드 복사</b> → 학교 계정 AI 화면에 붙여 넣기<div class="tune-row"><button type="button" id="tune-card-copy" class="song-main">부탁 카드 복사</button></div><details id="tune-card-box" class="tune-card-box"><summary>카드 글 보기</summary><textarea id="tune-card" rows="8" readonly aria-label="AI에게 보낼 부탁 카드"></textarea></details></li>
 <li><b>③ AI 답 붙여 넣기</b><textarea id="tune-answer" rows="5" autocomplete="off" spellcheck="false" placeholder="AI가 준 답(조율 설정)을 그대로 붙여 넣어요" aria-label="AI 답 붙여 넣기"></textarea><div class="tune-row"><button type="button" id="tune-check" class="song-main">검사하기</button><button type="button" id="tune-clear" class="kit-soft">지우기</button></div></li>
 <li><b>④ 듣고 고르기</b><div id="tune-result" class="tune-result" hidden></div><div class="tune-row"><button type="button" id="tune-before" class="kit-soft">지금 소리로 아리랑</button><button type="button" id="tune-after" class="kit-soft" disabled>바꾼 뒤 소리로 아리랑</button><button type="button" id="tune-apply" disabled>적용하기</button></div></li>
 </ol>
 <div class="tune-row"><button type="button" id="tune-reset" class="kit-soft">조율 처음으로</button></div>
 <details class="tune-examples"><summary>미리 받아 둔 예시 답 · AI 없이 해 볼 때</summary><p class="kit-hint">이 앱의 부탁 카드를 AI에게 넣고 미리 받아 둔 답이에요. 맞은 답도, 틀린 답도 있어요. 붙여 넣고 검사해서 어느 답이 부탁대로인지 찾아봐요.</p><div class="kit-ideas" id="tune-example-list"></div></details>
 <p class="kit-hint">조율은 3글자 발표 코드에 들어가지 않아요. 다른 태블릿에서는 같은 조율 설정을 붙여 넣어요. 붙여 넣은 글은 저장하지 않아요.</p>
 <p class="kit-status" id="tune-status" aria-live="polite"></p>`;
 const anchor=sheet.querySelector('.kit-code-row');sheet.insertBefore(box,anchor);
 const exl=$('tune-example-list');
 for(const ex of EXAMPLES){const b=document.createElement('button');b.type='button';b.className='kit-chip';b.textContent=ex.label;b.dataset.tuneEx=ex.id;exl.append(b);}
 if(!EXAMPLES.length)box.querySelector('.tune-examples').hidden=true;
 box.addEventListener('click',onClick);$('tune-answer').addEventListener('input',()=>{exampleSource='';});box.addEventListener('toggle',()=>{if(box.open)paintNow();else stopPreview();});
 window.addEventListener('gugak:kit',paintNow);
 paintNow();
 if(/(^#|\.)tune(\.|$)/.test(location.hash))openTune();}
function onClick(e){const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.tuneReq){chosen=REQUESTS.find(r=>r.id===b.dataset.tuneReq)||REQUESTS[0];paintNow();status('부탁: '+chosen.label+' → ② 카드를 복사해요.');return;}
 if(b.dataset.tuneEx){const ex=EXAMPLES.find(x=>x.id===b.dataset.tuneEx);if(ex){$('tune-answer').value=ex.answer;exampleSource=ex.source;$('tune-result').hidden=true;pending=null;$('tune-apply').disabled=true;$('tune-after').disabled=true;status('예시 답을 붙여 넣었어요 · '+ex.label+' · 부탁: '+ex.request+' → 검사하기');}return;}
 if(b.dataset.tuneOne){const [w,k]=b.dataset.tuneOne.split(':');const r=pending;if(!r&&w==='after')return;playOne(Number(k),w==='after'?r.tune:(app().state.kit.tune||Array(12).fill(0)));return;}
 switch(b.id){case'tune-card-copy':copyCard();break;case'tune-check':stopPreview();render(check($('tune-answer').value));break;case'tune-clear':$('tune-answer').value='';exampleSource='';$('tune-result').hidden=true;pending=null;$('tune-apply').disabled=true;$('tune-after').disabled=true;status('');break;
  case'tune-before':playPhrase(app().state.kit.tune||Array(12).fill(0),'지금 소리로');break;case'tune-after':if(pending)playPhrase(pending.tune,'바꾼 뒤 소리로');break;case'tune-apply':apply();break;case'tune-reset':reset();break;}}
function openTune(){window.GugakKitUI?.open?.();const box=$('tune-box');if(box){box.open=true;paintNow();box.scrollIntoView({block:'start'});}}
function boot(){if(!app()||!document.querySelector('#kit-sheet .kit-sheet')){setTimeout(boot,60);return;}build();}
window.GugakTune={check,card,current,open:openTune,stop:stopPreview,requests:REQUESTS.map(r=>({...r})),examples:EXAMPLES};
boot();
})();
