/* 내 꿈 다이어리 v0.4 — 2026-11-05 Claude: 학년군 4과정(대표 결정 D10). 근거 `…/2026-11-05_022836_셈제작소_내꿈다이어리_자료묶음_v1_공통틀/02_교안/교안_v04_학년군4.md`.
   같은 문서의 '앱 인계' 표를 따른다: band 'low'|'upper'|'mid'|'high', 새 칸은 checks(중)·aiNotes[k].flags(고)·courses(고)뿐.
   초1~3 '좋아하는 것 그림책'(네 쪽, 그림 카드 → interest·experience·question·aiNotes[0]·week에 낱말을 넣음), 초4~6 v0.3 그대로,
   중 '진로 탐색 다이어리'(4쪽에 확인 카드), 고 '진로 설계 다이어리'(4쪽 AI 답 검토 표시, 5쪽 과목·활동 계획표). 중·고는 인쇄 때 덧붙임 한 장.
   v0.3 — 2026-11-05 셈제작소 색 · v0.2 — 2026-11-04 Claude · 출처 GPT/Codex v0.1(원본은 그대로 둠).
   band가 없는 옛 파일은 'upper'로 연다. 학년군을 바꿔도 칸을 지우지 않고 화면·인쇄에서만 감춘다. */
(function(){
'use strict';
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=(v,n=300)=>typeof v==='string'?v.slice(0,n):'';
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const has=s=>typeof s==='string'&&s.trim()!=='';
const days=['월','화','수','목','금','토','일'];

/* ---------- 학년군 4과정 ---------- */
const BANDS={
 low:{group:'초등 저학년',grades:'1~3학년',name:'좋아하는 것 그림책',core:'내가 좋아하는 것은 내가 골라요. 네 쪽 그림책을 만들어요.'},
 upper:{group:'초등 고학년',grades:'4~6학년',name:'내 꿈 다이어리',core:'AI는 내 꿈을 정해 주지 않아요. 나는 골라 쓰고 고쳐요. 여섯 쪽 책을 만들어요.'},
 mid:{group:'중학교',grades:'중1~3',name:'진로 탐색 다이어리',core:'AI의 말도 확인하고 써요. 여섯 쪽 책과 확인 카드를 만들어요.'},
 high:{group:'고등학교',grades:'고1~3',name:'진로 설계 다이어리',core:'내 길은 내가 설계하고, AI의 말은 검토해요. 여섯 쪽 책과 과목·활동 계획표를 만들어요.'}};
const BAND_ORDER=['low','upper','mid','high'];
const BASE={
 cover:{name:'표지 · 나의 지도',short:'표지',lead:'책 제목과 별칭을 정해요. 나의 지도는 2~5쪽에 쓴 내 글로 저절로 채워져요.'},
 interest:{name:'관심 · 경험',short:'관심',lead:'잘하는지 판정하지 않아요. 해 보았던 일과 그때의 느낌을 적어요.'},
 futures:{name:'가능성 두 가지',short:'가능성',lead:'한 가지 직업으로 나를 정하지 않아요. 서로 다른 길 두 가지를 작게 탐색해요.'},
 ai:{name:'AI 질문 고쳐 쓰기',short:'AI 교정',lead:'AI가 한 말은 정답이 아니에요. 골라 쓰고, 내 말로 고치고, 이유를 적어요.',ai:true},
 plan:{name:'1년 계획과 이번 주',short:'이번 주',lead:'1년 동안 탐색할 것을 이번 달의 작은 실험과 이번 주 행동으로 나눠요. 쉬는 날도 직접 정해요.'},
 review:{name:'돌아보기 · 고치기',short:'돌아보기',lead:'계획을 지켰는지만 보지 않아요. 알게 된 점으로 다음 계획을 바꿔요.'}};
const OVER={
 mid:{ai:{lead:'AI가 준 질문을 고르고, 하나는 공식 진로 정보로 확인해요.'}},
 high:{ai:{name:'AI 답 검토',short:'AI 검토',lead:'AI 답에서 단정 · 고정관념 · 확인 안 된 숫자를 찾아 고쳐요.'},plan:{lead:'학교에 열린 과목과 학교 안 활동으로 1년 계획을 세워요.'}}};
const LOW=[
 {key:'lcover',name:'표지',short:'표지',lead:'책 이름과 별칭을 정해요. 표지 그림은 종이 그림책에 그려요.'},
 {key:'llike',name:'좋아하는 것 · 해 본 것',short:'좋아해요',lead:'잘하는 것 말고, 좋아하는 것과 해 본 것을 골라요.'},
 {key:'lask',name:'AI 질문과 내 답',short:'AI 질문',lead:'카드 세 장을 고르고 보내요. AI가 해 준 질문에 내 말로 답해요.',ai:true},
 {key:'lweek',name:'이번 주 한 가지',short:'이번 주',lead:'이번 주에 해 볼 일 하나를 고르고, 해 보면 스티커를 붙여요.'}];
const EXTRA={mid:{key:'checks',name:'확인 카드'},high:{key:'courses',name:'과목·활동 계획표'}};
function pagesOf(band){if(band==='low')return LOW;const ov=OVER[band]||{};return ['cover','interest','futures','ai','plan','review'].map(k=>Object.assign({key:k},BASE[k],ov[k]||{}));}
const LAB={interest:'지금 관심 있는 것',experience:'직접 해 본 경험 · 그때의 느낌',strength:'경험에서 발견한 나의 방법',question:'더 알아보고 싶은 질문',path:'해 보고 싶은 활동이나 삶의 모습',reason:'이 길이 궁금한 이유',try:'지금 작게 해 볼 활동',check:'알아볼 정보 · 확인한 출처 · 아직 모르는 점',year:'1년 동안 탐색할 것'};
const LAB_HIGH={interest:'관심 (두 가지)',experience:'해 본 경험',strength:'배운 점',reason:'이유',year:'1년 계획'};
const lab=(band,k)=>(band==='high'&&LAB_HIGH[k])||LAB[k];

/* ---------- 고르기 목록 ---------- */
const picks={keep:'그대로 써 볼래요',change:'고쳐서 쓸래요',drop:'쓰지 않을래요'};
const pickShort={keep:'그대로',change:'고쳐서',drop:'안 씀'};
const LPICK={keep:'좋아요',change:'바꿔요',drop:'안 써요'};
const sources={school:'우리 태블릿에서 직접 물었어요',visit:'선생님 기기에 내가 가서 직접 물었어요',teacher:'선생님이 대신 입력했어요',example:'미리 준비한 예시로 했어요',none:'AI 대신 짝·선생님이 질문해 줬어요'};
const sourceShort={school:'우리 태블릿에서 직접',visit:'선생님 기기에 가서 직접',teacher:'선생님이 대신 입력',example:'미리 준비한 예시',none:'사용하지 않음 (짝·선생님 질문)'};
const LIKE={draw:'그리기',make:'만들기',sport:'운동',song:'노래·춤',animal:'동물',book:'책',cook:'요리',play:'놀이'};
const WONDER={better:'어떻게 하면 더 잘해요?',people:'어떤 사람들이 이 일을 해요?',home:'집에서 해 볼 수 있는 건?'};
const ACT={draw:'그려 보기',make:'만들어 보기',read:'책 찾아 읽기',ask:'집에서 물어보기',practice:'연습해 보기',try:'직접 해 보기'};
const FLAGS={sure:'단정 (“반드시”)',bias:'고정관념 · 편견',fact:'확인 안 된 숫자 · 사실'};
const FLAG_SHORT={sure:'단정',bias:'고정관념',fact:'확인 필요'};
const FOUND={yes:'찾았어요',part:'일부만 찾았어요',no:'못 찾았어요'};
const CHECK_PICK='AI 질문 중 공식 자료에 답이 있는 사실 질문을 골라요. 나에 대한 질문은 4쪽에서 내가 답해요.';
const CHECK_RULE='블로그·광고 글은 출처가 아니에요. 못 찾아도 감점 없어요.';
const NOAI='짝·선생님이 해 준 질문';
/* 보내기 전 지울 것(11/5 07시 검증 D22 반영): 화면 확인 상자 · 인쇄 AI 쪽 · 선생님 요청문이 같은 목록을 쓴다 */
const DELETE_TEXT={
 low:'이름 · 학교 · 반 · 친구 이름을 쓰지 않아요. 얼굴 사진과 목소리는 보내지 않아요.',
 other:'이름·별칭·학교·반·연락처·친구 이름·성적과 알아볼 수 있는 가족·건강·장소 이야기는 빼요. 얼굴 사진과 목소리는 보내지 않아요.'};
const deleteText=b=>b==='low'?DELETE_TEXT.low:DELETE_TEXT.other;
/* AI 대신 짝·선생님 질문(aiSource none)일 때 저학년 3쪽 안내 문장 */
const leadOf=(d,p)=>d.band==='low'&&p.key==='lask'&&d.aiSource==='none'?'궁금한 것 카드를 고르면 짝이나 선생님이 질문으로 읽어 줘요. 들은 질문에 내 말로 답해요.':p.lead;
const SAFETY={low:'이름 쓰지 않기 · 카드만 보내기 · AI 말은 생각 하나 · 이상하면 손 들기',other:'이름·학교·친구 이름 넣지 않기 · 카드 칸만 채워 보내기 · 사실은 출처로 확인하기 · 이상한 답은 손 들기'};
const safety=b=>b==='low'?SAFETY.low:SAFETY.other;
const SWITCH='기본은 내가 직접 써요. 안 되면 선생님 기기에 가서 직접 쳐요. 그것도 어려울 때만 선생님이 대신 입력해요.';
const ASK_END={
 low:'초등학교 저학년이 알아듣는 쉬운 말로 두 문장 안에 답하고, 나에게 질문 하나를 해 줘. 직업을 정해 주지 마.',
 upper:'내 진로를 정해 주지 말고, 더 떠올릴 질문 3개와 이번 주에 해 볼 작은 활동 2개를 알려 줘.',
 mid:'내 진로를 정해 주지 말고, 가능성마다 내가 확인해 볼 질문 3개를 알려 줘.',
 high:'내 진로를 정해 주지 말고, 가능성마다 필요한 역량 3개와 내가 확인할 질문 2개를 알려 줘. 확실하지 않은 정보는 확실하지 않다고 표시해 줘.'};
const ASK_LINES={low:'카드 세 장(좋아하는 것 · 해 본 것 · 궁금한 것)',upper:'세 줄(관심 · 해 본 일 · 궁금한 것)',mid:'다섯 줄(관심 · 해 본 일 · 궁금한 것 · 가능성 두 가지)',high:'네 줄(관심 · 해 본 경험과 배운 점 · 가능성 두 가지)'};

/* ---------- 그림 카드 아이콘 (선만 써서 인쇄 배경을 꺼도 보임 · 사람 얼굴 없음) ---------- */
const ICON={
 draw:'<path d="M11 37l2.5-8.5L31 11l6 6-17.5 17.5z"/><path d="M27 15l6 6"/><path d="M11 37l8.5-2.5"/>',
 make:'<rect x="9" y="25" width="14" height="13" rx="2"/><rect x="25" y="25" width="14" height="13" rx="2"/><rect x="17" y="10" width="14" height="13" rx="2"/>',
 sport:'<circle cx="24" cy="24" r="14"/><path d="M24 10c-6 7-6 21 0 28M24 10c6 7 6 21 0 28M10 24h28"/>',
 song:'<path d="M19 33V13l17-4v20"/><circle cx="15" cy="33" r="4"/><circle cx="32" cy="29" r="4"/>',
 animal:'<ellipse cx="24" cy="31" rx="8" ry="7"/><circle cx="13" cy="21" r="3.5"/><circle cx="20" cy="14" r="3.5"/><circle cx="28" cy="14" r="3.5"/><circle cx="35" cy="21" r="3.5"/>',
 book:'<path d="M24 15c-5-4-11-4-15-2v23c4-2 10-2 15 2 5-4 11-4 15-2V13c-4-2-10-2-15 2z"/><path d="M24 15v23"/>',
 cook:'<path d="M10 22h28v9a7 7 0 0 1-7 7H17a7 7 0 0 1-7-7z"/><path d="M6 22h4M38 22h4M15 17h18M22 13h4"/>',
 play:'<path d="M24 6l12 14-12 14-12-14z"/><path d="M12 20h24M24 6v28"/><path d="M24 34c-3 3 3 5 0 9"/>',
 better:'<path d="M24 8l4.7 9.6 10.5 1.5-7.6 7.4 1.8 10.5L24 32l-9.4 5 1.8-10.5-7.6-7.4 10.5-1.5z"/>',
 people:'<path d="M8 38V24h8v14M20 38V14h8v24M32 38V20h8v18"/><path d="M5 38h38"/>',
 home:'<path d="M8 24L24 10l16 14"/><path d="M13 20v18h22V20"/><path d="M21 38v-9h6v9"/>',
 read:'<path d="M22 13c-4-3-9-3-13-1v21c4-2 9-2 13 1V13z"/><path d="M22 13c2-1.5 4-2.2 6-2.4"/><circle cx="33" cy="25" r="6"/><path d="M37.5 29.5L42 34"/>',
 ask:'<path d="M9 12h30v18H22l-8 7v-7H9z"/><path d="M20.5 18a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.2-1.5 2.3"/><path d="M24 27v.5"/>',
 practice:'<path d="M14 18a12 12 0 0 1 21-2"/><path d="M36 9v8h-8"/><path d="M34 30a12 12 0 0 1-21 2"/><path d="M12 39v-8h8"/><circle cx="24" cy="24" r="2.5"/>',
 try:'<path d="M14 40V8"/><path d="M14 9h20l-4 7 4 7H14"/>',
 keep:'<path d="M24 38C11 29 8 21 12 15.5c3.5-4.5 9.5-3.5 12 1 2.5-4.5 8.5-5.5 12-1 4 5.5 1 13.5-12 22.5z"/>',
 change:'<path d="M13 19a12 12 0 0 1 22-3"/><path d="M36 9v8h-8"/><path d="M35 29a12 12 0 0 1-22 3"/><path d="M12 39v-8h8"/>',
 drop:'<circle cx="24" cy="24" r="14"/><path d="M17 17l14 14M31 17L17 31"/>'};
const icon=(k,size=40)=>ICON[k]?`<svg class="ic" viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`:'';

/* ---------- 저학년: 카드 낱말을 기존 칸에 ‘카드 · 낱말’로 넣고 다시 읽는다 ---------- */
const SEP=' · ';
function splitCard(text,set){const t=String(text||''),i=t.indexOf(SEP),head=(i<0?t:t.slice(0,i)).trim(),k=Object.keys(set).find(x=>set[x]===head);return k?{card:k,word:i<0?'':t.slice(i+SEP.length)}:{card:'',word:t};}
const joinCard=(set,card,word)=>{const a=card?set[card]:'',b=String(word||'').trim();return a&&b?a+SEP+b:a||b;};
const wonderOf=d=>Object.keys(WONDER).find(k=>WONDER[k]===String(d.question||'').trim())||'';
const lowDay=d=>d.week.findIndex(x=>has(x.action));
const josa=(w,a,b)=>{const c=String(w).trim().slice(-1).charCodeAt(0);if(!(c>=0xAC00&&c<=0xD7A3))return a+'('+b+')';return (c-0xAC00)%28?a:b;};
const lowWord=(text,set)=>{const s=splitCard(text,set);return has(s.word)?s.word.trim():s.card?set[s.card]:'';};

/* ---------- 데이터 ---------- */
const blankNote=()=>({said:'',pick:'',mine:'',why:'',flags:[]});
const blankCheck=()=>({q:'',site:'',date:'',learned:'',found:'',ask:''});
const blankCourse=()=>({subject1:'',subject2:'',activity:'',toCheck:''});
function defaults(band){return {band:Object.hasOwn(BANDS,band)?band:'upper',title:'',alias:'',motto:'',interest:'',experience:'',strength:'',question:'',futures:[{path:'',reason:'',try:'',check:''},{path:'',reason:'',try:'',check:''}],aiSource:'',aiNotes:[blankNote(),blankNote(),blankNote()],checks:[blankCheck(),blankCheck()],year:'',month:'',evidence:'',helper:'',weekStart:'',week:days.map(()=>({action:'',done:false,note:''})),courses:[blankCourse(),blankCourse()],learned:'',change:'',correction:'',next:'',reviewed:false};}
const pickOf=(set,v)=>Object.hasOwn(set,v)?v:'';
function normalize(raw){const r=obj(raw),d=defaults(r.band);for(const k of ['title','alias','motto','interest','experience','strength','question','year','month','evidence','helper','learned','change','correction','next'])d[k]=txt(r[k],['title','alias'].includes(k)?70:300);d.weekStart=txt(r.weekStart,40);
 d.futures=d.futures.map((_,i)=>{const f=obj(Array.isArray(r.futures)?r.futures[i]:null);return {path:txt(f.path,100),reason:txt(f.reason,240),try:txt(f.try,240),check:txt(f.check,240)};});
 d.aiSource=pickOf(sources,r.aiSource);
 d.aiNotes=d.aiNotes.map((_,i)=>{const a=obj(Array.isArray(r.aiNotes)?r.aiNotes[i]:null);return {said:txt(a.said,240),pick:pickOf(picks,a.pick),mine:txt(a.mine,200),why:txt(a.why,120),flags:Object.keys(FLAGS).filter(k=>Array.isArray(a.flags)&&a.flags.includes(k))};});
 d.checks=d.checks.map((_,i)=>{const c=obj(Array.isArray(r.checks)?r.checks[i]:null);return {q:txt(c.q,160),site:txt(c.site,100),date:txt(c.date,30),learned:txt(c.learned,200),found:pickOf(FOUND,c.found),ask:txt(c.ask,60)};}); // 예전 same(AI 말과 같음/다름)은 읽지 않는다(11/5 07시 검증 반영)
 d.week=d.week.map((_,i)=>{const x=obj(Array.isArray(r.week)?r.week[i]:null);return {action:txt(x.action,100),done:x.done===true,note:txt(x.note,100)};});
 d.courses=d.courses.map((_,i)=>{const c=obj(Array.isArray(r.courses)?r.courses[i]:null);return {subject1:txt(c.subject1,60),subject2:txt(c.subject2,60),activity:txt(c.activity,120),toCheck:txt(c.toCheck,200)};});
 d.reviewed=r.reviewed===true;return d;}

/* ---------- 예제 (학년군마다 한 권 · 모두 미리 써 둔 가상 예시) ---------- */
const W7=a=>a.map(x=>({action:x}));
const DEMO={
 upper:{band:'upper',title:'내가 궁금한 내일',alias:'새싹 (가상 예시)',motto:'작게 해 보고, 내 생각으로 고치기',interest:'그림으로 설명하기, 동네 새 관찰하기',experience:'친구가 종이접기를 어려워해서 순서를 그림으로 그려 주었다. 친구가 따라 접었을 때 뿌듯했다.',strength:'헷갈리는 부분을 찾아 순서를 나누어 설명했다. 언제나 잘한다는 뜻은 아니다.',question:'사람에게 설명하는 일과 자연을 관찰하는 일 중 어떤 활동이 더 즐거울까?',
  futures:[{path:'설명 그림을 만드는 나',reason:'그림으로 알려 주는 활동이 즐거웠다.',try:'쉬운 놀이 규칙을 4칸 그림으로 만들고 읽기 쉬운지 물어본다.',check:'그림을 만드는 일에는 어떤 과정이 있는지 도서관 책에서 찾아본다. 책 제목·쪽은 직접 적는다.'},{path:'자연을 관찰하고 기록하는 나',reason:'같은 장소에서도 날마다 다른 것을 발견하는 것이 흥미롭다.',try:'학교 주변에서 어른과 함께 식물 한 가지를 관찰하고 그린다.',check:'이름을 모르면 추측과 확인한 정보를 나누어 적고, 도감이나 선생님에게 확인한다.'}],
  aiSource:'example',aiNotes:[
   {said:'(가상 예시) 그림 설명을 좋아한다면 디자이너가 꼭 맞을 거예요.',pick:'change',mine:'그림으로 설명하는 활동을 세 번 더 해 보고, 어떤 점이 즐거운지 비교해 볼래요.',why:'한 번 해 본 일로 직업을 정하기엔 일러요. 단정하는 말이라 고쳤어요.'},
   {said:'(가상 예시) 내 그림 설명서를 친구 두 명에게 보여 주고 어디가 헷갈렸는지 물어보세요.',pick:'keep',mine:'',why:'이번 주에 바로 해 볼 수 있어요.'},
   {said:'(가상 예시) 매일 1시간씩 새를 관찰해 보세요.',pick:'change',mine:'토요일에 15분만, 어른과 함께 학교 주변에서 관찰할래요.',why:'매일 1시간은 내 시간표에 맞지 않아요. 안전도 생각했어요.'}],
  year:'관심 있는 두 활동을 각각 세 번 해 보고, 즐거웠던 과정과 힘들었던 과정을 비교한다.',month:'그림 설명 한 장과 관찰 기록 한 장을 만든다.',evidence:'결과 두 장과 각각 고친 이유 한 가지를 남긴다.',helper:'도서관 자료, 선생님의 짧은 의견. 다른 사람 이름이나 연락처는 적지 않는다.',weekStart:'연습용 한 주 (실제 날짜 아님)',
  week:W7(['10분: 궁금한 놀이 규칙 고르기','15분: 규칙을 4칸 그림으로 그리기','10분: 친구에게 헷갈린 곳 물어보기','10분: 그림 한 곳 고치기','쉬는 날','15분: 어른과 식물 관찰하기','5분: 다음 주 한 가지만 고르기']),
  learned:'예시: 설명을 받는 사람에게 물어보면 내가 놓친 점을 알 수 있다. 실제로 해 본 뒤 내 경험으로 바꾼다.',change:'예시: 시간이 부족하면 두 활동을 한 주에 다 하지 않고 한 활동부터 해 본다.',correction:'예시: “나는 반드시 디자이너가 된다” → “그림으로 설명하는 활동을 더 해 보고 싶다”. 아직 한 번만 해 봤기 때문.',next:'예시: 다음 주에는 고친 그림이 이해되는지 확인한다.'},
 low:{band:'low',title:'내가 좋아하는 것',alias:'콩콩 (가상 예시)',interest:'그리기 · 고양이',experience:'만들기 · 종이접기',question:WONDER.better,aiSource:'example',
  aiNotes:[{said:'(가상 예시) 종이접기는 접는 순서를 천천히 따라 하면 더 잘돼요. 너는 어떤 순서가 제일 재미있었어?',pick:'keep',mine:'마지막에 펼쳐 보는 순서'}],
  week:[{},{},{},{},{},{action:'그려 보기 · 종이접기 순서 그림'},{}]},
 mid:{band:'mid',title:'내가 기록하는 장면',alias:'바람 (가상 예시)',motto:'확인하고, 작게 해 보기',interest:'사진 찍기, 학교 행사 준비',experience:'학급 행사 때 사진 담당을 맡아 장면을 골라 찍고 게시판에 정리했다. 친구들이 사진을 보며 그날 이야기를 다시 해서 뿌듯했다.',strength:'찍기 전에 무엇을 보여 줄지 먼저 정했다. 늘 잘한다는 뜻은 아니다.',question:'기록하는 일과 행사를 꾸리는 일 중 어떤 과정이 더 즐거울까?',
  futures:[{path:'장면을 기록하고 전하는 나',reason:'고른 사진으로 그날을 다시 이야기할 수 있었다.',try:'학교 행사 하나를 사진 다섯 장과 설명 한 줄씩으로 정리해 본다.',check:'사진·영상으로 기록하는 일의 과정을 공식 진로 정보에서 찾아본다.'},{path:'사람들이 모이는 자리를 꾸리는 나',reason:'행사 준비 순서를 짜는 일도 재미있었다.',try:'학급 회의 하나의 준비 순서표를 만들어 본다.',check:'행사를 기획하는 일에는 어떤 일이 있는지 확인한다.'}],
  aiSource:'example',aiNotes:[
   {said:'(가상 예시) 사진으로 기록하는 일을 하는 사람은 하루에 어떤 일을 하는지 확인해 보세요.',pick:'keep',mine:'',why:'확인 카드로 직접 찾아볼 수 있어요.'},
   {said:'(가상 예시) 사진을 좋아하면 반드시 사진작가가 되어야 해요.',pick:'change',mine:'사진으로 기록하는 활동을 몇 번 더 해 보고, 어떤 과정이 즐거운지 본다.',why:'한 가지로 정하는 단정이라 고쳤어요.'},
   {said:'(가상 예시) 행사를 꾸리는 일은 성격이 활발한 사람만 할 수 있어요.',pick:'drop',mine:'',why:'성격으로 단정하는 고정관념이라 쓰지 않아요.'}],
  checks:[{q:'(가상 예시) 사진·영상으로 기록하는 일을 하는 사람은 어떤 일을 하나요?',site:'(가상 예시) 공식 진로 정보 사이트 이름',date:'연습용 날짜',learned:'(가상 예시) 실제로 찾은 답을 내 말로 한 줄 적어요.',found:'part',ask:'진로 선생님'}],
  year:'두 가능성을 각각 세 번씩 해 보고, 확인 카드 두 장으로 알게 된 것을 비교한다.',month:'행사 사진 정리 한 번, 회의 준비 순서표 한 번.',evidence:'정리한 결과물과 확인 카드.',helper:'담임 선생님, 학교 도서관. 다른 사람 이름은 적지 않는다.',weekStart:'연습용 한 주 (실제 날짜 아님)',
  week:W7(['15분: 확인할 질문 하나 고르기','20분: 공식 진로 정보에서 찾아 확인 카드 쓰기','쉬는 날','15분: 사진 다섯 장 고르기','10분: 설명 한 줄씩 쓰기','쉬는 날','5분: 다음 주 한 가지 고르기']),
  learned:'예시: 공식 자료에서 찾은 것과 못 찾은 것을 나눠 적으니 다음에 물어볼 것이 분명해졌다. 실제로 해 본 뒤 내 경험으로 바꾼다.',change:'예시: 확인 카드를 쓴 뒤 해 볼 활동 하나를 바꾼다.',correction:'예시: “반드시 사진작가가 되어야 해” → “사진으로 기록하는 활동을 더 해 보고 싶다”. 한 번 해 본 일로 정하기엔 이르다.',next:'예시: 다음 주에는 확인 카드 한 장을 더 쓴다.'},
 high:{band:'high',title:'자료로 보는 우리 동네',alias:'징검다리 (가상 예시)',motto:'설계하고, 검토하고, 고치기',interest:'환경 문제, 숫자로 설명하기',experience:'동아리에서 급식 잔반을 2주 동안 세어 표로 정리했다.',strength:'숫자를 모으니 숫자 없이 설명할 때보다 쉬웠다. 표를 고치는 데 시간이 오래 걸렸다.',question:'자료를 다루는 일과 사람을 설득하는 일 중 무엇이 더 맞을까?',
  futures:[{path:'자료로 환경 문제를 설명하는 나',reason:'숫자로 보여 주니 친구들이 관심을 가졌다.',try:'공개된 지역 자료 하나를 찾아 표 하나로 정리해 본다.',check:'관련 직업·학과 정보를 공식 진로 정보에서 확인한다.'},{path:'캠페인을 기획하는 나',reason:'잔반 결과를 알리는 포스터를 만들 때 즐거웠다.',try:'학급 캠페인 하나의 순서를 짜 본다.',check:'기획하는 일에 필요한 역량을 확인한다.'}],
  aiSource:'example',aiNotes:[
   {said:'(가상 예시) 환경 관련 학과에 가면 반드시 성공할 거예요.',pick:'drop',mine:'',why:'단정이고 확인되지 않은 말이라 쓰지 않는다.',flags:['sure','fact']},
   {said:'(가상 예시) 자료를 다루려면 통계와 프로그래밍 역량이 필요해요. 학교 정보 수업에서 시작해 볼 수 있어요.',pick:'keep',mine:'',why:'학교 과목과 이어서 확인해 볼 수 있다.'},
   {said:'(가상 예시) 이 분야는 남학생에게 더 잘 맞아요.',pick:'change',mine:'관심과 경험으로 판단한다. 성별은 이유가 아니다.',why:'고정관념이라 고쳤다.',flags:['bias']}],
  year:'두 가능성과 이어진 과목·활동을 하나씩 해 보고, 학기 말에 계획표를 고친다.',month:'지역 자료 표 하나, 캠페인 순서표 하나.',evidence:'만든 표와 순서표, 고친 이유.',helper:'담임 선생님, 진로 선생님, 학교 개설 과목 목록.',weekStart:'연습용 한 주 (실제 날짜 아님)',
  week:W7(['20분: 공개 자료 하나 찾기','쉬는 날','20분: 표 하나로 정리하기','10분: 개설 과목 목록 확인하기','쉬는 날','15분: 캠페인 순서 정리하기','5분: 다음 주 한 가지 고르기']),
  courses:[{subject1:'(예시) 정보',subject2:'(예시) 통계를 다루는 수학 과목',activity:'환경 동아리 자료 정리 맡기',toCheck:'개설 학년, 먼저 들어야 하는 과목'},{subject1:'(예시) 사회 계열 과목',subject2:'',activity:'학급 캠페인 한 번 기획',toCheck:'개설 여부는 담임 선생님께 확인'}],
  learned:'예시: AI 답에서 확인 안 된 말을 걸러 내니 계획이 구체적이 되었다.',change:'예시: 과목 개설 학년을 확인한 뒤 계획 순서를 바꾼다.',correction:'예시: “반드시 성공할 거예요” → “관련 활동을 해 보며 맞는지 확인하겠다”. 확인되지 않은 단정이기 때문.',next:'예시: 다음 주에는 진로 선생님께 과목 순서를 여쭌다.'}};
function demo(band){return normalize(DEMO[Object.hasOwn(BANDS,band)?band:'upper']);}

/* ---------- AI에 넣을 말 (학생 직접 · 선생님 메뉴 같은 문장 · 쓴 칸만 · 자동 전송 없음) ---------- */
function askParts(d){const b=d.band;
 if(b==='low')return [['좋아하는 것',lowWord(d.interest,LIKE),splitCard(d.interest,LIKE).card],['해 본 것',lowWord(d.experience,LIKE),splitCard(d.experience,LIKE).card],['궁금한 것',has(d.question)?d.question.trim():'',wonderOf(d)]];
 if(b==='high'){const ex=[d.experience,d.strength].filter(has).map(s=>s.trim()).join(' / ');return [['관심',d.interest],['해 본 경험과 배운 점',ex],['가능성 1',d.futures[0].path],['가능성 2',d.futures[1].path]];}
 const r=[['관심',d.interest],['해 본 일',d.experience],['궁금한 것',d.question]];if(b==='mid')r.push(['가능성 1',d.futures[0].path],['가능성 2',d.futures[1].path]);return r;}
function askText(d){const parts=askParts(d).filter(p=>has(p[1]));if(!parts.length)return '';
 if(d.band==='low'){const [a,b,c]=askParts(d).map(p=>has(p[1])?p[1].trim():'');const s=[];if(a)s.push(`나는 ${a}${josa(a,'을','를')} 좋아해.`);if(b)s.push(`${b}${josa(b,'을','를')} 해 봤어.`);if(c)s.push(`궁금한 것: ${c}`);return s.join(' ')+' '+ASK_END.low;}
 return parts.map(p=>`${p[0]}: ${p[1].trim()}`).join('\n')+'\n'+ASK_END[d.band];}

/* ---------- 규칙형 기능: 쪽 채움 표시 · 점검 질문 ---------- */
function filled(d){
 if(d.band==='low')return [has(d.title)||has(d.alias),has(d.interest)||has(d.experience),has(d.question)||has(d.aiNotes[0].said)||has(d.aiNotes[0].mine),lowDay(d)>=0];
 return [has(d.title)||has(d.alias)||has(d.motto),has(d.interest)||has(d.experience)||has(d.strength)||has(d.question),d.futures.some(x=>has(x.path)||has(x.try)),d.aiSource==='none'||d.aiNotes.some(a=>has(a.said)||has(a.mine))||(d.band==='mid'&&d.checks.some(c=>has(c.q)||has(c.site)||has(c.learned))),has(d.year)||has(d.month)||d.week.some(x=>has(x.action))||(d.band==='high'&&d.courses.some(c=>has(c.subject1)||has(c.activity))),has(d.learned)||has(d.change)||has(d.correction)||has(d.next)];}
const PRIVATE=[[/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/,'전화번호'],[/[\w.+-]+@[\w-]+\.[\w.]+/,'이메일 주소'],[/[가-힣]{2,12}(초등학교|중학교|고등학교|초교)/,'학교 이름'],[/\d\s*학년\s*\d+\s*반/,'학년·반'],[/\d+\s*동\s*\d+\s*호/,'집 주소(동·호)'],[/(19|20)\d{2}\s*[년.\-/]\s*\d{1,2}\s*[월.\-/]\s*\d{1,2}\s*일?\s*(생|출생)/,'생년월일'],[/(내신|\d\s*등급|전교\s*\d+\s*등|평균\s*\d{2,3}\s*점)/,'성적']];
const SURE=/(반드시|무조건|절대로?|100\s*%|틀림없이|꼭\s*[가-힣]{0,12}(될\s*거|된다|될\s*것|돼야))/;
const privateHits=t=>PRIVATE.filter(([re])=>re.test(t)).map(([,l])=>l);
function texts(d){const out=[];const add=(where,v)=>{if(has(v))out.push([where,v]);};
 if(d.band==='low'){add('1쪽',d.title);add('1쪽',d.alias);add('2쪽',d.interest);add('2쪽',d.experience);add('3쪽',d.aiNotes[0].mine);d.week.forEach(x=>add('4쪽',x.action));return out;}
 add('1쪽',d.title);add('1쪽',d.alias);add('1쪽',d.motto);for(const k of ['interest','experience','strength','question'])add('2쪽',d[k]);d.futures.forEach(f=>{for(const k of ['path','reason','try','check'])add('3쪽',f[k]);});d.aiNotes.forEach(a=>{add('4쪽',a.mine);add('4쪽',a.why);});
 if(d.band==='mid')d.checks.forEach(c=>{for(const k of ['q','site','learned','ask'])add('4쪽 확인 카드',c[k]);});
 for(const k of ['year','month','evidence','helper','weekStart'])add('5쪽',d[k]);d.week.forEach(x=>{add('5쪽',x.action);add('5쪽',x.note);});
 if(d.band==='high')d.courses.forEach(c=>{for(const k of ['subject1','subject2','activity','toCheck'])add('5쪽 계획표',c[k]);});
 for(const k of ['learned','change','next'])add('6쪽',d[k]);return out;}
function check(d){const m=[],b=d.band;
 const seen=new Set();for(const [where,v] of texts(d)){const hit=privateHits(v).filter(l=>!seen.has(where+l));hit.forEach(l=>seen.add(where+l));if(hit.length)m.push(`${where}에 ${hit.join('·')}처럼 보이는 글이 있어요. 책에는 별칭만 쓰고 지워 주세요.`);}
 if(b==='low'){const f=filled(d);['1쪽: 책 이름이나 별칭을 적어요.','2쪽: 좋아하는 것과 해 본 것 카드를 골라요.',`3쪽: 궁금한 것 카드를 고르고, ${d.aiSource==='none'?NOAI:'AI가 해 준 질문'}에 답해요.`,'4쪽: 이번 주에 해 볼 것과 요일을 골라요.'].forEach((x,i)=>{if(!f[i])m.push(x);});return m;}
 if(!has(d.alias))m.push('표지에 실명 대신 별칭을 적었나요?');
 if(!has(d.experience))m.push('2쪽: 직접 해 본 경험 한 가지가 있나요?');
 d.futures.forEach((f,i)=>{if(!has(f.path)||!has(f.try))m.push(`3쪽: 가능성 ${i+1}의 모습과 지금 작게 해 볼 활동을 함께 적었나요?`);});
 if(has(d.futures[0].path)&&d.futures[0].path.trim()===d.futures[1].path.trim())m.push('3쪽: 가능성 두 가지가 같아요. 서로 다른 활동을 비교해 볼까요?');
 if(!d.aiSource)m.push('4쪽: AI를 어디에서 만났는지(또는 AI 없이 했는지) 골라 주세요.');
 d.aiNotes.forEach((a,i)=>{if(has(a.said)&&!a.pick)m.push(`4쪽 ${i+1}번: AI가 한 말을 그대로 쓸지, 고칠지, 안 쓸지 골라 주세요.`);if(a.pick==='change'&&!has(a.mine))m.push(`4쪽 ${i+1}번: 고쳐 쓸 문장을 내 말로 적어 보세요.`);if(a.pick&&!has(a.why))m.push(`4쪽 ${i+1}번: 그렇게 고른 이유를 한 줄 적어 보세요.`);
  if(b==='high'){const s=a.mine.match(SURE);if(s)m.push(`4쪽 ${i+1}번: 고친 문장에 아직 “${s[0]}”처럼 단정하는 말이 남아 있어요.`);}});
 if(b==='mid')d.checks.forEach((c,i)=>{const n=`4쪽 확인 카드 ${i+1}`,any=has(c.q)||has(c.site)||has(c.date)||has(c.learned)||c.found||has(c.ask);
  if(i===0||any){if(!has(c.q))m.push(`${n}: 공식 자료에서 답을 찾을 사실 질문을 하나 적어요.`);if(!has(c.site))m.push(`${n}: 출처 이름을 적어요.`);if(!has(c.date))m.push(`${n}: 확인한 날을 적어요.`);if(!c.found)m.push(`${n}: 찾았어요 · 일부만 · 못 찾았어요 중에서 골라요.`);}
  if(/^\s*(나는|내가|나에게|나한테)/.test(c.q))m.push(`${n}: 나에 대한 질문은 4쪽에서 내가 답해요. 확인 카드에는 공식 자료에 답이 있는 사실 질문을 골라요.`);
  if(/(블로그|카페|광고|유튜브)/.test(c.site))m.push(`${n}: 블로그·광고 글은 출처가 아니에요. 공식 진로 정보로 확인해 볼까요?`);
  if((c.found==='part'||c.found==='no')&&!has(c.ask))m.push(`${n}: 못 찾은 것은 누구에게 물어볼지(진로 선생님·담임처럼 역할만) 적어요.`);});
 if(!has(d.year)||!has(d.month))m.push(`5쪽: ${lab(b,'year')}${josa(lab(b,'year'),'을','를')} 이번 달 작은 실험으로 나눴나요?`);
 const acts=d.week.filter(x=>has(x.action)&&!/쉬|쉼|미정/.test(x.action));if(!acts.length)m.push('5쪽: 이번 주에 할 수 있는 행동을 하루만이라도 골라 보세요.');else if(acts.some(x=>!/\d/.test(x.action)))m.push('5쪽: 행동에 시간(예: 10분)을 적으면 실행하기 쉬워요.');
 for(const [where,v] of texts(d)){const s=v.match(SURE);if(s){m.push(`${where}에 “${s[0]}”처럼 단정하는 말이 있어요. “~해 보고 싶다”처럼 탐색하는 말로 고쳐 볼까요?`);break;}}
 if(!has(d.correction))m.push('6쪽: 고친 문장(고치기 전 → 고친 뒤 · 이유)을 하나 적었나요?');
 if(!d.reviewed)m.push('6쪽: 공개하고 싶지 않은 정보가 없는지 직접 읽고 확인했나요?');
 return m;}

/* ---------- 책(인쇄·미리보기) ---------- */
const BOOK_CSS=`.dp{font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;color:#10221f;line-height:1.6;word-break:keep-all;overflow-wrap:anywhere;font-size:11pt}
.dp *{box-sizing:border-box}.dp h1,.dp h2,.dp h3,.dp p{margin:0}
.dp-head{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0b7a75;padding-bottom:2mm;margin-bottom:5mm;font-size:9pt;color:#3d5651;font-weight:700;letter-spacing:.02em}
.dp-head span:first-child::before{content:"";display:inline-block;width:0;height:0;border:1.3mm solid #0b7a75;border-radius:50%;margin-right:2mm;vertical-align:.1em}
.dp-title{font-size:18pt;font-weight:800;letter-spacing:-.02em;display:flex;gap:3mm;align-items:center;margin-bottom:1.5mm}
.dp-title b{display:inline-flex;align-items:center;justify-content:center;width:9mm;height:9mm;border:1.6px solid #0b7a75;border-radius:50%;color:#0b7a75;font-size:12pt;flex:none}
.dp-title.ai b{border-color:#e8562f;color:#e8562f}.dp-title i{font-style:normal;font-size:9pt;font-weight:800;color:#e8562f;border:1.4px solid #e8562f;border-radius:2mm;padding:0 1.6mm;margin-left:1mm}
.dp-lead{font-size:10pt;color:#3d5651;margin-bottom:5mm}
.dp-block{break-inside:avoid;margin-bottom:4.5mm}
.dp h3{font-size:10.5pt;font-weight:700;color:#075e5a;margin-bottom:1.5mm}
.dp-text{white-space:pre-wrap;border-left:2px solid #b0cdc5;padding:.8mm 0 .8mm 3mm}
.dp-lines{display:block}.dp-lines i{display:block;height:9.5mm;border-bottom:1px solid #b0cdc5}
.dp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}
.dp-card{border:1px solid #b0cdc5;border-radius:3mm;padding:3.5mm 4.5mm 1mm;break-inside:avoid;margin-bottom:4.5mm}
.dp-card .dp-lines i{height:8.5mm}.dp-card .dp-block{margin-bottom:3mm}
.dp-card>h3{font-size:12pt;color:#10221f;border-bottom:1px dashed #b0cdc5;padding-bottom:1.5mm;margin-bottom:3mm}
.dp-card>h3 em{font-style:normal;color:#0b7a75;margin-right:2mm}
.dp-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10pt}
.dp-table th,.dp-table td{border:1px solid #8aa8a0;padding:1.8mm 2mm;vertical-align:top;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere}
.dp-table thead th{color:#075e5a;font-weight:700;border-bottom:2px solid #0b7a75}
.dp-table tbody th{text-align:center;font-weight:800}
.dp-note{font-size:9.5pt;color:#3d5651;border:1px solid #b0cdc5;border-left:3px solid #0b7a75;padding:2mm 3mm;margin:3mm 0 4mm;break-inside:avoid}
.dp-note.ai{border-left-color:#e8562f}
.dp-choice{margin:0 0 3mm;font-size:10pt}.dp-choice span{display:inline-block;margin-right:5mm;white-space:nowrap}
.dp-foot{margin-top:5mm;font-size:8.5pt;color:#56706a;border-top:1px solid #cfe3dd;padding-top:2mm}
.dp-cover{text-align:left;padding-top:6mm}
.dp-kicker{font-size:10pt;color:#0b7a75;font-weight:700;letter-spacing:.04em;margin-bottom:3mm}
.dp-book{font-size:28pt;font-weight:900;letter-spacing:-.03em;line-height:1.2;margin-bottom:3mm}
.dp-book .dp-lines i{height:14mm}
.dp-by{font-size:12pt;margin-bottom:6mm}.dp-by b{border-bottom:1px solid #8aa8a0;padding:0 2mm;min-width:45mm;display:inline-block}
.dp-motto{border:1px solid #b0cdc5;border-radius:3mm;padding:3mm 5mm;margin-bottom:8mm;font-size:12pt}
.dp-motto small{display:block;font-size:9pt;color:#3d5651;font-weight:700}
.dp-map{position:relative;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:auto auto auto;gap:7mm 6mm;margin:3mm 0 6mm}
.dp-map svg{position:absolute;inset:0;width:100%;height:100%;z-index:0}
.dp-node{position:relative;z-index:1;background:#fff;border:1.4px solid #0b7a75;border-radius:4mm;padding:2.5mm 3mm;min-height:24mm;font-size:10pt;break-inside:avoid}
.dp-node small{display:block;font-size:8.5pt;color:#0b7a75;font-weight:800;margin-bottom:1mm}
.dp-node .dp-lines i{height:7mm}
.dp-me{grid-column:2;grid-row:2;align-self:center;justify-self:center;width:34mm;height:34mm;border-radius:50%;border:2.2px solid #0b7a75;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2mm;font-weight:800;font-size:11pt;background:#fff;position:relative;z-index:1}
.dp-me small{font-size:8pt;color:#3d5651;font-weight:700}
.dp-cover-note{font-size:9.5pt;color:#3d5651}
.dp-draw{border:1.4px dashed #8fb5a9;border-radius:4mm;height:62mm;padding:2.5mm 4mm;margin-bottom:4mm;break-inside:avoid}.dp-draw small{font-size:9pt;color:#0b7a75;font-weight:700}
.dp-draw-xl{height:120mm}.dp-draw-m{height:56mm}.dp-draw-s{height:44mm}
.dp-pics{display:grid;grid-template-columns:repeat(8,1fr);gap:2mm;margin:1mm 0 3mm}.dp-pics.six{grid-template-columns:repeat(6,1fr)}.dp-pics.three{grid-template-columns:repeat(3,1fr);gap:4mm}
.dp-pic{border:1px solid #b0cdc5;border-radius:3mm;text-align:center;padding:1.6mm .5mm 1.2mm;font-size:9pt;font-weight:700;line-height:1.25;color:#10221f;break-inside:avoid}
.dp-pic svg{display:block;width:10mm;height:10mm;margin:0 auto 1mm;color:#0b7a75}
.dp-pics.three .dp-pic{display:flex;align-items:center;gap:2.5mm;text-align:left;padding:2mm 3mm;font-size:10pt}.dp-pics.three .dp-pic svg{margin:0;flex:none}
.dp-pic.on{border:2.4px solid #e8562f}.dp-pic.on svg{color:#e8562f}
.dp-hint{font-weight:500;color:#3d5651;font-size:9pt;margin-left:2mm}
.dp-word{font-size:11pt;margin-top:-1mm}.dp-word b{display:inline-block;min-width:70mm;border-bottom:1px solid #8aa8a0;padding:0 2mm;font-weight:500}
.dp-days{display:flex;gap:3mm;margin:1mm 0 4mm}.dp-days span{width:13mm;height:13mm;border:1.4px solid #0b7a75;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12pt}.dp-days span.on{border:2.6px solid #e8562f;color:#e8562f}
.dp-sticker{border:1.6px dashed #e8562f;border-radius:5mm;height:42mm;padding:2.5mm 4mm;display:flex;align-items:flex-start;justify-content:space-between;font-size:10pt;font-weight:700;color:#b5401f}
@media screen{.dp-draw{height:150px}.dp-draw-xl{height:260px}.dp-draw-m{height:130px}.dp-draw-s{height:110px}.dp-sticker{height:110px}.dp-node small,.dp-me small,.dp-draw small,.dp-pic,.dp-hint,.dp-title i{font-size:12px}}
@media screen{.dp.print-page{background:#fff;padding:12mm 13mm;margin:0 auto 18px;max-width:210mm;box-shadow:0 10px 30px -18px rgba(16,34,31,.45);border-radius:6px}}
@media screen and (max-width:640px){.dp.print-page{padding:18px 16px}.dp-map{grid-template-columns:1fr 1fr;gap:12px}.dp-map svg{display:none}.dp-me{grid-column:1/-1;grid-row:auto;width:auto;height:auto;border-radius:14px;flex-direction:row;gap:8px;padding:10px}.dp-node{grid-row:auto!important;grid-column:auto!important}.dp-grid2{grid-template-columns:1fr}.dp-table{font-size:9pt}.dp-pics,.dp-pics.six{grid-template-columns:repeat(4,1fr)}.dp-pics.three{grid-template-columns:1fr;gap:2mm}.dp-days{gap:4px;flex-wrap:wrap}.dp-days span{width:36px;height:36px}.dp-word b{min-width:50%}}
@media print{.dp.print-page{break-after:page;page-break-after:always;padding:0;margin:0;box-shadow:none;max-width:none}.dp.print-page:last-child{break-after:auto;page-break-after:auto}}`;
function injectCSS(){if(typeof document==='undefined'||document.getElementById('dp-book-css'))return;const s=document.createElement('style');s.id='dp-book-css';s.textContent=BOOK_CSS;document.head.append(s);}
const lines=n=>`<span class="dp-lines">${'<i></i>'.repeat(n)}</span>`;
const val=(x,n)=>has(x)?`<p class="dp-text">${esc(x)}</p>`:lines(n);
const block=(t,x,n=3)=>`<div class="dp-block"><h3>${t}</h3>${val(x,n)}</div>`;
const short=(s,n)=>{s=String(s||'').trim();return s.length>n?s.slice(0,n-1)+'…':s;};
const box=on=>on?'☑':'☐';
function map(d){const node=(label,x,pos)=>`<div class="dp-node" style="${pos}"><small>${label}</small>${has(x)?esc(short(x,60)):lines(2)}</div>`;
 return `<div class="dp-map"><svg viewBox="0 0 300 180" preserveAspectRatio="none" aria-hidden="true"><g stroke="#8fb5a9" stroke-width="1.6" stroke-dasharray="5 4" fill="none"><line x1="150" y1="90" x2="50" y2="28"/><line x1="150" y1="90" x2="250" y2="28"/><line x1="150" y1="90" x2="50" y2="152"/><line x1="150" y1="90" x2="250" y2="152"/></g></svg>${node('관심 · 2쪽',d.interest,'grid-column:1;grid-row:1')}${node('가능성 1 · 3쪽',d.futures[0].path,'grid-column:3;grid-row:1')}<div class="dp-me"><small>나</small>${has(d.alias)?esc(short(d.alias,16)):'(별칭)'}</div>${node('가능성 2 · 3쪽',d.futures[1].path,'grid-column:1;grid-row:3')}${node(lab(d.band,'year')+' · 5쪽',d.year,'grid-column:3;grid-row:3')}</div>`;}
const picRow=(opts,cur,cls='')=>`<div class="dp-pics${cls}">${Object.entries(opts).map(([k,t])=>`<div class="dp-pic${cur===k?' on':''}">${icon(k)}<span>${esc(t)}</span></div>`).join('')}</div>`;
const KICKER={upper:'나의 가능성을 탐색하는 작은 책',mid:'나의 가능성을 확인하며 탐색하는 책',high:'내 길을 설계하고 검토하는 책'};
const AI_STEP3={upper:'받은 말을 그대로·고쳐서·안 씀으로 고르고 아래에 남겨요',mid:'받은 질문을 그대로·고쳐서·안 씀으로 고르고, 공식 자료에 답이 있는 사실 질문 하나는 확인 카드에서 직접 찾아요',high:'문장마다 그대로·고쳐서·안 씀을 고르고, 단정·고정관념·확인 안 된 숫자에 표시해요'};
const AI_NOTE={upper:'',mid:' 공식 자료에 답이 있는 사실 질문 하나를 골라 덧붙임 ‘확인 카드’에서 찾아요. 나에 대한 질문은 이 쪽에서 내가 답해요.',high:' 연봉·전망 같은 숫자는 공식 자료로 확인하기 전까지 ‘확인 필요’예요. 성적·내신·학교 이름은 넣지 않아요.'};
function aiTable(d){const hi=d.band==='high',none=d.aiSource==='none';
 const cols=hi?'<col style="width:5%"><col style="width:26%"><col style="width:11%"><col style="width:14%"><col style="width:24%"><col>':'<col style="width:6%"><col style="width:30%"><col style="width:14%"><col style="width:28%"><col>';
 return `<table class="dp-table"><colgroup>${cols}</colgroup><thead><tr><th></th><th>${none?NOAI+' · 제안':'AI가 한 말 (질문·제안)'}</th><th>내 선택</th>${hi?'<th>표시</th>':''}<th>내 말로 고친 문장</th><th>그렇게 고른 이유</th></tr></thead><tbody>${d.aiNotes.map((a,n)=>`<tr style="height:${has(a.said)||has(a.mine)?'auto':(hi?'46mm':'50mm')}"><th>${n+1}</th><td>${esc(a.said)}</td><td>${Object.keys(picks).map(k=>`${box(a.pick===k)} ${pickShort[k]}`).join('<br>')}</td>${hi?`<td>${Object.keys(FLAGS).map(k=>`${box(a.flags.includes(k))} ${FLAG_SHORT[k]}`).join('<br>')}</td>`:''}<td>${esc(a.mine)}</td><td>${esc(a.why)}</td></tr>`).join('')}</tbody></table>`;}
function bodyHTML(d,key){const b=d.band;
 switch(key){
 case'cover':return `<div class="dp-cover"><p class="dp-kicker">${KICKER[b]} · ${BANDS[b].name}</p><h1 class="dp-book">${has(d.title)?esc(d.title):lines(1)}</h1><p class="dp-by">지은이 별칭 <b>${has(d.alias)?esc(d.alias):'&nbsp;'}</b></p><div class="dp-motto"><small>나에게 건네는 한 문장</small>${has(d.motto)?esc(d.motto):lines(1)}</div><h3>나의 지도 — 2~5쪽에 쓴 내 글로 채워져요</h3>${map(d)}<div class="dp-draw"><small>표지 그림 — 내가 좋아하는 장면이나 해 보고 싶은 활동을 그려요</small></div><p class="dp-cover-note">이 책은 내가 고르고 고치는 계획이에요. AI가 나의 성격·직업·성공을 예측한 결과가 아니에요. 마음이 바뀌면 언제든 고쳐 써요.</p></div>`;
 case'interest':return block(lab(b,'interest'),d.interest,4)+block(lab(b,'experience'),d.experience,6)+block(lab(b,'strength'),d.strength,4)+block(lab(b,'question'),d.question,4);
 case'futures':return d.futures.map((f,n)=>`<div class="dp-card"><h3><em>가능성 ${n+1}</em>${has(f.path)?esc(f.path):''}</h3>${has(f.path)?'':lines(1)}${block(lab(b,'reason'),f.reason,2)}${block(lab(b,'try'),f.try,2)}${block(lab(b,'check'),f.check,2)}</div>`).join('');
 case'ai':return `<p class="dp-choice" style="display:block;line-height:1.5"><b>화면에서 할 일</b> ① 태블릿에서 학교 계정 AI 열기 ② 넣는 말 — ${ASK_LINES[b]} + “${ASK_END[b]}” ③ ${AI_STEP3[b]}<br><b>지킬 것</b> ${safety(b)}<br><b>바꿔 쓰는 순서</b> ${SWITCH}</p><p class="dp-choice"><b>AI를 만난 곳</b> &nbsp;${Object.keys(sources).map(k=>`<span>${box(d.aiSource===k)} ${sourceShort[k]}</span>`).join('')}</p>${aiTable(d)}<p class="dp-note ai">${DELETE_TEXT.other} 받은 말 중 고른 것만 옮겨 적어요. AI가 “꼭 ~가 될 거예요”처럼 단정하면 탐색하는 말로 고쳐요. 모르는 사실은 선생님·공식 자료로 확인해요.${AI_NOTE[b]} AI를 쓰지 않았다면 짝이나 선생님이 해 준 질문을 적어요.</p>`;
 case'plan':return `<div class="dp-grid2">${block(lab(b,'year'),d.year,3)}${block('이번 달의 작은 실험',d.month,3)}${block('해 보았다는 흔적을 남길 방법',d.evidence,3)}${block('도움 · 자료 · 준비물 (이름 대신 역할)',d.helper,3)}</div><p class="dp-choice"><b>어느 주</b> ${has(d.weekStart)?esc(d.weekStart):'______________________'}</p><table class="dp-table"><colgroup><col style="width:9%"><col style="width:44%"><col style="width:11%"><col></colgroup><thead><tr><th>요일</th><th>언제 · 무엇을 · 얼마나</th><th>해 봄</th><th>해 본 뒤 메모 · 못 했다면 바꿀 점</th></tr></thead><tbody>${d.week.map((x,n)=>`<tr style="height:${has(x.action)?'auto':'14mm'}"><th>${days[n]}</th><td>${esc(x.action)}</td><td style="text-align:center">${box(x.done)}</td><td>${esc(x.note)}</td></tr>`).join('')}</tbody></table><p class="dp-note">‘해 봄’은 실제로 해 본 뒤에만 표시해요. 빈칸이나 못 한 날은 실패 점수가 아니에요. 시간을 줄이거나 다음 주에 바꿔요.${b==='high'?' 고른 과목과 학교 안 활동은 덧붙임 ‘과목·활동 계획표’에 적어요.':''}</p>`;
 case'review':return block('실제로 해 보고 새로 알게 된 점',d.learned,5)+block('다음 계획에서 바꿀 점 · 이유',d.change,4)+block(b==='upper'?'고치기 전 표현 → 고친 뒤 표현 · 고친 이유':'고치기 전 문장 → 고친 뒤 문장 · 고친 이유 (단정·고정관념)',d.correction,4)+block('다음에 내가 고를 한 걸음',d.next,3)+`<p class="dp-choice">${box(d.reviewed)} 내 글을 다시 읽고, 공개하고 싶지 않은 정보가 없는지 확인했어요.</p><p class="dp-choice">확인한 날 __________ &nbsp; 나에게 남기는 표시 __________</p>`;
 case'checks':return `<p class="dp-note">${CHECK_PICK} 예: 어떤 일을 하나요? · 어떤 공부·자격이 필요한가요? · 어디에서 일하나요?<br>공식 진로 정보(예: 커리어넷)에서 찾아요. ${CHECK_RULE} 80분 수업은 한 장, 4차시 수업은 두 장을 써요.</p>`+d.checks.map((c,n)=>`<div class="dp-card"><h3><em>확인 카드 ${n+1}</em>${n?'(4차시 수업에서 한 장 더)':'4쪽에서 고른 사실 질문 하나'}</h3>${block('고른 사실 질문',c.q,1)}<div class="dp-grid2">${block('출처 이름 (주소 말고 이름만)',c.site,1)}${block('확인한 날',c.date,1)}</div>${block('찾은 답 한 줄 (내 말로)',c.learned,2)}<div class="dp-grid2"><div class="dp-block"><h3>찾았나요?</h3><p class="dp-choice">${Object.keys(FOUND).map(k=>`<span>${box(c.found===k)} ${FOUND[k]}</span>`).join('')}</p></div>${block('일부만·못 찾았으면 물어볼 사람 (역할만)',c.ask,1)}</div></div>`).join('');
 case'courses':return `<table class="dp-table"><colgroup><col style="width:17%"><col style="width:19%"><col style="width:19%"><col style="width:20%"><col></colgroup><thead><tr><th>가능성</th><th>과목 1</th><th>과목 2</th><th>학교 안 활동</th><th>확인할 것 (먼저 들을 과목 · 개설 학년)</th></tr></thead><tbody>${d.courses.map((c,n)=>`<tr style="height:${has(c.subject1)||has(c.activity)?'auto':'50mm'}"><td><b>${n+1}</b> ${esc(d.futures[n].path)}</td><td>${esc(c.subject1)}</td><td>${esc(c.subject2)}</td><td>${esc(c.activity)}</td><td>${esc(c.toCheck)}</td></tr>`).join('')}</tbody></table>${block('학교 개설 과목 목록에서 눈에 띈 과목 · 더 물어볼 것',null,5)}<p class="dp-note">과목 이름은 담임 선생님이 준 학교 개설 과목 목록에서 직접 골라 써요. 과목 선택 상담이나 대입·학과 추천이 아니에요. 실제 신청은 학교 절차를 따라요.</p>`;
 case'lcover':return `<div class="dp-cover"><p class="dp-kicker">내가 좋아하는 것을 담은 그림책 · 좋아하는 것 그림책</p><h1 class="dp-book">${has(d.title)?esc(d.title):lines(1)}</h1><p class="dp-by">지은이 별칭 <b>${has(d.alias)?esc(d.alias):'&nbsp;'}</b></p><div class="dp-draw dp-draw-xl"><small>표지 그림 — 내가 좋아하는 것을 그려요</small></div><p class="dp-cover-note">이 책은 내가 고른 것으로 만들어요. 마음이 바뀌면 언제든 고쳐요.</p></div>`;
 case'llike':return [['좋아하는 것',d.interest],['해 본 것',d.experience]].map(([t,v])=>{const s=splitCard(v,LIKE);return `<div class="dp-block"><h3>${t} <span class="dp-hint">하나에 동그라미 하고 그려요</span></h3>${picRow(LIKE,s.card)}<div class="dp-draw dp-draw-m"><small>그림</small></div><p class="dp-word">낱말 <b>${has(s.word)?esc(s.word):'&nbsp;'}</b></p></div>`;}).join('');
 case'lask':{const a=d.aiNotes[0],w=wonderOf(d);return `<div class="dp-block"><h3>궁금한 것 <span class="dp-hint">하나에 동그라미</span></h3>${picRow(WONDER,w,' three')}${!w&&has(d.question)?`<p class="dp-text">${esc(d.question)}</p>`:''}</div><div class="dp-block"><h3>${d.aiSource==='none'?NOAI:`AI가 해 준 질문 <span class="dp-hint">AI를 쓰지 않았으면 ${NOAI}을 적어요</span>`}</h3>${val(a.said,2)}</div><div class="dp-block"><h3>내 마음 <span class="dp-hint">하나에 동그라미 · 내가 골라요</span></h3>${picRow(LPICK,a.pick,' three')}</div><div class="dp-block"><h3>내 답 — 그림이나 한 줄</h3>${has(a.mine)?`<p class="dp-text">${esc(a.mine)}</p>`:''}<div class="dp-draw dp-draw-s"><small>그림</small></div></div><p class="dp-choice"><b>AI를 만난 곳</b> &nbsp;${Object.keys(sources).map(k=>`<span>${box(d.aiSource===k)} ${sourceShort[k]}</span>`).join('')}</p><p class="dp-note ai"><b>지킬 것</b> ${SAFETY.low}. ${SWITCH}</p>`;}
 case'lweek':{const i=lowDay(d),s=splitCard(i<0?'':d.week[i].action,ACT);return `<div class="dp-block"><h3>이번 주에 해 볼 것 <span class="dp-hint">하나에 동그라미 하거나 그려요</span></h3>${picRow(ACT,s.card,' six')}<div class="dp-draw dp-draw-m"><small>그림</small></div><p class="dp-word">어떻게 <b>${has(s.word)?esc(s.word):'&nbsp;'}</b></p></div><div class="dp-block"><h3>언제 할까요? <span class="dp-hint">요일 하나에 동그라미</span></h3><div class="dp-days">${days.map((x,n)=>`<span class="${i===n?'on':''}">${x}</span>`).join('')}</div></div><div class="dp-sticker"><span>해 보면 여기에 스티커를 붙여요</span><span>${i>=0&&d.week[i].done?'☑ 해 봤어요':''}</span></div><p class="dp-note">돈이 들지 않고 안전한 일로 골라요. 어른과 함께 해야 하면 같이 해요.</p>`;}}
 return '';}
function pageHTML(d,p,label){const b=d.band,cover=p.key==='cover'||p.key==='lcover';
 return `<section class="print-page dp"><div class="dp-head"><span>${BANDS[b].name} · 셈제작소</span><span>${label}</span></div>${cover?'':`<h2 class="dp-title${p.ai?' ai':''}"><b>${p.extra?'+':p.n}</b>${p.name}${p.ai?'<i>AI</i>':''}</h2>${leadOf(d,p)?`<p class="dp-lead">${leadOf(d,p)}</p>`:''}`}${bodyHTML(d,p.key)}<p class="dp-foot">${b==='low'?'별칭 사용 · 내가 고르고 그린 그림책':'별칭 사용 · 언제든 고칠 수 있는 탐색 기록 · 이 책의 글은 내가 썼어요 (AI가 예측한 결과가 아님)'}</p></section>`;}
function worksheet(raw){injectCSS();const d=normalize(raw),P=pagesOf(d.band);
 const out=P.map((p,i)=>pageHTML(d,Object.assign({n:i+1},p),`${i+1} / ${P.length}`));
 const x=EXTRA[d.band];if(x)out.push(pageHTML(d,{key:x.key,name:x.name,extra:true,lead:x.key==='checks'?'':'학교 개설 과목 목록에서 가능성마다 과목과 학교 안 활동을 골라요. 실제 신청은 학교 절차를 따라요.'},'덧붙임 · '+x.name));
 return out.join('');}

/* ---------- 선생님 메뉴 요청문 (강사 입력 예외 ⑤ · 학생과 같은 문장 · 자동 전송 없음) ---------- */
function prompt(raw){const d=normalize(raw),b=d.band,aiPage=b==='low'?3:4,ask=askText(d);
 return `[선생님용 · ${BANDS[b].group} ${BANDS[b].name} AI 요청문]
쓰는 곳: 강사 입력용입니다(예외 ⑤). 학생 화면의 순서는 “${SWITCH}”입니다. 선생님이 대신 입력했다면 활동지 ${aiPage}쪽에 '선생님이 대신 입력'으로 표시하고 수업 후 기록표에 사유를 남깁니다.
AI 시간에는 학교가 정한 감독 교사가 함께합니다. 강사 기기는 감독 교사의 학교 계정으로 열고(강사 개인 계정은 쓰지 않음), 끝나면 학교 절차대로 로그아웃합니다. 감독 교사가 없는 날은 AI 없이 준비한 예시로 합니다.
학생이 직접 보낼 때와 같은 문장이고, 쓴 칸만 들어갑니다. 별칭은 넣지 않았습니다. 붙여 넣기 전에 지울 것을 확인합니다: ① 이름·별칭·친구 이름 ② 학교·반·연락처, 동네·학원 이름 ③ 알아볼 수 있는 가족·건강·형편·장소 이야기 ④ 성적. 날짜·드문 사건처럼 친구가 알아볼 단서도 지웁니다. 얼굴 사진과 목소리는 넣지 않습니다. 자동 확인 뒤에도 직접 읽습니다. 이 글은 자동으로 보내지지 않습니다.

지울 것 ①~④ 확인 뒤 붙여 넣기
------ 아래부터 붙여 넣기 ------
${ask||(b==='low'?'(아직 고른 카드가 없습니다. 2쪽·3쪽 카드를 먼저 골라 주세요.)':'(아직 쓴 칸이 없습니다. 2쪽 관심·경험부터 받아 적어 주세요.)')}
------ 여기까지 ------
받은 답은 선생님이 먼저 읽고 개인정보 추정·편견·단정·위험한 활동·확인 안 된 사실을 거른 뒤 학생과 함께 읽고, 학생이 고른 것만 ${aiPage}쪽에 옮겨 적습니다. 그대로 쓸지·고칠지·안 쓸지는 학생이 정합니다.`;}

/* ---------- 입력 화면 ---------- */
function mount(root,ctx){injectCSS();const d=ctx.data;let page=0,confirmAsk=false,confirmNext=false,pendingAct=null,seat=''; // seat: 저학년 공용 기기의 지금 차례 자리 번호(저장하지 않음)
 const field=(label,path,value,max=300,rows=3,hint='')=>{const id=ctx.uid('dream');return `<div class="field"><label for="${id}">${esc(label)}</label>${rows===1?`<input id="${id}" data-field="${path}" maxlength="${max}" value="${esc(value)}"${hint?` placeholder="${esc(hint)}"`:''}>`:`<textarea id="${id}" data-field="${path}" maxlength="${max}" rows="${rows}"${hint?` placeholder="${esc(hint)}"`:''}>${esc(value)}</textarea>`}</div>`;};
 const lowField=(label,low,value,hint)=>{const id=ctx.uid('lw');return `<div class="field"><label for="${id}">${esc(label)}</label><input id="${id}" data-low="${low}" data-part="word" maxlength="60" value="${esc(value)}" placeholder="${esc(hint)}"></div>`;};
 const chips=(name,path,opts,cur)=>`<div class="chips" role="radiogroup" aria-label="${esc(name)}">${Object.entries(opts).map(([k,t])=>{const id=ctx.uid('chip');return `<label class="chip" for="${id}"><input type="radio" id="${id}" name="${path}" data-field="${path}" value="${k}" ${cur===k?'checked':''}><span>${esc(t)}</span></label>`;}).join('')}</div>`;
 const pics=(name,attrs,opts,cur,cls='')=>{const g=ctx.uid('g');return `<div class="pics${cls}" role="radiogroup" aria-label="${esc(name)}">${Object.entries(opts).map(([k,t])=>{const id=ctx.uid('pic');return `<label class="pic" for="${id}"><input type="radio" id="${id}" name="${g}" ${attrs} value="${k}" ${cur===k?'checked':''}><span>${icon(k,44)}<b>${esc(t)}</b></span></label>`;}).join('')}</div>`;};
 const P=()=>pagesOf(d.band);
 const promptBtn='<button class="button ghost" type="button" data-action="dream-prompt">선생님용 AI 요청문 보기</button>';
 const askInner=()=>{const ps=askParts(d);return (d.band==='low'&&seat?`<p><b>자리</b> ${esc(seat)}번</p>`:'')+ps.map(([t,v,k])=>`<p>${d.band==='low'&&k?`<span class="ask-ic">${icon(k,26)}</span>`:''}<b>${esc(t)}</b> ${has(v)?esc(v):'<span class="muted">(아직 비어 있어요)</span>'}</p>`).join('')+`<p class="ask-end">${esc(ASK_END[d.band])}</p>`;};
 const askConfirm=()=>confirmAsk?`<div class="ask-confirm" role="group" aria-label="보내기 전 확인"><p><b>보내기 전에 지울 것을 확인해요</b> ${esc(deleteText(d.band))} 자동 확인 뒤에도 직접 한 번 읽어요.</p><div class="ask-actions"><button class="button primary" type="button" data-action="dream-ask-ok">확인했어요, 복사하기</button><button class="button" type="button" data-action="dream-ask-cancel">다시 볼게요</button></div></div>`:'';
 const seatRow=()=>d.band==='low'?`<p class="mini-title">내 자리 번호 <span class="badge">고르면 복사한 글 앞에 번호만 붙어요 · 이름은 쓰지 않아요</span></p><div class="chips seats" role="radiogroup" aria-label="내 자리 번호">${[1,2,3,4,5,6].map(n=>{const id=ctx.uid('seat');return `<label class="chip" for="${id}"><input type="radio" id="${id}" name="low-seat" data-seat value="${n}" ${seat===String(n)?'checked':''}><span>${n}번</span></label>`;}).join('')}</div>`:'';
 const askBox=()=>d.aiSource==='none'?`<div class="ask-box noai"><p class="mini-title">${NOAI} <span class="badge">AI에 보내지 않아요</span></p><p>${d.band==='low'?'고른 궁금한 것 카드를 짝이나 선생님이 질문으로 읽어 줘요. 누르기·보내기는 하지 않아요. 들은 질문은 아래에 적어요.':'짝이나 선생님에게 질문을 받아 아래에 적어요. 그대로 쓸지·고칠지·안 쓸지는 내가 골라요.'}</p><div class="ask-actions"><button class="button" type="button" data-action="dream-noai-off">AI로 하기로 돌아가기</button></div></div>`
  :`<div class="ask-box"><p class="mini-title">AI에 넣을 말 <span class="badge ai">AI</span> <span class="badge">내가 쓴 칸으로 만들어져요 · 별칭은 넣지 않아요</span></p>${seatRow()}<div class="ask-lines" data-ask>${askInner()}</div><div class="ask-actions"><button class="button primary" type="button" data-action="dream-ask-copy">글 복사하기</button><span class="muted small">복사한 뒤 학교 계정 AI 창에 붙여 넣어요. 자동으로 보내지 않아요.</span></div><div data-ask-confirm>${askConfirm()}</div><div class="ask-actions noai-switch"><button class="button ghost" type="button" data-action="dream-noai-on">AI 대신 짝·선생님 질문으로 하기</button><span class="muted small">AI를 쓰지 않는 친구는 이것을 눌러요.</span></div></div>`;
 const nextFriend=()=>confirmNext?`<div class="ask-confirm" role="group" aria-label="다음 친구 확인"><p><b>다음 친구 차례로 넘길까요?</b> 이 기기의 카드 칸·낱말 칸·별칭을 모두 비워요. 내 기록은 종이 그림책에 남아요.</p><div class="ask-actions"><button class="button primary" type="button" data-action="dream-next-ok">비우고 넘기기</button><button class="button" type="button" data-action="dream-next-cancel">아직이에요</button></div></div>`
  :`<div class="ask-actions"><button class="button" type="button" data-action="dream-next-friend">다음 친구 차례 (칸 비우기)</button><span class="muted small">한 기기에는 지금 차례인 친구의 책만 둬요. 내 기록은 종이 그림책이에요.</span></div>`;
 const aiCallout=b=>`<div class="callout ai"><strong>먼저 읽어요</strong><p>${esc(SWITCH)} 넣는 말은 ${esc(ASK_LINES[b])}, 그리고 끝 문장뿐이에요.</p><p class="safety"><b>지킬 것</b> ${esc(safety(b))}</p><p class="muted small">받은 말 중 고른 것만 옮겨 적어요. 이 앱은 AI에 연결되지 않아요.</p>${promptBtn}</div>`;
 function form(){const b=d.band,key=P()[page].key;
  switch(key){
  case'cover':return field('책 제목','title',d.title,70,1,'예: 내가 궁금한 내일')+field('지은이 별칭 (실명·학교명은 쓰지 않아요)','alias',d.alias,70,1,'예: 새싹')+field('나에게 건네는 한 문장','motto',d.motto,300,2)+`<div class="map-preview"><p class="mini-title">나의 지도 미리보기 <span class="badge">2~5쪽 내 글로 저절로 채워져요</span></p><div data-map>${map(d)}</div></div>`;
  case'interest':return field(lab(b,'interest'),'interest',d.interest,300,2,b==='high'?'예: 환경 문제, 숫자로 설명하기':'예: 그림 그리기, 동네 새 관찰')+field(lab(b,'experience'),'experience',d.experience,300,3,'언제, 무엇을 했고, 어떤 느낌이었나요?')+field(lab(b,'strength'),'strength',d.strength,300,2,b==='high'?'잘된 점과 힘들었던 점을 함께':'“나는 원래 ~” 대신 “그때 ~하게 했다”')+field(lab(b,'question'),'question',d.question);
  case'futures':return `<div class="two-col">${d.futures.map((f,i)=>`<section class="subpanel"><h3><span class="num-dot">${i+1}</span>가능성 ${i+1}</h3>${field(lab(b,'path'),`futures.${i}.path`,f.path,100,1,i?'예: 자연을 관찰하고 기록하는 나':'예: 설명 그림을 만드는 나')}${field(lab(b,'reason'),`futures.${i}.reason`,f.reason,240,2)}${field(lab(b,'try'),`futures.${i}.try`,f.try,240,2,'10~15분, 안전하게')}${field(lab(b,'check'),`futures.${i}.check`,f.check,240,2,'모르면 “아직 모름”이라고 써요')}</section>`).join('')}</div>`;
  case'ai':return `${aiCallout(b)}${askBox()}<p class="mini-title">AI를 어디에서 만났나요?</p>${chips('AI를 만난 곳','aiSource',sources,d.aiSource)}${d.aiNotes.map((a,i)=>`<section class="subpanel ai-card"><h3><span class="num-dot">${i+1}</span>${d.aiSource==='none'?NOAI:'AI가 한 말'} ${i+1}</h3><div class="ai-said">${field(d.aiSource==='none'?'들은 질문이나 제안':'AI가 한 질문이나 제안 (본 그대로)',`aiNotes.${i}.said`,a.said,240,2)}<p class="mini-title">내 선택</p>${chips('내 선택 '+(i+1),`aiNotes.${i}.pick`,picks,a.pick)}${b==='high'?`<p class="mini-title">이 문장에 표시</p><div class="flags">${Object.entries(FLAGS).map(([fk,ft])=>{const id=ctx.uid('fl');return `<label class="flag" for="${id}"><input type="checkbox" id="${id}" data-flag="${i}" value="${fk}" ${a.flags.includes(fk)?'checked':''}><span>${esc(ft)}</span></label>`;}).join('')}</div>`:''}</div><div class="ai-mine">${field('내 말로 고친 문장',`aiNotes.${i}.mine`,a.mine,200,2,'고쳐 쓸 때만 적어요')}${field('그렇게 고른 이유',`aiNotes.${i}.why`,a.why,120,1)}</div></section>`).join('')}${b==='mid'?`<h3 class="sub-title">확인 카드 <span class="badge">공식 진로 정보로 직접 찾아요</span></h3><p class="check-pick">${esc(CHECK_PICK)}</p><p class="muted small">공식 진로 정보(예: 커리어넷)에서 찾아요. ${esc(CHECK_RULE)} 80분 수업은 한 장, 4차시 수업은 두 장.</p><div class="two-col">${d.checks.map((c,i)=>`<section class="subpanel"><h3><span class="num-dot">${i+1}</span>확인 카드 ${i+1}</h3>${field('고른 사실 질문',`checks.${i}.q`,c.q,160,2,'예: 이 일을 하는 사람은 어떤 일을 하나요?')}${field('출처 이름 (주소 말고 이름만)',`checks.${i}.site`,c.site,100,1,'예: 커리어넷 직업정보')}${field('확인한 날',`checks.${i}.date`,c.date,30,1,'예: 11월 12일')}${field('찾은 답 한 줄 (내 말로)',`checks.${i}.learned`,c.learned,200,2,'읽은 내용을 내 말로')}<p class="mini-title">찾았나요?</p>${chips('찾았나요 '+(i+1),`checks.${i}.found`,FOUND,c.found)}<div class="check-ask" data-check-ask="${i}"${c.found==='part'||c.found==='no'?'':' hidden'}>${field('다음에 누구에게 물어볼까요? (이름 말고 역할)',`checks.${i}.ask`,c.ask,60,1,'예: 진로 선생님, 담임 선생님')}</div></section>`).join('')}</div>`:''}`;
  case'plan':return `<div class="two-col">${field(lab(b,'year'),'year',d.year,300,2,'예: 두 활동을 각각 세 번 해 보고 비교하기')+field('이번 달의 작은 실험','month',d.month,300,2)}${field('해 보았다는 흔적을 남길 방법','evidence',d.evidence,300,2,'그림, 관찰 메모, 고친 이유 등')+field('도움 · 자료 · 준비물 (이름 대신 역할)','helper',d.helper,300,2)}</div>${b==='high'?`<h3 class="sub-title">과목·활동 계획표 <span class="badge">학교 개설 목록에서 직접 골라 써요</span></h3><p class="muted small">담임 선생님이 준 학교 개설 과목 목록에서 가능성마다 과목 1~2개와 학교 안 활동 1개를 골라요. 과목 선택 상담이 아니고, 실제 신청은 학교 절차를 따라요.</p><div class="two-col">${d.courses.map((c,i)=>`<section class="subpanel"><h3><span class="num-dot">${i+1}</span>${has(d.futures[i].path)?esc(short(d.futures[i].path,28)):'가능성 '+(i+1)}</h3>${field('과목 1',`courses.${i}.subject1`,c.subject1,60,1,'학교 개설 목록에서')}${field('과목 2 (있으면)',`courses.${i}.subject2`,c.subject2,60,1)}${field('학교 안 활동',`courses.${i}.activity`,c.activity,120,1,'동아리, 학급 역할, 학교 행사 등')}${field('확인할 것',`courses.${i}.toCheck`,c.toCheck,200,2,'먼저 들어야 하는 과목, 개설 학년, 신청 시기')}</section>`).join('')}</div>`:''}${field('어느 주인지 (예: 11월 둘째 주)','weekStart',d.weekStart,40,1)}<div class="week" role="table" aria-label="이번 주 행동표"><div class="week-head" role="row"><span role="columnheader">요일</span><span role="columnheader">언제 · 무엇을 · 얼마나</span><span role="columnheader">해 봄</span></div>${d.week.map((x,i)=>{const a=ctx.uid('wk'),c=ctx.uid('wkd'),n=ctx.uid('wkn');return `<div class="week-row ${x.done||has(x.note)?'open':''}" role="row" data-week="${i}"><label class="day" for="${a}" role="rowheader">${days[i]}</label><input id="${a}" data-field="week.${i}.action" maxlength="100" value="${esc(x.action)}" placeholder="${i===4?'쉬는 날도 괜찮아요':'예: 10분 그림 그리기'}"><label class="done" for="${c}"><input id="${c}" type="checkbox" data-field="week.${i}.done" ${x.done?'checked':''}><span class="sr">${days[i]}요일 </span>해 봄</label><div class="week-note"><label for="${n}">해 본 뒤 메모 · 못 했다면 바꿀 점</label><input id="${n}" data-field="week.${i}.note" maxlength="100" value="${esc(x.note)}"></div></div>`;}).join('')}</div><p class="muted small">‘해 봄’은 실제로 해 본 뒤에만 눌러요. 누르면 메모 칸이 열려요.</p>`;
  case'review':return field('실제로 해 보고 새로 알게 된 점','learned',d.learned,300,3,'수업 날에는 “계획을 세우며 알게 된 점”을 써도 돼요')+field('다음 계획에서 바꿀 점 · 이유','change',d.change)+field(b==='upper'?'고치기 전 표현 → 고친 뒤 표현 · 고친 이유':'고치기 전 문장 → 고친 뒤 문장 · 고친 이유 (단정·고정관념)','correction',d.correction,300,3,'예: “반드시 ~가 된다” → “~ 활동을 더 해 보고 싶다”')+field('다음에 내가 고를 한 걸음','next',d.next,300,2)+`<label class="check-line" for="dream-reviewed"><input id="dream-reviewed" type="checkbox" data-field="reviewed" ${d.reviewed?'checked':''}>내 글을 다시 읽고, 공개하고 싶지 않은 정보가 없는지 확인했어요</label>`;
  case'lcover':return field('책 이름','title',d.title,70,1,'예: 내가 좋아하는 것')+field('지은이 별칭 (이름은 쓰지 않아요)','alias',d.alias,70,1,'예: 콩콩')+`<div class="callout"><p>표지 그림은 종이 그림책에 그려요.</p></div>`;
  case'llike':{const a=splitCard(d.interest,LIKE),e=splitCard(d.experience,LIKE);return `<p class="mini-title big">좋아하는 것</p>${pics('좋아하는 것','data-low="interest" data-part="card"',LIKE,a.card)}${lowField('낱말 하나 더 (안 써도 돼요)','interest',a.word,'예: 고양이')}<p class="mini-title big">해 본 것</p>${pics('해 본 것','data-low="experience" data-part="card"',LIKE,e.card)}${lowField('낱말 하나 더 (안 써도 돼요)','experience',e.word,'예: 종이접기')}`;}
  case'lask':{const a=d.aiNotes[0];return `${aiCallout('low')}<p class="mini-title big">궁금한 것</p>${pics('궁금한 것','data-low="question" data-part="card"',WONDER,wonderOf(d),' three')}${askBox()}<p class="mini-title">AI를 어디에서 만났나요?</p>${chips('AI를 만난 곳','aiSource',sources,d.aiSource)}${d.aiSource==='none'?field(NOAI,'aiNotes.0.said',a.said,240,2,'짝이나 선생님이 읽어 준 질문을 옮겨 적어요'):field('AI가 해 준 질문','aiNotes.0.said',a.said,240,2,'받은 질문을 옮겨 적어요')}<p class="mini-title big">내 마음 <span class="badge">차례인 친구가 혼자 골라요 · 모둠은 읽어 주기만 해요</span></p>${pics('내 마음','data-field="aiNotes.0.pick"',LPICK,a.pick,' three')}${field('내 답 (한 줄 · 낱말 하나도 돼요 · 비워 둬도 돼요)','aiNotes.0.mine',a.mine,200,2,'예: 마지막에 펼쳐 보는 순서')}<section class="next-friend"><p class="mini-title">다 했으면 · 한 사람 3분</p><div data-next-friend>${nextFriend()}</div></section>`;}
  case'lweek':{const i=lowDay(d),s=pendingAct||splitCard(i<0?'':d.week[i].action,ACT);return `<p class="mini-title big">이번 주에 해 볼 것</p>${pics('이번 주에 해 볼 것','data-low="act" data-part="card"',ACT,s.card,' six')}${lowField('어떻게 해 볼까요? (안 써도 돼요)','act',s.word,'예: 고양이 그림 한 장')}<p class="mini-title big">언제 할까요?</p><div class="days" role="radiogroup" aria-label="요일">${days.map((x,n)=>{const id=ctx.uid('day');return `<label class="day-pick" for="${id}"><input type="radio" id="${id}" name="low-day" data-lowday value="${n}" ${i===n?'checked':''}><span>${x}</span></label>`;}).join('')}</div><p class="muted small" data-day-hint>${i<0?'요일을 고르면 이번 주 칸에 저장돼요.':''}</p><label class="check-line" for="dream-lowdone"><input id="dream-lowdone" type="checkbox" data-lowdone ${i>=0&&d.week[i].done?'checked':''} ${i<0?'disabled':''}>해 봤어요 · 스티커 (해 본 뒤에만 눌러요)</label><p class="muted small">돈이 들지 않고 안전한 일로 골라요.</p>`;}}
  return '';}
 function stepper(){const f=filled(d),list=P();return `<ol class="stepper" style="--n:${list.length}">${list.map((p,i)=>`<li><button type="button" class="step${page===i?' current':''}${f[i]?' filled':''}${p.ai?' ai':''}" data-action="dream-page" data-page="${i}" ${page===i?'aria-current="step"':''} aria-label="${i+1}쪽 ${esc(p.name)}${f[i]?' (쓴 내용 있음)':''}"><span class="n">${f[i]&&page!==i?'✓':i+1}</span><span class="l">${esc(p.short)}</span></button></li>`).join('')}</ol>`;}
 function bandPicker(){return `<div class="band-pick" role="radiogroup" aria-label="학년군 고르기">${BAND_ORDER.map(k=>{const id=ctx.uid('band');return `<label class="band" for="${id}"><input type="radio" id="${id}" name="dream-band" data-band value="${k}" ${d.band===k?'checked':''}><span><b>${esc(BANDS[k].group)}</b><small>${esc(BANDS[k].grades)} · ${esc(BANDS[k].name)}</small></span></label>`;}).join('')}</div>`;}
 function render(){const list=P();if(page>=list.length)page=0;const cur=list[page];
  root.innerHTML=`<div class="diary band-${d.band}" id="diary-top"><section class="course" aria-label="학년군"><p class="mini-title">학년군 고르기 <span class="badge">바꿔도 쓴 내용은 그대로 남아요</span></p>${bandPicker()}<p class="course-core">${esc(BANDS[d.band].core)}</p></section><nav aria-label="다이어리 쪽 선택" data-stepper>${stepper()}</nav><article class="sheet${cur.ai?' ai':''}"><header class="sheet-head"><span class="tag">${page+1} / ${list.length}쪽</span>${cur.ai?' <span class="tag ai">AI</span>':''}<h2>${esc(cur.name)}</h2><p>${esc(leadOf(d,cur))}</p></header>${form()}</article><div class="pager"><button class="button" type="button" data-action="dream-prev" ${page===0?'disabled':''}>← 앞쪽</button><button class="button primary" type="button" data-action="dream-next" ${page===list.length-1?'disabled':''}>다음 쪽 →</button></div><section class="checker"><div class="checker-head"><button class="button" type="button" data-action="dream-check">내 책 점검하기</button><span class="badge">정해진 규칙으로 찾아요 · 점수 아님</span></div><div data-dream-feedback role="status" aria-live="polite"></div></section></div>`;}
 function refresh(){ctx.save();ctx.renderOutput();const nav=root.querySelector('[data-stepper]');if(nav){const h=stepper();if(nav.innerHTML!==h)nav.innerHTML=h;}const m=root.querySelector('[data-map]');if(m)m.innerHTML=map(d);const ak=root.querySelector('[data-ask]');if(ak)ak.innerHTML=askInner();if(confirmAsk){confirmAsk=false;const c=root.querySelector('[data-ask-confirm]');if(c)c.innerHTML='';}}
 function setPath(path,value){let t=d;for(let i=0;i<path.length-1;i++)t=t[path[i]];t[path[path.length-1]]=value;}
 function setLow(which,part,value){
  if(which==='question'){d.question=WONDER[value]||'';return;}
  if(which==='act'){const i=lowDay(d),cur=pendingAct||splitCard(i<0?'':d.week[i].action,ACT),next={card:part==='card'?value:cur.card,word:part==='word'?value:cur.word};if(i<0){pendingAct=next;const h=root.querySelector('[data-day-hint]');if(h)h.textContent='요일을 고르면 이번 주 칸에 저장돼요.';return;}d.week[i].action=joinCard(ACT,next.card,next.word).slice(0,100);return;}
  const cur=splitCard(d[which],LIKE);d[which]=joinCard(LIKE,part==='card'?value:cur.card,part==='word'?value:cur.word).slice(0,300);}
 function input(e){const el=e.target;if(!el.dataset)return;
  if(e.type==='change'&&(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&el.type!=='checkbox'&&el.type!=='radio')))return; // 글 칸은 input에서 이미 저장함. blur 때 다시 그리면 바로 누른 쪽 단추가 사라져 눌림이 없어진다
  if(el.dataset.seat!==undefined){if(!el.checked)return;seat=el.value;const ak=root.querySelector('[data-ask]');if(ak)ak.innerHTML=askInner();if(confirmAsk)showConfirm(false);return;}
  if(el.dataset.band!==undefined){if(!el.checked||!Object.hasOwn(BANDS,el.value))return;d.band=el.value;page=0;pendingAct=null;confirmAsk=false;ctx.save();ctx.renderOutput();render();const top=root.querySelector('#diary-top');if(top&&top.getBoundingClientRect().top<0)top.scrollIntoView({block:'start'});return;}
  if(el.dataset.low){if(el.type==='radio'&&!el.checked)return;setLow(el.dataset.low,el.dataset.part,el.value);refresh();return;}
  if(el.dataset.lowday!==undefined){if(!el.checked)return;const n=Number(el.value),i=lowDay(d);if(i===n)return;let act=pendingAct?joinCard(ACT,pendingAct.card,pendingAct.word):'',done=false;if(i>=0){act=d.week[i].action;done=d.week[i].done;d.week[i].action='';d.week[i].done=false;}d.week[n].action=(act||'해 볼 것 고르기').slice(0,100);d.week[n].done=done;pendingAct=null;refresh();const p=root.querySelector('#dream-lowdone');if(p){p.disabled=false;p.checked=done;}const h=root.querySelector('[data-day-hint]');if(h)h.textContent='';return;}
  if(el.dataset.lowdone!==undefined){const i=lowDay(d);if(i<0)return;d.week[i].done=el.checked;refresh();return;}
  if(el.dataset.flag!==undefined){const a=d.aiNotes[Number(el.dataset.flag)];a.flags=Object.keys(FLAGS).filter(k=>k===el.value?el.checked:a.flags.includes(k));refresh();return;}
  if(!el.dataset.field)return;const path=el.dataset.field.split('.');if(el.type==='radio'&&!el.checked)return;setPath(path,el.type==='checkbox'?el.checked:el.value);refresh();
  if(path[0]==='week'&&path[2]==='done'){const row=el.closest('.week-row');if(row)row.classList.toggle('open',el.checked||has(d.week[path[1]].note));}
  if(path[0]==='checks'&&path[2]==='found'){const w=root.querySelector(`[data-check-ask="${path[1]}"]`);if(w)w.hidden=!(el.value==='part'||el.value==='no');}
  if(path[0]==='aiSource'){confirmAsk=false;render();}}
 function go(n){page=Math.max(0,Math.min(P().length-1,n));confirmAsk=false;confirmNext=false;render();const top=root.querySelector('#diary-top');if(top&&top.getBoundingClientRect().top<0)top.scrollIntoView({block:'start'});}
 function showConfirm(on){confirmAsk=on;const c=root.querySelector('[data-ask-confirm]');if(c)c.innerHTML=askConfirm();}
 function click(e){const b=e.target.closest('button[data-action]');if(!b||!root.contains(b))return;switch(b.dataset.action){
  case'dream-page':go(Number(b.dataset.page));break;case'dream-prev':go(page-1);break;case'dream-next':go(page+1);break;
  case'dream-prompt':ctx.openPrompt();break;
  case'dream-ask-copy':{const t=askText(d);if(!t){ctx.status(d.band==='low'?'먼저 카드를 골라요.':'먼저 칸을 채워요.');break;}const hit=privateHits(t);if(hit.length){ctx.status(hit.join('·')+'처럼 보이는 글이 있어요. 지우고 다시 눌러요.');break;}showConfirm(true);break;}
  case'dream-ask-ok':{const t=askText(d);showConfirm(false);if(t)ctx.copy(d.band==='low'&&seat?`${seat}번\n${t}`:t);break;}
  case'dream-ask-cancel':showConfirm(false);break;
  case'dream-noai-on':case'dream-noai-off':{d.aiSource=b.dataset.action==='dream-noai-on'?'none':'';confirmAsk=false;ctx.save();ctx.renderOutput();render();ctx.status(d.aiSource==='none'?'AI에 보내지 않고 짝·선생님 질문으로 해요.':'AI로 하기로 돌아왔어요.');break;}
  case'dream-next-friend':case'dream-next-cancel':{confirmNext=b.dataset.action==='dream-next-friend';const c=root.querySelector('[data-next-friend]');if(c)c.innerHTML=nextFriend();break;}
  case'dream-next-ok':{const f=defaults('low');for(const k of Object.keys(f))d[k]=f[k];seat='';pendingAct=null;confirmAsk=false;confirmNext=false;ctx.save();ctx.renderOutput();go(1);ctx.status('칸을 비웠어요. 다음 친구 차례예요. 2쪽에서 카드를 골라요.');break;}
  case'dream-check':{const m=check(d);root.querySelector('[data-dream-feedback]').innerHTML=`<div class="feedback"><strong>점검 질문 ${m.length?m.length+'개':'없음'}</strong>${m.length?`<ul>${m.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<p>${d.band==='low'?'네 쪽을 다 골랐어요. 그림책을 한 번 넘겨 보세요.':'주요 칸이 채워졌어요. 이제 스스로 “내가 고른 계획인가, 바꿀 수 있는가, 이번 주에 할 수 있는가”를 확인해 보세요.'}</p>`}<p class="muted small">글자 모양만 보고 찾는 규칙이라 놓치거나 잘못 찾을 수 있어요. 내용이 맞는지는 나와 선생님이 함께 판단해요.</p></div>`;break;}}}
 render();root.addEventListener('input',input);root.addEventListener('change',input);root.addEventListener('click',click);
 return()=>{root.removeEventListener('input',input);root.removeEventListener('change',input);root.removeEventListener('click',click);};}
const spec={id:'dream',title:'내 꿈 다이어리',subtitle:'학년군별 4과정 · 관심에서 이번 주 한 걸음까지',defaults,normalize,demo,mount,worksheet,prompt,check,filled,askText,pagesOf,bands:BANDS,bandOrder:BAND_ORDER,bookCSS:BOOK_CSS,version:'0.4'};
if(typeof window!=='undefined'&&window.Edu&&window.Edu.register)window.Edu.register(spec);
if(typeof window!=='undefined')window.DreamDiary=spec;
if(typeof module!=='undefined')module.exports=spec;
})();
