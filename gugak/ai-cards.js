/* v0.9 AI 요청 카드(선생님 설정 안). 교안 v0.3의 요청 카드 ①(1교시 악기 추천)·②(2교시 고쳐 달라기) 문장을 만들어
 * - 공개 시험판(claude.ai 아티팩트)에서는 'sample' 기능으로 보는 사람의 Claude 계정에 바로 묻고 답을 스트리밍으로 보여 준다(첫 호출 때 허용 창).
 * - 그 밖(교실판, 허용 안 됨)에서는 문장을 복사해 선생님 화면의 다른 AI(펜즈·제미나이 등)에 붙여 넣는다.
 * 답은 'AI의 의견'이라고 표시하고, 악기 선택과 고치기는 학생이 한다. 앱 소리나 설정은 AI가 바꾸지 않는다.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const learner=()=>window.gugakApp?.state?.grade==='middle'?'중학생':'초등학생';
const CARDS=[{id:'pick',title:'요청 카드 ① 악기 추천 (1교시)',fields:[['like','우리가 좋아하는 소리','짧게 톡 / 길게 이어지는'],['role','하고 싶은 역할','가락 / 박자'],['feel','표현하고 싶은 느낌','신나는, 잔잔한…']],make:v=>`우리는 ${learner()}이고 국악기 소리를 비교하고 있어요.\n가야금, 해금, 아쟁, 장구 중에서 우리 모둠에 맞는 악기 2개를 추천해 주세요.\n우리가 좋아하는 소리: ${v.like||'(      )'}\n하고 싶은 역할: ${v.role||'(      )'}\n표현하고 싶은 느낌: ${v.feel||'(      )'}\n소리의 특징으로 이유를 말해 주고, 정답이 아니라 의견이라고 알려 주세요. ${learner()}이 읽기 쉽게 6줄 안으로 써 주세요.`},
 {id:'fix',title:'요청 카드 ② 고쳐 달라고 하기 (2교시)',fields:[['string','가야금 몇 현이 이상한가요','예: 5'],['heard','우리가 들은 것','예: 다른 줄보다 훨씬 높게 들려요'],['seen','설정 화면에 보이는 것','예: 높이 변화 1200 cent']],make:v=>`웹 국악기에서 가야금 ${v.string||'(   )'}현이 다른 줄보다 훨씬 높게 들려요.\n우리가 들은 것: ${v.heard||'(      )'}\n설정 화면에 보이는 것: ${v.seen||'(예: 높이 변화 ___ cent)'}\n바꾸고 싶은 것: ${v.string||'(   )'}현만 원래 높이로\n그대로 둘 것: 다른 줄, 음량, 다른 악기\n무엇을 한 가지 바꾸면 되는지, 고친 뒤 어떻게 확인하는지 알려 주세요. 모르는 것은 우리에게 질문해 주세요. ${learner()}이 읽기 쉽게 6줄 안으로 써 주세요.`}];
let sample=null,probe=null;
function toast(t){const e=$('toast');if(!e)return;e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2600);}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true;}catch{const ta=document.createElement('textarea');ta.value=t;document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch{}ta.remove();return ok;}}
async function prepare(){if(probe)return probe;probe=(async()=>{if(!window.claude?.use)return;try{sample=await window.claude.use('sample');}catch{sample=null;}})();return probe;}
function build(){const grid=document.querySelector('#ai-cards .ai-grid');if(!grid)return;for(const c of CARDS){const card=document.createElement('section');card.className='ai-card';card.dataset.card=c.id;const h=document.createElement('h4');h.textContent=c.title;card.append(h);const inputs={};for(const [k,label,ph] of c.fields){const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');i.type='text';i.placeholder=ph;i.maxLength=80;i.id='ai-'+c.id+'-'+k;inputs[k]=i;l.append(i);card.append(l);}
  const actions=document.createElement('div');actions.className='ai-actions';const ask=document.createElement('button');ask.type='button';ask.className='song-main';ask.textContent='Claude에게 묻기';ask.hidden=true;const copy=document.createElement('button');copy.type='button';copy.className='quiet';copy.textContent='문장 복사';const stop=document.createElement('button');stop.type='button';stop.className='quiet';stop.textContent='멈춤';stop.hidden=true;const state=document.createElement('span');state.className='subtle';actions.append(ask,copy,stop,state);card.append(actions);
  const honest=document.createElement('span');honest.className='ai-honest';honest.textContent='AI의 답은 의견 · 정하는 것은 학생';const out=document.createElement('div');out.className='ai-answer';out.setAttribute('aria-live','polite');card.append(honest,out);grid.append(card);
  const values=()=>Object.fromEntries(Object.entries(inputs).map(([k,i])=>[k,i.value.trim()]));
  copy.addEventListener('click',async()=>{const ok=await copyText(c.make(values()));state.textContent=ok?'복사했어요. 선생님 화면의 AI에 붙여 넣으세요.':'복사가 안 됐어요.';if(!ok){out.textContent=c.make(values());}});
  let ctl=null;stop.addEventListener('click',()=>ctl?.abort());
  ask.addEventListener('click',async()=>{if(!sample)return;ctl=new AbortController();ask.disabled=true;stop.hidden=false;out.textContent='Claude가 생각하는 중…';state.textContent='';try{const {text,truncated}=await sample(c.make(values()),{signal:ctl.signal,cache:false,onText:({text})=>{out.textContent=text;}});out.textContent=text;if(truncated)state.textContent='답이 길어 잘렸어요.';}catch(e){const code=e?.code||'';out.textContent=e?.text||'';if(code==='cancelled')state.textContent='멈췄어요.';else if(code==='not_granted'||code==='sampling_disabled'||code==='not_declared'||code==='capability_disabled'){ask.hidden=true;state.textContent='이 화면에서는 Claude에게 바로 물을 수 없어요. 문장을 복사해 다른 AI에 붙여 넣으세요.';}else if(code==='rate_limited')state.textContent='지금은 너무 자주 물었어요. 잠시 뒤 다시 눌러 주세요.';else state.textContent='답을 받지 못했어요('+(code||'오류')+'). 다시 눌러 보세요.';}finally{ask.disabled=false;stop.hidden=true;}});
  card._ask=ask;}
 prepare().then(()=>{const on=!!sample;document.querySelectorAll('#ai-cards .ai-card').forEach(card=>{card._ask.hidden=!on;});const st=$('ai-cards-state');if(st)st.textContent=on?'Claude에게 바로 묻기 가능(보는 사람 계정 사용, 첫 질문 때 허용 창)':'복사해서 다른 AI에 붙여 넣기';});}
window.GugakAiCards={cards:CARDS,prepare,_state:()=>({sample:!!sample})};
build();
})();
