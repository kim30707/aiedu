/* 정간보 놀이 v0.1 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * G5 정간보와 오선보 · G8 AI에게 악보를 만들게 하기 · H2 나만의 작곡 · L1 반가 만들기가 함께 쓰는 화면.
 * - 악보는 gugak-data.js의 SONGS(놀이·채점과 같은 수업용 악보)에서 바로 만든다. 한 칸 = 8분음표, 9칸 = 세마치 한 장단.
 * - 율명 두 안은 11/5 정간보_만들기.py와 같다(안 A 도=黃 · 안 B 솔=黃). 국악 강사 확인 전.
 * - 오선보는 9/8로, 점4분음표 박을 넘지 않게 나눠 붙임줄로 잇는다(강사 확인 전 규칙).
 * - AI 연결·네트워크 없음. 카드는 복사만 하고, 답은 사람이 붙여 넣는다.
 * v0.2 (2026-11-16, Claude Opus 5.5 · 총괄 개발 세션 하위 작업) — Astra 2차 검증 N19~N26·N30·N32·N11·N15 일부 반영:
 *   악보 후보 줄 탈락·크기 제한, 비교(다른·빠진·더한 칸), G4 줄 번호 토큰 검사, 줄 넘김 붙임줄, 내용 출처 표시,
 *   바뀌면 이전 결과 지우기, 재생 요청 번호·편집 시 멈춤, 덮어쓰기 전 확인·되돌리기, G4 원본 음 번호, 답 속 개인정보 가림, 교실 연결.
 */
(()=>{'use strict';
const P=window.GugakPlay,$=id=>document.getElementById(id),C=window.GugakClass||null;
const BAR=P.BAR;
const KEYS=['sol','la','do','re','mi','Sol','La'];
const KO={sol:'솔',la:'라',do:'도',re:'레',mi:'미',Sol:'높은솔',La:'높은라'};
const KO_CELL={sol:'솔',la:'라',do:'도',re:'레',mi:'미',Sol:'솔˙',La:'라˙'};
const YUL={A:{sol:'㑣',la:'㑲',do:'黃',re:'太',mi:'姑',Sol:'林',La:'南'},B:{sol:'黃',la:'太',do:'仲',re:'林',mi:'南',Sol:'潢',La:'汰'}};
const YUL_KO={'㑣':'배임','㑲':'배남','黃':'황','太':'태','姑':'고','林':'임','南':'남','仲':'중','潢':'청황','汰':'청태'};
const NOTE_OF={sol:'G3',la:'A3',do:'C4',re:'D4',mi:'E4',Sol:'G4',La:'A4'};
const SEMA={};for(const [p,s] of P.SEMACHI)SEMA[p]=s;
const PII=/(이름|학교|초등|중학교|[0-9]+\s*반|[0-9]{2,4}-?[0-9]{3,4}-?[0-9]{4}|@|주소|번지|아파트)/;/* tune.js와 같은 거름(완전하지 않음) */
const EX=window.GUGAK_JG_EXAMPLES||[];

/* ── 설정(주소 코드: G5·G8·H2·L1 · see/make/check · c45 · ya/yb/yn · up) ── */
const H=String(location.hash||'').replace(/^#/,'').split(/[.&]/);
const has=t=>H.includes(t);
const st={tab:has('g4')||has('G4')?'g4':has('check')||has('G8')?'check':has('make')||has('H2')||has('L1')?'make':'see',
 tempo:45,yul:has('yb')?'B':has('yn')?'N':'A',janggu:true,up:has('up'),
 song:'arirang-1',mine:null,g4:{orig:[],fixed:[],sel:0,del:[],src:null,ansSrc:null},sel:0,quiz:null,checked:null,marks:new Set(),diff:null,extra:null,cmp:null,timers:[],playing:null,seq:0,undo:null,src:null};
for(const t of H){const m=/^c(\d{2})$/.exec(t);if(m)st.tempo=Math.max(30,Math.min(70,+m[1]));}

/* ── 곡 → 장단(칸 배열) ── */
function songBars(id){const s=P.SONGS[id];return s.bars.map(bar=>{const cells=[],syl=[];for(const g of bar.split('|')){const [y,seq]=g.includes(':')?g.split(':'):['',g];seq.split(',').forEach((tok,k)=>{const m=/^([a-zA-Z]+)(\d+)$/.exec(tok),n=+m[2];cells.push(m[1]==='r'?'0':m[1]);syl.push(k?'':y);for(let i=1;i<n;i++){cells.push('-');syl.push('');}});}return {cells,syl};});}
const SONG_LIST=[
 ['arirang-1','아리랑 1구절 (아리랑 아리랑 아라리요)','arirang',0,4],['arirang-2','아리랑 2구절 (아리랑 고개로 넘어간다)','arirang',4,4],
 ['arirang-3','아리랑 3구절 (나를 버리고 가시는 님은)','arirang',8,4],['arirang-4','아리랑 4구절 (십리도 못 가서 발병 난다)','arirang',12,4],
 ['arirang-all','아리랑 전체 (16장단)','arirang',0,16],['doraji-1','도라지타령 1구절','doraji',0,4],['doraji-2','도라지타령 2구절','doraji',4,4]];
const songPart=key=>{const s=SONG_LIST.find(x=>x[0]===key);return songBars(s[2]).slice(s[3],s[3]+s[4]);};

/* ── 칸 → 음 사건 ── */
function offsets(bars){const o=[];let g=0;for(const b of bars){o.push(g);g+=b.cells.length;}return {o,total:g};}
function events(bars){const ev=[];let cur=null,g=0;for(const b of bars)for(const c of b.cells){if(c==='-'){if(cur)cur.len++;}else{cur={g,key:c===''?'0':c,len:1};ev.push(cur);}g++;}return ev;}

/* ── 정간보 코드 ── */
const OUT={sol:'솔',la:'라',do:'도',re:'레',mi:'미',Sol:'높은솔',La:'높은라','-':'-','0':'0','':'0'};
const toCode=bars=>bars.map(b=>b.cells.map(c=>OUT[c]??'?').join(' ')).join('\n');
const TOK={'솔':'sol','라':'la','도':'do','레':'re','미':'mi','높은솔':'Sol','높은라':'La','높솔':'Sol','높라':'La',"솔'":'Sol',"라'":'La','솔^':'Sol','라^':'La','솔˙':'Sol','라˙':'La',
 '-':'-','ㅡ':'-','—':'-','–':'-','─':'-','│':'-','|':'-','0':'0','쉼':'0','△':'0','○':'0'};
function tokOf(t){if(t in TOK)return TOK[t];for(const sc of ['A','B']){const k=Object.keys(YUL[sc]).find(k=>YUL[sc][k]===t);if(k&&sc===(st.yul==='B'?'B':'A'))return k;}return null;}
/* 입력 크기 제한(그리기 전에 자름 · Astra N19) */
const MAXCH=4000,MAXBAR=8,MAXCELL=BAR*2;
/* 쓸 수 없지만 음 이름처럼 보이는 글(시·파·C4·다른 율명 등) — 이런 칸이 많은 줄은 설명이 아니라 ‘악보 후보 줄’로 본다 */
const NOTEISH=/^(높은|낮은|높|낮)?(도|레|미|파|솔|라|시)['˙^]?$|^[A-Ga-g][#b♯♭]?\d?$|^(do|re|mi|fa|sol|so|la|si|ti)$|^[黃大太夾姑仲蕤林夷南無應㑣㑲潢汰淋湳浹㴌]{1,2}$/i;
const hideTok=(t,hide)=>'“'+(hide||PII.test(t)?'(가림)':t.slice(0,6))+'”';/* 개인정보처럼 보이는 답은 결과에 그 글을 옮기지 않음(Astra N11) */
function parseCode(text){const bars=[],problems=[];let skipped=0,over=0,src=String(text||'');const pii=PII.test(src);
 if(src.length>MAXCH){problems.push(`글이 너무 길어요(${src.length}자). 앞 ${MAXCH}자만 봐요`);src=src.slice(0,MAXCH);}
 for(const raw of src.split(/\r?\n/)){let s=raw.trim();if(!s||/^```/.test(s))continue;
  s=s.replace(/^\s*\d+\s*(장단|마디|줄)?\s*[:.)\]]\s*/,'').replace(/^[*•]\s+/,'');
  const toks=s.split(/[\s,·/]+/).filter(Boolean);if(toks.length===BAR+1&&toks[0]==='-')toks.shift();/* ‘- ’ 글머리표로 시작한 줄 */const cells=toks.map(t=>tokOf(t)??'?');
  if(!toks.length)continue;
  const good=cells.filter(c=>c!=='?').length,noteish=toks.filter((t,i)=>cells[i]==='?'&&NOTEISH.test(t)).length;
  const cand=good<toks.length/2;/* 읽을 수 있는 칸이 절반이 안 되는 줄 */
  if(cand&&good+noteish<Math.max(3,toks.length/2)){skipped++;continue;}/* 설명 글 줄은 건너뜀 */
  if(bars.length>=MAXBAR){over++;continue;}
  const n=bars.length+1,bad=toks.filter((t,i)=>cells[i]==='?'),list=bad.slice(0,4).map(x=>hideTok(x,pii)).join(' ');
  let cs=cells;
  if(cs.length>MAXCELL){problems.push(`${n}째 장단: 칸이 ${cells.length}개예요(9칸이어야 해요). 앞 ${MAXCELL}칸만 보여요`);cs=cells.slice(0,MAXCELL);}
  else if(cs.length!==BAR)problems.push(`${n}째 장단: 칸이 ${cells.length}개예요(9칸이어야 해요)`);
  bars.push({cells:cs,syl:cs.map(()=>''),cand});
  if(cand)problems.push(`${n}째 장단: 정간보 줄 같지만 칸 ${toks.length}개 중 ${bad.length}개를 읽을 수 없어요 ${list}`);
  else if(bad.length)problems.push(`${n}째 장단: 쓸 수 없는 칸 ${list}`);}
 if(bars.length&&bars[0].cells[0]==='-')problems.push('첫 칸이 “-”(이어서)로 시작해요. 이을 음이 없어요');
 if(over)problems.push(`장단이 ${bars.length+over}개예요. 앞 ${MAXBAR}개만 봐요`);
 if(!bars.length)problems.push('정간보 코드를 찾지 못했어요. “솔 - - 라 …”처럼 한 줄에 9칸인 글이 있어야 해요');
 return {bars,problems,skipped,pii};}

/* ── 소리 ── */
let soundReady=null;
function prep(){if(!soundReady){const ids=[...new Set(KEYS.map(k=>P.gayaSample(P.DEG[k])).concat(P.G12.map((_,k)=>P.hyeonSample(k))))].concat(Object.values(P.STROKES).map(s=>s.sample));soundReady=P.Sound.init(ids).catch(e=>{soundReady=null;throw e;});}return soundReady;}
/* 재생 요청 번호(Astra N26): 멈춤·탭 바꾸기·새 재생은 번호를 올린다. 소리 준비를 기다린 뒤 번호가 바뀌었으면 재생하지 않는다. */
function stop(){st.seq++;for(const t of st.timers)clearTimeout(t);st.timers=[];P.Sound.stopAll();document.querySelectorAll('.on').forEach(e=>e.classList.remove('on'));st.playing=null;if(C)C.busy=false;}
/* 재생 중(또는 준비 중)에 그 악보를 고치면 멈춘다(Astra N25). 멈췄으면 true */
function editStop(scope){if(st.playing!==scope)return false;stop();return true;}
async function play(bars,scope,{swap=null}={}){stop();const my=st.seq;st.playing=scope;bars=bars.map(b=>({cells:b.cells.slice(),syl:b.syl}));/* 예약한 소리와 화면이 따로 놀지 않게 사본으로 */
 await prep();if(my!==st.seq)return;await P.Sound.resume();if(my!==st.seq)return;
 const ctx=P.Sound.ctx,E=P.e8(st.tempo)/1000,t0=ctx.currentTime+.15,{o,total}=offsets(bars);if(C)C.busy=true;
 for(const e of events(bars)){let key=e.key;if(swap&&e.g===swap.g)key=swap.to;if(KEYS.includes(key))P.playString(P.DEG[key],{when:t0+e.g*E,dur:e.len*E+.15});}
 if(st.janggu)bars.forEach((b,bi)=>{for(const [pos,s] of P.SEMACHI)if(pos<b.cells.length)P.Sound.play(P.STROKES[s].sample,{when:t0+(o[bi]+pos)*E,gain:.5});});
 const root=document.getElementById(scope);
 for(let g=0;g<=total;g++)st.timers.push(setTimeout(()=>{root.querySelectorAll('.on').forEach(x=>x.classList.remove('on'));if(g===total){if(my===st.seq){st.playing=null;if(C)C.busy=false;}return;}
  const c=root.querySelector(`.jg-c[data-g="${g}"]`);c&&c.classList.add('on');root.querySelectorAll('.staff g[data-from]').forEach(n=>{if(+n.dataset.from<=g&&g<+n.dataset.to)n.classList.add('on');});},(t0-ctx.currentTime+g*E)*1000));}
async function tap(key){if(!KEYS.includes(key))return;try{await prep();await P.Sound.resume();P.playString(P.DEG[key],{dur:.6});}catch(e){}}

/* ── 정간보 그리기 ── */
function lastKey(cells,before){const all=before.flatMap(b=>b.cells);for(let i=all.length-1;i>=0;i--)if(all[i]!=='-')return all[i];return null;}
function perRow(el){const w=el.clientWidth||document.querySelector('main').clientWidth-40;return Math.max(1,Math.min(4,Math.floor((w+12)/(st.janggu?140:108))));}
function renderJG(el,bars,{onCell=null,cls=()=>''}={}){el.replaceChildren();el.classList.toggle('nojg',!st.janggu);const n=perRow(el),{o}=offsets(bars);
 for(let r=0;r*n<bars.length;r++){const row=document.createElement('div');row.className='jg-row';
  for(let bi=r*n;bi<Math.min(bars.length,(r+1)*n);bi++){const b=bars[bi],col=document.createElement('div');col.className='jg-bar';
   const h=document.createElement('div');h.className='jg-h';h.textContent=(bi+1)+'장단';col.append(h);
   const grid=document.createElement('div');grid.className='jg-grid';
   let last=bi>0?lastKey(bars[bi-1].cells,bars.slice(0,bi)):null;
   b.cells.forEach((c,ci)=>{const gi=o[bi]+ci,cell=document.createElement('button');cell.type='button';cell.className='jg-c '+cls(gi,c);cell.dataset.g=gi;
    const add=(k,t)=>{const s=document.createElement('span');s.className=k;s.textContent=t;cell.append(s);};
    if(KEYS.includes(c)){if(st.yul==='N')add('big',KO_CELL[c]);else{add('big',YUL[st.yul][c]);add('small',KO[c]+' · '+YUL_KO[YUL[st.yul][c]]);}}
    else if(c==='-'){if(last!=='0')add('tie','│');}else if(c==='0')add('rest','△');else if(c==='')cell.classList.add('blank');else add('bad','?');
    if(b.syl&&b.syl[ci])add('syl',b.syl[ci]);
    cell.setAttribute('aria-label',`${bi+1}장단 ${ci+1}째 칸 ${KEYS.includes(c)?KO[c]:c==='-'?'이음':c==='0'?'쉼':c===''?'빈칸':'모르는 칸'}`);
    if(c!=='-')last=c;cell.addEventListener('click',()=>onCell?onCell(gi,c):tap(c));grid.append(cell);
    if(st.janggu){const j=document.createElement('div');const s=ci<BAR?SEMA[ci]:null;j.className='jg-j'+(s?'':' empty');j.textContent=s?s:'·';grid.append(j);}});
   col.append(grid);row.append(col);}
  el.append(row);}}

/* ── 오선보 그리기(SVG) ── */
const NS='http://www.w3.org/2000/svg',LET={C:0,D:1,E:2,F:3,G:4,A:5,B:6};
const posOf=key=>{const n=NOTE_OF[key];return (+n[1]+(st.up?1:0))*7+LET[n[0]]-30;};/* 0 = 맨 아래 줄(E4) */
let clefOK=null;
function clefGlyph(){if(clefOK!==null)return clefOK;try{const c=document.createElement('canvas').getContext('2d');c.font='40px serif';clefOK=Math.abs(c.measureText('𝄞').width-c.measureText('\u{10FFFF}').width)>2;}catch(e){clefOK=false;}return clefOK;}
function pieces(p,len){const out=[];while(len>0){let d;if(p%3===0&&len>=6)d=6;else d=Math.min(len,3-p%3);out.push([p,d]);p+=d;len-=d;}return out;}
function renderStaff(svg,bars,{names=true}={}){svg.replaceChildren();const n=Math.max(1,Math.min(4,perRow(svg.parentElement)));
 const U=24,SP=10,BW=BAR*U+18,LEFT=64,ROWH=168,rows=Math.ceil(bars.length/n),W=LEFT+n*BW+12;
 svg.setAttribute('viewBox',`0 0 ${W} ${rows*ROWH+8}`);const el=(tag,a,parent=svg)=>{const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);parent.append(e);return e;};
 const {o}=offsets(bars),ev=events(bars);
 for(let r=0;r<rows;r++){const y0=r*ROWH+48,yb=y0+4*SP,nb=Math.min(n,bars.length-r*n),xEnd=LEFT+nb*BW;
  for(let i=0;i<5;i++)el('line',{x1:8,x2:xEnd,y1:y0+i*SP,y2:y0+i*SP,stroke:'#33424d','stroke-width':1});
  if(clefGlyph()){const t=el('text',{x:8,y:yb+13,'font-size':66,fill:'#1d2b36'});t.textContent='𝄞';}else{const t=el('text',{x:14,y:yb-6,'font-size':22,'font-weight':900,fill:'#1d2b36'});t.textContent='G';}
  if(r===0){for(const [v,yy] of [['9',y0+SP*2-1],['8',yb-1]]){const t=el('text',{x:44,y:yy,'font-size':20,'font-weight':900,fill:'#1d2b36','text-anchor':'middle'});t.textContent=v;}}
  for(let k=1;k<=nb;k++){const x=LEFT+k*BW;el('line',{x1:x,x2:x,y1:y0,y2:yb,stroke:'#33424d','stroke-width':k===nb&&r===rows-1?3:1.2});}
  for(let k=0;k<nb;k++){const t=el('text',{x:LEFT+k*BW+4,y:y0-30,'font-size':11,fill:'#5d6f69'});t.textContent=(r*n+k+1)+'장단';}}
 const yOf=(r,pos)=>r*ROWH+48+4*SP-pos*SP/2,rowEnd=r=>LEFT+Math.min(n,bars.length-r*n)*BW;
 for(const e of ev){/* 장단 경계에서 자르고, 박(8분음표 3개)을 넘지 않게 나눈다 */
  let g=e.g,left=e.len,prev=null;
  while(left>0){let bi=o.findIndex((x,i)=>g>=x&&(i===o.length-1||g<o[i+1]));const inBar=g-o[bi],room=bars[bi].cells.length-inBar,take=Math.min(left,room);
   for(const [p,d] of pieces(inBar,take)){const r=Math.floor(bi/n),x=LEFT+(bi%n)*BW+14+p*U,grp=el('g',{'data-from':o[bi]+p,'data-to':o[bi]+p+d});
    if(KEYS.includes(e.key)){const ps=posOf(e.key),y=yOf(r,ps),up=ps<4;
     for(let l=-2;l>=ps;l-=2)el('line',{x1:x-10,x2:x+10,y1:yOf(r,l),y2:yOf(r,l),stroke:'#33424d'},grp);
     for(let l=10;l<=ps;l+=2)el('line',{x1:x-10,x2:x+10,y1:yOf(r,l),y2:yOf(r,l),stroke:'#33424d'},grp);
     el('ellipse',{class:'head',cx:x,cy:y,rx:6.4,ry:4.6,transform:`rotate(-20 ${x} ${y})`,fill:d===6?'#fff':'#1d2b36',stroke:'#1d2b36','stroke-width':1.6},grp);
     const sx=up?x+5.6:x-5.6,sy=up?y-34:y+34;el('line',{class:'stem',x1:sx,x2:sx,y1:y,y2:sy,stroke:'#1d2b36','stroke-width':1.4},grp);
     if(d===1)el('path',{d:up?`M${sx} ${sy} c 1 7 9 9 8 18`:`M${sx} ${sy} c 1 -7 9 -9 8 -18`,fill:'none',stroke:'#1d2b36','stroke-width':2.2},grp);
     if(d===3||d===6)el('circle',{cx:x+11,cy:ps%2===0?y-3:y,r:2,fill:'#1d2b36'},grp);
     if(prev&&prev.r===r)el('path',{d:`M${prev.x+3} ${prev.y+(up?8:-8)} Q ${(prev.x+x)/2} ${prev.y+(up?18:-18)} ${x-3} ${y+(up?8:-8)}`,fill:'none',stroke:'#1d2b36','stroke-width':1.3},grp);
     else if(prev){/* 줄이 바뀌어도 이어지는 음(Astra N22): 앞 줄 끝까지 반쪽 붙임줄 + 다음 줄 처음에서 반쪽 붙임줄. 최종 표기는 강사 확인 전 */
      const xe=rowEnd(prev.r)-3,xs=LEFT-8,pu=prev.up?8:-8,pc=prev.up?18:-18,cu=up?8:-8,cc=up?18:-18;
      el('path',{class:'tie-x','data-part':'end',d:`M${prev.x+3} ${prev.y+pu} Q ${(prev.x+xe)/2} ${prev.y+pc} ${xe} ${prev.y+pu}`,fill:'none',stroke:'#1d2b36','stroke-width':1.3},grp);
      el('path',{class:'tie-x','data-part':'start',d:`M${xs} ${y+cu} Q ${(xs+x)/2} ${y+cc} ${x-3} ${y+cu}`,fill:'none',stroke:'#1d2b36','stroke-width':1.3},grp);}
     if(names&&!prev){const t=el('text',{x,y:r*ROWH+48+4*SP+40,'font-size':12,'font-weight':700,fill:'#0b7a75','text-anchor':'middle'},grp);t.textContent=KO_CELL[e.key];}
     prev={x,y,r,up};}
    else{const ym=yOf(r,4);/* 쉼표: 8분 · 4분 · 2분(점) */
     if(d===1)el('path',{d:`M${x-3} ${ym-6} a2.4 2.4 0 1 0 3 2 l 4 -3 l -5 14`,fill:'none',stroke:'#1d2b36','stroke-width':1.8},grp);
     else if(d===6)el('rect',{x:x-6,y:ym-5,width:12,height:5,fill:'#1d2b36'},grp);
     else el('path',{d:`M${x-2} ${ym-12} l 5 6 l -5 5 l 5 6 q -6 -2 -4 4`,fill:'none',stroke:'#1d2b36','stroke-width':2.2},grp);
     if(d===3||d===6)el('circle',{cx:x+9,cy:ym-3,r:2,fill:'#1d2b36'},grp);}}
   g+=take;left-=take;}}
 /* 가사 */
 bars.forEach((b,bi)=>{if(!b.syl)return;const r=Math.floor(bi/n);b.syl.forEach((s,ci)=>{if(!s)return;const t=el('text',{x:LEFT+(bi%n)*BW+14+ci*U,y:r*ROWH+48+4*SP+58,'font-size':13,'font-weight':800,fill:'#173f36','text-anchor':'middle'});t.textContent=s;});});}

/* ── ① 보고 치기 ── */
function renderSee(){const bars=songPart(st.song);renderJG($('see-jg'),bars);renderStaff($('see-staff'),bars);
 $('see-staff-note').textContent=st.up?'(같은 가락 · 리코더용으로 한 옥타브 위에 적음)':'(같은 가락 · 가야금 음높이)';}

/* ── ② 짓기 ── */
const blank=n=>Array.from({length:n},()=>({cells:Array(BAR).fill(''),syl:null}));
function loadMine(){const m=P.Store.get('gugak-jg-mine',null);if(m&&Array.isArray(m.bars)&&m.bars.length)return m.bars.map(c=>({cells:c.slice(0,BAR).map(x=>KEYS.includes(x)||x==='-'||x==='0'?x:''),syl:null}));return blank(1);}
function saveMine(){P.Store.set('gugak-jg-mine',{bars:st.mine.map(b=>b.cells)});}
function flat(){return st.mine.flatMap(b=>b.cells);}
function setCell(g,v){const bi=Math.floor(g/BAR),ci=g%BAR;st.mine[bi].cells[ci]=v;saveMine();}
/* 덮어쓰기 전 확인 · 직전 작품 하나 되돌리기(Astra N30) */
const hasMine=(bars=st.mine)=>!!bars&&bars.some(b=>b.cells.some(c=>c!==''));
const okUndo=u=>Array.isArray(u)&&u.length>=1&&u.length<=4&&u.every(c=>Array.isArray(c));
function keepUndo(){if(!hasMine())return;st.undo=st.mine.map(b=>b.cells.slice());P.Store.set('gugak-jg-undo',st.undo);}
function undoMine(){if(!okUndo(st.undo))return;const cur=st.mine.map(b=>b.cells.slice());editStop('tab-make');
 st.mine=st.undo.map(c=>({cells:Array.from({length:BAR},(_,i)=>KEYS.includes(c[i])||c[i]==='-'||c[i]==='0'?c[i]:''),syl:null}));st.undo=cur;P.Store.set('gugak-jg-undo',st.undo);
 st.sel=0;st.quiz=null;saveMine();renderMake();$('make-say').textContent='바꾸기 전 가락으로 되돌렸어요(한 번 더 누르면 방금 가락으로 돌아가요)';}
/* 우리 가락을 통째로 바꿀 때: 재생 멈춤 · 되돌리기 남기기 · 문제 끝 */
function replaceMine(bars,msg){const stopped=editStop('tab-make');keepUndo();st.mine=bars;st.sel=0;st.quiz=null;saveMine();renderMake();
 const t=(msg||'')+(stopped?' · 바뀌어서 소리를 멈췄어요':'');if(t)$('make-say').textContent=t.replace(/^ · /,'');}
function makeProblems(){const f=flat(),out=[];if(f[0]==='-')out.push('첫 칸은 “이어서”로 시작할 수 없어요');const empty=f.filter(x=>x==='').length;if(empty)out.push(`빈칸 ${empty}개(빈칸은 쉼으로 쳐요)`);return out;}
function renderMake(){$('make-bars').value=String(st.mine.length);
 const q=st.quiz;renderJG($('make-jg'),st.mine,{onCell:(g,c)=>{if(q){quizGuess(g);return;}st.sel=g;tap(c);renderMake();},cls:g=>(!q&&g===st.sel?'sel ':'')+(q&&q.shown&&g===q.g?'right ':'')+(q&&q.wrong.has(g)?'wrong':'')});
 renderStaff($('make-staff'),st.mine);$('make-code').value=toCode(st.mine);
 const pr=makeProblems();if(!q)$('make-say').textContent=pr.length?pr.join(' · '):`${Math.floor(st.sel/BAR)+1}장단 ${st.sel%BAR+1}째 칸을 골랐어요`;
 $('make-say').className='say'+(pr.length?' no':'');
 document.querySelectorAll('#palette button').forEach(b=>b.disabled=!!q);$('make-undo').disabled=!!q||!okUndo(st.undo);
 $('quiz-new').disabled=!!q||events(st.mine).filter(e=>KEYS.includes(e.key)).length<3;$('quiz-box').hidden=!q;}
function renderPalette(){const box=$('palette');box.replaceChildren();
 for(const k of KEYS){const b=document.createElement('button');b.dataset.v=k;b.innerHTML=`${KO_CELL[k]}<small>${KO[k]}</small>`;box.append(b);}
 for(const [v,t,s] of [['-','│','이어서'],['0','△','쉼'],['','✕','지우기']]){const b=document.createElement('button');b.dataset.v=v;b.innerHTML=`${t}<small>${s}</small>`;box.append(b);}}
function pick(v){if(st.quiz)return;const stopped=editStop('tab-make');setCell(st.sel,v);tap(v);st.sel=Math.min(st.sel+1,st.mine.length*BAR-1);renderMake();
 if(stopped)$('make-say').textContent='고쳐서 소리를 멈췄어요. 다시 ‘들어 보기’를 눌러요';}
/* 틀린 음 문제(H2 4차시): 화면 악보는 그대로, 소리만 한 칸 바꿈 */
function quizNew(){const notes=events(st.mine).filter(e=>KEYS.includes(e.key));if(notes.length<3)return;const e=notes[Math.floor(Math.random()*notes.length)];const i=KEYS.indexOf(e.key);
 const cand=[i-1,i+1].filter(j=>j>=0&&j<KEYS.length);const to=KEYS[cand[Math.floor(Math.random()*cand.length)]];
 st.quiz={g:e.g,from:e.key,to,tries:0,wrong:new Set(),shown:false};$('quiz-say').textContent='‘문제 소리 듣기’를 눌러 들어 봐요';renderMake();}
function quizGuess(g){const q=st.quiz;if(!q||q.shown)return;q.tries++;const ev=events(st.mine).find(e=>e.g<=g&&g<e.g+e.len);
 if(ev&&ev.g===q.g){q.shown=true;$('quiz-say').textContent=`맞았어요! ${Math.floor(q.g/BAR)+1}장단 ${q.g%BAR+1}째 칸: ${KO[q.from]} → ${KO[q.to]} (${q.tries}번 만에)`;}
 else{q.wrong.add(g);$('quiz-say').textContent='그 칸은 그대로예요. 다시 들어 봐요';}renderMake();}

/* ── ③ AI 악보 검사 ── */
/* 부탁 범위는 ‘…구절 전체 4장단’으로 적는다(자료 검증 16번: ‘둘째 구절의 첫 구절’ 겹침 없앰) */
const ASK={doraji:{song:'도라지타령 첫 구절',ref:'doraji-1'},arirang2:{song:'아리랑 둘째 구절(아리랑 고개로 넘어간다)',ref:'arirang-2'},teacher:{song:null,ref:null},ours:{song:null,ref:null}};
const EXAMPLE=()=>toCode(songPart('arirang-1'));
function card(kind=$('ask').value){const fmt=['형식:','- 한 줄 = 한 장단(세마치 장단) = 9칸이에요. 칸은 띄어쓰기로 나눠요.','- 칸에 쓸 수 있는 것: 솔 라 도 레 미 높은솔 높은라 (가야금 4~10현), - (앞 음을 이어서), 0 (쉼)','- 예시(아리랑 첫 구절 4장단):',EXAMPLE()];
 if(kind==='ours')return ['[국악 놀이터 · 정간보 검사 부탁 카드]','아래 정간보 코드가 형식에 맞는지만 확인해 주세요. 줄마다 칸이 9개인지, 쓸 수 없는 글자가 있는지 알려 주세요. 가락은 바꾸지 마세요.',...fmt,'확인할 코드:',st.mine?toCode(st.mine):'(② 우리 가락 짓기에서 먼저 지어요)'].join('\n');
 const song=kind==='teacher'?($('ask-song').value.trim()||'(강사가 정한 곡)')+' 첫 구절':ASK[kind].song;
 return ['[국악 놀이터 · 정간보 부탁 카드]',`부탁: ${song} 전체 4장단을 아래 형식의 정간보 코드로 적어 주세요.`,...fmt,'- 코드 4줄만 쓰고, 다른 설명은 쓰지 마세요.'].join('\n');}
function askPii(){const bad=$('ask').value==='teacher'&&PII.test($('ask-song').value);$('ask-pii').hidden=!bad;$('ask-pii').textContent=bad?'개인정보처럼 보이는 말이 있어요(이름·학교·반·번호 등). 지우고 써요.':'';return bad;}
function renderCard(){$('ask-song').hidden=$('ask').value!=='teacher';askPii();$('card').value=card();}
function renderExamples(){const box=$('examples');box.replaceChildren();for(const e of EX){const b=document.createElement('button');b.dataset.ex=e.id;b.textContent=e.label;b.style.fontSize='14px';box.append(b);}
 $('ex-source').textContent=EX.length?'미리 받아 둔 AI 답과 연습용으로 고친 글이에요. 하나를 눌러요.':'미리 받아 둔 답이 아직 없어요.';}
const exWord=e=>e.edited?'셈제작소가 연습용으로 고친 글(AI 답 아님)':`미리 받아 둔 AI 답(${e.got} 받음)`;
/* 내용 출처 상태(Astra N23): 셈제작소 예시 · 미리 받아 둔 AI 답(받은 날짜) · 고친 답 · 붙여 넣은 답 */
function srcWord(s){if(!s)return '';if(s.k==='ex')return `미리 받아 둔 AI 답(${s.got} 받음)`;if(s.k==='sem')return s.what||'셈제작소 예시(AI 답 아님)';if(s.k==='fixed')return s.from==='sem'?'고친 답(셈제작소 예시를 고침 · AI 답 아님)':s.from==='ex'?'고친 답(미리 받아 둔 AI 답을 고침)':'고친 답';return '붙여 넣은 답';}
/* 예시를 조금 고치면 ‘고친 답’, 예시를 통째로 바꿔 붙여 넣으면 ‘붙여 넣은 답’(자리마다 같은 글이 절반 넘게 남았는지로 가름) */
const keptHalf=(base,val)=>{const a=String(base||'').split(/\s+/).filter(Boolean),b=String(val||'').split(/\s+/).filter(Boolean);if(!a.length)return false;let k=0;for(let i=0;i<a.length;i++)if(a[i]===b[i])k++;return k>=a.length/2;};
function srcAfterInput(s,val){if(!String(val||'').trim())return null;if(s&&s.base!=null&&(s.k==='ex'||s.k==='sem'||s.k==='fixed'))return keptHalf(s.base,val)?{k:'fixed',from:s.k==='fixed'?s.from:s.k,base:s.base}:{k:'paste'};return {k:'paste'};}
function showSrc(id,s){const e=$(id);if(!e)return;e.textContent=s?'내용: '+srcWord(s):'';e.dataset.k=s?s.k:'';}
const PII_WARN='답에 개인정보처럼 보이는 말(이름·학교·반·번호 등)이 있어요. 결과에는 그 글을 옮기지 않고 가렸어요. 감독 선생님께 보여 드리고 답에서 지워요.';
/* 곡·부탁·율명 안·답이 바뀌면 이전 검사·비교·다시 묻기 카드를 지운다(Astra N24) */
function clearCheck(msg){editStop('tab-check');const had=!!st.checked;st.checked=null;st.marks=new Set();st.diff=null;st.extra=null;st.cmp=null;
 $('check-score').hidden=true;$('check-again').hidden=true;$('again-card').value='';$('again-state').textContent='';$('compare-say').textContent='';$('mark-count').textContent='';showSrc('check-src',null);
 const box=$('check-result');box.replaceChildren();if(msg&&had)box.textContent=msg;}
function checkNow(){const res=parseCode($('answer').value);clearCheck();st.checked=res;res.src=st.src;
 const box=$('check-result');box.replaceChildren();const p=document.createElement('p');p.className='say '+(res.problems.length?'no':'ok');
 p.textContent=res.problems.length?`형식 검사: 고칠 곳 ${res.problems.length}가지`:`형식 검사 통과 — ${res.bars.length}장단, 줄마다 9칸이에요. 가락이 맞는지는 쳐 보고 귀로 확인해요.`;box.append(p);
 if(res.pii){const w=document.createElement('p');w.className='warn';w.id='answer-pii';w.textContent=PII_WARN;box.append(w);}
 if(res.problems.length){const ul=document.createElement('ul');ul.className='problems';for(const t of res.problems){const li=document.createElement('li');li.textContent=t;ul.append(li);}box.append(ul);}
 if(res.skipped){const n=document.createElement('p');n.className='note';n.textContent=`정간보가 아닌 줄 ${res.skipped}개는 건너뛰었어요(설명 글 등).`;box.append(n);}
 /* 부탁한 4장단을 채웠는지 형식 검사와 따로 알린다(자료 검증 3번) */
 const want=$('ask').value==='ours'?(st.mine?st.mine.length:0):4;res.want=want;
 if(res.bars.length&&want&&res.bars.length!==want){const n=document.createElement('p');n.className='warn';n.id='bars-want';n.textContent=`부탁은 ${want}장단이었는데 받은 악보는 ${res.bars.length}장단이에요.`;box.append(n);}
 showSrc('check-src',res.src);
 const ref=ASK[$('ask').value]?.ref;$('check-compare').hidden=!ref;$('check-score').hidden=!res.bars.length;$('check-again').hidden=!res.bars.length;$('again-card').value='';renderCheck();}
function renderCheck(){const r=st.checked;if(!r||!r.bars.length)return;
 renderJG($('check-jg'),r.bars,{onCell:(g,c)=>{if(st.marks.has(g))st.marks.delete(g);else st.marks.add(g);$('again-card').value='';$('again-state').textContent='';tap(c);renderCheck();},cls:g=>(st.marks.has(g)?'mark ':'')+(st.diff&&st.diff.has(g)?(st.extra&&st.extra.has(g)?'diff extra':'diff'):'')});
 renderStaff($('check-staff'),r.bars,{names:true});$('mark-count').textContent=st.marks.size?`표시한 칸 ${st.marks.size}개`:'';$('check-again').hidden=false;}
function markNames(){const r=st.checked;if(!r)return [];const {o}=offsets(r.bars);return [...st.marks].sort((a,b)=>a-b).map(g=>{let bi=o.length-1;while(bi>0&&g<o[bi])bi--;return `${bi+1}장단 ${g-o[bi]+1}째 칸`;});}
function againCard(kind){const m=markNames();if(!m.length)return '(먼저 위 정간보에서 이상한 칸을 눌러 표시해요)';
 const r=st.checked,mine=!r.src||r.src.k==='paste';/* 이 대화에서 AI가 준 답이 아니면(예시·고친 답) 코드를 카드에 함께 적는다 */
 const tail=mine?'':'\n쳐 본 정간보 코드:\n'+toCode(r.bars);
 if(kind==='why')return `${mine?'':'아래 정간보 코드에서 '}${m[0]}을 왜 그 음으로 적었는지 알려 주세요. 다른 가능성이 있으면 함께 알려 주세요.`+tail;
 return `${mine?'방금 준':'아래'} 정간보 코드를 쳐 봤더니 ${m.join(', ')}이 아는 가락과 달라요. 그 칸만 고쳐서 같은 형식으로 다시 적어 주세요. 나머지 칸은 그대로 두세요.`+tail;}
/* 비교(Astra N20): 장단마다 칸을 맞춰 ‘내용이 다른 칸’·‘빠진 칸’(셈제작소에는 있고 받은 악보에는 없음)·‘더한 칸’(받은 악보에만 있음)을 따로 센다 */
function compare(){const ref=ASK[$('ask').value]?.ref,r=st.checked;if(!ref||!r)return;const A=songPart(ref),B=r.bars,{o}=offsets(B);st.diff=new Set();st.extra=new Set();
 let diff=0,miss=0,add=0;const missAt=[];
 for(let bi=0;bi<Math.max(A.length,B.length);bi++){const a=A[bi]?A[bi].cells:[],b=B[bi]?B[bi].cells:[];let mb=0;
  for(let ci=0;ci<Math.max(a.length,b.length);ci++){if(ci>=b.length){miss++;mb++;}else if(ci>=a.length){add++;st.diff.add(o[bi]+ci);st.extra.add(o[bi]+ci);}else if(a[ci]!==b[ci]){diff++;st.diff.add(o[bi]+ci);}}
  if(mb)missAt.push(`${bi+1}장단 ${mb}칸`);}
 st.cmp={diff,miss,add};
 const aN=A.reduce((s,x)=>s+x.cells.length,0),bN=B.reduce((s,x)=>s+x.cells.length,0);
 $('compare-say').textContent=`셈제작소 악보와 비교 — 내용이 다른 칸 ${diff}개(보라 점선) · 빠진 칸 ${miss}개 · 더한 칸 ${add}개(주황 점선).`+(miss?` 빠진 칸은 받은 악보에 없어서 표시할 수 없어요(${missAt.slice(0,4).join(', ')}).`:'')+(aN!==bN?` 칸 수도 달라요(셈제작소 ${aN}칸 · 받은 악보 ${bN}칸).`:'')+' 다르다고 꼭 틀린 것은 아니에요 — 같은 민요도 적는 사람마다 다를 수 있어요. 쳐 보고 귀로 정해요.';renderCheck();}


/* ── ④ 줄 번호로 치기(G4) — 카드 G4(메뉴 v0.2)와 같은 12현 조율표 ── */
const NOTE12=['G2','C3','D3','G3','A3','C4','D4','E4','G4','A4','C5','D5'],SOLFA12=['솔','도','레','솔','라','도','레','미','솔','라','도','레'];
const HY={sol:4,la:5,do:6,re:7,mi:8,Sol:9,La:10};
const g4Text=list=>list.map(n=>(n.h==null?'?':n.h)+(n.long?'(길게)':'')).join(' ');
function g4Example(){return g4Text(events(songPart('arirang-1')).filter(e=>KEYS.includes(e.key)).map(e=>({h:HY[e.key],long:e.len>=3})));}
function g4Card(){const song=$('g4-song').value.trim()||'(곡 이름)';return ['카드 G4 · 줄 번호로 바꿔 주세요','우리 가야금은 12줄이고, 줄마다 음이 이렇게 정해져 있어요.',NOTE12.map((n,i)=>`${i+1}현 ${n}`).join(', '),`${song} 첫 소절을 이 줄 번호만 써서 순서대로 적어 주세요.`,'한 음에 줄 번호 하나씩, 길게 끄는 음은 (길게)라고 적어 주세요.','예) 아리랑 첫 소절: '+g4Example()].join('\n');}
/* 줄 번호 읽기(Astra N21): 구분자(띄어쓰기·쉼표·화살표 등)로 나눈 토큰 하나하나가 통째로 ‘1~12(현)(길게)’ 형식이어야 한다.
 * 123 · 1.5 · -1 · 04 처럼 숫자가 섞인 다른 토큰은 줄 번호로 읽지 않고 문제로 보인다. */
const G4TOK=/^(1[0-2]|[1-9])현?(\((길게|짧게)\)|길게|짧게)?$/;
function g4Parse(text){const notes=[],problems=[];let skipped=0,src=String(text||'');const pii=PII.test(src);
 if(src.length>MAXCH){problems.push(`글이 너무 길어요(${src.length}자). 앞 ${MAXCH}자만 봐요`);src=src.slice(0,MAXCH);}
 for(let line of src.split(/\r?\n/)){
  line=line.replace(/\(\s*[A-G][#b♯♭]?\d\s*\)/g,' ').replace(/[A-G][#b♯♭]?\d/g,' ').replace(/^\s*\d+\s*(소절|마디|줄|장단)\s*[:.)]?\s*/,'').replace(/^\s*\d+[.)]\s+/,'').replace(/^\s*[-*•]\s+/,'');
  line=line.replace(/\(\s*(길게|짧게)\s*\)/g,'($1)').replace(/(\d)\s*현\s*(?=\(|길게|짧게)/g,'$1현').replace(/(\d)\s+(?=\((길게|짧게)\))/g,'$1').replace(/(\d)-(?=\d)/g,'$1 ');
  /* 숫자 악보로 인정하는 줄(자료 검증 2번): 숫자·구분자·(길게)·(짧게)·현만 있는 줄. ‘제목:’ 머리말은 떼고 건너뛴 글로 센다.
   * 그 밖의 글이 섞인 줄(예: “총 3개의 음입니다.”)은 줄 전체를 건너뛴 줄로 알린다 — 설명문 숫자를 음으로 읽지 않는다. */
  const lab=/^([^\d:：()]{1,40})[:：)]\s*(?=\S)/.exec(line);if(lab&&/[가-힣A-Za-z]/.test(lab[1])){skipped++;line=line.slice(lab[0].length);}
  const parts=line.split(/[\s,，、·/→>~]+/).map(t=>t.replace(/^["'“”‘’\[]+/,'').replace(/["'“”‘’\].,;:!?。]+$/,'')).filter(Boolean);
  if(!parts.length)continue;
  if(!parts.every(t=>/^[-+]?[\d.]+현?(\((길게|짧게)\)|길게|짧게)?$/.test(t)||/^(\((길게|짧게)\)|길게|짧게|현|[-–—─]+)$/.test(t))){skipped++;continue;}
  let inText=false;
  for(let t of parts){t=t.replace(/^["'“”‘’\[]+/,'').replace(/["'“”‘’\].,;:!?。]+$/,'');if(!t)continue;
   if(t==='현'||/^[-–—─]+$/.test(t))continue;
   if(/^(\(길게\)|길게)$/.test(t)){if(notes.length)notes[notes.length-1].long=true;inText=false;continue;}
   if(/^(\(짧게\)|짧게)$/.test(t)){if(notes.length)notes[notes.length-1].long=false;inText=false;continue;}
   const m=G4TOK.exec(t);
   if(m){notes.push({h:+m[1],long:/길게/.test(m[2]||'')});inText=false;continue;}
   if(/\d/.test(t)){const k=notes.length+1,nm=/^([1-9]\d?|0)현?$/.exec(t);/* 0·13~99는 ‘없는 줄’, 그 밖(04·123·1.5·-1 등)은 읽을 수 없는 글 */
    problems.push(nm?`${k}째 음: ${pii?'(가림)':+nm[1]+'현'}은 없어요(1~12현)`:`${k}째 음: ${hideTok(t,pii)}은 줄 번호로 읽을 수 없어요(1~12를 하나씩 띄어 써요)`);
    notes.push({h:null,long:false});inText=false;continue;}
   if(!inText){skipped++;inText=true;}}}
 if(!notes.length)problems.push('줄 번호를 찾지 못했어요. “4 5 6(길게)”처럼 숫자가 있어야 해요');
 if(notes.length>48){problems.push(`음이 ${notes.length}개예요. 앞 48개만 봐요`);notes.length=48;}
 return {notes,problems,skipped,pii};}
function g4Pii(){const bad=PII.test($('g4-song').value);$('g4-pii').hidden=!bad;$('g4-pii').textContent=bad?'개인정보처럼 보이는 말이 있어요(이름·학교·반·번호 등). 지우고 써요.':'';return bad;}
/* G4 출처에 따라 이름을 바꾼다: 셈제작소 예시는 ‘AI가 준’이라 하지 않는다(Astra N23) */
function g4Labels(){const s=st.g4.src,k=s?s.k:'paste';
 $('g4-orig-label').textContent=k==='sem'?'셈제작소 예시 줄 번호':k==='fixed'?'받은 줄 번호(고친 답)':'AI가 준 줄 번호';
 $('g4-play').textContent=k==='sem'?'예시 줄 번호 듣기':k==='fixed'?'받은 줄 번호 듣기':'AI 줄 번호 듣기';}
function clearG4(msg){editStop('tab-g4');const G=st.g4,had=G.orig.length>0;G.orig=[];G.fixed=[];G.del=[];G.sel=0;G.src=null;$('g4-score').hidden=true;$('g4-again').value='';$('g4-again-state').textContent='';showSrc('g4-src',null);
 if(had)$('g4-result').textContent=msg||'';}
function g4Check(){const r=g4Parse($('g4-answer').value),G=st.g4;editStop('tab-g4');
 /* 원본 음 번호(id)를 붙여 둔다 — 지우거나 고쳐도 다시 묻기 카드는 처음 받은 순서 기준(Astra N32) */
 G.orig=r.notes.map((n,i)=>({...n,id:i}));G.fixed=r.notes.map((n,i)=>({...n,id:i,changed:false}));G.del=[];G.sel=0;G.src=G.ansSrc;
 const box=$('g4-result');box.replaceChildren();const p=document.createElement('p');p.className='say '+(r.problems.length?'no':'ok');p.textContent=r.problems.length?`고칠 곳 ${r.problems.length}가지`:`줄 번호 ${r.notes.length}개를 찾았어요. 쳐 보고 아는 가락인지 귀로 확인해요.`;box.append(p);
 if(r.pii){const w=document.createElement('p');w.className='warn';w.id='g4-answer-pii';w.textContent=PII_WARN;box.append(w);}
 if(r.problems.length){const ul=document.createElement('ul');ul.className='problems';for(const t of r.problems.slice(0,6)){const li=document.createElement('li');li.textContent=t;ul.append(li);}box.append(ul);}
 if(r.skipped){const n=document.createElement('p');n.className='note';n.textContent=`줄 번호가 아닌 글 ${r.skipped}곳은 건너뛰었어요.`;box.append(n);}
 showSrc('g4-src',G.src);$('g4-score').hidden=!r.notes.length;renderG4();}
function g4Again(){const G=st.g4;if(!G.orig.length)return '';
 const chg=G.fixed.filter(n=>n.changed).map(n=>n.id+1).sort((a,b)=>a-b),del=G.del.map(i=>i+1).sort((a,b)=>a-b);
 const list=chg.length||del.length?chg:(G.fixed[G.sel]?[G.fixed[G.sel].id+1]:[]);if(!list.length&&!del.length)return '';
 const mine=!G.src||G.src.k==='paste',w=a=>a.map(i=>i+'번째').join(', ');
 let s=`${mine?'방금 준':'아래'} 줄 번호를 쳐 봤더니 처음 순서로`+(list.length?` ${w(list)} 음이 아는 가락과 달라요.`:'')+(del.length?`${list.length?' 그리고':''} ${w(del)} 음은 없어야 할 것 같아요.`:'');
 s+=' 그 음만 고쳐서 처음부터 다시 적어 주세요. 나머지는 그대로 두세요.';
 if(!mine)s+='\n쳐 본 줄 번호: '+g4Text(G.orig);return s;}
function renderG4(){$('g4-card').value=g4Card();g4Pii();g4Labels();const G=st.g4,box=$('g4-notes');box.replaceChildren();
 G.fixed.forEach((n,i)=>{const b=document.createElement('button');b.dataset.i=i;b.dataset.id=n.id;b.innerHTML=`${n.h==null?'?':n.h+'현'}<small>${n.h?SOLFA12[n.h-1]:'없는 줄'}${n.long?' · 길게':''}</small>`;b.setAttribute('aria-label',`처음 받은 ${n.id+1}번째 음 · ${n.h==null?'없는 줄':n.h+'현'}${n.long?' · 길게':''}${n.changed?' · 고침':''}`);if(i===G.sel)b.classList.add('on');if(n.changed)b.style.boxShadow='inset 0 0 0 3px var(--coral)';box.append(b);});
 $('g4-orig').value=g4Text(G.orig);$('g4-fixed').value=g4Text(G.fixed);$('g4-again').value=g4Again();
 const ch=G.fixed.filter(n=>n.changed).length,cur=G.fixed[G.sel];$('g4-say').textContent=G.fixed.length?`${G.sel+1}번째 음을 골랐어요`+(cur&&cur.id!==G.sel?`(처음 받은 ${cur.id+1}번째)`:'')+(ch?` · 고친 음 ${ch}개`:'')+(G.del.length?` · 지운 음 ${G.del.length}개`:''):(G.del.length?`음을 모두 지웠어요 · ‘처음 받은 대로’로 되살릴 수 있어요`:'');}
function g4Hit(h,when=0,dur=.6){if(h)P.Sound.play(P.hyeonSample(h-1),{when,dur,detune:(P.Tune.cents[h-1]||0)});}
async function g4Play(list){stop();const my=st.seq;st.playing='tab-g4';list=list.map(n=>({...n}));
 await prep();if(my!==st.seq)return;await P.Sound.resume();if(my!==st.seq)return;if(C)C.busy=true;
 const ctx=P.Sound.ctx,beat=P.e8(st.tempo)*2/1000,t0=ctx.currentTime+.15;let t=0;
 list.forEach((n,i)=>{const d=n.long?beat*2:beat;g4Hit(n.h,t0+t,d+.1);const at=t;st.timers.push(setTimeout(()=>{document.querySelectorAll('#g4-notes .on').forEach(x=>x.classList.remove('on'));const b=document.querySelector(`#g4-notes button[data-i="${i}"]`);b&&b.classList.add('on');},(t0-ctx.currentTime+at)*1000));t+=d;});
 st.timers.push(setTimeout(()=>{if(my===st.seq){st.playing=null;if(C)C.busy=false;}renderG4();},(t0-ctx.currentTime+t)*1000+100));}
function g4Edit(kind){const G=st.g4,n=G.fixed[G.sel];if(!n&&kind!=='reset')return;const stopped=editStop('tab-g4');
 if(kind==='up'||kind==='down'){n.h=Math.max(1,Math.min(12,(n.h||6)+(kind==='up'?1:-1)));n.changed=true;}else if(kind==='long'){n.long=!n.long;n.changed=true;}
 else if(kind==='del'){const [d]=G.fixed.splice(G.sel,1);if(d)G.del.push(d.id);G.sel=Math.max(0,Math.min(G.sel,G.fixed.length-1));}/* 다음 음을 ‘고침’으로 바꾸지 않는다(Astra N32) */
 else if(kind==='reset'){G.fixed=G.orig.map(x=>({...x,changed:false}));G.del=[];G.sel=0;}
 if(G.fixed[G.sel]&&kind!=='reset'&&kind!=='del')(async()=>{try{await prep();await P.Sound.resume();g4Hit(G.fixed[G.sel].h);}catch(e){}})();renderG4();
 if(stopped)$('g4-say').textContent='고쳐서 소리를 멈췄어요 · '+$('g4-say').textContent;}

/* ── 공통 ── */
function setTab(t){st.tab=t;stop();for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===t));for(const k of ['see','make','check','g4'])$('tab-'+k).hidden=k!==t;renderAll();}
function renderAll(){$('yul-note').textContent=st.yul==='N'?'계이름만 보여요.':`율명 ${st.yul==='A'?'안 A(도=黃)':'안 B(솔=黃)'} — 율명 조는 국악 강사 확인 전이에요.`;
 if(st.tab==='see')renderSee();else if(st.tab==='make')renderMake();else if(st.tab==='g4')renderG4();else{renderCard();renderCheck();}}
async function copy(text,stateEl){try{await navigator.clipboard.writeText(text);stateEl.textContent='복사했어요';}catch(e){stateEl.textContent='복사가 막혔어요. 글을 길게 눌러 직접 복사해요';}}
const toMine=bars=>bars.slice(0,4).map(b=>({cells:Array.from({length:BAR},(_,i)=>{const c=b.cells[i];return c===undefined||c==='?'?'':c;}),syl:null}));
const KEEP_NOTE=' 지금 가락은 ‘되돌리기’로 한 번 되살릴 수 있어요.';

function init(){const sel=$('song');for(const [k,t] of SONG_LIST){const o=document.createElement('option');o.value=k;o.textContent=t;sel.append(o);}sel.value=st.song;
 $('tempo').value=String([35,40,45,50,55].reduce((a,b)=>Math.abs(b-st.tempo)<Math.abs(a-st.tempo)?b:a));st.tempo=+$('tempo').value;
 $('yul').value=st.yul;$('octave').value=st.up?'1':'0';$('janggu').checked=st.janggu;
 st.mine=loadMine();{const u=P.Store.get('gugak-jg-undo',null);st.undo=okUndo(u)?u:null;}renderPalette();renderExamples();
 $('tempo').addEventListener('change',()=>{st.tempo=+$('tempo').value;stop();});
 /* 율명 안이 바뀌면 율명 글자 읽기가 달라지므로 이전 검사를 지운다(Astra N24) */
 $('yul').addEventListener('change',()=>{st.yul=$('yul').value;clearCheck('칸 글자(율명 안)가 바뀌었어요 · 다시 ‘검사하기’를 눌러요');renderAll();});
 $('octave').addEventListener('change',()=>{st.up=$('octave').value==='1';renderAll();});
 $('janggu').addEventListener('change',()=>{st.janggu=$('janggu').checked;stop();renderAll();});
 sel.addEventListener('change',()=>{st.song=sel.value;stop();renderSee();});
 $('make-bars').addEventListener('change',()=>{const n=+$('make-bars').value,lost=st.mine.slice(n);
  if(hasMine(lost)&&!confirm(`장단 수를 ${n}개로 줄이면 ${n+1}장단부터 지은 가락이 사라져요. 줄일까요?`+KEEP_NOTE)){$('make-bars').value=String(st.mine.length);return;}
  if(lost.length)keepUndo();const stopped=editStop('tab-make');while(st.mine.length<n)st.mine.push(blank(1)[0]);st.mine.length=n;st.sel=Math.min(st.sel,n*BAR-1);st.quiz=null;saveMine();renderMake();
  if(stopped)$('make-say').textContent='바뀌어서 소리를 멈췄어요. 다시 ‘들어 보기’를 눌러요';});
 $('ask').addEventListener('change',()=>{renderCard();clearCheck('부탁이 바뀌었어요 · 다시 ‘검사하기’를 눌러요');});
 $('ask-song').addEventListener('input',()=>{renderCard();clearCheck('곡 이름이 바뀌었어요 · 다시 ‘검사하기’를 눌러요');});
 $('g4-song').addEventListener('input',()=>{clearG4('곡 이름이 바뀌었어요 · 다시 ‘검사하기’를 눌러요');renderG4();});
 $('g4-answer').addEventListener('input',()=>{st.g4.ansSrc=srcAfterInput(st.g4.ansSrc,$('g4-answer').value);showSrc('g4-answer-src',st.g4.ansSrc);clearG4('답이 바뀌었어요 · 다시 ‘검사하기’를 눌러요');});
 $('answer').addEventListener('input',()=>{const was=st.src;st.src=srcAfterInput(st.src,$('answer').value);showSrc('answer-src',st.src);
  if(was&&(was.k==='ex'||was.k==='sem')&&st.src)$('ex-source').textContent=st.src.k==='fixed'?'미리 받아 둔 글을 고쳤어요 · 이제 ‘고친 답’이에요':'다른 답으로 바꿨어요 · 이제 ‘붙여 넣은 답’이에요';clearCheck('답이 바뀌었어요 · 다시 ‘검사하기’를 눌러요');});
 document.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.tab)setTab(b.dataset.tab);
  else if(b.closest('#palette')&&'v' in b.dataset)pick(b.dataset.v);
  else if(b.closest('#g4-notes')&&'i' in b.dataset){st.g4.sel=+b.dataset.i;const n=st.g4.fixed[st.g4.sel];(async()=>{try{await prep();await P.Sound.resume();g4Hit(n&&n.h);}catch(e){}})();renderG4();}
  else if(b.dataset.ex){const e=EX.find(x=>x.id===b.dataset.ex);if(e){if(e.ask)$('ask').value=e.ask;renderCard();$('answer').value=e.text;st.src=e.edited?{k:'sem',what:'셈제작소 예시(연습용으로 고친 글 · AI 답 아님)',base:e.text}:{k:'ex',got:e.got,base:e.text};showSrc('answer-src',st.src);$('ex-source').textContent=exWord(e);checkNow();}}
  else switch(b.id){
   case 'see-play':play(songPart(st.song),'tab-see').catch(e=>alert('소리를 준비하지 못했어요: '+e.message));break;
   case 'see-stop':case 'make-stop':case 'check-stop':stop();break;
   case 'make-play':play(st.mine,'tab-make').catch(()=>{});break;
   case 'make-load':if(hasMine()&&!confirm('지금 지은 가락 대신 예시(아리랑 첫 장단)를 불러올까요?'+KEEP_NOTE))break;
    replaceMine([songPart('arirang-1')[0]].map(b=>({cells:b.cells.slice(),syl:null})),'예시를 불러왔어요');break;
   case 'make-clear':if(confirm('우리 정간보를 모두 지울까요?'+(hasMine()?KEEP_NOTE:''))){replaceMine(blank(st.mine.length),'모두 지웠어요');}break;
   case 'make-undo':undoMine();break;
   case 'make-copy':copy($('make-code').value,$('make-state'));break;
   case 'make-import':{const t=prompt('정간보 코드를 붙여 넣어요(한 줄 = 9칸)');if(t==null)break;const r=parseCode(t);if(!r.bars.length){$('make-state').textContent=r.problems[0];break;}
    if(hasMine()&&!confirm('붙여 넣은 코드로 우리 정간보를 바꿀까요?'+KEEP_NOTE))break;
    replaceMine(toMine(r.bars));$('make-state').textContent=r.problems.length?'불러왔어요 · '+r.problems.join(' · '):'불러왔어요';break;}
   case 'quiz-new':quizNew();break;
   case 'quiz-play':if(st.quiz)play(st.mine,'tab-make',{swap:st.quiz}).catch(()=>{});break;
   case 'quiz-orig':play(st.mine,'tab-make').catch(()=>{});break;
   case 'quiz-show':if(st.quiz){st.quiz.shown=true;$('quiz-say').textContent=`정답: ${Math.floor(st.quiz.g/BAR)+1}장단 ${st.quiz.g%BAR+1}째 칸 ${KO[st.quiz.from]} → ${KO[st.quiz.to]}`;renderMake();}break;
   case 'quiz-end':st.quiz=null;stop();renderMake();break;
   case 'card-copy':if(askPii()){$('card-state').textContent='개인정보처럼 보이는 말이 있어요. 지우고 복사해요';break;}renderCard();copy($('card').value,$('card-state'));break;
   case 'check-go':checkNow();break;
   case 'check-clear':$('answer').value='';st.src=null;showSrc('answer-src',null);clearCheck();break;
   case 'check-play':if(st.checked)play(st.checked.bars,'tab-check').catch(()=>{});break;
   case 'check-compare':compare();break;
   case 'again-fix':$('again-card').value=againCard('fix');break;
   case 'again-why':$('again-card').value=againCard('why');break;
   case 'again-copy':copy($('again-card').value,$('again-state'));break;
   case 'g4-copy':if(g4Pii()){$('g4-state').textContent='개인정보처럼 보이는 말이 있어요. 지우고 복사해요';break;}renderG4();copy($('g4-card').value,$('g4-state'));break;
   case 'g4-example':$('g4-answer').value=g4Example();st.g4.ansSrc={k:'sem',what:'셈제작소 예시(앱 악보로 만든 줄 번호 · AI 답 아님)',base:$('g4-answer').value};showSrc('g4-answer-src',st.g4.ansSrc);g4Check();break;
   case 'g4-check':g4Check();break;
   case 'g4-play':g4Play(st.g4.orig).catch(()=>{});break;
   case 'g4-play-fixed':g4Play(st.g4.fixed).catch(()=>{});break;
   case 'g4-stop':stop();renderG4();break;
   case 'g4-up':g4Edit('up');break;case 'g4-down':g4Edit('down');break;case 'g4-long':g4Edit('long');break;case 'g4-del':g4Edit('del');break;case 'g4-reset':g4Edit('reset');break;
   case 'g4-again-copy':copy($('g4-again').value,$('g4-again-state'));break;
   case 'check-fix':if(st.checked&&hasMine()&&!confirm('② 우리 가락 짓기에 있던 가락을 받은 악보로 바꿔요. 바꿀까요?'+KEEP_NOTE))break;if(st.checked){replaceMine(toMine(st.checked.bars));setTab('make');$('make-say').textContent='받은 악보를 옮겼어요(앞 4장단·9칸까지). 표시한 칸을 고쳐 봐요';}break;}});
 let rz=null;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(renderAll,150);});
 P.volumeUI&&P.volumeUI();setTab(st.tab);
 /* 교실 연결(Astra N15): 서버가 있을 때만 자리 현황에 ‘정간보’ 화면으로 보인다. 파일로 열면 아무것도 안 함 */
 if(C){try{C.setPage('jeonggan','gayageum');C.start().catch(()=>{});}catch(e){}}}
window.GugakJG={g4Parse,g4Card,g4Example,g4Again,againCard,st,parseCode,toCode,songPart,events,card,pieces,quizNew,quizGuess,checkNow,compare,stop,play,g4Play,renderStaff};
init();
})();
