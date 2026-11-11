/* GugakSongs v0.7. 아리랑·도라지타령 시범 연주와 따라 하기.
 * 시범 연주는 미리 넣은 악보를 앱이 순서대로 연주하는 규칙형 기능이다. AI·네트워크·저장 없음.
 * 가락: 전래 민요 아리랑·도라지타령을 앱 가야금 조율 4~10현(G3 A3 C4 D4 E4 G4 A4)에 맞춰 수업용으로 새로 적음(2026-11-09, 꾸밈음을 줄임). 0.12까지는 위키백과 Arirang(en)·도라지타령(ko) 악보를 옮겨 썼다.
 * 장구: 세마치장단 기본형 덩 · · 덩 · 덕 쿵 덕 · (8분음표 9칸). 가락·장단 출처는 곡 따라 하기 안내(song-guide.html).
 * 입력 판정: app.js가 실물 악기 화면의 연주를 'gugak:gesture' 이벤트로 알린다(현 번호·장구 면).
 * v0.9.1: 재생 중 설정 변경은 안내 후 정지, 학년 빠르기 동기화, 같이 하기 덩 양손 입력도 300ms 이내로 판정.
 * v0.8(2026-11-03): 시범 보기·한 음씩·같이 하기에서 칠 곳을 검은 점(●)으로, 다음 칠 곳을 작은 고리(○)로 악기 위에 찍는다. 소리 경로는 v0.7과 같다.
 * v0.12.1(2026-11-11, Claude): 해금 가락·아쟁 가락도 검은 점을 따라 한다. 아쟁은 4~7현(라·미는 누름, 쉬운 연주는 앱이 대신), 해금은 따라 하는 동안 중현을 솔(G3)에 맞추고 중현 왼손 자리에 점을 찍는다(±70 cent 안이면 맞음). 국악 강사 확인 전 교육용 추정.
 * v0.10(2026-11-05): 왼손잡이 배치(좌우 반전)에서는 점 층을 악기 그림 그룹(.ri-stage) 안에 두어 함께 뒤집고, 궁편(왼쪽)·채편(오른쪽) 안내 글의 좌우를 바꾼다. 판정·소리는 그대로.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id),app=()=>window.gugakApp;
const DEG={sol:3,la:4,do:5,re:6,mi:7,Sol:8,La:9},NOTE=['G2','C3','D3','G3','A3','C4','D4','E4','G4','A4','C5','D5'];
const STROKE={'덩':{sides:['gung','chae'],index:0,hand:'양손',say:'궁편과 채편을 함께 쳐요'},'덕':{sides:['chae'],index:4,hand:'채편',say:'채편(오른쪽)을 쳐요'},'쿵':{sides:['gung'],index:2,hand:'궁편',say:'궁편(왼쪽)을 쳐요'}};
const SEMACHI=[[0,'덩'],[3,'덩'],[5,'덕'],[6,'쿵'],[7,'덕']],BAR=9,DUO_MS=300,AHEAD_MS=260,LATE_MS=600,PARTS=['gayageum','haegeum','ajaeng','janggu'];
const NAMES={gayageum:'가야금 가락',haegeum:'해금 가락',ajaeng:'아쟁 가락',janggu:'장구 장단'},GRADE_TEMPO={low:40,high:50,middle:60};
// v0.12.1(2026-11-11): 해금·아쟁 가락. 가락은 가야금 4~10현 음(G3 A3 C4 D4 E4 G4 A4)과 같다. 연주법·자리는 국악 강사 확인 전 교육용 추정.
const MIDI={3:55,4:57,5:60,6:62,7:64,8:67,9:69},SOLF={3:'솔',4:'라',5:'도',6:'레',7:'미',8:'솔',9:'라'};
// 아쟁: 열린 현 4현 G3·5현 C4·6현 D4·7현 G4. 라·미는 아래 현을 온음(200 cent) 눌러 올린다. 쉬운 연주에서는 앱이 누름을 대신한다.
const AJ={3:[3,0],4:[3,200],5:[4,0],6:[5,0],7:[5,200],8:[6,0],9:[6,200]},PRESS_X=330;
// 해금: 따라 하는 동안 중현을 솔(G3)에 맞춘다(앱 녹음 중현은 약 Ab3). 왼손 자리 = 솔에서 올라간 cent, 중현만 쓴다. 화면 자리는 real-instruments.js의 (y-165)/220*1500 식과 같다.
const HAE_TOL=70,HAE_Y0=165,HAE_SPAN=220,HAE_CENTS=1500,HAE_X=492,BOWED=['haegeum','ajaeng'];let haeOff=null;
function haeOffset(){if(haeOff===null){const m=window.GUGAK_MEASURED_PITCHES?.samples?.find(s=>s.instrument==='haegeum'&&Number(s.index)===0&&s.accepted),hz=Number(m?.estimatedHz)||207.5;haeOff=1200*Math.log2(196/hz);}return haeOff;}
const haeFinger=e=>(MIDI[e.string]-55)*100,easyMode=()=>app()?.state?.interaction!=='realistic';
function spot(p,e){if(p==='ajaeng'){const [s,c]=AJ[e.string];return{string:s,press:c};}if(p==='haegeum')return{string:0,finger:haeFinger(e)};return{string:e.string,press:0};}
function label(e,p){if(p==='janggu')return e.stroke+' · '+STROKE[e.stroke].hand;const n=NOTE[e.string];if(p==='ajaeng'){const sp=spot(p,e);return(sp.string+1)+'현'+(sp.press?' 누름':'')+'('+n+')';}if(p==='haegeum')return'중현 '+SOLF[e.string]+'('+n+')';return(e.string+1)+'현('+n+')';}
// 한 마디 = '가사:음길이,…|…' (음길이는 8분음표 수, r = 쉼)
const SONGS={
 arirang:{name:'아리랑',source:'전래 민요 · 셈제작소 수업용 악보',original:'느리게',bars:[
  '아:sol5|리:la1|랑:sol2,la1','아:do5|리:re1|랑:do3','아:mi3|라:re3|리:do2,la1','요:sol6|r3',
  '아:do5|리:re1|랑:do3','고:mi3|개:do2,la1|로:sol3','넘:do5|어:re1|간:do3','다:do6|r3',
  '나:Sol6|를:Sol3','버:Sol3|리:mi3|고:re3','가:mi3|시:re2|는:mi1|님:do3','은:sol6|r3',
  '십:do5|리:re1|도:do3','못:mi3|가:do2,la1|서:sol3','발:do5|병:re1|난:do3','다:do6|r3'],
  phrases:['아리랑 아리랑 아라리요','아리랑 고개로 넘어간다','나를 버리고 가시는 님은','십리도 못 가서 발병 난다']},
 doraji:{name:'도라지타령',source:'전래 민요 · 셈제작소 수업용 악보',original:'조금 빠르게',bars:[
  '도:mi3|라:mi3|지:mi3','도:mi5|라:re1|지:do3','백:Sol6|도:La2,Sol1','라:mi5,re1|지:do3',
  '심:re3|심:mi6','산:re3|천:re2,do1|에:la1,sol2','백:la3|도:do5|라:la1','지:sol6|r3',
  '한:mi3|두:mi6','뿌:mi5|리:re1|만:do3','캐:Sol6|어:La2,Sol1','도:mi5,re1,do3',
  '대:re2|바:mi1|구:mi3|니:mi3','철:re3|철:re2,do1|철:la1,sol2','다:la3|넘:do5|는:la1','다:sol6|r3',
  '에:la3|헤:la3|요:sol3','에:la3|헤:la3|요:sol3','에:do3|헤:do6','요:do6,re3',
  '에:mi3|야:mi3|라:mi3','난:mi5,re1|다:do3','지:Sol2|화:Sol1|자:Sol3,La2,Sol1','좋:mi5,re1|다:do3',
  '얼:re3|씨:mi3|구:mi3','좋:re3|구:re2,do1|나:la1,sol2','내:la3|사:do3|랑:la3','아:sol6|r3'],
  phrases:['도라지 도라지 백도라지','심심산천에 백도라지','한두 뿌리만 캐어도','대바구니 철철철 다 넘는다','에헤요 에헤요 에헤요','에야라 난다 지화자 좋다','얼씨구 좋구나 내 사랑아']}};
function parse(song){const notes=[];song.bars.forEach((bar,b)=>{let t=b*BAR;for(const group of bar.split('|')){const [syl,seq]=group.includes(':')?group.split(':'):['',group];seq.split(',').forEach((tok,k)=>{const m=/^([a-zA-Z]+)(\d+)$/.exec(tok),len=Number(m[2]);if(m[1]!=='r'){if(!(m[1] in DEG))throw new Error(song.name+' 음 '+tok);notes.push({t,len,string:DEG[m[1]],syl:k?'':syl,bar:b});}t+=len;});}if(t!==(b+1)*BAR)throw new Error(song.name+' '+(b+1)+'마디 길이 '+(t-b*BAR));});return notes;}
function janggu(song,melody){const out=[];song.bars.forEach((_,b)=>SEMACHI.forEach(([pos,stroke],k)=>{const t=b*BAR+pos,next=SEMACHI[k+1]?.[0]??BAR;out.push({t,len:next-pos,stroke,syl:melody.find(n=>n.t===t)?.syl||'',bar:b});}));return out;}
for(const s of Object.values(SONGS)){s.melody=parse(s);s.janggu=janggu(s,s.melody);}
const S={song:'arirang',phrase:-1,tempo:50,together:true};let run=null,last=null,built=false,gradeAtRender=null,flashTimers=new Set();
function part(){const i=app()?.state?.instrument;return PARTS.includes(i)?i:null;}
function other(p){return p==='janggu'?'gayageum':'janggu';}
function range(){const s=SONGS[S.song];if(S.phrase<0)return[0,s.bars.length];return[S.phrase*4,Math.min(s.bars.length,S.phrase*4+4)];}
function events(p){const s=SONGS[S.song],[from,to]=range();return(p==='janggu'?s.janggu:s.melody).filter(e=>e.bar>=from&&e.bar<to).map(e=>({...e,t:e.t-from*BAR}));}
function stringIndex(i){const midi=window.GugakReal?.gayageumMidis?.[i],g=app()?.groups('gayageum').find(x=>Number(x.officialMidi)===midi);return Number(g?.index??-1);}
function noteName(e,p){return label(e,p);}
function ask(e,p){if(p==='janggu')return e.stroke+' · '+sideText(STROKE[e.stroke].say);const n=NOTE[e.string];if(p==='ajaeng'){const sp=spot(p,e);return(sp.string+1)+'현'+(sp.press?'을 눌러 '+n+'로 올리고':'('+n+')을')+' 활로 그어요'+(sp.press&&easyMode()?' · 쉬운 연주는 앱이 눌러 줘요':'');}if(p==='haegeum')return'중현 검은 점 자리('+SOLF[e.string]+' · '+n+')를 '+(easyMode()?'누르고 있어요':'짚고 활을 그어요');return(e.string+1)+'현('+n+')을 뜯어요';}
const mirrored=()=>document.querySelector('#scene svg#real-instrument')?.dataset.mirror==='left',sideText=s=>mirrored()?s.replace(/왼쪽|오른쪽/g,m=>m==='왼쪽'?'오른쪽':'왼쪽'):s;
function say(t){const f=$('song-feedback');if(f)f.textContent=t;}
function targets(p,e){const scene=$('scene');if(!scene||!e)return[];if(p==='janggu')return STROKE[e.stroke].sides.flatMap(s=>[...scene.querySelectorAll('[data-strike="'+s+'"]')]);const s=spot(p,e).string;return[...scene.querySelectorAll('[data-string="'+s+'"],[data-visible-string="'+s+'"]')];}
function mark(cls,p,e){document.querySelectorAll('#scene .'+cls).forEach(el=>el.classList.remove(cls));for(const el of targets(p,e))el.classList.add(cls);if(cls==='song-now')dots('now',p,e);else if(cls==='song-soon')dots('soon',p,e);}
// v0.8: 칠 곳을 검은 점으로 찍는다. 가야금은 안족 오른쪽 현 위('오른손 뜯기' 표시 자리 x=875), 장구는 면 가운데. ●=지금 칠 곳, ○=다음 칠 곳(조금 옆). 점은 터치를 받지 않는다.
const NS='http://www.w3.org/2000/svg',DOT_X=875;
function dotLayer(){const svg=document.querySelector('#scene svg#real-instrument');if(!svg)return null;let g=svg.querySelector('.song-dots');if(!g){g=document.createElementNS(NS,'g');g.setAttribute('class','song-dots');g.setAttribute('pointer-events','none');(svg.querySelector('.ri-stage')||svg).append(g);}return g;}
function dotSpots(p,e,kind){const scene=$('scene');if(!scene||!e)return[];const soon=kind==='soon';if(p==='janggu')return STROKE[e.stroke].sides.map(s=>{const f=scene.querySelector('[data-strike="'+s+'"]');return f&&{x:Number(f.getAttribute('cx')),y:Number(f.getAttribute('cy'))-(soon?70:0),r:soon?15:26,side:s};}).filter(Boolean);const sp=spot(p,e);if(p==='haegeum')return[{x:HAE_X+(soon?-34:0),y:HAE_Y0+sp.finger/HAE_CENTS*HAE_SPAN,r:soon?8:13,string:0}];const t=scene.querySelector('[data-string="'+sp.string+'"]');if(!t)return[];const y=Number(t.getAttribute('y1')),out=[{x:DOT_X+(soon?34:0),y,r:soon?8:13,string:sp.string}];if(sp.press&&!soon)out.push({x:PRESS_X,y,r:11,string:sp.string,press:true});return out;}
function dots(kind,p,e){const g=dotLayer();if(!g)return;g.querySelectorAll('.dot-'+kind+',.label-'+kind).forEach(d=>d.remove());for(const s of dotSpots(p,e,kind)){const c=document.createElementNS(NS,'circle');c.setAttribute('class','song-dot dot-'+kind);c.setAttribute('cx',s.x);c.setAttribute('cy',s.y);c.setAttribute('r',s.r);if(s.string!==undefined)c.dataset.dotString=s.string;if(s.side)c.dataset.dotSide=s.side;if(s.press){c.classList.add('dot-press');c.dataset.dotPress='1';}g.append(c);if(s.press&&!mirrored()){const t=document.createElementNS(NS,'text');t.setAttribute('class','song-dot-label label-'+kind);t.setAttribute('x',s.x);t.setAttribute('y',s.y-17);t.setAttribute('text-anchor','middle');t.textContent='누름';g.append(t);}}}
function clearMarks(){for(const t of flashTimers)clearTimeout(t);flashTimers.clear();document.querySelectorAll('#scene .song-now,#scene .song-soon,#scene .song-good,#scene .song-bad').forEach(el=>el.classList.remove('song-now','song-soon','song-good','song-bad'));document.querySelectorAll('#scene .song-dots').forEach(g=>g.remove());}
function flash(cls,els){els.forEach(el=>el.classList.add(cls));const t=setTimeout(()=>{flashTimers.delete(t);els.forEach(el=>el.classList.remove(cls));},380);flashTimers.add(t);}
function cell(k){return $('song-strip')?.querySelector('[data-k="'+k+'"]');}
function cellNow(k){const strip=$('song-strip');strip?.querySelectorAll('.now').forEach(c=>c.classList.remove('now'));const c=cell(k);if(!c)return;c.classList.add('now');strip.scrollLeft=Math.max(0,c.offsetLeft-strip.clientWidth/2+c.offsetWidth/2);}
function voiceOf(p,e){if(p==='janggu')return{index:STROKE[e.stroke].index,cents:0};if(p==='gayageum')return{index:stringIndex(e.string),cents:0};const g=app()?.groups(p)||[];if(p==='ajaeng'){const sp=spot(p,e);return{index:Number(g[sp.string]?.index??-1),cents:sp.press};}return{index:Number(g[0]?.index??-1),cents:haeOffset()+haeFinger(e)};}
const bowing=new Map();let bowSerial=0;
function releaseBow(tok){const t=bowing.get(tok);if(t===undefined)return;clearTimeout(t);bowing.delete(tok);try{app()?.engine?.release?.(tok);}catch{}}
function releaseAllBows(){for(const tok of[...bowing.keys()])releaseBow(tok);}
function sound(p,e,gain=1,ms=700){const a=app();if(!a)return;const v=voiceOf(p,e),index=v.index;if(index<0)return;if(BOWED.includes(p)){const tok='song-bow-'+(++bowSerial);bowing.set(tok,setTimeout(()=>releaseBow(tok),Math.max(160,ms-40)));return a.play(index,{instrument:p,sustain:true,gestureGain:gain,bowSpeed:.5,physicalCents:v.cents},undefined,tok).then(r=>{if(!bowing.has(tok)){try{a.engine.release(tok);}catch{}}return r;}).catch(()=>{bowing.delete(tok);});}const extra={instrument:p,sustain:false,gestureGain:gain};if(p==='janggu'&&e.stroke!=='덩')extra.side=STROKE[e.stroke].sides[0];return a.play(index,extra).catch(()=>{});}
async function prewarm(list){const a=app(),eng=a?.engine;if(!eng?.decode)return;try{await eng.ready();}catch{return;}const want=new Set();for(const [p,e]of list)want.add(p+':'+voiceOf(p,e).index);for(const s of a.bank?.samples||[])if(want.has(s.instrument+':'+Number(s.index)))eng.decode(s).catch(()=>{});}
function renderStrip(){const strip=$('song-strip');if(!strip)return;strip.replaceChildren();const p=part();if(!p){const m=document.createElement('p');m.className='song-empty';m.textContent='곡 따라 하기는 가야금·해금·아쟁(가락)과 장구(장단)에서 할 수 있어요. 위에서 악기를 골라 주세요.';strip.append(m);return;}
 events(p).forEach((e,k,all)=>{const c=document.createElement('span');c.className='song-cell'+(k===0||all[k-1].bar!==e.bar?' bar-start':'');c.dataset.k=k;c.style.setProperty('--len',e.len);const syl=document.createElement('small'),main=document.createElement('b'),sub=document.createElement('i');syl.textContent=e.syl||' ';if(p==='janggu'){main.textContent=e.stroke;sub.textContent=STROKE[e.stroke].hand;}else if(p==='ajaeng'){const sp=spot(p,e);main.textContent=(sp.string+1)+'현';sub.textContent=NOTE[e.string]+(sp.press?' 누름':'');}else if(p==='haegeum'){main.textContent=SOLF[e.string];sub.textContent=NOTE[e.string];}else{main.textContent=(e.string+1)+'현';sub.textContent=NOTE[e.string];}c.append(syl,main,sub);c.title=noteName(e,p)+(e.syl?' · '+e.syl:'');strip.append(c);});}
function renderControls(){if(!built)return;const s=SONGS[S.song],p=part();document.querySelectorAll('[data-song]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.song===S.song)));document.querySelectorAll('[data-song-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.songPart===p)));
 const sel=$('song-phrase');sel.replaceChildren(new Option('전체 ('+s.bars.length+'마디)','-1'),...s.phrases.map((t,i)=>new Option((i+1)+'구절 · '+t,String(i))));sel.value=String(S.phrase);
 $('song-tempo').value=String(S.tempo);$('song-tempo-value').textContent='♩. = '+S.tempo;$('song-together').checked=S.together;$('song-together-label').textContent=(p?NAMES[other(p)]:'다른 악기')+' 함께 듣기';
 for(const id of['song-demo','song-step','song-along'])$(id).disabled=!p;$('song-hint').hidden=run?.mode!=='step';$('song-source').textContent='가락: '+s.source+' · 앱 가야금 4~10현 · 장단: 세마치 기본형 · 원래 빠르기 '+s.original+(p==='haegeum'?' · 해금: 따라 하는 동안 중현을 솔(G3)에 맞춤(교육용 추정)':p==='ajaeng'?' · 아쟁: 4~7현, 라·미는 누름(교육용 추정)':'');renderStrip();}
function stop(reason){if(!run)return false;const r=run;run=null;releaseAllBows();clearInterval(r.timer);clearTimeout(r.duoTimer);clearMarks();$('song-strip')?.querySelectorAll('.now').forEach(c=>c.classList.remove('now'));if($('song-hint'))$('song-hint').hidden=true;document.body.classList.remove('song-running');if(reason!=='done'&&reason!=='restart')say('멈췄어요');return true;}
function begin(mode){const p=part();if(!p)return false;stop('restart');app()?.stopAll?.();if($('action-now'))$('action-now').textContent=(mode==='demo'?'먼저 들어 보기':mode==='step'?'한 음씩 따라 하기':'박자 맞춰 같이 하기')+' 시작 · 위 악보 칸과 검은 점을 보세요';renderStrip();const own=events(p);if(!own.length)return false;document.body.classList.add('song-running');
 if(mode==='step'){run={mode,part:p,own,k:0,good:0,wrong:0,sides:{}};$('song-hint').hidden=false;stepShow();return true;}
 const e8=60000/(S.tempo*3),acc=S.together?events(other(p)).map(e=>({...e,part:other(p)})):[];
 run={mode,part:p,own,acc,e8,t0:performance.now()+3*3*e8,i:0,j:0,nowUntil:0,total:(range()[1]-range()[0])*BAR};prewarm([...own.map(e=>[p,e]),...acc.map(e=>[e.part,e])]);mark('song-soon',p,own[0]);tick();run.timer=setInterval(tick,15);return true;}
function tick(){const r=run;if(!r)return;const now=performance.now();if(now<r.t0){const beats=Math.ceil((r.t0-now)/(3*r.e8));say((r.mode==='demo'?'들려주기 · ':'같이 하기 · ')+'준비 '+(['','하나','둘','셋'][beats]||''));return;}
 while(r.i<r.own.length&&r.t0+r.own[r.i].t*r.e8<=now){const e=r.own[r.i],k=r.i++;if(r.mode==='demo')sound(r.part,e,1,e.len*r.e8);mark('song-now',r.part,e);mark('song-soon',r.part,r.own[k+1]);cellNow(k);r.nowUntil=r.t0+(e.t+e.len)*r.e8-40;say((r.mode==='demo'?'듣기 · ':'같이 · ')+(e.syl?'“'+e.syl+'” ':'')+noteName(e,r.part));}
 while(r.j<r.acc.length&&r.t0+r.acc[r.j].t*r.e8<=now){const e=r.acc[r.j++];sound(e.part,e,.55,e.len*r.e8);}
 if(r.nowUntil&&now>r.nowUntil){mark('song-now',r.part,null);r.nowUntil=0;}
 if(now>r.t0+r.total*r.e8+350)finish();}
function finish(){const r=run;if(!r)return;if(r.mode==='demo')say('들려주기 끝 · 이제 “한 음씩 따라 하기”로 연습해 보세요');else if(r.mode==='along'){const hit=r.own.filter(e=>e.hit).length;r.own.forEach((e,k)=>cell(k)?.classList.toggle('miss',!e.hit));say('같이 하기 끝 · 제때 맞힌 음 '+hit+' / '+r.own.length);r.result={hit,total:r.own.length};}else{say('끝까지 했어요! 맞게 친 음 '+r.good+'개 · 다른 곳 '+r.wrong+'번');r.result={good:r.good,wrong:r.wrong};}
 last={mode:r.mode,part:r.part,song:S.song,phrase:S.phrase,...(r.result||{})};stop('done');}
function stepShow(){const r=run,e=r.own[r.k];mark('song-now',r.part,e);mark('song-soon',r.part,r.own[r.k+1]);cellNow(r.k);say((r.k+1)+' / '+r.own.length+' · '+(e.syl?'“'+e.syl+'” ':'')+ask(e,r.part));}
function stepGood(){const r=run;clearTimeout(r.duoTimer);r.sides={};r.armed=false;r.missed=false;flash('song-good',targets(r.part,r.own[r.k]));cell(r.k)?.classList.add('hit');r.good++;r.k++;if(r.k>=r.own.length)return finish();stepShow();}
function stepWrong(e,els){const r=run;r.wrong++;flash('song-bad',els);say('다른 곳이에요 · '+ask(e,r.part));}
function hitEls(p,h){const scene=$('scene');return p==='janggu'?[...scene.querySelectorAll('[data-strike="'+h.side+'"]')]:[...scene.querySelectorAll('[data-string="'+h.string+'"]')];}
function haeStep(h,e){const r=run,d=h.finger-haeFinger(e);if(h.string!==0){if(h.press)stepWrong(e,hitEls('haegeum',h));return;}if(Math.abs(d)<=HAE_TOL){if(h.press||r.armed)stepGood();return;}r.armed=true;if(!h.press)return;if(!r.missed){r.missed=true;r.wrong++;}flash('song-bad',hitEls('haegeum',h));say((d<0?'조금 더 아래로(높게)':'조금 더 위로(낮게)')+' · '+ask(e,'haegeum'));}
function matches(p,e,h){if(p==='janggu')return STROKE[e.stroke].sides.includes(h.side);if(p==='haegeum')return h.string===0&&Math.abs(h.finger-haeFinger(e))<=HAE_TOL;return h.string===spot(p,e).string;}
function onStep(h,now){const r=run,e=r.own[r.k];if(!e)return;if(r.part==='haegeum')return haeStep(h,e);if(r.part!=='janggu')return h.string===spot(r.part,e).string?stepGood():stepWrong(e,hitEls(r.part,h));const need=STROKE[e.stroke].sides;if(!need.includes(h.side))return stepWrong(e,hitEls(r.part,h));r.sides[h.side]=now;if(need.every(s=>now-(r.sides[s]??-1e9)<=DUO_MS))return stepGood();clearTimeout(r.duoTimer);r.duoTimer=setTimeout(()=>{if(run===r&&r.own[r.k]===e){r.wrong++;say('덩은 궁편과 채편을 함께 쳐요');}},DUO_MS+40);}
function onAlong(h,now){const r=run;if(now<r.t0-AHEAD_MS)return;let best=null;r.own.forEach((e,k)=>{if(e.hit)return;const at=r.t0+e.t*r.e8;if(now<at-AHEAD_MS||now>at+Math.min(e.len*r.e8,LATE_MS))return;if(!matches(r.part,e,h))return;const d=Math.abs(now-at);if(!best||d<best.d)best={e,k,d};});
 if(!best){if(h.press!==false)flash('song-bad',hitEls(r.part,h));return;}const {e,k}=best;if(r.part==='janggu'){e.sides=e.sides||{};e.sides[h.side]=now;if(!STROKE[e.stroke].sides.every(s=>e.sides[s]!==undefined&&now-e.sides[s]<=DUO_MS))return;}e.hit=true;cell(k)?.classList.add('hit');flash('song-good',hitEls(r.part,h));}
function onGesture(ev){const r=run,d=ev.detail||{};if(!r||r.mode==='demo'||d.instrument!==r.part)return;const now=performance.now();let h;if(r.part==='janggu'){if(d.side!=='gung'&&d.side!=='chae')return;h={side:d.side};}else{const el=document.querySelector('#scene [data-string][data-position-note="'+d.index+'"]');if(!el)return;h={string:Number(el.dataset.string),press:true};if(r.part==='haegeum'){if(!Number.isFinite(d.cents))return;h.finger=d.cents-haeOffset();}}r.mode==='step'?onStep(h,now):onAlong(h,now);}
function onPitch(ev){const r=run,d=ev.detail||{};if(!r||r.mode==='demo'||r.part!=='haegeum'||d.instrument!=='haegeum'||!d.sounding||!Number.isFinite(d.cents))return;const h={string:Number(d.string),finger:d.cents-haeOffset(),press:false};r.mode==='step'?onStep(h,performance.now()):onAlong(h,performance.now());}
function assistCents(inst,i,manual){const r=run;if(!r||r.mode==='demo'||r.part!==inst)return 0;if(inst==='haegeum')return haeOffset();if(inst!=='ajaeng'||manual)return 0;let e=null;if(r.mode==='step')e=r.own[r.k];else{const now=performance.now();let best=Infinity;for(const x of r.own){if(x.hit)continue;const at=r.t0+x.t*r.e8;if(now<at-AHEAD_MS||now>at+Math.max(x.len*r.e8,LATE_MS))continue;const dd=Math.abs(now-at);if(dd<best){best=dd;e=x;}}}if(!e)return 0;const sp=spot('ajaeng',e);return sp.string===Number(i)?sp.press:0;}
function hint(){const r=run;if(r?.mode!=='step')return;const e=r.own[r.k];sound(r.part,e,1,900);flash('song-good',targets(r.part,e));}
function select(song){if(!SONGS[song])return false;stop();S.song=song;S.phrase=-1;renderControls();return true;}
function setPhrase(n){n=Number(n);const max=Math.ceil(SONGS[S.song].bars.length/4)-1;if(!(n>=-1&&n<=max))return false;stop();S.phrase=n;renderControls();return true;}
function stopForSetting(message){if(!run)return;stop();app()?.stopAll?.();say(message+' 다시 시작해 주세요.');}
function setTempo(v){v=Math.round(Number(v));if(!(v>=30&&v<=110))return false;if(v!==S.tempo)stopForSetting('빠르기를 바꿨어요.');S.tempo=v;$('song-tempo').value=String(v);$('song-tempo-value').textContent='♩. = '+v;return true;}
function setTogether(on){on=!!on;if(on!==S.together)stopForSetting('함께 듣기를 바꿨어요.');S.together=on;$('song-together').checked=on;return true;}
function setPart(p){if(!PARTS.includes(p))return false;stop();if(app()?.state?.instrument!==p)app()?.selectInstrument?.(p);renderControls();return true;}
function open(on=true){const d=$('song-panel');if(d)d.open=on;}
function build(){const panel=$('song-panel');if(!panel)return;built=true;gradeAtRender=app()?.state?.grade;S.tempo=GRADE_TEMPO[gradeAtRender]||S.tempo;
 panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.song)select(b.dataset.song);else if(b.dataset.songPart)setPart(b.dataset.songPart);else if(b.id==='song-demo')begin('demo');else if(b.id==='song-step')begin('step');else if(b.id==='song-along')begin('along');else if(b.id==='song-hint')hint();else if(b.id==='song-stop'){stop();app()?.stopAll?.();}});
 $('song-phrase').addEventListener('change',e=>setPhrase(e.target.value));$('song-tempo').addEventListener('input',e=>setTempo(e.target.value));$('song-together').addEventListener('change',e=>setTogether(e.target.checked));
 window.addEventListener('gugak:gesture',onGesture);window.addEventListener('gugak:pitch',onPitch);window.addEventListener('gugak:scene',()=>{if(run&&run.part!==part())stop();const grade=app()?.state?.grade;if(grade!==gradeAtRender){gradeAtRender=grade;if(GRADE_TEMPO[grade])setTempo(GRADE_TEMPO[grade]);}renderControls();});
 const q=new URLSearchParams(location.search);if(SONGS[q.get('song')]){S.song=q.get('song');if(PARTS.includes(q.get('part')))setPart(q.get('part'));open(true);}renderControls();}
window.GugakSongs={songs:SONGS,assistCents,spot:(p,e)=>spot(p,e),select,setPhrase,setTempo,setTogether,setPart,open,start:begin,stop,hint,events,getState:()=>({...S,part:part(),running:run?{mode:run.mode,part:run.part,k:run.k??run.i,good:run.good,wrong:run.wrong,t0:run.t0,e8:run.e8}:null,last})};
build();
})();
