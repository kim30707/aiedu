/* v0.11(2026-11-05, Claude) G2 「나만의 디지털 가야금」 화면 — 내 악기 만들기·저장·발표.
 * 소리를 바꾸는 규칙은 app.js(setKit·kitRoute·engine.setReverb)에 있고, 이 파일은 고르는 화면만 그린다.
 * - 보기(프리셋)에서만 고른다: 낮은 줄(1~6현) 가야금·아쟁 / 높은 줄(7~12현) 가야금·해금 / 울림 없음·조금·많이.
 *   강사 의견(11/4 녹음 32:19 "전통 틀을 벗어나면 안 된다", 33:19 "'아무거나'는 안 된다")에 따라 자유 입력·AI 자동 변경이 없다.
 * - 저장은 이 기기 localStorage('gugak-my-instruments-v011')에만. 서버·외부 전송 없음. 학생 이름은 받지 않고 악기 이름(12자)만.
 * - 발표 코드 3글자(낮은 줄 G/A · 높은 줄 G/H · 울림 0/1/2, 예: AH1)를 다른 태블릿의 ‘코드로 열기’나 주소 #kit-AH1에 넣으면 같은 소리가 된다. 코드에 이름은 들어가지 않는다.
 * - AI 의견 문장은 복사만 한다(앱 안에 AI 연결 없음). 규칙으로 움직이는 기능을 AI라고 부르지 않는다.
 * v0.12(2026-11-05, Claude): 조율(state.kit.tune, 12줄 cent)을 저장 목록에 함께 넣고 연다. '기본 가야금으로'·'코드로 열기'는 조율도 기본으로 되돌린다(3글자 코드에 조율이 없으므로).
 *   조율을 AI에게 부탁하고 붙여 넣는 화면은 my-tuning.js(대표 결정 2026-11-05 20:3x '설정 붙여넣기'). 붙여 넣은 답은 앱이 검사하고 학생이 '적용'을 눌러야 바뀐다.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id),app=()=>window.gugakApp,STORE='gugak-my-instruments-v011',MAX=12;
const NAME_IDEAS=['바닷가 가야금','산 가야금','절 가야금','넓은 홀 가야금'];
let presenting=false,lastFocus=null,pendingDelete=null;
function toast(t){const e=$('toast');if(!e)return;e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2600);}
function list(){try{const v=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(v)?v.filter(x=>x&&typeof x.name==='string'&&app().parseKitCode(x.code)).slice(0,MAX):[];}catch{return[];}}
function store(rows){try{localStorage.setItem(STORE,JSON.stringify(rows.slice(0,MAX)));return true;}catch{return false;}}
function kit(){return app().state.kit;}
function short(id){return app().kitOptions.short[id]||id;}
function summaryOf(code,tune){const k=app().parseKitCode(code);return k?app().kitSummary({...k,name:'',tune:app().cleanTune(tune)||Array(12).fill(0)}):'';}
function seg(part,options,labels){return `<div class="seg kit-seg" role="group" aria-label="${part==='low'?'낮은 줄 소리':part==='high'?'높은 줄 소리':'울림'}" data-kit-part="${part}">${options.map((v,i)=>`<button type="button" data-kit-value="${v}">${labels[i]}</button>`).join('')}</div>`;}
function build(){
 const meta=document.querySelector('#view-play .play-meta');if(!meta||$('kit-open'))return;
 const open=document.createElement('button');open.type='button';open.id='kit-open';open.className='kit-button';open.setAttribute('aria-haspopup','dialog');open.setAttribute('aria-controls','kit-sheet');open.innerHTML='<span aria-hidden="true">🎛</span> <span id="kit-open-label">내 악기</span>';meta.prepend(open);
 const banner=document.createElement('div');banner.id='kit-banner';banner.className='kit-banner';banner.hidden=true;banner.setAttribute('role','status');banner.innerHTML='<div class="kit-banner-text"><small id="kit-banner-kicker">내 악기</small><strong id="kit-banner-name"></strong><span id="kit-banner-sum"></span></div><div class="kit-banner-actions"><button type="button" id="kit-banner-edit" class="kit-soft">바꾸기</button><button type="button" id="kit-banner-end">발표 끝</button></div>';
 document.querySelector('#view-play .play-heading > div')?.append(banner);
 const o=app().kitOptions;
 const sheet=document.createElement('div');sheet.id='kit-sheet';sheet.className='sheet-backdrop';sheet.hidden=true;
 sheet.innerHTML=`<section class="sheet kit-sheet" role="dialog" aria-modal="true" aria-labelledby="kit-title">
 <div class="kit-head"><div><p class="eyebrow">나만의 디지털 가야금</p><h2 id="kit-title">내 악기 만들기</h2></div><button type="button" id="kit-close" class="icon-button" aria-label="닫기">×</button></div>
 <p class="kit-rule">보기에서 골라요. 고른 대로 앱이 소리를 바꾸는 <b>설정</b>이에요(AI 아님). 가야금 12줄과 치는 방법은 그대로이고 소리만 바뀌어요.</p>
 <div class="kit-part"><h3>낮은 줄 <small>1~6현</small></h3>${seg('low',o.low,o.low.map(short))}<p class="kit-hint">아쟁은 낮은 소리를 내는 현악기예요. 낮은 줄에만 둘 수 있어요.</p></div>
 <div class="kit-part"><h3>높은 줄 <small>7~12현</small></h3>${seg('high',o.high,o.high.map(short))}<p class="kit-hint">해금은 높은 소리를 내는 현악기예요. 높은 줄에만 둘 수 있어요.</p></div>
 <div class="kit-part"><h3>울림 <small>공간에 퍼지는 느낌</small></h3>${seg('reverb',[0,1,2],o.reverb)}<p class="kit-hint">바닷가·산·절·넓은 홀을 떠올리며 골라요. 기기에서 만든 울림이에요.</p></div>
 <div class="kit-part kit-name"><h3><label for="kit-name">악기 이름</label> <small>악기 이름만 · 내 이름·친구 이름은 쓰지 않아요</small></h3><input id="kit-name" type="text" maxlength="12" autocomplete="off" placeholder="예: 바닷가 가야금"><div class="kit-ideas" role="group" aria-label="이름 보기">${NAME_IDEAS.map(n=>`<button type="button" class="kit-chip" data-kit-name="${n}">${n}</button>`).join('')}</div></div>
 <p class="kit-code-row">발표 코드 <b id="kit-code">GG0</b> <span>다른 태블릿의 ‘코드로 열기’에 넣으면 같은 소리가 돼요.</span></p>
 <div class="sheet-actions"><button type="button" id="kit-try" class="song-main">이 소리로 쳐 보기</button><button type="button" id="kit-save">이 기기에 저장</button><button type="button" id="kit-present">발표하기</button><button type="button" id="kit-default" class="kit-soft">기본 가야금으로</button></div>
 <div class="kit-saved"><h3>저장한 내 악기 <small id="kit-count"></small></h3><p class="kit-hint">이 기기 안에만 저장돼요. 서버나 다른 곳으로 보내지 않아요.</p><ul id="kit-list" class="kit-list"></ul></div>
 <div class="kit-open-code"><label for="kit-code-input">코드로 열기</label><input id="kit-code-input" type="text" maxlength="3" autocomplete="off" autocapitalize="characters" placeholder="예: AH1"><button type="button" id="kit-code-open">열기</button></div>
 <details class="kit-ai"><summary>AI에게 의견 물어보는 문장 (복사만)</summary><p class="kit-hint">앱은 AI에 연결되어 있지 않아요. 문장을 복사해 AI에게 물어보고, 답은 ‘의견’으로 읽어요. 고르는 것은 우리예요.</p><textarea id="kit-prompt" rows="9" readonly aria-label="AI에게 물어보는 문장"></textarea><button type="button" id="kit-prompt-copy" class="kit-soft">문장 복사</button></details>
 <p class="kit-status" id="kit-status" aria-live="polite"></p>
 </section>`;
 document.body.append(sheet);
 open.addEventListener('click',openSheet);$('kit-close').addEventListener('click',closeSheet);sheet.addEventListener('click',e=>{if(e.target===sheet)closeSheet();});
 sheet.addEventListener('click',onSheetClick);
 $('kit-name').addEventListener('input',()=>{app().setKit({name:$('kit-name').value},{quiet:true});});
 $('kit-code-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openCode();}});
 $('kit-banner-end').addEventListener('click',()=>present(false));$('kit-banner-edit').addEventListener('click',openSheet);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden)closeSheet();});
 window.addEventListener('gugak:kit',paint);window.addEventListener('gugak:scene',paint);
 paint();
}
function onSheetClick(e){const b=e.target.closest('button');if(!b||b.disabled)return;const part=b.closest('[data-kit-part]')?.dataset.kitPart;
 if(part){const v=b.dataset.kitValue;app().setKit({[part]:part==='reverb'?Number(v):v});ensureGayageum(false);status(app().kitSummary());return;}
 if(b.dataset.kitName){$('kit-name').value=b.dataset.kitName;app().setKit({name:b.dataset.kitName},{quiet:true});status('이름: '+b.dataset.kitName);return;}
 if(b.dataset.kitOpen){openSaved(b.dataset.kitOpen,false);return;}
 if(b.dataset.kitShow){openSaved(b.dataset.kitShow,true);return;}
 if(b.dataset.kitDelete){remove(b.dataset.kitDelete,b);return;}
 switch(b.id){case'kit-try':ensureGayageum(true);closeSheet();toast('가야금 줄을 뜯어 보세요 · '+app().kitSummary());break;case'kit-save':save();break;case'kit-present':ensureGayageum(true);closeSheet();present(true);break;case'kit-default':app().setKit({low:'gayageum',high:'gayageum',reverb:0,tune:Array(12).fill(0)});status('기본 가야금 소리로 돌아왔어요.');break;case'kit-code-open':openCode();break;case'kit-prompt-copy':copyPrompt();break;}}
function ensureGayageum(force){const a=app();if(a.state.instrument!=='gayageum'&&(force||a.kitActive()))a.selectInstrument('gayageum');if(force&&a.state.view!=='play')a.setView('play');}
function status(t){const e=$('kit-status');if(e)e.textContent=t;}
function openSheet(){pendingDelete=null;lastFocus=document.activeElement;paint();$('kit-sheet').hidden=false;$('kit-close').focus();}
function closeSheet(){$('kit-sheet').hidden=true;lastFocus?.focus?.();}
function save(){const a=app(),name=a.state.kit.name||nextName(),code=a.kitCode();a.setKit({name},{quiet:true});$('kit-name').value=name;const rows=list().filter(r=>r.name!==name);if(rows.length>=MAX){status('저장은 '+MAX+'개까지예요. 쓰지 않는 악기를 지운 뒤 저장하세요.');return;}rows.unshift({id:Date.now().toString(36),name,code,tune:(a.state.kit.tune||[]).slice(),savedAt:new Date().toISOString().slice(0,10)});if(!store(rows)){status('이 기기에 저장할 수 없어요. 발표 코드 '+code+'를 적어 두세요.');return;}renderList();status('‘'+name+'’을(를) 이 기기에 저장했어요 · 발표 코드 '+code);}
function nextName(){const used=new Set(list().map(r=>r.name));for(let i=1;i<=MAX+1;i++){const n='내 가야금 '+i;if(!used.has(n))return n;}return'내 가야금';}
function openSaved(id,show){const r=list().find(x=>x.id===id);if(!r)return;app().setKitCode(r.code,{name:r.name});app().setKit({tune:app().cleanTune(r.tune)||Array(12).fill(0)},{quiet:true});ensureGayageum(true);closeSheet();if(show)present(true);else toast('‘'+r.name+'’ 소리로 바꿨어요 · '+summaryOf(r.code,r.tune));}
function remove(id,b){if(pendingDelete!==id){pendingDelete=id;b.textContent='한 번 더 누르면 지워요';return;}pendingDelete=null;store(list().filter(x=>x.id!==id));renderList();status('이 기기에서 지웠어요.');}
function openCode(){const v=$('kit-code-input').value.trim().toUpperCase(),a=app();if(!a.parseKitCode(v)){status('코드는 세 글자예요. 예: AH1 (낮은 줄 G·A, 높은 줄 G·H, 울림 0·1·2)');return;}a.setKitCode(v,{name:''});a.setKit({tune:Array(12).fill(0)},{quiet:true});$('kit-name').value='';status('코드 '+v+' · '+a.kitSummary());$('kit-code-input').value='';}
function prompt(){const a=app(),k=a.state.kit,o=a.kitOptions,who=a.state.grade==='middle'?'중학생':'초등학생';return['우리는 '+who+'이고, 국악 웹악기에서 ‘나만의 디지털 가야금’을 만들고 있어요.','앱에서 고를 수 있는 것은 이것뿐이에요.','- 낮은 줄(1~6현): '+o.low.map(short).join(' / '),'- 높은 줄(7~12현): '+o.high.map(short).join(' / '),'- 울림: '+o.reverb.join(' / '),'지금 고른 것: 낮은 줄 '+short(k.low)+', 높은 줄 '+short(k.high)+', 울림 '+o.reverb[k.reverb],'악기 이름: '+(k.name||'(아직 없음)'),'이 조합이 아리랑을 치기에 어울리는지 한 줄로 의견을 주세요.','바꾸면 좋을 것이 있으면 위 보기 안에서 한 가지만 추천하고, 왜 그런지 한 줄로 알려 주세요.','정답이 아니라 의견으로요. 우리 이름이나 학교는 묻지 말아 주세요.'].join('\n');}
async function copyPrompt(){const t=$('kit-prompt');t.value=prompt();try{await navigator.clipboard.writeText(t.value);status('문장을 복사했어요. 앱이 AI에 보내지 않아요.');}catch{t.focus();t.select();status('자동 복사가 막혀서 글을 선택했어요. 길게 눌러 복사하세요.');}}
function present(on){presenting=!!on;document.body.classList.toggle('kit-presenting',presenting);paint();if(presenting){window.scrollTo({top:0,behavior:'instant'});toast('발표 중 · 가야금으로 아리랑 한 마디를 쳐 보세요');}}
function renderList(){const ul=$('kit-list');if(!ul)return;const rows=list();ul.replaceChildren();$('kit-count').textContent=rows.length?rows.length+'개 · 최대 '+MAX+'개':'아직 없어요';for(const r of rows){const li=document.createElement('li');const text=document.createElement('div');text.className='kit-item-text';const n=document.createElement('strong');n.textContent=r.name;const s=document.createElement('small');s.textContent=summaryOf(r.code,r.tune)+' · 코드 '+r.code;text.append(n,s);const act=document.createElement('div');act.className='kit-item-actions';for(const [label,attr,cls] of [['열기','kitOpen',''],['발표','kitShow',''],['지우기','kitDelete','kit-soft']]){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset[attr]=r.id;if(cls)b.className=cls;act.append(b);}li.append(text,act);ul.append(li);}}
function paint(){const a=app();if(!a||!$('kit-open'))return;const k=a.state.kit,active=a.kitActive(),code=a.kitCode();
 document.querySelectorAll('[data-kit-part]').forEach(g=>{const part=g.dataset.kitPart;g.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(String(k[part])===b.dataset.kitValue)));});
 if($('kit-name')&&document.activeElement!==$('kit-name'))$('kit-name').value=k.name||'';
 $('kit-code').textContent=code;$('kit-open-label').textContent=active?(k.name||'내 악기')+' · '+code:'내 악기';$('kit-open').classList.toggle('on',active);
 $('kit-open').setAttribute('aria-label','내 악기 만들기'+(active?' · 지금 '+a.kitSummary():''));
 if($('kit-prompt'))$('kit-prompt').value=prompt();renderList();
 const banner=$('kit-banner'),show=presenting||(active&&a.state.instrument==='gayageum');banner.hidden=!show;banner.classList.toggle('presenting',presenting);
 $('kit-banner-kicker').textContent=presenting?'오늘 발표하는 악기':'내 악기 · 고른 설정';$('kit-banner-name').textContent=k.name||(active?'이름 없는 내 악기':'기본 가야금');$('kit-banner-sum').textContent=a.kitSummary()+' · 코드 '+code;$('kit-banner-end').hidden=!presenting;}
function boot(){if(!app()){setTimeout(boot,50);return;}build();}
window.GugakKitUI={open:openSheet,close:closeSheet,present,isPresenting:()=>presenting,list,prompt,paint};
boot();
})();
