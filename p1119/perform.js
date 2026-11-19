/* 국악 연주 채점 v0.2 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * 리듬 게임과 다른 화면이다. 떨어지는 기호·검은 점 같은 안내 없이, 수업에서 배운 곡을 악기 화면에서 외워 친다.
 * 앱은 친 줄(장구는 친 편)과 시각만 기록하고, 끝나면 수업 악보와 견주어 점수를 매긴다. 마이크·녹음 없음, AI 없음.
 * 채점(기본값, 국악 강사 확인 필요)
 *  - 음: 친 음 순서를 악보 음 순서와 맞춰 보기(편집 거리 정렬) → 맞은 음·틀린 음·빠진 음·더 친 음.
 *        음 점수 = (맞은 음 − 더 친 음×0.5) ÷ 악보 음 수.
 *  - 박자(v0.2): 음마다 '앞에 맞게 친 음과의 간격'을 본다 → 한 곳이 밀려도 그 뒤 음은 다시 맞음으로 센다.
 *        박 소리 끔: 학생 빠르기 = 간격 비율의 가운데값. 박 소리 켬: 반주 박 시각에 맞으면 1, 밀렸어도 간격이 맞으면 0.5.
 *        어긋남이 8분음표 0.35배 안이면 1, 0.75배 안이면 0.5. 박자 점수 = 합 ÷ 악보 음 수.
 *  - 총점 = 음 60% + 박자 40%. 별 ★★★ 90 · ★★ 70 · ★ 40.
 */
(()=>{'use strict';
const P=window.GugakPlay,AV=window.GugakAvatar,$=id=>document.getElementById(id);
const CLASS=P.classCode();
const TEMPO=CLASS.tempo||45;
const PIECES={
 P1:{inst:'gayageum',title:'아리랑 1구절',song:'arirang',from:0,bars:4},
 P2:{inst:'gayageum',title:'아리랑 1~2구절',song:'arirang',from:0,bars:8},
 P3:{inst:'gayageum',title:'아리랑 전체',song:'arirang',from:0,bars:16},
 P4:{inst:'gayageum',title:'도라지타령',song:'doraji',from:0,bars:8},
 P5:{inst:'janggu',title:'세마치 장단 4마디',bars:4}};
const st={seq:0,seat:P.Store.get('gugak-seat',0),group:P.Store.get('gugak-group',0),offset:P.Store.get('gugak-offset',0),beat:P.Store.get('gugak-perf-beat',true),hand:CLASS.hand||P.Store.get('gugak-hand','right'),piece:'P1',run:null,server:false,practice:null};
const avatar=()=>AV.load()||AV.make('gayul');

/* ── 악보 ── */
function expected(id,range){const pc=PIECES[id];const from=range?range[0]:(pc.from||0),bars=range?range[1]-range[0]:pc.bars;
 if(pc.inst==='janggu')return P.jangdan(P.SEMACHI,bars,from).map((n,i)=>({i,t:n.t-from*P.BAR,bar:n.bar,key:n.stroke,label:n.stroke}));
 const s=P.SONGS[pc.song];return s.melody.filter(m=>m.bar>=from&&m.bar<from+bars).map((m,i)=>({i,t:m.t-from*P.BAR,bar:m.bar,key:m.deg,label:P.STRINGS.find(x=>x.deg===m.deg).name,syl:m.syl,len:m.len}));}
const nameOf=(inst,key)=>inst==='janggu'?key:P.STRINGS.find(x=>x.deg===key).name;

/* ── 맞춰 보기(편집 거리) ── */
function align(exp,play,model=null){const n=exp.length,m=play.length,G=1000;// 음이 같으면 편집 거리 → 그다음 박 시각이 가까운 쪽(지적 1)
 const tc=(i,j)=>model?Math.min(3,Math.abs(play[j].t-(model.a+model.b*exp[i].t))/model.b):0;
 const sub=(i,j)=>(exp[i].key===play[j].key?0:G)+tc(i,j);
 const D=[...Array(n+1)].map(()=>new Array(m+1).fill(0));
 for(let i=0;i<=n;i++)D[i][0]=i*G;for(let j=0;j<=m;j++)D[0][j]=j*G;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)D[i][j]=Math.min(D[i-1][j-1]+sub(i-1,j-1),D[i-1][j]+G,D[i][j-1]+G);
 const ops=[];let i=n,j=m;const eq=(a,b)=>Math.abs(a-b)<1e-6;
 while(i>0||j>0){if(i>0&&j>0&&eq(D[i][j],D[i-1][j-1]+sub(i-1,j-1))){ops.push({op:exp[i-1].key===play[j-1].key?'ok':'wrong',e:i-1,p:j-1});i--;j--;}else if(i>0&&eq(D[i][j],D[i-1][j]+G)){ops.push({op:'miss',e:i-1});i--;}else{ops.push({op:'extra',p:j-1,before:i});j--;}}
 return ops.reverse();}
function guess(exp,play,{beat,e8,startMs}){if(beat)return{a:startMs,b:e8};if(play.length<2||!exp.length)return null;const de=exp[exp.length-1].t-exp[0].t,dp=play[play.length-1].t-play[0].t;const b=de>0&&dp>0?dp/de:e8;return{a:play[0].t-b*exp[0].t,b};}
function score(exp,play,{beat,e8,startMs}){
 const N=exp.length;if(!N)return{ops:[],ok:0,wrong:0,miss:0,extra:play.length,N:0,notePct:0,rhythmPct:0,total:0,stars:0,tim:new Map(),playedTempo:null};// 지적 23
 const ops=align(exp,play,guess(exp,play,{beat,e8,startMs}));let ok=0,wrong=0,miss=0,extra=0;for(const o of ops)({ok:()=>ok++,wrong:()=>wrong++,miss:()=>miss++,extra:()=>extra++})[o.op]();
 const pairs=ops.filter(o=>o.op==='ok'||o.op==='wrong').map(o=>[exp[o.e].t,play[o.p].t,o]);
 // v0.2(11/16 총괄창 지적): 한 곳이 밀리면 그 뒤가 모두 틀리던 것(한 직선 맞춤) → 앞 음과의 사이(간격)로 한 음씩 본다.
 //  박 끔: 학생 빠르기 = 간격 비율의 가운데값. 음마다 '앞에 맞춘 음과의 간격'이 맞으면 1/0.5.
 //  박 켬: 반주 박 시각에 맞으면 1/0.5, 박에서 밀렸어도 앞 음과의 간격이 맞으면 0.5.
 pairs.sort((x,y)=>x[2].e-y[2].e);
 const ratios=[];for(let k=1;k<pairs.length;k++){const de=pairs[k][0]-pairs[k-1][0],dp=pairs[k][1]-pairs[k-1][1];if(de>0&&dp>0)ratios.push(dp/de);}
 ratios.sort((x,y)=>x-y);const med=ratios.length?ratios[Math.floor((ratios.length-1)/2)]+(ratios.length%2?0:(ratios[ratios.length/2]-ratios[Math.floor((ratios.length-1)/2)])/2):null;
 const unit=beat?e8:med;const grade=r=>r<=.35?1:r<=.75?.5:0;
 let credit=0;const tim=new Map();
 if(unit&&pairs.length>=(beat?1:2))pairs.forEach(([te,tp,o],k)=>{let c,r,early;
  const loc=k?((tp-pairs[k-1][1])-unit*(te-pairs[k-1][0]))/unit:0;
  if(beat){const abs=(tp-(startMs+e8*te))/e8;r=Math.abs(abs);c=grade(r);early=abs<0;if(c<1&&k&&Math.abs(loc)<=.35){c=Math.max(c,.5);}}
  else{r=Math.abs(loc);c=k?grade(r):1;early=loc<0;}
  tim.set(o.e,{r,c,early});credit+=c;});
 const model=!beat&&med?{b:med}:null;
 const notePct=Math.max(0,Math.round(100*(ok-.5*extra)/N)),rhythmPct=Math.round(100*credit/N),total=Math.round(.6*notePct+.4*rhythmPct);
 const stars=total>=90?3:total>=70?2:total>=40?1:0;
 const playedTempo=model&&!beat?Math.round(60000/(3*model.b)):null;
 return{ops,ok,wrong,miss,extra,N,notePct,rhythmPct,total,stars,tim,playedTempo};}

/* ── 장구 친 편을 장단 기호로 ── */
function strokes(hits){const out=[];const hs=[...hits].sort((a,b)=>a.t-b.t);for(let k=0;k<hs.length;k++){const h=hs[k],nx=hs[k+1];if(nx&&nx.side!==h.side&&nx.t-h.t<=90){out.push({t:h.t,key:'덩'});k++;}else out.push({t:h.t,key:h.side==='gung'?'쿵':'덕'});}return out;}

/* ── 소리 ── */
let soundP=null;function sound(){if(!soundP){const ids=new Set(Object.values(P.STROKES).map(s=>s.sample));for(const s of P.STRINGS)ids.add(P.gayaSample(s.deg));soundP=P.Sound.init([...ids]).catch(e=>{soundP=null;throw e;});}return soundP;}

/* ── 화면 ── */
function show(id){for(const s of document.querySelectorAll('.screen'))s.hidden=s.id!==id;}
function home(){show('home');$('me').innerHTML=AV.render(avatar(),{size:110});
 fill($('seat'),41,st.seat,'자리 번호');fill($('group'),(CLASS.groups||8)+1,st.group,'모둠');
 const list=$('pieces');list.replaceChildren();const best=P.Store.get('gugak-perf-best',{});
 for(const [id,pc] of Object.entries(PIECES)){const b=document.createElement('button');b.className='piece'+(id===st.piece?' on':'');b.dataset.piece=id;b.innerHTML=`<span class="inst">${pc.inst==='janggu'?'장구':'가야금'}</span><b>${pc.title}</b><span class="best">${best[id]?'최고 '+best[id]+'점':'처음'}</span>`;list.append(b);}
 $('beat').checked=st.beat;$('tempo-line').textContent=`빠르기 ♩.=${TEMPO}${CLASS.program?' · 수업 설정 '+CLASS.program:''}`;}
function fill(sel,n,v,label){sel.replaceChildren(new Option(label+' 고르기','0'));for(let i=1;i<n;i++)sel.append(new Option(i+'번',''+i));sel.value=String(v||0);}

/* 악기 그리기: 가야금 7줄(위=낮은 줄) / 장구 두 편 — 안내 표시 없음 */
function buildInstrument(inst){const box=$('inst');box.replaceChildren();box.className='inst '+inst+(st.hand==='left'?' mirror':'');
 if(inst==='gayageum'){P.STRINGS.forEach((s,i)=>{const row=document.createElement('button');row.className='string';row.dataset.lane=i;row.innerHTML=`<span class="lab">${s.hyeon}현 ${s.name}</span><span class="line" style="height:${2+i*.5}px"></span><span class="anjok"></span>`;box.append(row);});}
 else{for(const [lane,label,sub] of [[0,'궁편','쿵 · 왼손'],[1,'채편','덕 · 오른손']]){const b=document.createElement('button');b.className='drum d'+lane;b.dataset.lane=lane;b.innerHTML=`<b>${label}</b><span>${st.hand==='left'?sub.replace(/왼손|오른손/,h=>h==='왼손'?'오른손':'왼손'):sub}</span>`;/* 왼손 배치면 손 글자도(Astra 14) */box.append(b);}}}

async function begin(id,range=null){const my=++st.seq;cancel();P.Sound.stopAll();st.piece=id;const pc=PIECES[id],exp=expected(id,range),e8=P.e8(TEMPO);
 show('play');$('play-title').textContent=pc.title+(range?` · ${range[2]}구절만 연습`:'');buildInstrument(pc.inst);$('play-me').innerHTML=AV.render(avatar(),{size:84});
 $('keys').textContent=pc.inst==='janggu'?(st.hand==='left'?'글쇠: F 채편 · J 궁편 · 스페이스 덩 (왼손 배치)':'글쇠: F 궁편 · J 채편 · 스페이스 덩'):'글쇠: 1~7 또는 A S D F G H J (위 줄부터)';
 $('status').textContent='소리 준비 중…';try{await sound();await P.Sound.resume();}catch(e){if(st.seq===my)$('status').textContent='소리를 준비하지 못했어요';return;}
 if(st.seq!==my||$('play').hidden)return;// 준비 중 그만·다시 시작(지적 18)
 const ctx=P.Sound.ctx,lat=P.Sound.latency(),ahead=.6,beat=st.beat;
 const run={id,range,pc,exp,e8,beat,hits:[],t0:null,done:false,startMs:0,timer:0,silence:0,cd:[]};st.run=run;
 if(beat){const ctxStart=ctx.currentTime+ahead;run.t0=performance.now()+ahead*1000+lat*1000;run.startMs=P.BAR*e8;// 한 마디 세고 시작
  const bars=range?range[1]-range[0]:pc.bars;for(const k of [0,3,6])P.Sound.play('janggu-04-deok-medium',{when:ctxStart+k*e8/1000,gain:.4});
  for(const n of P.jangdan(P.SEMACHI,bars))P.Sound.play(P.STROKES[n.stroke].sample,{when:ctxStart+(n.t+P.BAR)*e8/1000,gain:pc.inst==='janggu'?.0:.38});
  if(pc.inst==='janggu'){/* 장구 채점은 반주 대신 박만 */for(let b=0;b<bars;b++)for(const k of [0,3,6])P.Sound.play('janggu-04-deok-medium',{when:ctxStart+((b+1)*P.BAR+k)*e8/1000,gain:.16});}
  const endMs=(P.BAR+bars*P.BAR)*e8+e8*3;run.timer=setTimeout(()=>{if(!run.done)end();},ahead*1000+endMs+400);
  $('status').innerHTML='하나 · 둘 · 셋 다음부터 <b>외워서</b> 쳐요';countdown(run,e8,ahead);}
 else{$('status').innerHTML='첫 음을 치면 시작해요 · <b>외워서</b> 쳐요';}
 st.run=run;$('done').disabled=false;}
function cancel(){const r=st.run;if(r){r.done=true;clearTimeout(r.timer);clearTimeout(r.silence);(r.cd||[]).forEach(clearTimeout);}$('count').textContent='';}
function countdown(run,e8,ahead){const el=$('count');['하나','둘','셋','시작'].forEach((w,i)=>run.cd.push(setTimeout(()=>{if(st.run!==run||run.done)return;el.textContent=w;el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');if(i===3){run.cd.push(setTimeout(()=>el.textContent='',700));if(!run.playing){run.playing=true;$('status').innerHTML='<b class="live">● 연주 중</b> · 다 치면 “다 쳤어요”';}}},ahead*1000+i*3*e8)));}
function hit(lane,stamp){const r=st.run;if(!r||r.done)return;const inst=r.pc.inst;
 if(inst==='gayageum')P.playString(P.STRINGS[lane].deg,{gain:.95});else P.Sound.play(lane===0?'janggu-02-kung-medium':'janggu-04-deok-medium',{gain:.95});
 const el=document.querySelector(`#inst [data-lane="${lane}"]`);if(el){el.classList.remove('pluck');void el.offsetWidth;el.classList.add('pluck');}
 if(r.t0==null){r.t0=stamp;r.startMs=0;}
 if(!r.playing){r.playing=true;$('status').innerHTML='<b class="live">● 연주 중</b> · 다 치면 “다 쳤어요”'+(r.beat?'':' (5초 쉬면 끝나요)');}
 const t=stamp-r.t0-(r.beat?st.offset:0);
 r.hits.push(inst==='gayageum'?{t,key:P.STRINGS[lane].deg,lane}:{t,side:lane===0?'gung':'chae'});
 if(!r.beat){clearTimeout(r.silence);r.silence=setTimeout(()=>{if(!r.done&&st.run===r)end();},quiet(r));}}
// 반주 끔: 쉬면 끝나는 시간 = 5초와 '악보에서 가장 긴 음 사이 + 여유'(내 빠르기로) 중 긴 것(지적 15·16)
function quiet(r){const ex=r.exp,h=r.hits;let gap=0;for(let k=0;k<ex.length;k++)gap=Math.max(gap,(ex[k+1]?ex[k+1].t:ex[k].t+(ex[k].len||3))-ex[k].t);
 let u=r.e8;const k=Math.min(h.length,ex.length)-1;if(k>=1&&ex[k].t>ex[0].t&&h[h.length-1].t>h[0].t)u=(h[h.length-1].t-h[0].t)/(ex[k].t-ex[0].t);u=Math.max(r.e8*.4,Math.min(r.e8*3,u));
 return Math.max(5000,(gap+4)*u);}
function end(){const r=st.run;if(!r||r.done)return;r.done=true;clearTimeout(r.timer);clearTimeout(r.silence);r.cd.forEach(clearTimeout);$('count').textContent='';P.Sound.stopAll();
 const play=r.pc.inst==='janggu'?strokes(r.hits):r.hits;
 const res=score(r.exp,play,{beat:r.beat,e8:r.e8,startMs:r.startMs});r.res=res;r.play=play;showResult(r);}

function showResult(r){show('result');const res=r.res,pc=r.pc,practice=!!r.range;
 $('r-title').textContent=pc.title+(practice?` · ${r.range[2]}구절 연습`:'');
 $('r-stars').textContent='★'.repeat(res.stars)+'☆'.repeat(3-res.stars);$('r-total').textContent=res.total;
 $('r-note').textContent=res.notePct+'%';$('r-rhythm').textContent=res.rhythmPct+'%';
 $('r-detail').textContent=`맞은 음 ${res.ok} · 틀린 음 ${res.wrong} · 빠진 음 ${res.miss} · 더 친 음 ${res.extra} (악보 ${res.N}음)`+(res.playedTempo?` · 내 빠르기 ♩.≈${res.playedTempo}`:'')+(r.beat?' · 박 소리 켬':' · 박 소리 끔');
 $('r-say').textContent=res.total>=90?'아주 잘했어요! 외워서 끝까지 쳤어요.':res.total>=70?'잘했어요! 빨간 칸만 다시 해 봐요.':res.total>=40?'좋아요, 틀린 마디를 골라 다시 연습해요.':'천천히 한 구절씩 연습해 봐요.';
 // 마디별 보기
 const sheet=$('sheet');sheet.replaceChildren();const byBar=new Map();
 for(const e of r.exp){if(!byBar.has(e.bar))byBar.set(e.bar,[]);byBar.get(e.bar).push({e,cls:'miss',txt:e.label});}
 const items=new Map(r.exp.map(e=>[e.i,null]));
 for(const o of res.ops){if(o.op==='extra'){const e=r.exp[Math.min(o.before,r.exp.length-1)];const bar=o.before<r.exp.length?e.bar:r.exp[r.exp.length-1].bar;byBar.get(bar).push({extra:true,txt:'+'+nameOf(pc.inst,r.play[o.p].key),order:o.before-.5});continue;}
  const cell=byBar.get(r.exp[o.e].bar).find(c=>c.e&&c.e.i===o.e);const tm=res.tim.get(o.e);
  if(o.op==='ok'){cell.cls=tm&&tm.c<1?'late':'ok';cell.title=tm&&tm.c<1?(tm.early?'조금 빨랐어요':'조금 늦었어요'):'';}
  else if(o.op==='wrong'){cell.cls='wrong';cell.txt=r.exp[o.e].label+'→'+nameOf(pc.inst,r.play[o.p].key);}}
 const bars=[...byBar.keys()].sort((a,b)=>a-b),phr=pc.inst==='janggu'?null:P.SONGS[pc.song].phrases;
 for(let k=0;k<bars.length;k+=4){const row=document.createElement('div');row.className='phrase';const pIdx=Math.floor(bars[k]/4);
  row.innerHTML=`<div class="ph-head"><b>${pc.inst==='janggu'?(bars[k]+1)+'~'+(bars[Math.min(k+3,bars.length-1)]+1)+'마디':(pIdx+1)+'구절'}</b>${phr?`<span>${phr[pIdx]||''}</span>`:''}</div>`;
  const barsEl=document.createElement('div');barsEl.className='bars';
  for(const b of bars.slice(k,k+4)){const cells=byBar.get(b).sort((x,y)=>(x.e?x.e.i:x.order)-(y.e?y.e.i:y.order));const good=cells.every(c=>c.cls==='ok'&&!c.extra);
   const bEl=document.createElement('div');bEl.className='bar'+(good?' good':'');bEl.innerHTML=`<div class="bar-no">${b+1}마디 ${good?'✓':''}</div><div class="cells">${cells.map(c=>`<span class="cell ${c.extra?'extra':c.cls}" ${c.title?`title="${c.title}"`:''}>${c.e&&c.e.syl?`<i>${c.e.syl}</i>`:''}${c.txt}</span>`).join('')}</div>`;barsEl.append(bEl);}
  row.append(barsEl);
  if(!practice&&pc.inst!=='janggu'){const again=document.createElement('button');again.className='btn small ghost';again.dataset.phrase=pIdx;again.textContent=(pIdx+1)+'구절만 다시';row.append(again);}
  sheet.append(row);}
 // 기록·결과 코드(연습은 기록하지 않음)
 const demo=!!CLASS.demo,ok=st.seat>0&&st.group>0&&!practice&&!demo;// 시연(#demo)은 기록·코드 없음(지적 22)
 if(ok){const b=P.Store.get('gugak-perf-best',{});if(!b[r.id]||res.total>b[r.id]){b[r.id]=res.total;P.Store.set('gugak-perf-best',b);}}
 $('r-code').textContent=P.NR?'기록 없는 판 · 점수는 이 화면에만 보여요(결과 코드 없음)':practice?'구절 연습은 결과 코드를 만들지 않아요':demo?'시연은 결과 코드를 만들지 않아요':location.protocol!=='file:'?'교실 서버판 · 점수는 서버로 보내요(결과 코드는 서버 없이 파일로 열 때만)':ok?P.resultCode({seat:st.seat,group:st.group,level:r.id,score:res.total,acc:res.notePct}):'자리 번호와 모둠을 고르면 결과 코드가 나와요';
 $('r-send').hidden=P.NR||!(ok&&st.server);$('r-send-state').textContent='';}
async function send(){const r=st.run;if(!r?.res)return;try{const resp=await P.post('api/score',{seat:st.seat,group:st.group,level:r.id,score:r.res.total,acc:r.res.notePct,stars:r.res.stars,beat:r.beat?1:0});if(!resp.ok){const j=await resp.json().catch(()=>({}));if(j.error){$('r-send-state').textContent=j.error;return;}throw 0;}$('r-send-state').textContent='점수판에 보냈어요';}catch(e){$('r-send-state').textContent='보내지 못했어요 · 결과 코드를 선생님께 보여 주세요';}}

/* 먼저 들어 보기: 화면 안내 없이 소리만 */
async function listen(){const my=st.seq,pc=PIECES[st.piece];await sound();await P.Sound.resume();if(st.seq!==my||!$('play').hidden)return;P.Sound.stopAll();const e8=P.e8(TEMPO),c=P.Sound.ctx.currentTime+.3;
 for(const e of expected(st.piece)){const o={when:c+e.t*e8/1000,gain:.9,dur:pc.inst==='janggu'?0:e.len*e8/1000};pc.inst==='janggu'?P.Sound.play(P.STROKES[e.key].sample,o):P.playString(e.key,o);}
 if(pc.inst!=='janggu')for(const n of P.jangdan(P.SEMACHI,pc.bars))P.Sound.play(P.STROKES[n.stroke].sample,{when:c+n.t*e8/1000,gain:.35});}

function bind(){document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.piece){st.piece=b.dataset.piece;home();}
  else if(b.id==='go')begin(st.piece);
  else if(b.id==='listen')listen();
  else if(b.id==='stop-listen')P.Sound.stopAll();
  else if(b.id==='done')end();
  else if(b.id==='quit'||b.id==='r-home'){st.seq++;cancel();P.Sound.stopAll();home();}
  else if(b.id==='r-again')begin(st.run.id);
  else if(b.dataset.phrase!=null){const k=+b.dataset.phrase;begin(st.run.id,[k*4,k*4+4,k+1]);}
  else if(b.id==='r-send')send();});
 $('seat').onchange=e=>{st.seat=+e.target.value;P.Store.set('gugak-seat',st.seat);};
 $('group').onchange=e=>{st.group=+e.target.value;P.Store.set('gugak-group',st.group);};
 $('beat').onchange=e=>{st.beat=e.target.checked;P.Store.set('gugak-perf-beat',st.beat);};
 $('inst').addEventListener('pointerdown',e=>{const el=e.target.closest('[data-lane]');if(!el)return;e.preventDefault();hit(+el.dataset.lane,e.timeStamp);});
 const KEYS={janggu:{KeyF:[0],KeyJ:[1],Space:[0,1]},gayageum:{Digit1:[0],Digit2:[1],Digit3:[2],Digit4:[3],Digit5:[4],Digit6:[5],Digit7:[6],KeyA:[0],KeyS:[1],KeyD:[2],KeyF:[3],KeyG:[4],KeyH:[5],KeyJ:[6]}};
 if(st.hand==='left')KEYS.janggu={KeyF:[1],KeyJ:[0],Space:[0,1]};// 왼손 배치: 화면 왼쪽 = 채편
 document.addEventListener('keydown',e=>{const r=st.run;if(e.repeat||!r||r.done||$('play').hidden)return;const m=KEYS[r.pc.inst][e.code];if(m){e.preventDefault();m.forEach((l,k)=>hit(l,e.timeStamp+k*5));}});}
async function detect(){try{st.server=(await fetch('api/ping',{cache:'no-store'})).ok;}catch(e){st.server=false;}}
document.addEventListener('DOMContentLoaded',()=>{bind();home();detect();window.GugakPerform={st,PIECES,expected,align,score,strokes,begin,hit,end};});
})();
