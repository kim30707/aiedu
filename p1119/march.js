/* 행진 장단 만들기 v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * G7 「대취타와 역사 장면」(대취타처럼 행진 장면 만들기) · H3 「우리 지역 소리 지도」(3차시 장단 만들기)가 함께 쓰는 화면.
 * - 징·좌고·꽹과리 소리는 공연실 교실판 웹악기의 국립국악원 음원(공공누리 제1유형)을 bank-percussion.js로 옮겨 쓴다. 장구는 놀이터와 같다.
 * - 장단 예시는 셈제작소 기본값(국악 강사 확인 전). 지역 놀이·춤의 실제 장단은 강사가 정한다.
 * - AI 연결 없음. 카드는 복사만, 답은 사람이 붙여 넣는다. H3는 AI의 세 줄을 공식 자료와 대조해 표시한다.
 */
(()=>{'use strict';
const P=window.GugakPlay,$=id=>document.getElementById(id);
const H=String(location.hash||'').replace(/^#/,'').split(/[.&]/),has=t=>H.includes(t);
const MODE=has('H3')?'H3':'G7';
let PORT=8927;for(const t of H){const m=/^p(\d{4,5})$/.exec(t);if(m)PORT=+m[1];}
const PII=/(이름|학교|초등|중학교|[0-9]+\s*반|[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}|@|주소|번지|아파트)/;
const ROWS=[
 {id:'jing',name:'징',sub:'크게·작게',vals:[['크','extra-jing-00-strike-strong',1],['작','extra-jing-00-strike-soft',.8]]},
 {id:'jwago',name:'좌고',sub:'크게·보통',vals:[['크','extra-jwago-00-strike-strong',1],['보','extra-jwago-00-strike-medium',.9]]},
 {id:'janggu',name:'장구',sub:'덩·쿵·덕',vals:[['덩',P.STROKES['덩'].sample,.9],['쿵',P.STROKES['쿵'].sample,.9],['덕',P.STROKES['덕'].sample,.9]]},
 {id:'kkwaeng',name:'꽹과리',sub:'갱·지·객',vals:[['갱','extra-kkwaenggwari-00-gaeng-medium',.55],['지','extra-kkwaenggwari-01-ji-medium',.55],['객','extra-kkwaenggwari-02-gaek-medium',.55]]}];
const FRAMES={walk:{name:'걸음 4박(8칸)',cells:8,per:2},semachi:{name:'세마치(9칸)',cells:9,per:3},free12:{name:'12칸(강사가 정하는 장단)',cells:12,per:3}};
const SPEEDS={slow:['느리게',52],mid:['보통',72],fast:['빠르게',96]};/* 한 박(걸음 한 번)의 빠르기, 강사 확인 전 */
const SCENES=['왕의 행차','성을 지키는 군대','사신 맞이','이긴 뒤 돌아오는 행진'];
/* 예시(셈제작소 기본값 · 강사 확인 전): 칸 → 값 번호(1부터) */
const EXAMPLES={
 walk:{jing:{0:1},jwago:{0:1,2:2,4:1,6:2},janggu:{0:1,2:3,4:2,6:3},kkwaeng:{0:1,1:2,2:1,4:1,5:2,6:1}},
 semachi:{jing:{0:1},jwago:{0:1,3:2,6:2},janggu:Object.fromEntries(P.SEMACHI.map(([p,s])=>[p,s==='덩'?1:s==='쿵'?2:3])),kkwaeng:{0:1,3:1,5:2,6:1,7:2}},
 free12:{jing:{0:1},jwago:{0:1,6:1}}};
const st={mode:MODE,scene:null,frame:MODE==='H3'?'semachi':'walk',speed:'mid',grid:{},timers:[],playing:false,checks:[],beatOnly:P.reduceMotion()||P.Store.get('gugak-march-beatonly',false)};
const mask=t=>t.replace(new RegExp(PII.source,'g'),'○○');/* 개인정보처럼 보이는 말은 화면·코드에 옮기지 않음(2차 N11) */

function key(){return 'gugak-march-'+st.frame;}
function load(){const g=P.Store.get(key(),null);st.grid={};for(const r of ROWS)st.grid[r.id]=Array(FRAMES[st.frame].cells).fill(0);if(g)for(const r of ROWS)if(Array.isArray(g[r.id]))g[r.id].slice(0,FRAMES[st.frame].cells).forEach((v,i)=>{st.grid[r.id][i]=Math.max(0,Math.min(r.vals.length,v|0));});}
function save(){P.Store.set(key(),st.grid);}

/* ── 소리 ── */
let ready=null;
function prep(){if(!ready){const ids=[...new Set(ROWS.flatMap(r=>r.vals.map(v=>v[1])))];ready=P.Sound.init(ids).catch(e=>{ready=null;throw e;});}return ready;}
function hit(r,v,when=0){const val=r.vals[v-1];if(val)P.Sound.play(val[1],{when,gain:val[2]});}
let gen=0;/* 재생 요청 번호(2차 N26) */
function stop(){gen++;st.playing=false;for(const t of st.timers)clearTimeout(t);st.timers=[];P.Sound.stopAll();document.querySelectorAll('.seq td.on').forEach(e=>e.classList.remove('on'));$('play').textContent='돌려 듣기';}
async function play(){stop();const g=gen;await prep();await P.Sound.resume();if(g!==gen)return;st.playing=true;$('play').textContent='처음부터 다시';
 const F=FRAMES[st.frame],cellS=60/SPEEDS[st.speed][1]/F.per,ctx=P.Sound.ctx,t0=ctx.currentTime+.15,loops=16;
 for(let L=0;L<loops;L++)for(let c=0;c<F.cells;c++){const when=t0+(L*F.cells+c)*cellS;for(const r of ROWS){const v=st.grid[r.id][c];if(v)hit(r,v,when);}
  if(!st.beatOnly||c%F.per===0)st.timers.push(setTimeout(()=>{const cc=st.beatOnly?[...Array(F.per)].map((_,i)=>c+i):[c];document.querySelectorAll('.seq td.on').forEach(e=>e.classList.remove('on'));for(const x of cc)document.querySelectorAll(`.seq td[data-c="${x}"]`).forEach(e=>e.classList.add('on'));},(when-ctx.currentTime)*1000));}/* 박마다 강조: 움직임 줄이기·‘박마다만 표시’(2차 N27) */
 st.timers.push(setTimeout(stop,(t0-ctx.currentTime+loops*F.cells*cellS)*1000+200));}

/* ── 그리기 ── */
function chips(box,items,cur,onPick){box.replaceChildren();for(const [k,t] of items){const b=document.createElement('button');b.textContent=t;b.dataset.k=k;b.setAttribute('aria-pressed',String(k===cur));b.addEventListener('click',()=>onPick(k));box.append(b);}}
function renderGrid(){const F=FRAMES[st.frame],t=$('seq');t.replaceChildren();
 const head=document.createElement('tr');head.className='cols';head.append(document.createElement('td'));for(let c=0;c<F.cells;c++){const td=document.createElement('td');td.textContent=c%F.per===0?String(c/F.per+1)+'박':'';head.append(td);}t.append(head);
 for(const r of ROWS){const tr=document.createElement('tr');const th=document.createElement('th');th.innerHTML=`${r.name}<small>${r.sub}</small>`;tr.append(th);
  for(let c=0;c<F.cells;c++){const td=document.createElement('td');td.dataset.c=c;if(c%F.per===0)td.className='beat';const b=document.createElement('button');const v=st.grid[r.id][c];b.textContent=v?r.vals[v-1][0]:'';b.className=v?'v'+v:'';
   b.setAttribute('aria-label',`${r.name} ${c+1}째 칸 ${v?r.vals[v-1][0]:'없음'}`);
   b.addEventListener('click',async()=>{const nv=(st.grid[r.id][c]+1)%(r.vals.length+1);st.grid[r.id][c]=nv;save();renderGrid();renderCode();if(st.playing){play();return;}/* 듣는 중에 고치면 고친 장단으로 처음부터(2차 N25) */if(nv){try{await prep();await P.Sound.resume();hit(r,nv);}catch(e){}}});td.append(b);tr.append(td);}
  t.append(tr);}}
function codeText(){const F=FRAMES[st.frame];const head=(st.mode==='H3'?`[우리 지역 소리 지도] ${PII.test($('heritage').value)?'(유산 이름 — 개인정보처럼 보이는 말이 있어 뺐어요)':$('heritage').value.trim()||'(유산 이름)'}`:`[행진 장면] ${st.scene||'(장면)'}`)+` · ${F.name} · ${SPEEDS[st.speed][0]}`;
 return [head,...ROWS.map(r=>`${r.name.padEnd(3,' ')}: `+st.grid[r.id].map(v=>v?r.vals[v-1][0]:'·').join(' '))].join('\n');}
function renderCode(){$('code').value=codeText();}
function card(){if(st.mode==='H3'){const h=$('heritage').value.trim()||'(유산 이름)';return [`[국악 놀이터 · 우리 지역 소리 지도 카드]`,`${h}을(를) 초등학생이 알기 쉽게 세 줄로 알려 주세요.`,'- 한 줄에 한 가지씩, 번호 없이 세 줄만 써 주세요.','- 확실하지 않은 것은 “확실하지 않음”이라고 써 주세요.'].join('\n');}
 return ['카드 G7 · 행진 장면',`우리 모둠이 고른 장면: ${st.scene||'(장면 카드 이름)'}`,'쓸 수 있는 악기: 징, 좌고, 장구, 꽹과리','이 장면에 어울리는 빠르기(느리게 / 보통 / 빠르게)와 악기 두세 가지를 골라 주고,','왜 그런지 한 줄로 알려 주세요. 정답이 아니라 의견으로요.'].join('\n');}
function piiCheck(){const bad=st.mode==='H3'&&PII.test($('heritage').value);$('pii').hidden=!bad;$('pii').textContent=bad?'개인정보처럼 보이는 말이 있어요(이름·학교·반·번호 등). 지우고 써요.':'';return bad;}
function renderTopic(){if(st.mode==='H3'){$('title').textContent='우리 지역 소리 지도';$('topic-title').textContent='우리 지역 국가유산';$('scenes').hidden=true;$('heritage-row').hidden=false;$('ai-title').textContent='AI 세 줄을 공식 자료와 대조하기';$('foot').textContent='지역 놀이·춤의 실제 장단과 유산 목록·지정 구분은 강사가 공식 자료로 확인해요. 장단 틀·예시·빠르기 이름은 국악 강사 확인 전이에요. 대금은 교실판에서 쳐요. 이 화면은 AI에 연결되어 있지 않아요. 소리: 국립국악원 국악기 디지털 음원(공공누리 제1유형).';
  $('topic-note').textContent='강사가 공식 기관 자료(국가유산청·지자체 누리집 등)로 확인한 목록에서 골라요. 장단은 그 놀이·춤의 장단을 강사가 알려 줘요.';}
 else{chips($('scenes'),SCENES.map(s=>[s,s]),st.scene,k=>{if(k!==st.scene){$('answer').value='';$('result').replaceChildren();st.checks=[];}/* 다른 장면의 답이 남지 않게(2차 N24) */st.scene=k;renderTopic();renderCode();$('card').value=card();});$('topic-note').textContent='장면 카드를 하나 골라요. 역사 사실은 사회 교과서 범위 안에서 강사가 설명해요.';}
 piiCheck();$('card').value=card();}
function renderAll(){chips($('frames'),Object.entries(FRAMES).map(([k,f])=>[k,f.name]),st.frame,k=>{stop();st.frame=k;load();renderAll();});
 chips($('speeds'),Object.entries(SPEEDS).map(([k,s])=>[k,s[0]]),st.speed,k=>{st.speed=k;if(st.playing)play();renderAll();});
 renderTopic();renderGrid();renderCode();}

/* ── AI 답 ── */
function showAnswer(){const box=$('result');box.replaceChildren();const text=$('answer').value.trim();if(!text){box.textContent='답을 먼저 붙여 넣어요';return;}
 if(PII.test(text)){const w=document.createElement('p');w.className='warn';w.textContent='답에 개인정보처럼 보이는 말이 있어요. 감독 선생님께 보여 주고 지워요.';box.append(w);}
 const shown=mask(text);
 if(st.mode==='G7'){const p=document.createElement('p');p.className='note';p.textContent='AI의 의견이에요. 정답이 아니에요. 참고해서 우리 모둠이 위 칸에서 정해요.';const o=document.createElement('div');o.className='opinion';o.textContent=shown.slice(0,600);box.append(p,o);return;}
 const all=shown.split(/\r?\n/).map(s=>s.replace(/^\s*([-*•]|\d+[.)])\s*/,'').trim()).filter(Boolean),lines=all.slice(0,3);st.n=all.length;st.checks=lines.map(()=>({mark:null,where:null}));
 const wrap=document.createElement('div');wrap.className='lines';
 lines.forEach((l,i)=>{const d=document.createElement('div');d.className='line';const p=document.createElement('p');p.textContent=(i+1)+'. '+l;d.append(p);
  const marks=document.createElement('div');marks.className='chips';const draw=()=>{chips(marks,[['ok','공식 자료와 맞아요'],['no','틀려요'],['unknown','확인 못 했어요']],st.checks[i].mark,k=>{st.checks[i].mark=k;draw();sum();});};draw();
  const where=document.createElement('select');where.setAttribute('aria-label','확인한 곳');for(const t of ['확인한 곳 고르기','국가유산청 누리집','지자체·박물관 누리집','교과서','강사 설명']){const o=document.createElement('option');o.textContent=t;where.append(o);}
  where.addEventListener('change',()=>{st.checks[i].where=where.selectedIndex?where.value:null;sum();});d.append(marks,where);wrap.append(d);});
 const s=document.createElement('p');s.className='state';s.id='check-sum';box.append(wrap,s);sum();}
function sum(){const el=$('check-sum');if(!el)return;const c=st.checks,ok=c.filter(x=>x.mark==='ok').length,no=c.filter(x=>x.mark==='no').length,un=c.filter(x=>x.mark==='unknown').length,left=c.filter(x=>!x.mark||(x.mark!=='unknown'&&!x.where)).length;/* ‘확인 못 함’은 확인한 곳 없이도 됨 */
 el.textContent=(st.n!==3?`AI 답이 세 줄이 아니에요(${st.n}줄) — 앞의 ${c.length}줄만 봐요. `:'')+(left?`아직 ${left}줄 남았어요(맞음·틀림은 확인한 곳도 함께 골라요)`:`판단 기록 끝: 맞음 ${ok} · 틀림 ${no} · 확인 못 함 ${un} — 강사가 보여 준 자료로 고른 거예요. 지도 카드에는 ‘맞음’ 줄만 옮겨 적어요`);}/* 고른 것 = 사실 확정이 아님(2차 N28) */

async function copy(text,el){try{await navigator.clipboard.writeText(text);el.textContent='복사했어요';}catch(e){el.textContent='복사가 막혔어요. 글을 길게 눌러 직접 복사해요';}}
function init(){load();
 const cl=$('classroom');cl.href=`${location.protocol==='file:'?'http:':location.protocol}//${location.hostname||'127.0.0.1'}:${PORT}/instrument/index.html?all=1`;$('classroom-note').textContent=`공연실 서버(포트 ${PORT})가 켜져 있을 때만 열려요. 악기 고르기에서 징·꽹과리·좌고·대금을 골라요.`;
 $('heritage').addEventListener('input',()=>{piiCheck();$('card').value=card();renderCode();$('result').replaceChildren();st.checks=[];});
 $('answer').addEventListener('input',()=>{$('result').replaceChildren();});
 $('play').addEventListener('click',()=>play().catch(e=>alert('소리를 준비하지 못했어요: '+e.message)));
 $('stop').addEventListener('click',stop);
 const bo=$('beat-only');bo.checked=st.beatOnly;bo.addEventListener('change',()=>{st.beatOnly=bo.checked;P.Store.set('gugak-march-beatonly',bo.checked);if(st.playing)play();});
 $('example').addEventListener('click',()=>{if(ROWS.some(r=>st.grid[r.id].some(v=>v))&&!confirm('지금 칸을 지우고 예시로 바꿀까요?'))return;/* 2차 N30 */const ex=EXAMPLES[st.frame]||{};for(const r of ROWS){st.grid[r.id]=Array(FRAMES[st.frame].cells).fill(0);for(const [c,v] of Object.entries(ex[r.id]||{}))st.grid[r.id][+c]=v;}save();renderGrid();renderCode();if(st.playing)play();});
 $('clear').addEventListener('click',()=>{if(!confirm('장단 칸을 모두 지울까요?'))return;for(const r of ROWS)st.grid[r.id].fill(0);save();renderGrid();renderCode();if(st.playing)stop();});
 $('copy').addEventListener('click',()=>{if(piiCheck()){$('copy-state').textContent='개인정보처럼 보이는 말이 있어요. 지우고 복사해요';return;}$('card').value=card();copy($('card').value,$('copy-state'));});
 $('show').addEventListener('click',showAnswer);$('clear-ans').addEventListener('click',()=>{$('answer').value='';$('result').replaceChildren();});
 $('copy-code').addEventListener('click',()=>copy($('code').value,$('code-state')));
 renderAll();}
window.GugakMarch={st,ROWS,FRAMES,EXAMPLES,card,codeText,play,stop,showAnswer};
init();
})();
