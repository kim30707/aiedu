/* 누구나 함께 악기 — 공통 자료(카드·바꿀 수 있는 것·설정 검사·악기 코드). together.html과 교탁 받은 함(together-show.html)이 같이 쓴다. 2026-11-16 Claude Opus 5.5 */
(()=>{'use strict';
const PII=/(이름\s*[:：은는]|제 이름|내 이름|학교|초등|중학교|[0-9]+\s*반|[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}|@|주소|번지|아파트)/;
const mask=t=>String(t||'').replace(new RegExp(PII.source,'g'),'○○');
/* ── 사용자 카드(10/31 수업 제안 9쪽 4장 + 더 둘지 제안 2장) ── */
const CARDS=[
 {id:1,who:'지우',about:'한쪽 팔을 쓰기 어려운 친구',like:'장구 치는 걸 제일 좋아해요',inst:2,pic:'🥁'},
 {id:2,who:'할머니',about:'눈이 잘 안 보이세요',like:'트로트를 좋아하세요',inst:1,pic:'🎵'},
 {id:3,who:'친구',about:'귀가 잘 안 들리는 친구',like:null,inst:1,pic:'🙂'},
 {id:4,who:'동생',about:'국악기를 처음 쳐 보는 동생',like:null,inst:2,pic:'⭐'},
 {id:5,who:'할아버지',about:'손이 떨려서 작은 단추를 누르기 어려우세요',like:null,inst:1,pic:'🌿',extra:true},
 {id:6,who:'이웃 어른',about:'태블릿을 처음 써 보세요',like:null,inst:2,pic:'🏡',extra:true}];
const LIKES=['노래 부르기','춤추기','동물','축구','그림 그리기','아이돌 노래','트로트','할머니 댁 놀러 가기'];
const HARD=['단추가 작아요','한 손으로 치기 어려워요','어느 줄을 칠지 헷갈려요','박자를 알기 어려워요','화면이 복잡해요','글자가 잘 안 보여요','소리가 잘 안 들려요','손을 빨리 움직이기 어려워요'];
/* ── 바꿀 수 있는 것(이것만, 이 범위 안에서) ── */
const FEAT=[
 {k:'inst',name:'악기',vals:[[1,'가야금'],[2,'장구']],say:'가야금(줄 7개) 또는 장구'},
 {k:'big',name:'버튼크기',vals:[[1,'보통'],[2,'크게'],[3,'아주크게']],say:'1 보통 · 2 크게 · 3 아주 크게'},
 {k:'one',name:'한번누르기',vals:[[0,'끔'],[1,'켬']],say:'켜면 어디를 눌러도 곡의 다음 음(장구는 다음 장단 소리)이 나요'},
 {k:'simple',name:'단순화면',vals:[[0,'끔'],[1,'켬']],say:'켜면 악기와 꼭 필요한 단추만 보여요'},
 {k:'text',name:'글자크게',vals:[[0,'끔'],[1,'켬']],say:'켜면 글자가 커져요'},
 {k:'contrast',name:'또렷한색',vals:[[0,'끔'],[1,'켬']],say:'켜면 검정·흰색·노랑으로 또렷하게 보여요'},
 {k:'lamp',name:'박자불빛',vals:[[0,'끔'],[1,'켬']],say:'켜면 박마다 큰 불빛이 천천히 켜져요'},
 {k:'vib',name:'진동',vals:[[0,'끔'],[1,'켬']],say:'켜면 박마다 기기가 짧게 떨려요(진동이 없는 기기도 있어요)'},
 {k:'key',name:'글쇠하나',vals:[[0,'끔'],[1,'켬']],say:'켜면 글쇠판 스페이스·엔터나 바깥 스위치 하나로 다음 음을 쳐요'},
 {k:'mic',name:'소리반응',vals:[[0,'끔'],[1,'켬']],say:'켜면 "아" 소리를 내면 다음 음이 나요(마이크로 크기만 재고 녹음하지 않아요 · 선생님이 허용해야 켜져요)'},
 {k:'hand',name:'손위치',vals:[[0,'양손'],[1,'오른쪽'],[2,'왼쪽']],say:'양손 · 오른쪽(단추를 오른쪽에 모음) · 왼쪽'},
 {k:'vol',name:'소리크기',vals:[[1,'보통'],[2,'크게'],[3,'아주크게']],say:'1 보통 · 2 크게 · 3 아주 크게'},
 {k:'showhit',name:'친소리보이기',vals:[[0,'끔'],[1,'켬']],say:'켜면 친 소리 이름이 화면에 크게 떠요'}];
const NOFEAT={'고개반응':'고개 반응은 카메라를 써야 해서 이번 판에는 없어요','카메라':'카메라는 쓰지 않아요','발페달':'발 페달은 ‘글쇠하나’로 연결해요(페달이 스페이스·엔터 글쇠를 보내는 것만 돼요)','보조스위치':'보조 스위치는 ‘글쇠하나’로 연결해요','줄추가':'줄 더하기는 이번 판에 없어요(심화 과정)','악기소리바꾸기':'다른 악기 소리는 이번 판에 없어요'};
const BASE=inst=>({card:0,inst,big:1,one:0,simple:0,text:0,contrast:0,lamp:0,vib:0,key:0,mic:0,hand:0,vol:1,showhit:0});
const ORDER=['card','inst','big','one','simple','text','contrast','lamp','vib','key','mic','hand','vol','showhit'];
const CH='ABCDEFGHJKLMNPQRSTUVWXYZ';
const sum=s=>{let h=11;for(const c of s)h=(h*37+c.charCodeAt(0))%CH.length;return CH[h];};
function toCode(c){const d=ORDER.map(k=>String(c[k])).join('');return '함께-'+d+'-'+sum(d);}
function fromCode(code){const m=/^\s*함께-(\d{14})-([A-Z])\s*$/.exec(code||'');if(!m||sum(m[1])!==m[2])return null;const c={};ORDER.forEach((k,i)=>c[k]=+m[1][i]);
 if(!CARDS.some(x=>x.id===c.card))return null;for(const f of FEAT)if(!f.vals.some(v=>v[0]===c[f.k]))return null;return c;}
const valName=(k,v)=>{const f=FEAT.find(x=>x.k===k);return (f.vals.find(x=>x[0]===v)||[,'?'])[1];};
const norm=s=>String(s).replace(/[\s·_\-]/g,'').replace(/[“”"'`*]/g,'');
/* AI 답 검사: [설정] … [끝] 안의 ‘항목: 값’만 읽는다(없으면 답 전체에서 아는 항목 줄만). 모르는 항목·범위 밖 값은 적용하지 않는다. */
function parseAnswer(text,cur){const out={set:{},bad:[],unknown:[],none:false,lines:0};let body=String(text||'');
 const a=body.indexOf('[설정]'),b=body.indexOf('[끝]');const block=a>=0;if(block)body=body.slice(a+4,b>a?b:undefined);
 for(const raw of body.split(/\r?\n/)){const line=raw.replace(/^\s*[-*•\d.)]+\s*/,'').trim();if(!line)continue;const m=/^([^:：=]{1,14})\s*[:：=]\s*(.{1,20})$/.exec(line);if(!m){if(block)out.bad.push({line:mask(line).slice(0,40),why:'‘항목: 값’ 꼴이 아니에요'});continue;}
  const key=norm(m[1]),raw2=m[2].replace(/\(.*\)\s*$/,'').trim(),val=norm(raw2),tok=[val,norm(raw2.split(/\s+/)[0]),val.replace(/^\d/,'')];/* ‘3 아주 크게’처럼 숫자와 말을 함께 써도 읽음 — 둘이 어긋나면 거절 */const f=FEAT.find(x=>norm(x.name)===key);
  if(!f){const nf=Object.keys(NOFEAT).find(n=>key.includes(n));if(nf)out.unknown.push({line:mask(line).slice(0,40),why:NOFEAT[nf]});else if(block)out.unknown.push({line:mask(line).slice(0,40),why:'이 악기에 없는 항목이에요'});continue;}
  out.lines++;const both=/^(\d)(\D+)$/.exec(val),clash=both&&f.vals.some(x=>String(x[0])===both[1])&&f.vals.some(x=>norm(x[1])===both[2])&&!f.vals.some(x=>String(x[0])===both[1]&&norm(x[1])===both[2]);
  const v=clash?null:f.vals.find(x=>tok.some(t=>String(x[0])===t||norm(x[1])===t)||(val==='켜기'&&x[1]==='켬')||(val==='끄기'&&x[1]==='끔')||(/^on$/i.test(val)&&x[1]==='켬')||(/^off$/i.test(val)&&x[1]==='끔'));
  if(!v){out.bad.push({line:mask(line).slice(0,40),why:clash?`${f.name}의 숫자와 말이 서로 달라요(예: 2 크게)`:`${f.name}은(는) ${f.vals.map(x=>x[1]).join('·')} 가운데 하나만 돼요`});continue;}
  if(f.k in out.set&&out.set[f.k]!==v[0])out.bad.push({line:mask(line).slice(0,40),why:`${f.name}을(를) 두 번 다르게 적었어요 · 처음 것만 써요`});else out.set[f.k]=v[0];}
 out.changes=Object.keys(out.set).filter(k=>out.set[k]!==cur[k]);out.none=!out.lines;return out;}
window.HKCore={PII,mask,CARDS,LIKES,HARD,FEAT,NOFEAT,BASE,ORDER,toCode,fromCode,valName,parseAnswer};
})();
