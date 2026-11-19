/* 누구나 함께 악기 v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * 10/31 대표 결정 수업 「AI 국악기를 바꿔서 누구나 함께 연주하기」의 놀이터 화면.
 * 사용자 카드 → 지금 악기 쳐 보기 → AI에게 바꿀 방법 묻기(카드 복사·답 붙여 넣기·검사) → 다른 모둠 의견 → 발표 → 합주.
 * - 학생 앱은 AI에 연결하지 않는다. 카드 글은 학생이 복사해 학교 계정 AI(감독 선생님 기기)에 붙여 넣는다.
 * - 교실 서버 없이 모둠 태블릿 한 대로 끝까지 된다. 서버가 있으면 '같이 시작' 시각만 받는다(자리·모둠을 보내지 않음).
 * - 마이크 '소리 반응'은 기기 안에서 소리 크기만 잰다(녹음·저장·전송 없음). 선생님이 허용해야 켜진다. 카메라는 쓰지 않는다.
 * - 박자 불빛은 박마다 한 번(1초에 2번 넘지 않음).
 */
(()=>{'use strict';
const P=window.GugakPlay,$=id=>document.getElementById(id);
const PII=/(이름\s*[:：은는]|제 이름|내 이름|학교|초등|중학교|[0-9]+\s*반|[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}|@|주소|번지|아파트)/;
const mask=t=>String(t||'').replace(new RegExp(PII.source,'g'),'○○');
const {CARDS,LIKES,HARD,FEAT,NOFEAT,BASE,ORDER,toCode,fromCode,valName,parseAnswer}=window.HKCore;
/* ── 상태 ── */
const SAVE='gugak-hk';const saved=P.Store.get(SAVE,null);
const st={card:null,like:'',hard:[],base:null,cur:null,preview:null,last:null,ans:'',src:'',opinions:'',ai:[],we:[],q:['','',''],step:1,seq:0,gen:0,micOK:false,mic:null,beat:null,session:null,trial:false,trialCode:null};
if(saved&&saved.card){Object.assign(st,saved);st.preview=null;st.beat=null;st.session=null;st.mic=null;}
const keep=()=>{const {card,like,hard,base,cur,ans,src,opinions,ai,we,q,step}=st;P.Store.set(SAVE,{card,like,hard,base,cur,ans,src,opinions,ai,we,q,step});};
const card=()=>CARDS.find(c=>c.id===st.card);
const live=()=>st.preview||st.cur||BASE(1);
/* ── 소리 ── */
const DEGS=[3,4,5,6,7,8,9];
const PADS=[{s:'쿵',side:'궁편(왼쪽 북면)'},{s:'덩',side:'두 편 함께'},{s:'덕',side:'채편(오른쪽)'}];
let soundP=null;
function sound(){if(!soundP)soundP=P.Sound.init([...DEGS.map(P.gayaSample),...['덩','쿵','덕','기덕'].map(s=>P.STROKES[s].sample)]).catch(e=>{soundP=null;throw e;});return soundP;}
const GAIN={1:.9,2:1.25,3:1.6};
async function hit(what){try{await sound();await P.Sound.resume();}catch(e){$('snd').textContent='소리를 준비하지 못했어요: '+e.message;return;}
 const c=live(),g=GAIN[c.vol]||.9;if(typeof what==='number'){P.playString(what,{gain:g});const s=P.STRINGS.find(x=>x.deg===what);flashHit(s.name,'.str[data-deg="'+what+'"]');}
 else{P.Sound.play(P.STROKES[what].sample,{gain:g});flashHit(what,'.pad[data-s="'+what+'"]');}}
/* 한 번 누르기: 곡의 다음 음(가야금: 아리랑 첫 구절 · 장구: 세마치 한 장단) */
function seqList(inst,song){if(inst===2)return P.SEMACHI.map(x=>x[1]);const s=P.SONGS[song||'arirang'];return s.melody.filter(m=>m.bar<4).map(m=>m.deg);}
function next(){const c=live(),L=seqList(c.inst,st.session?.song);const v=L[st.seq%L.length];st.seq++;hit(v);paintNext();}
function paintNext(){const c=live(),L=seqList(c.inst,st.session?.song),v=L[st.seq%L.length];document.querySelectorAll('#stage .nextup').forEach(e=>e.classList.remove('nextup'));
 const el=document.querySelector(c.inst===2?`#stage .pad[data-s="${v}"]`:`#stage .str[data-deg="${v}"]`);if(el&&c.one)el.classList.add('nextup');const n=$('one-n');if(n)n.textContent=`${st.seq%L.length+1}/${L.length}`;}
function flashHit(name,sel){const c=live();const el=document.querySelector('#stage '+sel);if(el){el.classList.add('hit');setTimeout(()=>el.classList.remove('hit'),160);}
 if(c.showhit){const h=$('hitname');if(h){h.textContent=name;h.classList.remove('show');void h.offsetWidth;h.classList.add('show');}}}
/* ── 악기 그리기 ── */
function drawStage(){const c=live(),s=$('stage');if(!s)return;const B={1:56,2:84,3:120}[c.big];
 document.body.classList.toggle('hk-text',!!c.text);document.body.classList.toggle('hk-contrast',!!c.contrast);document.body.classList.toggle('hk-simple',!!c.simple);
 s.className='stage hand'+c.hand+(c.one?' one':'');s.style.setProperty('--b',B+'px');
 const used=c.simple&&c.inst===1?new Set(seqList(1)):null;
 const keys=c.inst===2?PADS.filter(p=>!c.simple||true).map(p=>`<button class="pad" data-s="${p.s}" aria-label="장구 ${p.s} · ${p.side}"><b>${p.s}</b>${c.simple?'':`<small>${p.side}</small>`}</button>`).join('')
  :DEGS.filter(d=>!used||used.has(d)).map(d=>{const x=P.STRINGS.find(y=>y.deg===d);return `<button class="str" data-deg="${d}" aria-label="가야금 ${x.hyeon}현 ${x.name}"><b>${x.name}</b>${c.simple?'':`<small>${x.hyeon}현</small>`}</button>`;}).join('');
 s.innerHTML=`<div class="keys ${c.inst===2?'janggu':'gaya'}">${keys}</div>${c.one?`<button class="onebtn" id="onebtn">다음 음 <span id="one-n"></span></button>`:''}<div class="lamp" id="lamp" aria-hidden="true"></div><div class="hitname" id="hitname" aria-live="off"></div>`;
 s.querySelectorAll('.str,.pad').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();if(live().one)next();else hit(b.dataset.deg?+b.dataset.deg:b.dataset.s);}));
 const ob=$('onebtn');if(ob)ob.addEventListener('pointerdown',e=>{e.preventDefault();next();});
 $('lamp').hidden=!c.lamp;paintNext();micSync();
 const tags=FEAT.filter(f=>f.k!=='inst'&&c[f.k]!==BASE(1)[f.k]).map(f=>`${f.name} ${valName(f.k,c[f.k])}`);$('stage-tags').textContent=(st.preview?'바꾸기 전 쳐 보는 중 · ':'')+(c.inst===2?'장구':'가야금')+(tags.length?' · '+tags.join(' · '):' · 모두 처음 그대로');}
/* 글쇠 하나(스페이스·엔터, 바깥 스위치·발 페달이 보내는 글쇠) */
document.addEventListener('keydown',e=>{const c=live();if(!c.key||e.repeat)return;if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='Space'||e.key==='Enter'){e.preventDefault();next();}});
/* 소리 반응: 기기 안에서 소리 크기만 잼(녹음·저장·전송 없음) */
async function micSync(){const want=!!live().mic&&st.micOK&&!st.trialHide;const note=$('mic-note');
 if(!want){if(st.mic){st.mic.stream.getTracks().forEach(t=>t.stop());cancelAnimationFrame(st.mic.raf);st.mic=null;}if(note)note.textContent=live().mic&&!st.micOK?'소리 반응: 선생님이 아래 ‘선생님 칸’에서 허용해야 켜져요':'';return;}
 if(st.mic)return;if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){if(note)note.textContent='이 주소에서는 브라우저가 마이크를 막아요(교실 서버 주소 등) · 글쇠하나나 한번누르기로 대신해요';return;}
 try{await sound();const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});const ctx=P.Sound.ctx,src=ctx.createMediaStreamSource(stream),an=ctx.createAnalyser();an.fftSize=512;src.connect(an);/* 스피커로 내보내지 않음 */
  const buf=new Float32Array(an.fftSize);let last=0;const m={stream,raf:0};st.mic=m;
  const loop=()=>{an.getFloatTimeDomainData(buf);let s=0;for(const v of buf)s+=v*v;const rms=Math.sqrt(s/buf.length),now=performance.now();if(rms>.12&&now-last>380){last=now;next();}m.raf=requestAnimationFrame(loop);};loop();
  if(note)note.textContent='소리 반응 켜짐 · 소리 크기만 재요(녹음하지 않아요)';}catch(e){if(note)note.textContent='마이크를 쓰지 못했어요 · 글쇠하나나 한번누르기로 대신해요';}}
/* ── 박자(불빛·진동): 박마다 한 번, 1초에 2번 넘지 않음 ── */
function beatRun(startPerf,tempo,durMs,song){stopBeat();const c=live(),beat=Math.max(500,3*P.e8(tempo));const B={t0:startPerf,beat,end:startPerf+durMs,raf:0,n:-1};st.beat=B;st.seq=0;paintNext();
 const lamp=$('lamp'),vib=c.vib&&navigator.vibrate;
 const loop=()=>{const now=performance.now();if(now>B.end||st.beat!==B){if(lamp)lamp.classList.remove('on');$('beat-state').textContent=st.session?'같이 시작 끝':'';st.beat=null;st.session=null;return;}
  const k=Math.floor((now-B.t0)/B.beat);if(now<B.t0){$('beat-state').textContent=`곧 시작 · ${Math.ceil((B.t0-now)/1000)}초`;}
  else if(k!==B.n){B.n=k;$('beat-state').textContent=`${k+1}박`;if(live().lamp&&lamp){lamp.classList.add('on');setTimeout(()=>lamp.classList.remove('on'),Math.min(300,B.beat/2));}if(live().vib&&navigator.vibrate)navigator.vibrate(60);}
  B.raf=requestAnimationFrame(loop);};loop();}
function stopBeat(){if(st.beat){cancelAnimationFrame(st.beat.raf);st.beat=null;}st.gen++;P.Sound.stopAll();const l=$('lamp');if(l)l.classList.remove('on');}
async function practice(){const tempo=+$('tempo').value||45;try{await sound();await P.Sound.resume();}catch(e){return;}const ctx=P.Sound.ctx,e8=P.e8(tempo)/1000,t0=ctx.currentTime+.6,bars=4;
 stopBeat();const g=++st.gen;for(const n of P.jangdan(P.SEMACHI,bars))P.Sound.play(P.STROKES[n.stroke].sample,{when:t0+n.t*e8,gain:.35});beatRun(performance.now()+600,tempo,bars*P.BAR*e8*1000,'arirang');}
/* ── 부탁 카드 글 ── */
function askText(){const C=card(),c=st.cur;const like=C.like||(st.like?`${mask(st.like)}을(를) 좋아해요`:'좋아하는 것은 모둠이 정해요');
 const lines=['[함께 악기 바꾸기 부탁]','우리 모둠은 아래 사람이 태블릿 국악기를 함께 연주할 수 있게, 악기 설정을 바꾸려고 해요.','',
  `■ 사용자 카드: ${C.who} — ${C.about}. ${like}.`,
  st.hard.length?`■ 우리 모둠이 생각한 어려운 점: ${st.hard.join(', ')}`:'■ 우리 모둠이 생각한 어려운 점: (아직 안 골랐어요)',
  `■ 악기: ${c.inst===2?'장구(쿵·덩·덕 세 단추)':'가야금(줄 7개)'} — 아리랑에 맞춰 반 친구들과 합주해요.`,
  '■ 지금 설정:',...FEAT.map(f=>`${f.name}: ${valName(f.k,c[f.k])}`),'',
  '■ 바꿀 수 있는 것(이 항목만, 이 범위 안에서):',...FEAT.map(f=>`- ${f.name}: ${f.say}`)];
 if(st.opinions.trim())lines.push('','■ 다른 모둠이 쳐 보고 준 의견:',mask(st.opinions.trim()).slice(0,300));
 lines.push('','부탁:','1) 이 사람이 이 악기를 칠 때 어려울 점을 두 가지만 짧게 말해 주세요.','2) 위 항목 가운데 바꿀 것을 아래 형식으로만 적어 주세요. 바꾸지 않을 항목은 쓰지 않아도 돼요.','[설정]','항목: 값','[끝]','3) 바꾼 것마다 이유를 한 줄씩 적어 주세요.','- 위에 없는 기능은 만들지 말고, 필요하면 ‘없어서 아쉬운 기능’으로 따로 적어 주세요.');
 return lines.join('\n');}
/* ── 화면 ── */
function goStep(n){st.step=n;document.querySelectorAll('.hk-step').forEach(s=>s.hidden=+s.dataset.step!==n);document.querySelectorAll('#steps button').forEach(b=>b.setAttribute('aria-current',+b.dataset.step===n?'step':'false'));
 const slot=document.querySelector(`.hk-step[data-step="${n}"] .slot`);if(slot)slot.append($('stagebox'));$('stagebox').hidden=!slot;
 if(n!==3&&st.preview){st.preview=null;}if(n===3)paintAsk();if(n===5)paintShow();if(n===4)paintTrial();drawStage();keep();window.scrollTo({top:0});}
function paintCards(){const box=$('cards');box.innerHTML='';const more=$('more').checked;
 for(const C of CARDS){if(C.extra&&!more)continue;const b=document.createElement('button');b.className='ucard';b.setAttribute('aria-pressed',String(st.card===C.id));b.dataset.id=C.id;
  b.innerHTML=`<span class="pic" aria-hidden="true">${C.pic}</span><b>${C.who}</b><span>${C.about}</span><em>${C.like||'좋아하는 것: 모둠이 정해요'}</em>${C.extra?'<i class="tag">더 둘지 제안</i>':''}`;
  b.onclick=()=>{if(st.card&&st.card!==C.id&&st.cur&&JSON.stringify(st.cur)!==JSON.stringify(st.base)&&!confirm('카드를 바꾸면 지금까지 바꾼 악기 설정이 처음으로 돌아가요. 바꿀까요?'))return;
   st.card=C.id;st.base={...BASE(C.inst),card:C.id};st.cur={...st.base};st.hard=[];st.like='';st.ans='';st.src='';st.last=null;st.opinions='';st.seq=0;paintCards();paintLike();keep();drawStage();};box.append(b);}
 $('to2').disabled=!st.card;}
function paintLike(){const C=card();$('like-row').hidden=!C||!!C.like;const ch=$('likes');ch.innerHTML='';for(const l of LIKES){const b=document.createElement('button');b.textContent=l;b.setAttribute('aria-pressed',String(st.like===l));b.onclick=()=>{st.like=l;$('like-own').value='';paintLike();keep();};ch.append(b);}}
function paintHard(){const ch=$('hards');ch.innerHTML='';for(const h of HARD){const b=document.createElement('button');b.textContent=h;b.setAttribute('aria-pressed',String(st.hard.includes(h)));b.onclick=()=>{st.hard=st.hard.includes(h)?st.hard.filter(x=>x!==h):[...st.hard,h].slice(-4);paintHard();keep();};ch.append(b);}
 const C=card();$('who2').textContent=C?`${C.who} — ${C.about}`:'';}
function paintAsk(){if(!card())return;$('ask').value=askText();$('answer').value=st.ans;paintResult();}
function paintResult(){const box=$('result');box.innerHTML='';const txt=$('answer').value;if(!txt.trim()){$('apply').disabled=true;$('try').disabled=true;return;}
 const r=parseAnswer(txt,st.cur);st.last=r;const add=(cls,t)=>{const p=document.createElement('p');p.className=cls;p.textContent=t;box.append(p);return p;};
 if(PII.test(txt))add('warn','답에 개인정보처럼 보이는 말이 있어요. 감독 선생님께 보여 주고 지워요(화면에는 ○○로 가려요).');
 if(st.src)add('note','답 출처: '+st.src);
 if(r.none&&!r.bad.length)add('warn','바꿀 항목을 찾지 못했어요. 답에 [설정] … [끝] 꼴이 있는지 보고, 없으면 AI에게 형식대로 다시 부탁해요.');
 if(r.changes.length){add('ok',`바꿀 것 ${r.changes.length}가지(적용 전이에요):`);const ul=document.createElement('ul');for(const k of r.changes){const f=FEAT.find(x=>x.k===k);const li=document.createElement('li');li.textContent=`${f.name}: ${valName(k,st.cur[k])} → ${valName(k,r.set[k])}`;ul.append(li);}box.append(ul);}
 else if(!r.none)add('note','지금 설정과 같아요(이미 적용했거나 바꿀 것이 없어요).');
 for(const x of r.bad)add('warn',`쓰지 않는 줄: “${x.line}” — ${x.why}`);
 for(const x of r.unknown)add('note',`없는 기능: “${x.line}” — ${x.why}`);
 if(r.changes.length)add('note','적용하기 전에 ‘바꾼 악기 쳐 보기’로 먼저 쳐 보고, 카드 속 사람이 정말 칠 수 있을지 모둠이 판단해요. AI 답은 의견이에요.');
 $('apply').disabled=!r.changes.length;$('try').disabled=!r.changes.length;}
function applyNow(){const r=st.last;if(!r||!r.changes.length)return;st.history=(st.history||[]).concat([{...st.cur}]).slice(-5);for(const k of r.changes)st.cur[k]=r.set[k];st.preview=null;st.seq=0;$('apply-state').textContent=`적용했어요 · ${r.changes.length}가지 바꿈`;$('try').textContent='바꾼 악기 쳐 보기';keep();drawStage();paintAsk();paintManual();}
/* AI 없이 직접 바꾸기(강사와 함께 · AI를 쓸 수 없는 날) */
function paintManual(){const box=$('manual');box.innerHTML='';for(const f of FEAT){const r=document.createElement('div');r.className='row';const l=document.createElement('span');l.className='lab';l.textContent=f.name;r.append(l);const ch=document.createElement('div');ch.className='chips';
  for(const [v,n] of f.vals){const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-pressed',String(st.cur&&st.cur[f.k]===v));b.onclick=()=>{st.cur[f.k]=v;st.preview=null;keep();drawStage();paintManual();paintAsk();};ch.append(b);}r.append(ch);box.append(r);}}
/* 다른 모둠 시험·의견 */
const OPN=['단추 크기가 알맞아요','단추가 아직 작아요','한 손으로 칠 수 있어요','한 손으로는 아직 어려워요','박자를 알 수 있어요','박자를 알기 어려워요','화면이 쉬워요','화면이 아직 복잡해요','소리가 잘 들려요','소리가 너무 작아요'];
function paintTrial(){const code=toCode(st.cur||BASE(1));$('mycode').value=st.cur?code:'';$('op-in').value=st.opinions;
 const ch=$('ops');ch.innerHTML='';st.opSel=st.opSel||[];for(const o of OPN){const b=document.createElement('button');b.textContent=o;b.setAttribute('aria-pressed',String(st.opSel.includes(o)));b.onclick=()=>{st.opSel=st.opSel.includes(o)?st.opSel.filter(x=>x!==o):[...st.opSel,o];paintTrial();};ch.append(b);}
 const yes=$('op-yes').value;$('op-out').value=st.trialCode?`[${CARDS.find(c=>c.id===st.trialCode.card).who} 카드 악기를 쳐 본 의견]\n정말 칠 수 있을까: ${yes||'(고르기)'}\n${st.opSel.join('\n')}${$('op-own').value.trim()?'\n'+mask($('op-own').value.trim()).slice(0,80):''}`:'';
 $('trial-on').hidden=!st.trialCode;$('trial-who').textContent=st.trialCode?`${CARDS.find(c=>c.id===st.trialCode.card).who} — ${CARDS.find(c=>c.id===st.trialCode.card).about}`:'';}
/* 발표 */
const AI_DID=['바꿀 것을 제안했어요','설정 글을 써 줬어요','어려운 점을 말해 줬어요','없는 기능을 말해서 우리가 뺐어요','틀린 형식을 써서 다시 물었어요'];
const WE_DID=['카드 속 사람의 어려운 점을 찾았어요','부탁 글을 골라 AI에게 물었어요','AI 답을 검사했어요','쳐 보고 적용할지 정했어요','다른 모둠 의견을 듣고 다시 바꿨어요','AI 답 가운데 일부를 뺐어요'];
function paintShow(){const C=card();if(!C)return;$('sh-who').textContent=`${C.pic} ${C.who} — ${C.about}`;$('sh-like').textContent=C.like||(st.like?mask(st.like)+'을(를) 좋아해요':'');
 const ch=FEAT.filter(f=>st.cur[f.k]!==st.base[f.k]).map(f=>`${f.name}: ${valName(f.k,st.base[f.k])} → ${valName(f.k,st.cur[f.k])}`);$('sh-changes').innerHTML='';for(const t of ch.length?ch:['(아직 바꾼 것이 없어요)']){const li=document.createElement('li');li.textContent=t;$('sh-changes').append(li);}
 for(const [id,list,keyName] of [['sh-ai',AI_DID,'ai'],['sh-we',WE_DID,'we']]){const box=$(id);box.innerHTML='';for(const t of list){const b=document.createElement('button');b.textContent=t;b.setAttribute('aria-pressed',String(st[keyName].includes(t)));b.onclick=()=>{st[keyName]=st[keyName].includes(t)?st[keyName].filter(x=>x!==t):[...st[keyName],t];keep();paintShow();};box.append(b);}}
 ['q1','q2','q3'].forEach((id,i)=>{$(id).value=st.q[i];});$('sh-code').textContent=toCode(st.cur);}
/* ── 교실 연결: 같이 시작 시각만 받는다(자리·모둠은 보내지 않음) ── */
function onSession(s){const L=P.LEVELS[s.level]||{};const tempo=s.tempo||45,ch=P.chart(s.level,tempo);st.session={id:s.id,song:L.song||L.backing||'arirang'};const start=window.GugakClass.toPerf(s.startAt)+P.BAR*P.e8(tempo);/* 교탁의 세기 한 마디 뒤 */
 if(st.step!==6)goStep(6);$('beat-state').textContent='선생님이 같이 시작을 눌렀어요';beatRun(start,tempo,Math.max(4000,ch.end-P.BAR*P.e8(tempo)),st.session.song);}
/* ── 시작 ── */
function init(){
 document.querySelectorAll('#steps button').forEach(b=>b.onclick=()=>{const n=+b.dataset.step;if(n>1&&!st.card){$('to2-note').textContent='먼저 사용자 카드를 골라요';return;}goStep(n);});
 $('more').onchange=paintCards;$('to2').onclick=()=>goStep(2);
 $('like-own').oninput=e=>{const v=e.target.value;$('like-pii').hidden=!PII.test(v);if(!PII.test(v)){st.like=v.trim().slice(0,20);keep();}paintLike();};
 $('copy').onclick=async()=>{const t=askText();$('ask').value=t;try{await navigator.clipboard.writeText(t);$('copy-state').textContent='복사했어요 · 감독 선생님이 정한 학교 계정 AI 화면에 붙여 넣어요';}catch(e){$('ask').select();$('copy-state').textContent='글을 길게 눌러 복사해요';}};
 $('answer').oninput=()=>{st.ans=$('answer').value;st.src='붙여 넣은 답';st.preview=null;keep();paintResult();drawStage();};
 $('try').onclick=()=>{if(st.preview){st.preview=null;$('try').textContent='바꾼 악기 쳐 보기';}else if(st.last&&st.last.changes.length){st.preview={...st.cur};for(const k of st.last.changes)st.preview[k]=st.last.set[k];$('try').textContent='바꾸기 전으로 쳐 보기';}st.seq=0;drawStage();};
 $('apply').onclick=applyNow;$('undo').onclick=()=>{const h=st.history||[];if(!h.length){$('apply-state').textContent='되돌릴 것이 없어요';return;}st.cur=h.pop();st.preview=null;keep();drawStage();paintAsk();paintManual();$('apply-state').textContent='한 번 전으로 되돌렸어요';};
 $('ex').onchange=()=>{const id=$('ex').value;if(!id)return;const E=(window.HK_EXAMPLES||[]).find(x=>x.id===id);$('ex').value='';if(!E)return;if(E.card!==st.card){$('ex-note').textContent=`이 예시는 ‘${CARDS.find(c=>c.id===E.card).who}’ 카드용이에요. 카드를 그것으로 바꾼 뒤 골라요.`;return;}
  if($('answer').value.trim()&&!confirm('붙여 넣은 답을 지우고 예시로 바꿀까요?'))return;$('answer').value=E.text;st.ans=E.text;st.src=E.kind==='ai'?`미리 받아 둔 AI 답(${E.got} 받음)`:'셈제작소가 만든 연습용 답(AI 답 아님 · 일부러 틀린 곳 있음)';$('ex-note').textContent='';keep();paintResult();};
 $('clear-ans').onclick=()=>{$('answer').value='';st.ans='';st.src='';st.preview=null;keep();paintResult();drawStage();};
 $('op-in').oninput=e=>{st.opinions=e.target.value.slice(0,400);keep();};
 $('op-yes').onchange=paintTrial;$('op-own').oninput=paintTrial;
 $('trial-load').onclick=()=>{const c=fromCode($('trial-code').value);if(!c){$('trial-state').textContent='악기 코드가 맞지 않아요(함께-숫자 14개-글자)';return;}st.trialCode=c;st.preview={...c};st.seq=0;$('trial-state').textContent='다른 모둠 악기를 열었어요 · 쳐 보고 의견을 골라요(우리 악기는 그대로예요)';paintTrial();drawStage();};
 $('trial-end').onclick=()=>{st.trialCode=null;st.preview=null;st.opSel=[];$('trial-state').textContent='우리 악기로 돌아왔어요';paintTrial();drawStage();};
 $('op-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('op-out').value);$('op-state').textContent='복사했어요 · 그 모둠에 전해요(말로 읽어 줘도 돼요)';}catch(e){$('op-out').select();}};
 $('re-ask').onclick=()=>{if(!st.opinions.trim()){$('re-state').textContent='받은 의견을 먼저 넣어요';return;}st.ans='';st.src='';goStep(3);};
 ['q1','q2','q3'].forEach((id,i)=>$(id).oninput=e=>{const v=e.target.value;$(id+'-pii').hidden=!PII.test(v);st.q[i]=mask(v).slice(0,120);keep();});
 $('big-show').onclick=()=>{document.body.classList.toggle('presenting');$('big-show').textContent=document.body.classList.contains('presenting')?'발표 끝(돌아가기)':'크게 보여 주기';};
 $('practice').onclick=practice;$('stop').onclick=()=>{stopBeat();$('beat-state').textContent='멈췄어요';};
 $('mic-ok').onchange=e=>{st.micOK=e.target.checked;micSync();};
 $('reset').onclick=()=>{if(!confirm('이 기기의 ‘함께 악기’ 기록(카드·설정·발표 글)을 지울까요?'))return;try{localStorage.removeItem(SAVE);}catch(e){}location.reload();};
 paintCards();paintLike();paintHard();paintManual();
 const exs=window.HK_EXAMPLES||[];$('ex').innerHTML='<option value="">예시 답 고르기</option>'+exs.map(E=>`<option value="${E.id}">${CARDS.find(c=>c.id===E.card).who} · ${E.kind==='ai'?'미리 받아 둔 AI 답':'연습용(틀린 곳 있음)'}</option>`).join('');
 goStep(st.card?st.step:1);
 /* 교탁 받은 함에서 ‘열어 쳐 보기’: #open=함께-…(이 기기 우리 악기는 그대로) */
 {let h='';try{h=decodeURIComponent(location.hash);}catch(e){}const m=/open=(함께-\d{14}-[A-Z])/.exec(h);if(m){goStep(4);$('trial-code').value=m[1];$('trial-load').click();}}
 const GC=window.GugakClass;if(GC){GC.noHello=true;GC.setPage('together');GC.on_('session',onSession);GC.on_('cancel',()=>{if(st.session){stopBeat();st.session=null;$('beat-state').textContent='선생님이 멈췄어요';}});GC.start().then(on=>{$('class-line').textContent=on?'교실 연결: 선생님 ‘모두 같이 시작’을 받을 수 있어요(이 화면은 자리·모둠을 보내지 않아요)':'';});}
}
window.GugakHK={st,CARDS,FEAT,parseAnswer,toCode,fromCode,askText,BASE,next,hit,goStep};
document.addEventListener('DOMContentLoaded',init);
})();
