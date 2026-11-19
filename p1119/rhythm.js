/* 국악 장단·가락 놀이(리듬 게임과 채점) v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * - 장구: 세마치장단을 궁편·채편 두 칸에 떨어지는 장구 기호로 친다(덩은 두 편을 함께).
 * - 가야금: 아리랑·도라지타령 가락을 4~10현 일곱 줄에서 뜯는다(웹악기 가야금처럼 낮은 줄이 위, 오른쪽에서 뜯음).
 * - 판정: 딱(±80ms)·좋아(±160ms)·놓침. 쉬운 판은 ±110/±220. 기기 지연은 '박자 맞추기'로 기기마다 맞춘다.
 * - 점수·기록은 자리 번호와 모둠 번호만 쓰고 이 기기 안에 둔다. 교실 시연 서버가 있으면 점수판으로 보낼 수 있다.
 * - AI·외부 전송 없음. 장단·가락·빠르기·기호는 국악 강사 확인 전 교육용(확인 필요).
 */
(()=>{'use strict';
const P=window.GugakPlay,AV=window.GugakAvatar,$=id=>document.getElementById(id);
const CLASS=P.classCode();
const BASE_TEMPO=CLASS.tempo||45;
const LEVELS=P.LEVELS;
const ORDER={janggu:['J1','J2','J3','J4'],gayageum:['G1','G2','G3','G4']};
const PASS=60;// 통과선(정확도 %) — 국악 강사 확인 필요
const CHUIMSAE={5:'좋다!',10:'얼씨구!',20:'잘한다!',30:'얼씨구 절씨구!',40:'그렇지!',50:'지화자!',60:'최고다!'};// 추임새 문구는 국악 강사 확인 필요
const st={seq:0,seat:P.Store.get('gugak-seat',0),group:P.Store.get('gugak-group',0),hand:CLASS.hand||P.Store.get('gugak-hand','right'),offset:P.Store.get('gugak-offset',0),game:'janggu',level:null,run:null,server:null};
const best=()=>P.Store.get('gugak-best',{}),setBest=b=>P.Store.set('gugak-best',b);
const avatar=()=>AV.load()||AV.make('dungka');

/* ───────── 시작 화면 ───────── */
function show(id){for(const s of document.querySelectorAll('.screen'))s.hidden=s.id!==id;}
function renderHome(){
 $('home-avatar').innerHTML=AV.render(avatar(),{size:120,animate:true});
 const a=avatar();$('home-name').textContent=AV.BASES[a.base].name;
 fillSelect($('seat'),41,st.seat,'자리 번호');fillSelect($('group'),(CLASS.groups||8)+1,st.group,'모둠');
 for(const b of document.querySelectorAll('[data-game]'))b.setAttribute('aria-pressed',String(b.dataset.game===st.game));
 const bs=best(),list=$('levels');list.replaceChildren();
 const [lo,hi]=CLASS.levels||[1,4];
 ORDER[st.game].forEach((id,i)=>{const L=LEVELS[id],b=bs[id],open=i+1>=lo&&i+1<=hi&&(i===0||i+1<=lo||(bs[ORDER[st.game][i-1]]?.acc||0)>=PASS||bs[ORDER[st.game][i-1]]?.passed/* 통과선으로 다음 단계(Astra 5) · 통과 이력은 최고 점수와 따로(2차 N05) */||CLASS.demo||P.Store.get('gugak-unlock',false));
  const btn=document.createElement('button');btn.className='level';btn.disabled=!open;btn.dataset.level=id;
  btn.innerHTML=`<span class="lv-num">${i+1}단계</span><b>${L.title}</b><span class="lv-desc">${L.desc}</span><span class="lv-stars">${stars(b?.stars||0)}</span><span class="lv-best">${b?'최고 '+b.score.toLocaleString()+'점':open?'처음 도전':'앞 단계 통과(60%)'}</span>`;
  list.append(btn);});
 $('hand').textContent=st.hand==='left'?'왼손 배치':'오른손 배치';
 $('offset-now').textContent=(st.offset>0?'+':'')+st.offset+'ms';
 const pb=$('btn-practice');if(pb){pb.textContent='연습 판(점수 없음): '+(st.practice?'켬':'끔');pb.setAttribute('aria-pressed',String(!!st.practice));}
 $('whole-line').hidden=!CLASS.whole;
 $('class-line').textContent=CLASS.program?`수업 설정 ${CLASS.program} · 빠르기 ♩.=${BASE_TEMPO}${CLASS.groups?' · 모둠 '+CLASS.groups+'개':''}`:'';
}
function fillSelect(sel,n,v,label){sel.replaceChildren(new Option(label+' 고르기','0'));for(let i=1;i<n;i++)sel.append(new Option(i+'번','' +i));sel.value=String(v||0);}
const stars=n=>'★'.repeat(n)+'☆'.repeat(3-n);

/* ───────── 악보 만들기 ───────── */
function buildChart(id,base=BASE_TEMPO){return P.chart(id,base,!!CLASS.easy);}/* 악보 만들기는 gugak-data.js(교탁 반주와 같은 악보) */

/* ───────── 소리 준비 ───────── */
let soundPromise=null;
function soundIds(){const ids=new Set(Object.values(P.STROKES).map(s=>s.sample));for(const s of P.STRINGS)ids.add(P.gayaSample(s.deg));return[...ids];}
function prepareSound(){if(!soundPromise)soundPromise=P.Sound.init(soundIds()).catch(e=>{soundPromise=null;throw e;});return soundPromise;}

/* ───────── 놀이 ───────── */
const X=window.GugakArcade;
const cv=()=>$('track');let raf=0,lastG=null,lastFrame=0;
const COUNT_WORDS=['하나','둘','셋'];
function lanesOf(game){return game==='janggu'?2:P.STRINGS.length;}
/* opts: at = 교탁이 정한 시작 시각(performance 기준 ms, 세기 마디 시작), nobacking = 반주는 교탁에서, base = 빠르기, practice = 연습 판 */
async function start(id,opts={}){stop();const my=++st.seq;st.level=id;const chart=buildChart(id,opts.base||BASE_TEMPO);show('play');$('play-title').textContent=(CLASS.one&&chart.L.game==='janggu'?'박 맞추기(한 버튼) · ':'')+(opts.practice?'연습 · ':CLASS.whole?'반 전체 · ':'')+chart.L.title+(opts.practice?` · ♩.=${chart.tempo}`:'');$('banner')&&($('banner').hidden=true);
 $('play-avatar').innerHTML=AV.render(avatar(),{size:110,animate:false});const pa=$('play');pa.style.setProperty('--beat',(3*chart.e8<700?6*chart.e8:3*chart.e8)+'ms');pa.classList.remove('sinmyeong','ended');
 setupPads(chart.L.game);setupSide(chart);say('소리 준비 중…');X.reset();$('gauge-fill').style.width='0%';$('gauge').classList.remove('full');
 try{await prepareSound();await P.Sound.resume();}catch(e){if(st.seq===my)say('소리를 준비하지 못했어요: '+e.message);return;}
 if(st.seq!==my||$('play').hidden)return;// 준비 중 그만(지적 18)
 const ctx=P.Sound.ctx,lat=P.Sound.latency(),ahead=opts.at?(opts.at-performance.now())/1000:1.2;
 if(ahead<.25){say('같이 시작 시각이 지났어요. 다음 판에 함께해요');setTimeout(()=>{if(st.seq===my){renderHome();show('home');}},1800);return;}
 const ctxStart=ctx.currentTime+ahead,perfStart=performance.now()+ahead*1000+lat*1000;
 if(!opts.nobacking)for(const b of chart.backing)b.deg?P.playString(b.deg,{when:ctxStart+b.t/1000,gain:b.gain,dur:b.dur||0}):P.Sound.play(b.id,{when:ctxStart+b.t/1000,gain:b.gain,dur:b.dur||0});
 if(!opts.nobacking)X.SFX.jing(ctxStart+P.BAR*chart.e8/1000-0.02);
 window.GugakClass&&(GugakClass.busy=true,GugakClass.joined=opts.session||0);/* 교탁이 합류를 셈(Astra 9) */
 st.run={opts,practice:opts.practice?opts:null,whole:!!CLASS.whole,chart,perfStart,ctxStart,score:0,combo:0,maxCombo:0,perfect:0,good:0,miss:0,wrongPitch:0,stray:0,done:false,demo:!!CLASS.demo||st.forceDemo,shown:{},lastNote:Math.max(...chart.notes.map(n=>n.t))};
 updateHud();say(st.run.demo?'시연: 앱이 대신 쳐요':opts.nobacking?'교탁 반주에 맞춰요 · 하나 둘 셋!':'첫 마디는 세기예요 · 하나 둘 셋!');
 $('play-avatar').classList.add('dance');
 cancelAnimationFrame(raf);lastFrame=0;raf=requestAnimationFrame(frame);}
function now(){return performance.now()-st.run.perfStart;}
function once(key,fn){const r=st.run;if(!r.shown[key]){r.shown[key]=1;fn();}}
function frame(ts){const r=st.run;if(!r||r.done)return;const t=now(),C=r.chart;const dt=lastFrame?Math.min(80,ts-lastFrame):16;lastFrame=ts;
 X.watchPerf(ts,fps=>{setLite(true,true);toast(`화면이 느려서(약 ${fps}fps) ‘가볍게 보기’로 바꿨어요`);});
 // 시작 연출
 if(t<0)once('title',()=>X.text(geo.w/2,geo.h*.42,C.L.title,'banner',1100));
 COUNT_WORDS.forEach((w,i)=>{if(t>=i*3*C.e8)once('c'+i,()=>{X.text(geo.w/2,geo.h*.42,w,'count',Math.min(700,3*C.e8));});});
 if(t>=P.BAR*C.e8)once('go',()=>X.text(geo.w/2,geo.h*.42,'얼씨구, 시작!','go',800));
 // 시연: 제때 자동으로 친다
 if(r.demo)for(const n of C.notes)if(n.state==='wait'&&t>=n.t){for(const lane of n.lanes)hitLane(lane,n.t+r.perfStart+st.offset,true);}
 // 놓침
 for(const n of C.notes)if(n.state==='wait'&&t>n.t+C.W[1]){if(Object.keys(n.hits).length){judge(n,0,true);continue;}n.state='miss';r.miss++;r.combo=0;X.A.combo.n=0;missFx(n);}
 if(X.tickGauge(performance.now())==='end'){$('play').classList.remove('sinmyeong');$('gauge').classList.remove('full');}
 $('gauge-fill').style.width=X.A.gauge.toFixed(1)+'%';
 // 끝 연출
 if(t>r.lastNote+C.W[1]+150)once('end',()=>{const full=r.miss===0&&r.wrongPitch===0;X.text(geo.w/2,geo.h*.42,full?'모두 맞힘! 얼씨구 좋다!':'완주! 잘한다!','go',1300);if(full)X.SFX.arpeggio([5,6,7,8,9],.08);else X.SFX.blip();$('play').classList.add('ended');});
 X.step(dt);draw(t);beatCell(t,C);
 if(t>Math.max(C.end,r.lastNote+C.W[1]+150)+1400){finish();return;}
 raf=requestAnimationFrame(frame);}
function hitLane(lane,stamp,auto=false){const r=st.run;if(!r||r.done)return;const C=r.chart,t=stamp-r.perfStart-st.offset;
 // 소리: 친 곳의 소리를 바로 낸다
 if(C.L.game!=='janggu'){P.playString(P.STRINGS[lane].deg,{gain:.95});X.A.pluck[lane]=t;}
 padFlash(lane);
 // 이 줄(칸)에서 가장 가까운 기다리는 음
 const one=C.L.game==='janggu'&&CLASS.one;/* 한 버튼(저학년): 어느 편을 쳐도 그 시각의 장단 기호로 셈 — 조사 1차 v1 */
 let cand=null,dbest=1e9;for(const n of C.notes){if(n.state!=='wait'||(!one&&!n.lanes.includes(lane)))continue;const d=Math.abs(t-n.t);if(d<dbest){dbest=d;cand=n;}}
 if(C.L.game==='janggu'){const hit=one&&cand&&dbest<=C.W[1];P.Sound.play(hit?P.STROKES[cand.stroke].sample:lane===0?'janggu-02-kung-medium':'janggu-04-deok-medium',{gain:.9});}/* 한 버튼: 맞힌 기호의 소리(Astra 10) */
 if(!cand||dbest>C.W[1]){ // 맞는 음이 없을 때
  if(C.L.game==='janggu'){r.stray++;const p=fxPos(lane);X.A.rings.push({x:p.x,y:p.y,life:0,max:240,col:'rgba(255,255,255,.5)',w:3,r0:14,r1:46});}
  else{const other=C.notes.find(n=>n.state==='wait'&&Math.abs(t-n.t)<=C.W[1]);if(other){r.wrongPitch++;r.combo=0;X.A.combo.n=0;const p=fxPos(lane);X.puff(p.x,p.y);X.text(p.x-60,p.y-30,'음이 달라요','wrong',600);}else r.stray++;}
  updateHud();return;}
 if(C.L.game==='janggu'){const side=one?cand.sides[0]:lane===0?'gung':'chae';cand.hits[side]=t;
  const need=cand.sides.filter(s=>!(s in cand.hits));const easyDeong=((C.L.easy||CLASS.easy)&&cand.stroke==='덩')||one;
  if(need.length&&!easyDeong)return;// 덩: 다른 편을 기다린다(판정 창이 지나면 '반쪽'으로 판정)
  const sg=Object.values(cand.hits).map(x=>x-cand.t);dev(r,sg.reduce((a,b)=>a+b,0)/sg.length,auto);judge(cand,Math.max(...sg.map(Math.abs)));return;}
 dev(r,t-cand.t,auto);judge(cand,dbest);}
function dev(r,d,auto){if(!auto&&!r.demo)(r.devs||(r.devs=[])).push(d);}/* 평균 빠름·늦음(결과에 보여 주고 박자 맞추기 제안) */
function fxPos(lane){const g=lastG;if(!g||!geo)return{x:0,y:0};if(g.kind==='janggu')return{x:X.laneX(g.G,lane,1),y:g.G.hitY};return{x:g.hitX,y:g.rh*lane+g.rh/2};}
function judge(n,err,half=false){const r=st.run,C=r.chart;let kind;
 if(half)kind='good';
 else kind=err<=C.W[0]?'perfect':'good';
 n.state=kind;r[kind]++;r.combo++;r.maxCombo=Math.max(r.maxCombo,r.combo);
 const mult=X.A.sinmyeong?1.5:1,add=Math.round(((kind==='perfect'?100:60)+Math.floor(r.combo/10)*10)*mult);r.score+=add;
 // 빛·조각
 const L=X.LANE,cols=kind==='perfect'?['#ffe08a','#ff9a6b']:['#7ff5ea','#dff3ee'];
 for(const lane of n.lanes){const p=fxPos(lane);X.burst(p.x,p.y,kind,cols[0],cols[1]);
  if(lastG?.kind==='janggu'){const G=lastG.G,s0=.38,x0=X.laneX(G,lane,s0),x1=X.laneX(G,lane,1),hw0=G.lw*s0/2,hw1=G.lw/2;X.beam(x0-hw0,x0+hw0,x1-hw1,x1+hw1,G.top,G.hitY,lane===0?'rgba(255,177,94,A)':'rgba(92,240,228,A)');}}
 const p=fxPos(n.lanes[0]),cx=n.lanes.length===2?geo.w/2:(lastG?.kind==='janggu'?p.x:p.x-70);
 X.text(cx,p.y-(lastG?.kind==='janggu'?70:34),half?'덩은 두 편 함께!':kind==='perfect'?'딱!':'좋아',half?'small':kind,520);
 X.text(cx+(lastG?.kind==='janggu'?0:0),p.y-(lastG?.kind==='janggu'?118:70),'+'+add,'score',650);
 X.A.combo.n=r.combo;X.A.combo.bump=1;
 if(X.addGauge(kind,performance.now())){$('play').classList.add('sinmyeong');$('gauge').classList.add('full');X.text(geo.w/2,geo.h*.55,'신명 나는 판! 점수 ×1.5','banner',1500);X.SFX.arpeggio();cheer('얼씨구 절씨구!');}
 if(CHUIMSAE[r.combo]){cheer(CHUIMSAE[r.combo]);X.SFX.blip();hop();}
 bounce();updateHud();const av=$('play-avatar');av.classList.toggle('c20',r.combo>=20);av.classList.toggle('c50',r.combo>=50);}
function missFx(n){$('play-avatar').classList.remove('c20','c50');const p=fxPos(n.lanes[0]);X.puff(p.x,p.y);X.text(n.lanes.length===2?geo.w/2:(lastG?.kind==='janggu'?p.x:p.x-70),p.y-(lastG?.kind==='janggu'?70:34),'놓침','miss',520);X.addGauge('miss',performance.now());updateHud();}
function finish(){const r=st.run;r.done=true;window.GugakClass&&(GugakClass.busy=false);cancelAnimationFrame(raf);$('play-avatar').classList.remove('dance');const C=r.chart,total=C.notes.length;
 const timing=Math.round(100*(r.perfect+.6*r.good)/total);
 const pitch=C.L.game==='gayageum'?Math.round(100*(r.perfect+r.good)/Math.max(1,r.perfect+r.good+r.wrongPitch)):null;
 const acc=pitch==null?timing:Math.round(timing*.8+pitch*.2);
 const s=acc>=90?3:acc>=70?2:acc>=40?1:0;
 const dv=r.devs||[],meanDev=dv.length>=5?Math.round(dv.reduce((a,b)=>a+b,0)/dv.length):null;
 const res={meanDev,level:C.id,score:r.score,acc,timing,pitch,stars:s,perfect:r.perfect,good:r.good,miss:r.miss,wrongPitch:r.wrongPitch,maxCombo:r.maxCombo,total,demo:r.demo,full:r.miss===0&&r.wrongPitch===0};
 res.practice=r.practice;res.whole=r.whole;res.pass=acc>=PASS;
 r.result=res;const bs=best(),old=bs[C.id];const keep=!r.demo&&!r.practice&&!r.whole;/* 연습 판·반 전체 판은 기록하지 않음 */const record=keep&&res.score>0&&(!old||res.score>old.score);
 if(record){bs[C.id]={score:res.score,acc,stars:Math.max(s,old?.stars||0),passed:!!(res.pass||old?.passed)};setBest(bs);}else if(keep&&old&&(s>old.stars||(res.pass&&!old.passed))){old.stars=Math.max(s,old.stars);old.passed=!!(old.passed||res.pass);setBest(bs);}else if(keep&&!old&&res.pass){bs[C.id]={score:res.score,acc,stars:s,passed:true};setBest(bs);}
 renderResult(res,record,old);}
let countRaf=0;
function renderResult(res,record,old){show('result');const L=LEVELS[res.level];
 $('res-title').textContent=(res.practice?'연습 · ':res.whole?'반 전체 · ':'')+L.title+(res.demo?' · 시연':'');
 const pr=res.practice,faster=pr&&res.acc>=80&&pr.base<pr.target?Math.min(pr.target,pr.base+4):0;
 $('res-pass').className='pass-res '+(res.pass?'ok':'');$('res-pass').textContent=res.demo?'':res.pass?`통과! (정확도 ${PASS}% 넘음)`:`통과선 ${PASS}%까지 ${PASS-res.acc}% 남았어요`;
 $('res-faster').hidden=!faster;$('res-faster').dataset.base=faster||'';$('res-faster').textContent=faster?`조금 빠르게 (♩.=${faster})`:'';
 $('res-practice').hidden=!pr;$('res-practice').textContent=pr?(pr.base>=pr.target?(res.acc>=80?'수업 빠르기로 잘 쳤어요! 이제 점수 판에 도전해 봐요':`수업 빠르기(♩.=${pr.target}) 연습 중 · 점수는 남지 않아요`):res.acc>=80?'정확도 80% 넘음 → 조금 빠르게 해 봐요':`♩.=${pr.base} 연습 중 · 정확도 80%를 넘으면 빨라져요 · 점수는 남지 않아요`):'';
 // 별: 하나씩 터지며 나온다
 const sw=$('res-stars');sw.replaceChildren();for(let i=0;i<3;i++){const sp=document.createElement('span');sp.className='star'+(i<res.stars?' on':'');sp.textContent='★';sp.style.animationDelay=(250+i*380)+'ms';sw.append(sp);if(i<res.stars)setTimeout(()=>{if(!$('result').hidden)X.SFX.star(i);},250+i*380);}
 // 점수: 올라가며 센다
 cancelAnimationFrame(countRaf);const t0=performance.now(),dur=st.lite?0:1100,el=$('res-score');const tickN=()=>{const k=dur?Math.min(1,(performance.now()-t0)/dur):1,e=1-Math.pow(1-k,3);el.textContent=Math.round(res.score*e).toLocaleString();if(k<1)countRaf=requestAnimationFrame(tickN);};tickN();
 $('res-full').hidden=!res.full||res.demo;
 $('res-acc').textContent=res.acc+'%';$('res-timing').textContent=res.timing+'%';$('res-pitch-row').hidden=$('res-pitch').hidden=res.pitch==null;if(res.pitch!=null)$('res-pitch').textContent=res.pitch+'%';
 $('res-detail').textContent=`딱 ${res.perfect} · 좋아 ${res.good} · 놓침 ${res.miss}${res.pitch!=null?' · 음 다름 '+res.wrongPitch:''} · 가장 긴 연속 ${res.maxCombo}`;
 $('res-dev').textContent=res.meanDev==null?'':Math.abs(res.meanDev)<25?'박에 고르게 맞췄어요':`평균 ${Math.abs(res.meanDev)}ms ${res.meanDev<0?'빨랐어요':'늦었어요'}`+(Math.abs(res.meanDev)>=40?' · 늘 이렇다면 첫 화면 “박자 맞추기”를 해 보세요':'');
 $('res-avatar').innerHTML=AV.render(avatar(),{size:150,animate:res.stars>=2});
 $('res-cheer').textContent=res.stars===3?'얼씨구! 잘한다!':res.stars===2?'좋다! 조금만 더!':res.stars===1?'잘했어요! 한 번 더 해 볼까요?':'괜찮아요, 느리게 다시 해 봐요';
 $('res-record').hidden=!record;$('res-record').textContent=old?`새 최고 기록! (전 ${old.score.toLocaleString()}점)`:'첫 기록!';
 const idx=ORDER[L.game].indexOf(res.level),hiLv=(CLASS.levels||[1,4])[1],next=idx+2<=hiLv||res.demo?ORDER[L.game][idx+1]:null;$('res-next').hidden=!next||!res.pass;/* 수업 설정 단계 범위 밖은 열지 않음(지적 12) */$('res-next').dataset.level=next||'';
 const ok=st.seat>0&&st.group>0&&!res.demo&&!res.practice&&!res.whole;$('res-code').textContent=P.NR?'기록 없는 판 · 점수는 이 화면에만 보여요(결과 코드 없음)':res.demo?'시연은 결과 코드를 만들지 않아요':res.practice?'연습 판은 결과 코드를 만들지 않아요':res.whole?'반 전체 판은 기록하지 않아요':location.protocol!=='file:'?'교실 서버판 · 점수는 서버로 보내요(결과 코드는 서버 없이 파일로 열 때만)':ok?P.resultCode({seat:st.seat,group:st.group,level:res.level,score:res.score,acc:res.acc}):'자리 번호와 모둠을 고르면 결과 코드가 나와요';
 $('res-send').hidden=P.NR||!(ok&&st.server);$('res-send-state').textContent='';}
async function sendScore(){const r=st.run?.result;if(!r)return;try{const resp=await P.post('api/score',{seat:st.seat,group:st.group,level:r.level,score:r.score,acc:r.acc,stars:r.stars});if(!resp.ok){const j=await resp.json().catch(()=>({}));if(j.error){$('res-send-state').textContent=j.error;return;}throw new Error(resp.status);}$('res-send-state').textContent='점수판에 보냈어요';}catch(e){$('res-send-state').textContent='보내지 못했어요 · 결과 코드를 선생님께 보여 주세요';}}
function stop(){st.seq++;window.GugakClass&&(GugakClass.busy=false);if(st.run)st.run.done=true;cancelAnimationFrame(raf);P.Sound.stopAll();$('play-avatar')?.classList.remove('dance');}

/* ───────── 왼쪽 판: 장단 박자표·기호 설명 ───────── */
let beatEls=[],lastCell=-1;
function setupSide(chart){$('keys').textContent=chart.L.game==='janggu'?(st.hand==='left'?'글쇠: J 궁편 · F 채편 · 스페이스 덩':'글쇠: F 궁편 · J 채편 · 스페이스 덩'):'글쇠: 1~7 또는 A S D F G H J (위 줄부터)';const box=$('beats');box.replaceChildren();beatEls=[];lastCell=-1;const map=new Map(P.SEMACHI);
 for(let i=0;i<P.BAR;i++){const d=document.createElement('span');const k=map.get(i);d.textContent=k||'·';d.className='bc'+(k?' k-'+(k==='덩'?'d':k==='쿵'?'g':'c'):'')+(i%3===0?' big':'');box.append(d);beatEls.push(d);}
 $('bb-title').textContent=chart.L.game==='janggu'?'세마치 장단 · 9칸':'반주 장단: 세마치';
 $('legend').innerHTML=chart.L.game==='janggu'?'<div><b class="lg d">덩</b>두 편 함께</div><div><b class="lg g">쿵</b>궁편 · '+(st.hand==='left'?'오른손':'왼손')+'</div><div><b class="lg c">덕</b>채편 · '+(st.hand==='left'?'왼손':'오른손')+'</div>':'<div>기호에 적힌 음의 <b>줄</b>을 판정선에서 뜯어요</div><div class="muted">위 = 낮은 줄(4현)</div>';}
function beatCell(t,C){if(t<0||!beatEls.length)return;const c=Math.floor(t/C.e8)%P.BAR;if(c===lastCell)return;if(lastCell>=0)beatEls[lastCell].classList.remove('now');beatEls[c].classList.add('now');lastCell=c;}

/* ───────── 그리기 ───────── */
let geo=null;
function layout(){const c=cv(),r=c.getBoundingClientRect(),dpr=st.lite?1:Math.min(2,window.devicePixelRatio||1);c.width=Math.round(r.width*dpr);c.height=Math.round(r.height*dpr);geo={w:r.width,h:r.height,dpr};}
function laneRect(game,lane){const {w,h}=geo;if(game==='janggu'){const mirror=st.hand==='left',col=mirror?1-lane:lane;const cw=w/2;return{x:col*cw,y:0,w:cw,h};}const rh=h/P.STRINGS.length;return{x:0,y:lane*rh,w,h:rh};}
function draw(t){if(!geo)layout();const c=cv(),g=c.getContext('2d'),{w,h,dpr}=geo,r=st.run,C=r.chart,game=C.L.game;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
 if(game==='janggu'){const G=X.drawJanggu(g,w,h,t,C,r,st.hand==='left');lastG={kind:'janggu',G};}
 else{const o=X.drawGayageum(g,w,h,t,C,P.STRINGS);lastG={kind:'gayageum',...o};}
 X.drawCombo(g,w,h,r.combo,X.A.sinmyeong?1.5:1);
 X.drawFx(g);
 // 진행 막대(오방색)
 const k=Math.max(0,Math.min(1,t/C.end));const pg=g.createLinearGradient(0,0,w,0);['#2f6fd6','#d8322f','#f2c14e','#f4f1e8'].forEach((cc,i)=>pg.addColorStop(i/3,cc));g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,h-6,w,6);g.fillStyle=pg;g.fillRect(0,h-6,k*w,6);}

/* ───────── 누르는 자리 ───────── */
function setupPads(game){const pads=$('pads');pads.replaceChildren();pads.className='pads '+game+(st.hand==='left'?' mirror':'');
 if(game==='janggu'){for(const [lane,label,sub] of [[0,'궁편','쿵 · 왼손'],[1,'채편','덕 · 오른손']]){const b=document.createElement('button');b.className='pad pad-'+lane;b.dataset.lane=lane;b.innerHTML=`<b>${label}</b><span>${st.hand==='left'?sub.replace(/왼손|오른손/,h=>h==='왼손'?'오른손':'왼손'):sub}</span>`;/* 지적 13 */pads.append(b);}}
 else{/* 가야금은 그림 위 줄을 그대로 누른다 */}
 layout();}
function laneFromPoint(x,y){const r=cv().getBoundingClientRect(),game=st.run?.chart.L.game;if(!game||x<r.left||x>r.right||y<r.top||y>r.bottom)return -1;if(game==='janggu'){const left=x-r.left<r.width/2;return st.hand==='left'?(left?1:0):(left?0:1);}return Math.max(0,Math.min(P.STRINGS.length-1,Math.floor((y-r.top)/(r.height/P.STRINGS.length))));}
function padFlash(lane){const el=document.querySelector('.pad-'+lane);if(el){el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit');}}
function flash(text,kind,n){const f=$('judge');f.textContent=text;f.className='judge '+kind;void f.offsetWidth;f.classList.add('show');}
function cheer(text){const c=$('cheer');c.textContent=text;c.classList.remove('show');void c.offsetWidth;c.classList.add('show');}
function bounce(){const a=$('play-avatar');if(a){a.classList.remove('hit');void a.offsetWidth;a.classList.add('hit');}}
function hop(){const a=document.querySelector('#play-avatar .gg-body');if(a){a.classList.remove('hop');void a.getBBox?.();a.classList.add('hop');}}
function toast(t){const el=$('toast');if(!el)return;el.textContent=t;el.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>el.hidden=true,3500);}
function setLite(on,auto=false){st.lite=on;X.A.lite=on;document.body.classList.toggle('lite',on);if(!auto)P.Store.set('gugak-lite',on);const b=$('btn-lite');if(b)b.textContent='가볍게 보기: '+(on?'켬':'끔');if(geo)layout();}
function setNofx(on,auto=false){st.nofx=on;X.A.nofx=on;document.body.classList.toggle('nofx',on);if(!auto)P.Store.set('gugak-nofx',on);const b=$('btn-nofx');if(b)b.textContent='효과 끄기: '+(on?'켬':'끔');}
function updateHud(){const r=st.run;$('hud-score').textContent=r.score.toLocaleString();const judged=r.perfect+r.good+r.miss,tm=judged?(r.perfect+.6*r.good)/judged*100:0,hitN=r.perfect+r.good,pt=r.chart.L.game==='gayageum'&&hitN+r.wrongPitch?hitN/(hitN+r.wrongPitch)*100:null,run=pt==null?tm:tm*.8+pt*.2,pf=$('pass-fill');if(pf){pf.style.width=run.toFixed(0)+'%';$('pass').classList.toggle('ok',judged>0&&run>=PASS);}$('hud-combo').textContent=r.combo>=10?'최고 연속 '+r.maxCombo:'';}
function say(t){$('play-say').textContent=t;}

/* ───────── 박자 맞추기(기기 지연) ───────── */
let cal=null,calTimer=0,calSeq=0;
function calCancel(){calSeq++;clearTimeout(calTimer);cal=null;P.Sound.stopAll();const b=$('cal-tap');if(b)b.disabled=true;}
async function calibrate(){calCancel();const my=calSeq;await prepareSound();await P.Sound.resume();if(my!==calSeq||$('calib').hidden)return;/* 다시 시작·돌아가기(지적 20) */const ctx=P.Sound.ctx,lat=P.Sound.latency(),beat=600,n=10,ahead=.4;const ctxStart=ctx.currentTime+ahead,perfStart=performance.now()+ahead*1000+lat*1000;for(let i=0;i<n;i++)P.Sound.play('janggu-04-deok-medium',{when:ctxStart+i*beat/1000,gain:.9});cal={perfStart,beat,n,taps:[]};$('cal-state').textContent='“덕” 소리에 맞춰 큰 단추를 10번 눌러요';$('cal-tap').disabled=false;calTimer=setTimeout(()=>{if(!cal||my!==calSeq)return;const errs=cal.taps.map(s=>{const k=Math.round((s-cal.perfStart)/cal.beat);return s-cal.perfStart-k*cal.beat;}).filter(e=>Math.abs(e)<250).sort((a,b)=>a-b);if(errs.length<5){$('cal-state').textContent='누른 횟수가 적어요. 다시 해 볼까요?';}else{const med=Math.round(errs[Math.floor(errs.length/2)]);st.offset=Math.max(-200,Math.min(200,med));P.Store.set('gugak-offset',st.offset);$('cal-state').textContent='맞췄어요: '+(st.offset>0?'+':'')+st.offset+'ms (이 기기에 저장)';}$('cal-tap').disabled=true;cal=null;renderHome();},n*beat+900);}

/* ───────── 연결 ───────── */
function bind(){
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.game){st.game=b.dataset.game;window.GugakClass?.setPage('rhythm',st.game);renderHome();}
  else if(b.dataset.level&&b.classList.contains('level')){st.forceDemo=false;start(b.dataset.level,practiceOpts());}
  else if(b.id==='sound-on'){prepareSound().then(()=>P.Sound.resume()).then(()=>{b.hidden=true;}).catch(()=>{});}
  else if(b.id==='btn-nofx'){setNofx(!st.nofx);}
  else if(b.id==='play-mute'){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.textContent=on?'소리 켜기':'소리 끄기';if(P.Sound.master)P.Sound.master.gain.value=on?0:+P.Store.get('gugak-vol',.8);}/* 놀이 중에도 바로 소리 끄기(2차 N09) */
  else if(b.id==='play-sfx'){X.A.sfx=!X.A.sfx;try{localStorage.setItem('gugak-sfx',String(X.A.sfx));}catch(e){}b.textContent='효과음: '+(X.A.sfx?'켬':'끔');}
  else if(b.id==='btn-practice'){st.practice=!st.practice;renderHome();}
  else if(b.id==='res-faster'&&b.dataset.base){stop();start(st.level,{practice:true,base:+b.dataset.base,target:BASE_TEMPO});}
  else if(b.id==='banner-go'){joinSession(true);}
  else if(b.id==='btn-demo'){st.forceDemo=true;start(ORDER[st.game][1]);}
  else if(b.id==='hand'){st.hand=st.hand==='left'?'right':'left';P.Store.set('gugak-hand',st.hand);renderHome();}
  else if(b.id==='btn-cal'){show('calib');}
  else if(b.id==='btn-lite'){setLite(!st.lite);}
  else if(b.id==='cal-start'){calibrate();}
  else if(b.id==='cal-back'||b.id==='play-quit'||b.id==='res-home'){if(b.id==='cal-back')calCancel();stop();renderHome();show('home');}
  else if(b.id==='res-again'){const pr=st.run?.practice;stop();start(st.level,pr?{practice:true,base:pr.base,target:pr.target}:{});}
  else if(b.id==='res-next'&&b.dataset.level){const pr=st.run?.practice;stop();start(b.dataset.level,pr?{practice:true,base:Math.max(30,BASE_TEMPO-12),target:BASE_TEMPO}:{});}/* 연습은 연습으로(Astra 4) */
  else if(b.id==='res-send')sendScore();});
 $('cal-tap').addEventListener('pointerdown',e=>{if(cal)cal.taps.push(e.timeStamp);});
 $('seat').addEventListener('change',e=>{st.seat=+e.target.value;P.Store.set('gugak-seat',st.seat);});
 $('group').addEventListener('change',e=>{st.group=+e.target.value;P.Store.set('gugak-group',st.group);});
 const area=$('play-area');
 area.addEventListener('pointerdown',e=>{if(!st.run||st.run.done)return;e.preventDefault();let lane=-1;const pad=e.target.closest('.pad');if(pad)lane=+pad.dataset.lane;else lane=laneFromPoint(e.clientX,e.clientY);if(lane>=0)hitLane(lane,e.timeStamp);},{passive:false});
 const KEYS={janggu:{KeyF:[0],KeyJ:[1],Space:[0,1]},gayageum:{Digit1:[0],Digit2:[1],Digit3:[2],Digit4:[3],Digit5:[4],Digit6:[5],Digit7:[6],KeyA:[0],KeyS:[1],KeyD:[2],KeyF:[3],KeyG:[4],KeyH:[5],KeyJ:[6]}};
 const LEFT={KeyF:[1],KeyJ:[0],Space:[0,1]};// 왼손 배치: 화면 왼쪽 = 채편(지적 13)
 document.addEventListener('keydown',e=>{if(e.repeat||!st.run||st.run.done)return;const g=st.run.chart.L.game,m=(g==='janggu'&&st.hand==='left'?LEFT:KEYS[g])[e.code];if(m){e.preventDefault();for(const l of m)hitLane(l,e.timeStamp);}else if(e.code==='Escape'){stop();renderHome();show('home');}});
 window.addEventListener('resize',()=>{if(!$('play').hidden)layout();});
}
/* ───────── 연습 판 ───────── */
function practiceOpts(){return st.practice?{practice:true,base:Math.max(30,BASE_TEMPO-12),target:BASE_TEMPO}:{};}
/* ───────── 교탁과 같이 시작 ───────── */
function joinSession(byTap){const s=st.pending,C=window.GugakClass;if(!s||!C)return;
 const at=C.toPerf(s.startAt);if(at-performance.now()<600){st.pending=null;$('banner').hidden=true;toast('같이 시작 시각이 지났어요. 다음 판에 함께해요');return;}
 if(!byTap&&!(P.Sound.ctx&&P.Sound.ctx.state==='running')){/* 소리를 켜려면 한 번 눌러야 함(브라우저 규칙) */$('banner-text').textContent=`선생님이 같이 시작해요 · ${LEVELS[s.level].title}`;$('banner').hidden=false;return;}
 st.pending=null;$('banner').hidden=true;st.game=LEVELS[s.level].game;st.forceDemo=false;start(s.level,{at,nobacking:true,base:s.tempo,session:s.id});}
function onSession(s){if(!LEVELS[s.level]||!/^[JG]/.test(s.level))return;/* 연주 채점(P)은 이 화면이 아님 */
 if(st.run&&!st.run.done&&!$('play').hidden){toast('선생님이 같이 시작을 눌렀어요 · 지금 판을 마치고 기다려요');return;}
 if($('home').hidden){if(!$('calib').hidden)calCancel();stop();renderHome();show('home');}
 st.pending=s;joinSession(false);}
async function detectServer(){try{const r=await fetch('api/ping',{cache:'no-store'});st.server=r.ok;}catch(e){st.server=false;}}
document.addEventListener('DOMContentLoaded',()=>{bind();{const fb=$('play-sfx');if(fb)fb.textContent='효과음: '+(X.A.sfx?'켬':'끔');}setLite(!!(P.Store.get('gugak-lite',false)||CLASS.lite||(P.reduceMotion&&P.reduceMotion())),!P.Store.get('gugak-lite',false)&&!CLASS.lite);/* 움직임 줄이기 설정이면 가볍게 보기(지적 21) */{const rm=P.reduceMotion&&P.reduceMotion();setNofx(!!(P.Store.get('gugak-nofx',false)||CLASS.nofx||rm),!P.Store.get('gugak-nofx',false)&&!CLASS.nofx);}/* 움직임 줄이기 → 효과 끄기까지(Astra 12) */
 renderHome();show('home');detectServer();const GC=window.GugakClass;if(GC){GC.on_('hello',e=>{if(e)$('class-line').textContent='교실 서버: '+e;});GC.on_('state',()=>{const so=$('sound-on');if(so)so.hidden=!!(P.Sound.ctx&&P.Sound.ctx.state==='running');});GC.on_('session',onSession);GC.on_('cancel',old=>{if(st.pending&&st.pending.id===old.id){st.pending=null;$('banner').hidden=true;}if(st.run&&!st.run.done&&st.run.opts?.session===old.id){stop();renderHome();show('home');toast('선생님이 멈췄어요');}});GC.setPage('rhythm',st.game);GC.start();}if(CLASS.demo){st.forceDemo=true;}window.GugakRhythm={st,LEVELS,buildChart,start,hitLane,stop,finish};});
})();
