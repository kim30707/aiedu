/* 내꿈다이어리 v0.2 — 2026-11-04 Claude.
   출처: GPT/Codex v0.1 `…/2026-11-03_183541_내꿈다이어리_v01_6쪽제작/06_AI작업/GPT/dream.js` (원본은 그대로 둠).
   v0.1에서 바꾼 것: 4쪽 'AI 질문 고쳐 쓰기'(홈페이지의 AI 교정표), 표지 '나의 지도'(학생 글로 채움, AI 아님),
   1년·이번 달을 5쪽 '목표와 이번 주'로 합침, 한 줄 주간표, 규칙형 점검(개인정보·단정 표현), 책 인쇄 디자인.
   데이터 칸은 v0.1의 칸을 모두 그대로 두고 aiSource·aiNotes만 더했다 → v0.1 파일을 그대로 불러온다. */
(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=(v,n=300)=>typeof v==='string'?v.slice(0,n):'';
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const days=['월','화','수','목','금','토','일'];
const pages=[
 {name:'표지 · 나의 지도',short:'표지',lead:'책 제목과 별칭을 정해요. 나의 지도는 2~5쪽에 쓴 내 글로 저절로 채워져요.'},
 {name:'관심 · 경험',short:'관심',lead:'잘하는지 판정하지 않아요. 해 보았던 일과 그때의 느낌을 적어요.'},
 {name:'가능성 두 가지',short:'가능성',lead:'한 가지 직업으로 나를 정하지 않아요. 서로 다른 길 두 가지를 작게 탐색해요.'},
 {name:'AI 질문 고쳐 쓰기',short:'AI 교정',lead:'AI가 한 말은 정답이 아니에요. 골라 쓰고, 내 말로 고치고, 이유를 적어요.'},
 {name:'목표와 이번 주',short:'이번 주',lead:'1년 목표를 이번 달의 작은 실험과 이번 주 행동으로 나눠요. 쉬는 날도 직접 정해요.'},
 {name:'돌아보기 · 고치기',short:'돌아보기',lead:'계획을 지켰는지만 보지 않아요. 알게 된 점으로 다음 계획을 바꿔요.'}];
const picks={keep:'그대로 써 볼래요',change:'고쳐서 쓸래요',drop:'쓰지 않을래요'};
const pickShort={keep:'그대로',change:'고쳐서',drop:'안 씀'};
const sources={teacher:'선생님 화면에서 함께 봤어요',school:'학교가 허용한 계정에서 직접 썼어요',none:'AI 없이 짝·선생님 질문으로 했어요'};
const sourceShort={teacher:'선생님 화면',school:'학교 허용 계정',none:'AI 없이'};
const blankNote=()=>({said:'',pick:'',mine:'',why:''});
function defaults(){return {title:'',alias:'',motto:'',interest:'',experience:'',strength:'',question:'',futures:[{path:'',reason:'',try:'',check:''},{path:'',reason:'',try:'',check:''}],aiSource:'',aiNotes:[blankNote(),blankNote(),blankNote()],year:'',month:'',evidence:'',helper:'',weekStart:'',week:days.map(()=>({action:'',done:false,note:''})),learned:'',change:'',correction:'',next:'',reviewed:false};}
function normalize(raw){const r=obj(raw),d=defaults();for(const k of ['title','alias','motto','interest','experience','strength','question','year','month','evidence','helper','learned','change','correction','next'])d[k]=txt(r[k],['title','alias'].includes(k)?70:300);d.weekStart=txt(r.weekStart,40);
 d.futures=d.futures.map((_,i)=>{const f=obj(Array.isArray(r.futures)?r.futures[i]:null);return {path:txt(f.path,100),reason:txt(f.reason,240),try:txt(f.try,240),check:txt(f.check,240)};});
 d.aiSource=Object.hasOwn(sources,r.aiSource)?r.aiSource:'';
 d.aiNotes=d.aiNotes.map((_,i)=>{const a=obj(Array.isArray(r.aiNotes)?r.aiNotes[i]:null);return {said:txt(a.said,240),pick:Object.hasOwn(picks,a.pick)?a.pick:'',mine:txt(a.mine,200),why:txt(a.why,120)};});
 d.week=d.week.map((_,i)=>{const x=obj(Array.isArray(r.week)?r.week[i]:null);return {action:txt(x.action,100),done:x.done===true,note:txt(x.note,100)};});d.reviewed=r.reviewed===true;return d;}
function demo(){return normalize({title:'내가 궁금한 내일',alias:'새싹 (가상 예시)',motto:'작게 해 보고, 내 생각으로 고치기',interest:'그림으로 설명하기, 동네 새 관찰하기',experience:'친구가 종이접기를 어려워해서 순서를 그림으로 그려 주었다. 친구가 따라 접었을 때 뿌듯했다.',strength:'헷갈리는 부분을 찾아 순서를 나누어 설명했다. 언제나 잘한다는 뜻은 아니다.',question:'사람에게 설명하는 일과 자연을 관찰하는 일 중 어떤 활동이 더 즐거울까?',
 futures:[{path:'설명 그림을 만드는 나',reason:'그림으로 알려 주는 활동이 즐거웠다.',try:'쉬운 놀이 규칙을 4칸 그림으로 만들고 읽기 쉬운지 물어본다.',check:'그림을 만드는 일에는 어떤 과정이 있는지 도서관 책에서 찾아본다. 책 제목·쪽은 직접 적는다.'},{path:'자연을 관찰하고 기록하는 나',reason:'같은 장소에서도 날마다 다른 것을 발견하는 것이 흥미롭다.',try:'학교 주변에서 어른과 함께 식물 한 가지를 관찰하고 그린다.',check:'이름을 모르면 추측과 확인한 정보를 나누어 적고, 도감이나 선생님에게 확인한다.'}],
 aiSource:'teacher',aiNotes:[
  {said:'(가상 예시) 그림 설명을 좋아한다면 디자이너가 꼭 맞을 거예요.',pick:'change',mine:'그림으로 설명하는 활동을 세 번 더 해 보고, 어떤 점이 즐거운지 비교해 볼래요.',why:'한 번 해 본 일로 직업을 정하기엔 일러요. 단정하는 말이라 고쳤어요.'},
  {said:'(가상 예시) 내 그림 설명서를 친구 두 명에게 보여 주고 어디가 헷갈렸는지 물어보세요.',pick:'keep',mine:'',why:'이번 주에 바로 해 볼 수 있어요.'},
  {said:'(가상 예시) 매일 1시간씩 새를 관찰해 보세요.',pick:'change',mine:'토요일에 15분만, 어른과 함께 학교 주변에서 관찰할래요.',why:'매일 1시간은 내 시간표에 맞지 않아요. 안전도 생각했어요.'}],
 year:'관심 있는 두 활동을 각각 세 번 해 보고, 즐거웠던 과정과 힘들었던 과정을 비교한다.',month:'그림 설명 한 장과 관찰 기록 한 장을 만든다.',evidence:'결과 두 장과 각각 고친 이유 한 가지를 남긴다.',helper:'도서관 자료, 선생님의 짧은 의견. 다른 사람 이름이나 연락처는 적지 않는다.',weekStart:'연습용 한 주 (실제 날짜 아님)',
 week:[{action:'10분: 궁금한 놀이 규칙 고르기'},{action:'15분: 규칙을 4칸 그림으로 그리기'},{action:'10분: 친구에게 헷갈린 곳 물어보기'},{action:'10분: 그림 한 곳 고치기'},{action:'쉬는 날'},{action:'15분: 어른과 식물 관찰하기'},{action:'5분: 다음 주 한 가지만 고르기'}],
 learned:'예시: 설명을 받는 사람에게 물어보면 내가 놓친 점을 알 수 있다. 실제로 해 본 뒤 내 경험으로 바꾼다.',change:'예시: 시간이 부족하면 두 활동을 한 주에 다 하지 않고 한 활동부터 해 본다.',correction:'예시: “나는 반드시 디자이너가 된다” → “그림으로 설명하는 활동을 더 해 보고 싶다”. 아직 한 번만 해 봤기 때문.',next:'예시: 다음 주에는 고친 그림이 이해되는지 확인한다.',reviewed:false});}

/* ---------- 규칙형 기능(AI 아님): 쪽 채움 표시 · 점검 질문 ---------- */
const has=s=>typeof s==='string'&&s.trim()!=='';
function filled(d){return [has(d.title)||has(d.alias)||has(d.motto),has(d.interest)||has(d.experience)||has(d.strength)||has(d.question),d.futures.some(f=>has(f.path)||has(f.try)),d.aiSource==='none'||d.aiNotes.some(a=>has(a.said)||has(a.mine)),has(d.year)||has(d.month)||d.week.some(x=>has(x.action)),has(d.learned)||has(d.change)||has(d.correction)||has(d.next)];}
const PRIVATE=[[/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/,'전화번호'],[/[\w.+-]+@[\w-]+\.[\w.]+/,'이메일 주소'],[/[가-힣]{2,12}(초등학교|중학교|고등학교|초교)/,'학교 이름'],[/\d\s*학년\s*\d+\s*반/,'학년·반'],[/\d+\s*동\s*\d+\s*호/,'집 주소(동·호)'],[/(19|20)\d{2}\s*[년.\-/]\s*\d{1,2}\s*[월.\-/]\s*\d{1,2}\s*일?\s*(생|출생)/,'생년월일']];
const SURE=/(반드시|무조건|절대로?|100\s*%|틀림없이|꼭\s*[가-힣]{0,12}(될\s*거|된다|될\s*것|돼야))/;
function texts(d){const out=[];const add=(where,v)=>{if(has(v))out.push([where,v]);};add('1쪽',d.title);add('1쪽',d.alias);add('1쪽',d.motto);for(const k of ['interest','experience','strength','question'])add('2쪽',d[k]);d.futures.forEach(f=>{for(const k of ['path','reason','try','check'])add('3쪽',f[k]);});d.aiNotes.forEach(a=>{add('4쪽',a.mine);add('4쪽',a.why);});for(const k of ['year','month','evidence','helper','weekStart'])add('5쪽',d[k]);d.week.forEach(x=>{add('5쪽',x.action);add('5쪽',x.note);});for(const k of ['learned','change','next'])add('6쪽',d[k]);return out;}
function check(d){const m=[];
 const seen=new Set();for(const [where,v] of texts(d)){const hit=PRIVATE.filter(([re])=>re.test(v)).map(([,l])=>l).filter(l=>!seen.has(where+l));hit.forEach(l=>seen.add(where+l));if(hit.length)m.push(`${where}에 ${hit.join('·')}처럼 보이는 글이 있어요. 책에는 별칭만 쓰고 지워 주세요.`);}
 if(!has(d.alias))m.push('표지에 실명 대신 별칭을 적었나요?');
 if(!has(d.experience))m.push('2쪽: 직접 해 본 경험 한 가지가 있나요?');
 d.futures.forEach((f,i)=>{if(!has(f.path)||!has(f.try))m.push(`3쪽: 가능성 ${i+1}의 모습과 지금 작게 해 볼 활동을 함께 적었나요?`);});
 if(has(d.futures[0].path)&&d.futures[0].path.trim()===d.futures[1].path.trim())m.push('3쪽: 가능성 두 가지가 같아요. 서로 다른 활동을 비교해 볼까요?');
 if(!d.aiSource)m.push('4쪽: AI를 어디에서 만났는지(또는 AI 없이 했는지) 골라 주세요.');
 d.aiNotes.forEach((a,i)=>{if(has(a.said)&&!a.pick)m.push(`4쪽 ${i+1}번: AI가 한 말을 그대로 쓸지, 고칠지, 안 쓸지 골라 주세요.`);if(a.pick==='change'&&!has(a.mine))m.push(`4쪽 ${i+1}번: 고쳐 쓸 문장을 내 말로 적어 보세요.`);if(a.pick&&!has(a.why))m.push(`4쪽 ${i+1}번: 그렇게 고른 이유를 한 줄 적어 보세요.`);});
 if(!has(d.year)||!has(d.month))m.push('5쪽: 1년 탐색 목표를 이번 달 작은 실험으로 나눴나요?');
 const acts=d.week.filter(x=>has(x.action)&&!/쉬|쉼|미정/.test(x.action));if(!acts.length)m.push('5쪽: 이번 주에 할 수 있는 행동을 하루만이라도 골라 보세요.');else if(acts.some(x=>!/\d/.test(x.action)))m.push('5쪽: 행동에 시간(예: 10분)을 적으면 실행하기 쉬워요.');
 for(const [where,v] of texts(d)){const s=v.match(SURE);if(s){m.push(`${where}에 “${s[0]}”처럼 단정하는 말이 있어요. “~해 보고 싶다”처럼 탐색하는 말로 고쳐 볼까요?`);break;}}
 if(!has(d.correction))m.push('6쪽: 고친 문장(고치기 전 → 고친 뒤 · 이유)을 하나 적었나요?');
 if(!d.reviewed)m.push('6쪽: 공개하고 싶지 않은 정보가 없는지 직접 읽고 확인했나요?');
 return m;}

/* ---------- 책(인쇄·미리보기) ---------- */
const BOOK_CSS=`.dp{font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;color:#111a2e;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere;font-size:11pt}
.dp *{box-sizing:border-box}.dp h1,.dp h2,.dp h3,.dp p{margin:0}
.dp-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #2b5bff;padding-bottom:2mm;margin-bottom:5mm;font-size:9pt;color:#46526e;font-weight:700;letter-spacing:.02em}
.dp-head span:first-child::before{content:"";display:inline-block;width:0;height:0;border:1.3mm solid #04876f;border-radius:50%;margin-right:2mm;vertical-align:.1em}
.dp-title{font-size:18pt;font-weight:800;letter-spacing:-.02em;display:flex;gap:3mm;align-items:center;margin-bottom:1.5mm}
.dp-title b{display:inline-flex;align-items:center;justify-content:center;width:9mm;height:9mm;border:1.6px solid #2b5bff;border-radius:50%;color:#2b5bff;font-size:12pt;flex:none}
.dp-lead{font-size:10pt;color:#46526e;margin-bottom:5mm}
.dp-block{break-inside:avoid;margin-bottom:4.5mm}
.dp h3{font-size:10.5pt;font-weight:700;color:#1f45e6;margin-bottom:1.5mm}
.dp-text{white-space:pre-wrap;border-left:2px solid #b8c3dc;padding:.8mm 0 .8mm 3mm}
.dp-lines{display:block}.dp-lines i{display:block;height:9.5mm;border-bottom:1px solid #b8c3dc}
.dp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}
.dp-card{border:1px solid #b8c3dc;border-radius:3mm;padding:3.5mm 4.5mm 1mm;break-inside:avoid;margin-bottom:4.5mm}
.dp-card .dp-lines i{height:8.5mm}.dp-card .dp-block{margin-bottom:3mm}
.dp-card>h3{font-size:12pt;color:#111a2e;border-bottom:1px dashed #b8c3dc;padding-bottom:1.5mm;margin-bottom:3mm}
.dp-card>h3 em{font-style:normal;color:#04876f;margin-right:2mm}
.dp-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10pt}
.dp-table th,.dp-table td{border:1px solid #8f9bb8;padding:1.8mm 2mm;vertical-align:top;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}
.dp-table thead th{color:#1f45e6;font-weight:700;border-bottom:2px solid #2b5bff}
.dp-table tbody th{text-align:center;font-weight:800}
.dp-note{font-size:9.5pt;color:#46526e;border:1px solid #b8c3dc;border-left:3px solid #04876f;padding:2mm 3mm;margin:3mm 0 4mm;break-inside:avoid}
.dp-choice{margin:0 0 3mm;font-size:10pt}.dp-choice span{display:inline-block;margin-right:5mm;white-space:nowrap}
.dp-foot{margin-top:5mm;font-size:8.5pt;color:#66728f;border-top:1px solid #d3dbee;padding-top:2mm}
.dp-cover{text-align:left;padding-top:6mm}
.dp-kicker{font-size:10pt;color:#04876f;font-weight:700;letter-spacing:.04em;margin-bottom:3mm}
.dp-book{font-size:28pt;font-weight:900;letter-spacing:-.03em;line-height:1.2;margin-bottom:3mm}
.dp-book .dp-lines i{height:14mm}
.dp-by{font-size:12pt;margin-bottom:6mm}.dp-by b{border-bottom:1px solid #8f9bb8;padding:0 2mm;min-width:45mm;display:inline-block}
.dp-motto{border:1px solid #b8c3dc;border-radius:3mm;padding:3mm 5mm;margin-bottom:8mm;font-size:12pt}
.dp-motto small{display:block;font-size:9pt;color:#46526e;font-weight:700}
.dp-map{position:relative;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:auto auto auto;gap:7mm 6mm;margin:3mm 0 6mm}
.dp-map svg{position:absolute;inset:0;width:100%;height:100%;z-index:0}
.dp-node{position:relative;z-index:1;background:#fff;border:1.4px solid #2b5bff;border-radius:4mm;padding:2.5mm 3mm;min-height:24mm;font-size:10pt;break-inside:avoid}
.dp-node small{display:block;font-size:8.5pt;color:#04876f;font-weight:800;margin-bottom:1mm}
.dp-node .dp-lines i{height:7mm}
.dp-me{grid-column:2;grid-row:2;align-self:center;justify-self:center;width:34mm;height:34mm;border-radius:50%;border:2.2px solid #04876f;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2mm;font-weight:800;font-size:11pt;background:#fff;position:relative;z-index:1}
.dp-me small{font-size:8pt;color:#46526e;font-weight:700}
.dp-cover-note{font-size:9.5pt;color:#46526e}
.dp-draw{border:1.4px dashed #8fb5a9;border-radius:4mm;height:62mm;padding:2.5mm 4mm;margin-bottom:4mm;break-inside:avoid}.dp-draw small{font-size:9pt;color:#04876f;font-weight:700}
@media screen{.dp-draw{height:150px}.dp-node small,.dp-me small,.dp-draw small{font-size:12px}}
@media screen{.dp.print-page{background:#fff;padding:12mm 13mm;margin:0 auto 18px;max-width:210mm;box-shadow:0 10px 30px -18px rgba(17,26,46,.45);border-radius:6px}}
@media screen and (max-width:640px){.dp.print-page{padding:18px 16px}.dp-map{grid-template-columns:1fr 1fr;gap:12px}.dp-map svg{display:none}.dp-me{grid-column:1/-1;grid-row:auto;width:auto;height:auto;border-radius:14px;flex-direction:row;gap:8px;padding:10px}.dp-node{grid-row:auto!important;grid-column:auto!important}.dp-grid2{grid-template-columns:1fr}.dp-table{font-size:9pt}}
@media print{.dp.print-page{break-after:page;page-break-after:always;padding:0;margin:0;box-shadow:none;max-width:none}.dp.print-page:last-child{break-after:auto;page-break-after:auto}}`;
function injectCSS(){if(typeof document==='undefined'||document.getElementById('dp-book-css'))return;const s=document.createElement('style');s.id='dp-book-css';s.textContent=BOOK_CSS;document.head.append(s);}
const lines=n=>`<span class="dp-lines">${'<i></i>'.repeat(n)}</span>`;
const val=(x,n)=>has(x)?`<p class="dp-text">${esc(x)}</p>`:lines(n);
const block=(t,x,n=3)=>`<div class="dp-block"><h3>${t}</h3>${val(x,n)}</div>`;
const short=(s,n)=>{s=String(s||'').trim();return s.length>n?s.slice(0,n-1)+'…':s;};
function map(d){const node=(label,x,pos)=>`<div class="dp-node" style="${pos}"><small>${label}</small>${has(x)?esc(short(x,60)):lines(2)}</div>`;
 return `<div class="dp-map"><svg viewBox="0 0 300 180" preserveAspectRatio="none" aria-hidden="true"><g stroke="#8fb5a9" stroke-width="1.6" stroke-dasharray="5 4" fill="none"><line x1="150" y1="90" x2="50" y2="28"/><line x1="150" y1="90" x2="250" y2="28"/><line x1="150" y1="90" x2="50" y2="152"/><line x1="150" y1="90" x2="250" y2="152"/></g></svg>${node('관심 · 2쪽',d.interest,'grid-column:1;grid-row:1')}${node('가능성 1 · 3쪽',d.futures[0].path,'grid-column:3;grid-row:1')}<div class="dp-me"><small>나</small>${has(d.alias)?esc(short(d.alias,16)):'(별칭)'}</div>${node('가능성 2 · 3쪽',d.futures[1].path,'grid-column:1;grid-row:3')}${node('1년 탐색 목표 · 5쪽',d.year,'grid-column:3;grid-row:3')}</div>`;}
const box=on=>on?'☑':'☐';
function pageHTML(d,i){let body='';
 if(i===0)body=`<div class="dp-cover"><p class="dp-kicker">나의 가능성을 탐색하는 작은 책 · 내꿈다이어리</p><h1 class="dp-book">${has(d.title)?esc(d.title):lines(1)}</h1><p class="dp-by">지은이 별칭 <b>${has(d.alias)?esc(d.alias):'&nbsp;'}</b></p><div class="dp-motto"><small>나에게 건네는 한 문장</small>${has(d.motto)?esc(d.motto):lines(1)}</div><h3>나의 지도 — 2~5쪽에 쓴 내 글로 채워져요</h3>${map(d)}<div class="dp-draw"><small>표지 그림 — 내가 좋아하는 장면이나 해 보고 싶은 활동을 그려요</small></div><p class="dp-cover-note">이 책은 내가 고르고 고치는 계획이에요. AI가 나의 성격·직업·성공을 예측한 결과가 아니에요. 마음이 바뀌면 언제든 고쳐 써요.</p></div>`;
 if(i===1)body=block('지금 관심 있는 것',d.interest,4)+block('직접 해 본 경험 · 그때의 느낌',d.experience,6)+block('경험에서 발견한 나의 방법',d.strength,4)+block('더 알아보고 싶은 질문',d.question,4);
 if(i===2)body=d.futures.map((f,n)=>`<div class="dp-card"><h3><em>가능성 ${n+1}</em>${has(f.path)?esc(f.path):''}</h3>${has(f.path)?'':lines(1)}${block('이 길이 궁금한 이유',f.reason,2)}${block('지금 작게 해 볼 활동',f.try,2)}${block('알아볼 정보 · 확인한 출처 · 아직 모르는 점',f.check,2)}</div>`).join('');
 if(i===3)body=`<p class="dp-choice"><b>AI를 만난 곳</b> &nbsp;${Object.keys(sources).map(k=>`<span>${box(d.aiSource===k)} ${sourceShort[k]}</span>`).join('')}</p><table class="dp-table"><colgroup><col style="width:6%"><col style="width:30%"><col style="width:14%"><col style="width:28%"><col></colgroup><thead><tr><th></th><th>${d.aiSource==='none'?'짝·선생님이 한 질문·제안':'AI가 한 말 (질문·제안)'}</th><th>내 선택</th><th>내 말로 고친 문장</th><th>그렇게 고른 이유</th></tr></thead><tbody>${d.aiNotes.map((a,n)=>`<tr style="height:${has(a.said)||has(a.mine)?'auto':'50mm'}"><th>${n+1}</th><td>${esc(a.said)}</td><td>${Object.keys(picks).map(k=>`${box(a.pick===k)} ${pickShort[k]}`).join('<br>')}</td><td>${esc(a.mine)}</td><td>${esc(a.why)}</td></tr>`).join('')}</tbody></table><p class="dp-note">초등학생은 AI에 직접 입력하지 않아요. 선생님이 화면에 보여 준 AI의 말이나, 학교가 허용한 계정에서 본 말만 옮겨 적어요. AI가 “꼭 ~가 될 거예요”처럼 단정하면 탐색하는 말로 고쳐요. 모르는 사실은 선생님·공식 자료로 확인해요. AI를 쓰지 않았다면 짝이나 선생님이 해 준 질문을 적어요.</p>`;
 if(i===4)body=`<div class="dp-grid2">${block('1년 동안 탐색할 목표',d.year,3)}${block('이번 달의 작은 실험',d.month,3)}${block('해 보았다는 흔적을 남길 방법',d.evidence,3)}${block('도움 · 자료 · 준비물 (이름 대신 역할)',d.helper,3)}</div><p class="dp-choice"><b>어느 주</b> ${has(d.weekStart)?esc(d.weekStart):'______________________'}</p><table class="dp-table"><colgroup><col style="width:9%"><col style="width:44%"><col style="width:11%"><col></colgroup><thead><tr><th>요일</th><th>언제 · 무엇을 · 얼마나</th><th>해 봄</th><th>해 본 뒤 메모 · 못 했다면 바꿀 점</th></tr></thead><tbody>${d.week.map((x,n)=>`<tr style="height:${has(x.action)?'auto':'14mm'}"><th>${days[n]}</th><td>${esc(x.action)}</td><td style="text-align:center">${box(x.done)}</td><td>${esc(x.note)}</td></tr>`).join('')}</tbody></table><p class="dp-note">‘해 봄’은 실제로 해 본 뒤에만 표시해요. 빈칸이나 못 한 날은 실패 점수가 아니에요. 시간을 줄이거나 다음 주에 바꿔요.</p>`;
 if(i===5)body=block('실제로 해 보고 새로 알게 된 점',d.learned,5)+block('다음 계획에서 바꿀 점 · 이유',d.change,4)+block('고치기 전 표현 → 고친 뒤 표현 · 고친 이유',d.correction,4)+block('다음에 내가 고를 한 걸음',d.next,3)+`<p class="dp-choice">${box(d.reviewed)} 내 글을 다시 읽고, 공개하고 싶지 않은 정보가 없는지 확인했어요.</p><p class="dp-choice">확인한 날 __________ &nbsp; 나에게 남기는 표시 __________</p>`;
 return `<section class="print-page dp"><div class="dp-head"><span>내꿈다이어리</span><span>${i+1} / 6</span></div>${i===0?'':`<h2 class="dp-title"><b>${i+1}</b>${pages[i].name}</h2><p class="dp-lead">${pages[i].lead}</p>`}${body}<p class="dp-foot">별칭 사용 · 언제든 고칠 수 있는 탐색 기록 · 이 책의 글은 내가 썼어요 (AI가 예측한 결과가 아님)</p></section>`;}
function worksheet(raw){injectCSS();const d=normalize(raw);return pages.map((_,i)=>pageHTML(d,i)).join('');}

/* ---------- 선생님이 허용된 AI에 붙여 넣는 요청문 (자동 전송 없음) ---------- */
function prompt(raw){const d=normalize(raw);const v=x=>has(x)?x.trim():'(아직 비어 있음)';
 return `[선생님용 · 내꿈다이어리 AI 질문 요청문]
쓰는 곳: 만 13세 미만 학생은 AI에 직접 입력하지 않습니다. 선생님이 학교에서 허용한 AI를 교탁 화면에 띄워 붙여 넣거나, 학교가 승인한 학생 계정(예: 부산 펜즈)에서만 씁니다.
붙여 넣기 전에 이름·학교·연락처 같은 개인정보가 없는지 다시 봅니다. 별칭은 넣지 않았습니다. 이 글은 자동으로 보내지지 않습니다.

------ 아래부터 붙여 넣기 ------
너는 초등학교 5~6학년 학생의 진로 탐색 활동을 돕는 조력자야. 학생이 직접 쓴 글을 읽고, 학생이 스스로 고르고 고칠 수 있는 '질문'과 '작은 활동 제안'만 해 줘.
지킬 것:
- 어떤 직업이 맞다, 될 것이다처럼 진단·예측·단정하지 마.
- 성격·능력·성적·소득을 평가하지 마.
- 활동은 10~15분 안에, 돈이 들지 않고, 안전하게 할 수 있는 것으로. 어른과 함께 해야 하면 그렇게 적어.
- 직업·학교에 관한 사실은 확인할 공식 자료 종류를 함께 적고, 모르면 모른다고 해.
- 초등학생이 읽기 쉬운 짧은 문장으로.
학생 글:
- 관심: ${v(d.interest)}
- 직접 해 본 경험: ${v(d.experience)}
- 궁금한 질문: ${v(d.question)}
- 가능성 1: ${v(d.futures[0].path)} / 해 볼 활동: ${v(d.futures[0].try)}
- 가능성 2: ${v(d.futures[1].path)} / 해 볼 활동: ${v(d.futures[1].try)}
- 1년 탐색 목표: ${v(d.year)}
요청: (1) 학생이 자기 경험을 더 떠올릴 질문 3개, (2) 이번 주에 해 볼 수 있는 작은 활동 2개, (3) 학생 글에 단정하는 표현이 있으면 1개를 골라 탐색하는 말로 바꾼 예. 모두 합쳐 10줄 이내.
------ 여기까지 ------
받은 답은 학생과 함께 읽고, 학생이 고른 것만 4쪽 'AI 질문 고쳐 쓰기'에 옮겨 적습니다. 그대로 쓸지·고칠지·안 쓸지는 학생이 정합니다.`;}

/* ---------- 입력 화면 ---------- */
function mount(root,ctx){injectCSS();const d=ctx.data;let page=0;
 const field=(label,path,value,max=300,rows=3,hint='')=>{const id=ctx.uid('dream');return `<div class="field"><label for="${id}">${esc(label)}</label>${rows===1?`<input id="${id}" data-field="${path}" maxlength="${max}" value="${esc(value)}"${hint?` placeholder="${esc(hint)}"`:''}>`:`<textarea id="${id}" data-field="${path}" maxlength="${max}" rows="${rows}"${hint?` placeholder="${esc(hint)}"`:''}>${esc(value)}</textarea>`}</div>`;};
 const chips=(name,path,opts,cur)=>`<div class="chips" role="radiogroup" aria-label="${esc(name)}">${Object.entries(opts).map(([k,t])=>{const id=ctx.uid('chip');return `<label class="chip" for="${id}"><input type="radio" id="${id}" name="${path}" data-field="${path}" value="${k}" ${cur===k?'checked':''}><span>${esc(t)}</span></label>`;}).join('')}</div>`;
 function form(){
  if(page===0)return field('책 제목','title',d.title,70,1,'예: 내가 궁금한 내일')+field('지은이 별칭 (실명·학교명은 쓰지 않아요)','alias',d.alias,70,1,'예: 새싹')+field('나에게 건네는 한 문장','motto',d.motto,300,2)+`<div class="map-preview"><p class="mini-title">나의 지도 미리보기 <span class="badge">2~5쪽 글로 저절로 채움 · AI 아님</span></p><div data-map>${map(d)}</div></div>`;
  if(page===1)return field('지금 관심 있는 것','interest',d.interest,300,2,'예: 그림 그리기, 동네 새 관찰')+field('직접 해 본 경험 · 그때의 느낌','experience',d.experience,300,3,'언제, 무엇을 했고, 어떤 느낌이었나요?')+field('경험에서 발견한 나의 방법','strength',d.strength,300,2,'“나는 원래 ~” 대신 “그때 ~하게 했다”')+field('더 알아보고 싶은 질문','question',d.question);
  if(page===2)return `<div class="two-col">${d.futures.map((f,i)=>`<section class="subpanel"><h3><span class="num-dot">${i+1}</span>가능성 ${i+1}</h3>${field('해 보고 싶은 활동이나 삶의 모습',`futures.${i}.path`,f.path,100,1,i?'예: 자연을 관찰하고 기록하는 나':'예: 설명 그림을 만드는 나')}${field('이 길이 궁금한 이유',`futures.${i}.reason`,f.reason,240,2)}${field('지금 작게 해 볼 활동',`futures.${i}.try`,f.try,240,2,'10~15분, 안전하게')}${field('알아볼 정보 · 출처 · 아직 모르는 점',`futures.${i}.check`,f.check,240,2,'모르면 “아직 모름”이라고 써요')}</section>`).join('')}</div>`;
  if(page===3)return `<div class="callout"><strong>먼저 읽어요</strong><p>초등학생은 AI에 직접 입력하지 않아요. 선생님이 화면에 보여 준 AI의 말, 또는 학교가 허용한 계정에서 본 말만 옮겨 적어요. 이 앱은 AI에 연결되지 않아요.</p><button class="button ghost" type="button" data-action="dream-prompt">선생님용 AI 요청문 보기</button></div><p class="mini-title">AI를 어디에서 만났나요?</p>${chips('AI를 만난 곳','aiSource',sources,d.aiSource)}${d.aiNotes.map((a,i)=>`<section class="subpanel ai-card"><h3><span class="num-dot">${i+1}</span>${d.aiSource==='none'?'짝·선생님이 한 질문':'AI가 한 말'} ${i+1}</h3><div class="ai-said">${field(d.aiSource==='none'?'들은 질문이나 제안':'AI가 한 질문이나 제안 (본 그대로)',`aiNotes.${i}.said`,a.said,240,2)}<p class="mini-title">내 선택</p>${chips('내 선택 '+(i+1),`aiNotes.${i}.pick`,picks,a.pick)}</div><div class="ai-mine">${field('내 말로 고친 문장',`aiNotes.${i}.mine`,a.mine,200,2,'고쳐 쓸 때만 적어요')}${field('그렇게 고른 이유',`aiNotes.${i}.why`,a.why,120,1)}</div></section>`).join('')}`;
  if(page===4)return `<div class="two-col">${field('1년 동안 탐색할 목표','year',d.year,300,2,'예: 두 활동을 각각 세 번 해 보고 비교하기')+field('이번 달의 작은 실험','month',d.month,300,2)}${field('해 보았다는 흔적을 남길 방법','evidence',d.evidence,300,2,'그림, 관찰 메모, 고친 이유 등')+field('도움 · 자료 · 준비물 (이름 대신 역할)','helper',d.helper,300,2)}</div>${field('어느 주인지 (예: 11월 둘째 주)','weekStart',d.weekStart,40,1)}<div class="week" role="table" aria-label="이번 주 행동표"><div class="week-head" role="row"><span role="columnheader">요일</span><span role="columnheader">언제 · 무엇을 · 얼마나</span><span role="columnheader">해 봄</span></div>${d.week.map((x,i)=>{const a=ctx.uid('wk'),b=ctx.uid('wkd'),c=ctx.uid('wkn');return `<div class="week-row ${x.done||has(x.note)?'open':''}" role="row" data-week="${i}"><label class="day" for="${a}" role="rowheader">${days[i]}</label><input id="${a}" data-field="week.${i}.action" maxlength="100" value="${esc(x.action)}" placeholder="${i===4?'쉬는 날도 괜찮아요':'예: 10분 그림 그리기'}"><label class="done" for="${b}"><input id="${b}" type="checkbox" data-field="week.${i}.done" ${x.done?'checked':''}><span class="sr">${days[i]}요일 </span>해 봄</label><div class="week-note"><label for="${c}">해 본 뒤 메모 · 못 했다면 바꿀 점</label><input id="${c}" data-field="week.${i}.note" maxlength="100" value="${esc(x.note)}"></div></div>`;}).join('')}</div><p class="muted small">‘해 봄’은 실제로 해 본 뒤에만 눌러요. 누르면 메모 칸이 열려요.</p>`;
  return field('실제로 해 보고 새로 알게 된 점','learned',d.learned,300,3,'수업 날에는 “계획을 세우며 알게 된 점”을 써도 돼요')+field('다음 계획에서 바꿀 점 · 이유','change',d.change)+field('고치기 전 표현 → 고친 뒤 표현 · 고친 이유','correction',d.correction,300,3,'예: “반드시 ~가 된다” → “~ 활동을 더 해 보고 싶다”')+field('다음에 내가 고를 한 걸음','next',d.next,300,2)+`<label class="check-line" for="dream-reviewed"><input id="dream-reviewed" type="checkbox" data-field="reviewed" ${d.reviewed?'checked':''}>내 글을 다시 읽고, 공개하고 싶지 않은 정보가 없는지 확인했어요</label>`;}
 function stepper(){const f=filled(d);return `<ol class="stepper">${pages.map((p,i)=>`<li><button type="button" class="step${page===i?' current':''}${f[i]?' filled':''}" data-action="dream-page" data-page="${i}" ${page===i?'aria-current="step"':''} aria-label="${i+1}쪽 ${esc(p.name)}${f[i]?' (쓴 내용 있음)':''}"><span class="n">${f[i]&&page!==i?'✓':i+1}</span><span class="l">${esc(p.short)}</span></button></li>`).join('')}</ol>`;}
 function render(){root.innerHTML=`<div class="diary" id="diary-top"><nav aria-label="다이어리 쪽 선택" data-stepper>${stepper()}</nav><article class="sheet"><header class="sheet-head"><span class="tag">${page+1} / 6쪽</span><h2>${esc(pages[page].name)}</h2><p>${esc(pages[page].lead)}</p></header>${form()}</article><div class="pager"><button class="button" type="button" data-action="dream-prev" ${page===0?'disabled':''}>← 앞쪽</button><button class="button primary" type="button" data-action="dream-next" ${page===5?'disabled':''}>다음 쪽 →</button></div><section class="checker"><div class="checker-head"><button class="button" type="button" data-action="dream-check">내 책 점검하기</button><span class="badge">규칙으로 찾음 · AI 아님 · 점수 아님</span></div><div data-dream-feedback role="status" aria-live="polite"></div></section></div>`;}
 function setPath(path,value){let t=d;for(let i=0;i<path.length-1;i++)t=t[path[i]];t[path[path.length-1]]=value;}
 function input(e){const el=e.target;if(!el.dataset||!el.dataset.field)return;const path=el.dataset.field.split('.');if(el.type==='radio'&&!el.checked)return;setPath(path,el.type==='checkbox'?el.checked:el.value);ctx.save();ctx.renderOutput();
  const nav=root.querySelector('[data-stepper]');if(nav)nav.innerHTML=stepper();const m=root.querySelector('[data-map]');if(m)m.innerHTML=map(d);
  if(path[0]==='week'&&path[2]==='done'){const row=el.closest('.week-row');if(row)row.classList.toggle('open',el.checked||has(d.week[path[1]].note));}
  if(path[0]==='aiSource'){render();}}
 function go(n){page=Math.max(0,Math.min(5,n));render();const top=root.querySelector('#diary-top');if(top&&top.getBoundingClientRect().top<0)top.scrollIntoView({block:'start'});}
 function click(e){const b=e.target.closest('button[data-action]');if(!b||!root.contains(b))return;switch(b.dataset.action){
  case'dream-page':go(Number(b.dataset.page));break;case'dream-prev':go(page-1);break;case'dream-next':go(page+1);break;
  case'dream-prompt':ctx.openPrompt();break;
  case'dream-check':{const m=check(d);root.querySelector('[data-dream-feedback]').innerHTML=`<div class="feedback"><strong>점검 질문 ${m.length?m.length+'개':'없음'}</strong>${m.length?`<ul>${m.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>주요 칸이 채워졌어요. 이제 스스로 “내가 고른 계획인가, 바꿀 수 있는가, 이번 주에 할 수 있는가”를 확인해 보세요.</p>'}<p class="muted small">글자 모양만 보고 찾는 규칙이라 놓치거나 잘못 찾을 수 있어요. 내용이 맞는지는 나와 선생님이 함께 판단해요.</p></div>`;break;}}}
 render();root.addEventListener('input',input);root.addEventListener('change',input);root.addEventListener('click',click);
 return()=>{root.removeEventListener('input',input);root.removeEventListener('change',input);root.removeEventListener('click',click);};}
const spec={id:'dream',title:'내꿈다이어리',subtitle:'관심에서 이번 주 한 걸음까지 · 여섯 쪽 책',defaults,normalize,demo,mount,worksheet,prompt,check,filled,bookCSS:BOOK_CSS,version:'0.2'};
if(typeof window!=='undefined'&&window.Edu&&window.Edu.register)window.Edu.register(spec);
if(typeof window!=='undefined')window.DreamDiary=spec;
if(typeof module!=='undefined')module.exports=spec;
})();
