/* GugakSongs v0.7. 아리랑·도라지타령 시범 연주와 따라 하기.
 * 시범 연주는 미리 넣은 악보를 앱이 순서대로 연주하는 규칙형 기능이다. AI·네트워크·저장 없음.
 * 가락: 위키백과 Arirang(en)·도라지타령(ko) 악보(LilyPond, 바장조 9/8)를 앱 가야금 조율 4~10현(G3 A3 C4 D4 E4 G4 A4)으로 옮김.
 * 장구: 세마치장단 기본형 덩 · · 덩 · 덕 쿵 덕 · (8분음표 9칸). 가락·장단 모두 국악 강사 검수 전.
 * 입력 판정: app.js가 실물 악기 화면의 연주를 'gugak:gesture' 이벤트로 알린다(현 번호·장구 면).
 * v0.8(2026-11-03): 시범 보기·한 음씩·같이 하기에서 칠 곳을 검은 점(●)으로, 다음 칠 곳을 작은 고리(○)로 악기 위에 찍는다. 소리 경로는 v0.7과 같다.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id),app=()=>window.gugakApp;
const DEG={sol:3,la:4,do:5,re:6,mi:7,Sol:8,La:9},NOTE=['G2','C3','D3','G3','A3','C4','D4','E4','G4','A4','C5','D5'];
const STROKE={'덩':{sides:['gung','chae'],index:0,hand:'양손',say:'궁편과 채편을 함께 쳐요'},'덕':{sides:['chae'],index:4,hand:'채편',say:'채편(오른쪽)을 쳐요'},'쿵':{sides:['gung'],index:2,hand:'궁편',say:'궁편(왼쪽)을 쳐요'}};
const SEMACHI=[[0,'덩'],[3,'덩'],[5,'덕'],[6,'쿵'],[7,'덕']],BAR=9,DUO_MS=300,AHEAD_MS=260,LATE_MS=600,PARTS=['gayageum','janggu'];
const NAMES={gayageum:'가야금 가락',janggu:'장구 장단'},GRADE_TEMPO={low:40,high:50,middle:60};
// 한 마디 = '가사:음길이,…|…' (음길이는 8분음표 수, r = 쉼)
const SONGS={
 arirang:{name:'아리랑',source:'위키백과 Arirang 악보',original:'느리게',bars:[
  '아:sol5|리:la1|랑:sol2,la1','아:do5|리:re1|랑:do2,re1','아:mi3|라:re1,mi1,re1|리:do2,la1','요:sol5,la1,sol1,la1|r1',
  '아:do5|리:re1|랑:do2,re1','고:mi2,re1|개:do2,la1|로:sol2,la1','넘:do5|어:re1|간:do3','다:do6|r3',
  '나:Sol6|를:Sol3','버:Sol3|리:mi3|고:re3','가:mi3|시:re2|는:mi1|님:do2,la1','은:sol5,la1,sol1,la1|r1',
  '십:do5|리:re1|도:do2,re1','못:mi2,re1|가:do2,la1|서:sol2,la1','발:do5|병:re1|난:do3','다:do6|r3'],
  phrases:['아리랑 아리랑 아라리요','아리랑 고개로 넘어간다','나를 버리고 가시는 님은','십리도 못 가서 발병 난다']},
 doraji:{name:'도라지타령',source:'위키백과 도라지타령 악보',original:'♩. = 110',bars:[
  '도:mi3|라:mi3|지:mi3','도:mi5|라:re1|지:do3','백:Sol6|도:La2,Sol1','라:mi5,re1|지:do3',
  '심:re2,mi1|심:mi6','산:re2,mi1|천:re2,do1|에:la1,sol2','백:la3|도:do5|라:la1','지:sol6|r3',
  '한:mi3|두:mi6','뿌:mi5|리:re1|만:do3','캐:Sol6|어:La2,Sol1','도:mi5,re1,do3',
  '대:re2|바:mi1|구:mi3|니:mi3','철:re2,mi1|철:re2,do1|철:la1,sol2','다:la3|넘:do5|는:la1','다:sol6|r3',
  '에:la3|헤:la2,do1|요:sol3','에:la3|헤:la2,do1|요:sol3','에:do3|헤:do5,re1','요:do6,re3',
  '에:mi3|야:mi3|라:mi3','난:mi5,re1|다:do3','지:Sol2|화:Sol1|자:Sol3,La2,Sol1','좋:mi5,re1|다:do3',
  '얼:re2,mi1|씨:mi3|구:mi3','좋:re2,mi1|구:re2,do1|나:la1,sol2','내:la3|사:do3|랑:la3','아:sol6|r3'],
  phrases:['도라지 도라지 백도라지','심심산천에 백도라지','한두 뿌리만 캐어도','대바구니 철철철 다 넘는다','에헤요 에헤요 에헤요','에야라 난다 지화자 좋다','얼씨구 좋구나 내 사랑아']}};
function parse(song){const notes=[];song.bars.forEach((bar,b)=>{let t=b*BAR;for(const group of bar.split('|')){const [syl,seq]=group.includes(':')?group.split(':'):['',group];seq.split(',').forEach((tok,k)=>{const m=/^([a-zA-Z]+)(\d+)$/.exec(tok),len=Number(m[2]);if(m[1]!=='r'){if(!(m[1] in DEG))throw new Error(song.name+' 음 '+tok);notes.push({t,len,string:DEG[m[1]],syl:k?'':syl,bar:b});}t+=len;});}if(t!==(b+1)*BAR)throw new Error(song.name+' '+(b+1)+'마디 길이 '+(t-b*BAR));});return notes;}
function janggu(song,melody){const out=[];song.bars.forEach((_,b)=>SEMACHI.forEach(([pos,stroke],k)=>{const t=b*BAR+pos,next=SEMACHI[k+1]?.[0]??BAR;out.push({t,len:next-pos,stroke,syl:melody.find(n=>n.t===t)?.syl||'',bar:b});}));return out;}
for(const s of Object.values(SONGS)){s.melody=parse(s);s.janggu=janggu(s,s.melody);}
const S={song:'arirang',phrase:-1,tempo:50,together:true};let run=null,last=null,built=false,flashTimers=new Set();
function part(){const i=app()?.state?.instrument;return PARTS.includes(i)?i:null;}
function other(p){return p==='janggu'?'gayageum':'janggu';}
function range(){const s=SONGS[S.song];if(S.phrase<0)return[0,s.bars.length];return[S.phrase*4,Math.min(s.bars.length,S.phrase*4+4)];}
function events(p){const s=SONGS[S.song],[from,to]=range();return(p==='janggu'?s.janggu:s.melody).filter(e=>e.bar>=from&&e.bar<to).map(e=>({...e,t:e.t-from*BAR}));}
function stringIndex(i){const midi=window.GugakReal?.gayageumMidis?.[i],g=app()?.groups('gayageum').find(x=>Number(x.officialMidi)===midi);return Number(g?.index??-1);}
function noteName(e,p){return p==='janggu'?e.stroke+' · '+STROKE[e.stroke].hand:(e.string+1)+'현('+NOTE[e.string]+')';}
function ask(e,p){return p==='janggu'?e.stroke+' · '+STROKE[e.stroke].say:(e.string+1)+'현('+NOTE[e.string]+')을 뜯어요';}
function say(t){const f=$('song-feedback');if(f)f.textContent=t;}
function targets(p,e){const scene=$('scene');if(!scene||!e)return[];if(p==='janggu')return STROKE[e.stroke].sides.flatMap(s=>[...scene.querySelectorAll('[data-strike="'+s+'"]')]);return[...scene.querySelectorAll('[data-string="'+e.string+'"],[data-visible-string="'+e.string+'"]')];}
function mark(cls,p,e){document.querySelectorAll('#scene .'+cls).forEach(el=>el.classList.remove(cls));for(const el of targets(p,e))el.classList.add(cls);if(cls==='song-now')dots('now',p,e);else if(cls==='song-soon')dots('soon',p,e);}
// v0.8: 칠 곳을 검은 점으로 찍는다. 가야금은 안족 오른쪽 현 위('오른손 뜯기' 표시 자리 x=875), 장구는 면 가운데. ●=지금 칠 곳, ○=다음 칠 곳(조금 옆). 점은 터치를 받지 않는다.
const NS='http://www.w3.org/2000/svg',DOT_X=875;
function dotLayer(){const svg=document.querySelector('#scene svg#real-instrument');if(!svg)return null;let g=svg.querySelector('.song-dots');if(!g){g=document.createElementNS(NS,'g');g.setAttribute('class','song-dots');g.setAttribute('pointer-events','none');svg.append(g);}return g;}
function dotSpots(p,e,kind){const scene=$('scene');if(!scene||!e)return[];const soon=kind==='soon';if(p==='janggu')return STROKE[e.stroke].sides.map(s=>{const f=scene.querySelector('[data-strike="'+s+'"]');return f&&{x:Number(f.getAttribute('cx')),y:Number(f.getAttribute('cy'))-(soon?70:0),r:soon?15:26,side:s};}).filter(Boolean);const t=scene.querySelector('[data-string="'+e.string+'"]');return t?[{x:DOT_X+(soon?34:0),y:Number(t.getAttribute('y1')),r:soon?8:13,string:e.string}]:[];}
function dots(kind,p,e){const g=dotLayer();if(!g)return;g.querySelectorAll('.dot-'+kind).forEach(d=>d.remove());for(const s of dotSpots(p,e,kind)){const c=document.createElementNS(NS,'circle');c.setAttribute('class','song-dot dot-'+kind);c.setAttribute('cx',s.x);c.setAttribute('cy',s.y);c.setAttribute('r',s.r);if(s.string!==undefined)c.dataset.dotString=s.string;if(s.side)c.dataset.dotSide=s.side;g.append(c);}}
function clearMarks(){for(const t of flashTimers)clearTimeout(t);flashTimers.clear();document.querySelectorAll('#scene .song-now,#scene .song-soon,#scene .song-good,#scene .song-bad').forEach(el=>el.classList.remove('song-now','song-soon','song-good','song-bad'));document.querySelectorAll('#scene .song-dots').forEach(g=>g.remove());}
function flash(cls,els){els.forEach(el=>el.classList.add(cls));const t=setTimeout(()=>{flashTimers.delete(t);els.forEach(el=>el.classList.remove(cls));},380);flashTimers.add(t);}
function cell(k){return $('song-strip')?.querySelector('[data-k="'+k+'"]');}
function cellNow(k){const strip=$('song-strip');strip?.querySelectorAll('.now').forEach(c=>c.classList.remove('now'));const c=cell(k);if(!c)return;c.classList.add('now');strip.scrollLeft=Math.max(0,c.offsetLeft-strip.clientWidth/2+c.offsetWidth/2);}
function sound(p,e,gain=1){const a=app();if(!a)return;const index=p==='janggu'?STROKE[e.stroke].index:stringIndex(e.string);if(index<0)return;const extra={instrument:p,sustain:false,gestureGain:gain};if(p==='janggu'&&e.stroke!=='덩')extra.side=STROKE[e.stroke].sides[0];return a.play(index,extra).catch(()=>{});}
async function prewarm(list){const a=app(),eng=a?.engine;if(!eng?.decode)return;try{await eng.ready();}catch{return;}const want=new Set();for(const [p,e]of list)want.add(p+':'+(p==='janggu'?STROKE[e.stroke].index:stringIndex(e.string)));for(const s of a.bank?.samples||[])if(want.has(s.instrument+':'+Number(s.index)))eng.decode(s).catch(()=>{});}
function renderStrip(){const strip=$('song-strip');if(!strip)return;strip.replaceChildren();const p=part();if(!p){const m=document.createElement('p');m.className='song-empty';m.textContent='곡 따라 하기는 가야금(가락)과 장구(장단)에서 할 수 있어요. 위에서 악기를 골라 주세요.';strip.append(m);return;}
 events(p).forEach((e,k,all)=>{const c=document.createElement('span');c.className='song-cell'+(k===0||all[k-1].bar!==e.bar?' bar-start':'');c.dataset.k=k;c.style.setProperty('--len',e.len);const syl=document.createElement('small'),main=document.createElement('b'),sub=document.createElement('i');syl.textContent=e.syl||' ';if(p==='janggu'){main.textContent=e.stroke;sub.textContent=STROKE[e.stroke].hand;}else{main.textContent=(e.string+1)+'현';sub.textContent=NOTE[e.string];}c.append(syl,main,sub);c.title=noteName(e,p)+(e.syl?' · '+e.syl:'');strip.append(c);});}
function renderControls(){if(!built)return;const s=SONGS[S.song],p=part();document.querySelectorAll('[data-song]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.song===S.song)));document.querySelectorAll('[data-song-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.songPart===p)));
 const sel=$('song-phrase');sel.replaceChildren(new Option('전체 ('+s.bars.length+'마디)','-1'),...s.phrases.map((t,i)=>new Option((i+1)+'구절 · '+t,String(i))));sel.value=String(S.phrase);
 $('song-tempo').value=String(S.tempo);$('song-tempo-value').textContent='♩. = '+S.tempo;$('song-together').checked=S.together;$('song-together-label').textContent=(p?NAMES[other(p)]:'다른 악기')+' 함께 듣기';
 for(const id of['song-demo','song-step','song-along'])$(id).disabled=!p;$('song-hint').hidden=run?.mode!=='step';$('song-source').textContent='가락: '+s.source+'을 앱 가야금 4~10현으로 옮김 · 장단: 세마치 기본형 · 원래 빠르기 '+s.original+' · 국악 강사 검수 전';renderStrip();}
function stop(reason){if(!run)return false;const r=run;run=null;clearInterval(r.timer);clearTimeout(r.duoTimer);clearMarks();$('song-strip')?.querySelectorAll('.now').forEach(c=>c.classList.remove('now'));if($('song-hint'))$('song-hint').hidden=true;document.body.classList.remove('song-running');if(reason!=='done'&&reason!=='restart')say('멈췄어요');return true;}
function begin(mode){const p=part();if(!p)return false;stop('restart');app()?.stopAll?.();renderStrip();const own=events(p);if(!own.length)return false;document.body.classList.add('song-running');
 if(mode==='step'){run={mode,part:p,own,k:0,good:0,wrong:0,sides:{}};$('song-hint').hidden=false;stepShow();return true;}
 const e8=60000/(S.tempo*3),acc=S.together?events(other(p)).map(e=>({...e,part:other(p)})):[];
 run={mode,part:p,own,acc,e8,t0:performance.now()+3*3*e8,i:0,j:0,nowUntil:0,total:(range()[1]-range()[0])*BAR};prewarm([...own.map(e=>[p,e]),...acc.map(e=>[e.part,e])]);mark('song-soon',p,own[0]);tick();run.timer=setInterval(tick,15);return true;}
function tick(){const r=run;if(!r)return;const now=performance.now();if(now<r.t0){const beats=Math.ceil((r.t0-now)/(3*r.e8));say((r.mode==='demo'?'시범 연주 · ':'같이 하기 · ')+'준비 '+(['','하나','둘','셋'][beats]||''));return;}
 while(r.i<r.own.length&&r.t0+r.own[r.i].t*r.e8<=now){const e=r.own[r.i],k=r.i++;if(r.mode==='demo')sound(r.part,e,1);mark('song-now',r.part,e);mark('song-soon',r.part,r.own[k+1]);cellNow(k);r.nowUntil=r.t0+(e.t+e.len)*r.e8-40;say((r.mode==='demo'?'시범 · ':'같이 · ')+(e.syl?'“'+e.syl+'” ':'')+noteName(e,r.part));}
 while(r.j<r.acc.length&&r.t0+r.acc[r.j].t*r.e8<=now){const e=r.acc[r.j++];sound(e.part,e,.55);}
 if(r.nowUntil&&now>r.nowUntil){mark('song-now',r.part,null);r.nowUntil=0;}
 if(now>r.t0+r.total*r.e8+350)finish();}
function finish(){const r=run;if(!r)return;if(r.mode==='demo')say('시범 끝 · 이제 “한 음씩 따라 하기”로 연습해 보세요');else if(r.mode==='along'){const hit=r.own.filter(e=>e.hit).length;r.own.forEach((e,k)=>cell(k)?.classList.toggle('miss',!e.hit));say('같이 하기 끝 · 제때 맞힌 음 '+hit+' / '+r.own.length);r.result={hit,total:r.own.length};}else{say('끝까지 했어요! 맞게 친 음 '+r.good+'개 · 다른 곳 '+r.wrong+'번');r.result={good:r.good,wrong:r.wrong};}
 last={mode:r.mode,part:r.part,song:S.song,phrase:S.phrase,...(r.result||{})};stop('done');}
function stepShow(){const r=run,e=r.own[r.k];mark('song-now',r.part,e);mark('song-soon',r.part,r.own[r.k+1]);cellNow(r.k);say((r.k+1)+' / '+r.own.length+' · '+(e.syl?'“'+e.syl+'” ':'')+ask(e,r.part));}
function stepGood(){const r=run;clearTimeout(r.duoTimer);r.sides={};flash('song-good',targets(r.part,r.own[r.k]));cell(r.k)?.classList.add('hit');r.good++;r.k++;if(r.k>=r.own.length)return finish();stepShow();}
function stepWrong(e,els){const r=run;r.wrong++;flash('song-bad',els);say('다른 곳이에요 · '+ask(e,r.part));}
function hitEls(p,h){const scene=$('scene');return p==='janggu'?[...scene.querySelectorAll('[data-strike="'+h.side+'"]')]:[...scene.querySelectorAll('[data-string="'+h.string+'"]')];}
function onStep(h,now){const r=run,e=r.own[r.k];if(!e)return;if(r.part!=='janggu')return h.string===e.string?stepGood():stepWrong(e,hitEls(r.part,h));const need=STROKE[e.stroke].sides;if(!need.includes(h.side))return stepWrong(e,hitEls(r.part,h));r.sides[h.side]=now;if(need.every(s=>now-(r.sides[s]??-1e9)<=DUO_MS))return stepGood();clearTimeout(r.duoTimer);r.duoTimer=setTimeout(()=>{if(run===r&&r.own[r.k]===e){r.wrong++;say('덩은 궁편과 채편을 함께 쳐요');}},DUO_MS+40);}
function onAlong(h,now){const r=run;if(now<r.t0-AHEAD_MS)return;let best=null;r.own.forEach((e,k)=>{if(e.hit)return;const at=r.t0+e.t*r.e8;if(now<at-AHEAD_MS||now>at+Math.min(e.len*r.e8,LATE_MS))return;if(r.part==='janggu'?!STROKE[e.stroke].sides.includes(h.side):e.string!==h.string)return;const d=Math.abs(now-at);if(!best||d<best.d)best={e,k,d};});
 if(!best){flash('song-bad',hitEls(r.part,h));return;}const {e,k}=best;if(r.part==='janggu'){e.sides=e.sides||{};e.sides[h.side]=now;if(!STROKE[e.stroke].sides.every(s=>e.sides[s]))return;}e.hit=true;cell(k)?.classList.add('hit');flash('song-good',hitEls(r.part,h));}
function onGesture(ev){const r=run,d=ev.detail||{};if(!r||r.mode==='demo'||d.instrument!==r.part)return;const now=performance.now();let h;if(r.part==='janggu'){if(d.side!=='gung'&&d.side!=='chae')return;h={side:d.side};}else{const el=document.querySelector('#scene [data-string][data-position-note="'+d.index+'"]');if(!el)return;h={string:Number(el.dataset.string)};}r.mode==='step'?onStep(h,now):onAlong(h,now);}
function hint(){const r=run;if(r?.mode!=='step')return;const e=r.own[r.k];sound(r.part,e,1);flash('song-good',targets(r.part,e));}
function select(song){if(!SONGS[song])return false;stop();S.song=song;S.phrase=-1;renderControls();return true;}
function setPhrase(n){n=Number(n);const max=Math.ceil(SONGS[S.song].bars.length/4)-1;if(!(n>=-1&&n<=max))return false;stop();S.phrase=n;renderControls();return true;}
function setTempo(v){v=Math.round(Number(v));if(!(v>=30&&v<=110))return false;S.tempo=v;$('song-tempo-value').textContent='♩. = '+v;return true;}
function setPart(p){if(!PARTS.includes(p))return false;stop();if(app()?.state?.instrument!==p)app()?.selectInstrument?.(p);renderControls();return true;}
function open(on=true){const d=$('song-panel');if(d)d.open=on;}
function build(){const panel=$('song-panel');if(!panel)return;built=true;S.tempo=GRADE_TEMPO[app()?.state?.grade]||S.tempo;
 panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.song)select(b.dataset.song);else if(b.dataset.songPart)setPart(b.dataset.songPart);else if(b.id==='song-demo')begin('demo');else if(b.id==='song-step')begin('step');else if(b.id==='song-along')begin('along');else if(b.id==='song-hint')hint();else if(b.id==='song-stop'){stop();app()?.stopAll?.();}});
 $('song-phrase').addEventListener('change',e=>setPhrase(e.target.value));$('song-tempo').addEventListener('input',e=>setTempo(e.target.value));$('song-together').addEventListener('change',e=>{S.together=e.target.checked;});
 window.addEventListener('gugak:gesture',onGesture);window.addEventListener('gugak:scene',()=>{if(run&&run.part!==part())stop();renderControls();});
 const q=new URLSearchParams(location.search);if(SONGS[q.get('song')]){S.song=q.get('song');if(PARTS.includes(q.get('part')))setPart(q.get('part'));open(true);}renderControls();}
window.GugakSongs={songs:SONGS,select,setPhrase,setTempo,setPart,open,start:begin,stop,hint,events,getState:()=>({...S,part:part(),running:run?{mode:run.mode,part:run.part,k:run.k??run.i,good:run.good,wrong:run.wrong,t0:run.t0,e8:run.e8}:null,last})};
build();
})();
