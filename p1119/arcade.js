/* 국악 놀이터 오락실 그래픽 v0.2 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션)
 * '달밤 마당 무대': 원근 장구 길, 빛나는 구슬 기호, 칠 때 빛·조각, 판정 글자, 연속 숫자, 흥 게이지·신명, 시작·완주 연출, 효과음.
 * 특정 상용 게임의 화면·캐릭터·글자체를 따라 그리지 않음(구조만). 화면 전체 번쩍임 없음(국소 효과만, 박 맞춤 맥동은 1.5Hz 이하).
 * Canvas 2D만 씀. '가볍게 보기'(lite)는 조각 수를 줄이고 덧칠 빛을 끈다.
 */
(()=>{'use strict';
const TAU=Math.PI*2;
const OBANG=['#2f6fd6','#d8322f','#f2c14e','#f4f1e8','#26211f'];// 청·적·황·백·흑
const LANE={gung:{base:'#d9813b',glow:'#ffb15e',dark:'#5a2d12'},chae:{base:'#16a39c',glow:'#5cf0e4',dark:'#06403d'}};
const STR_COL=[['#ffb08f','#d8322f'],['#ffd88a','#d98a12'],['#d6f58a','#5d9a1e'],['#8ff5ea','#0b7a75'],['#a9c8ff','#2f5fc0'],['#d6b8ff','#6d3fb0'],['#ffb3d9','#c23a7a']];
const NOTE_COL={'덩':['#ffd36b','#e8562f'],'쿵':['#ffb15e','#a24e1c'],'덕':['#7ff5ea','#0b7a75'],'기덕':['#c9f7ff','#2b6f99']};
const A={pluck:{},lite:false,nofx:false,sfx:(()=>{try{return localStorage.getItem('gugak-sfx')!=='false';}catch(e){return true;}})(),parts:[],rings:[],texts:[],beams:[],combo:{n:0,bump:0},gauge:0,sinmyeong:0,sinUntil:0,shake:0,banner:null,
 sfxGain:.5,audio:null};

/* ── 효과음(합성 + 가야금 음원) ── */
function ac(){return window.GugakPlay?.Sound?.ctx||null;}
function tone({f=440,type='sine',dur=.25,gain=.15,when=0,slide=0,partials=null}){const c=ac();if(!c||!A.sfx)return;const t=when||c.currentTime;const out=c.createGain();out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(gain*A.sfxGain,t+.01);out.gain.exponentialRampToValueAtTime(.0005,t+dur);out.connect(window.GugakPlay.Sound.master||c.destination);
 for(const [mul,amp] of (partials||[[1,1]])){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f*mul,t);if(slide)o.frequency.exponentialRampToValueAtTime(f*mul*slide,t+dur);g.gain.value=amp;o.connect(g).connect(out);o.start(t);o.stop(t+dur+.05);}}
const SFX={
 jing(when){tone({f:98,dur:2.6,gain:.35,when,partials:[[1,1],[2.02,.5],[2.98,.3],[4.1,.18],[5.3,.08]],slide:.985});},// 징 느낌(합성)
 blip(){tone({f:660,type:'triangle',dur:.12,gain:.12});tone({f:990,type:'triangle',dur:.16,gain:.1,when:(ac()?.currentTime||0)+.07});},
 arpeggio(degs=[3,4,5,6,7,8,9],step=.07){const P=window.GugakPlay,c=ac();if(!c||!P||!A.sfx)return;degs.forEach((d,i)=>P.Sound.play(P.gayaSample(d),{when:c.currentTime+i*step,gain:.55}));},
 star(i){this.arpeggio([[5],[7],[8]][i]||[9],0);},
 tick(){tone({f:1200,type:'square',dur:.03,gain:.04});}
};

/* ── 입자 ── */
function burst(x,y,kind,colA,colB){const now=performance.now();if(A.nofx||A.parts.length>160||now-(A.lastBurst??-1e9)<90)return;A.lastBurst=now;/* 효과 끄기·연타 상한·시간 상한 초당 11번(2차 N08) *//* 효과 끄기·연타 상한(Astra 12) */const n=A.lite?5:(kind==='perfect'?22:14);for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.6,v=(kind==='perfect'?260:190)*(.45+Math.random()*.8);
  A.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0,max:380+Math.random()*320,r:2+Math.random()*3.5,col:Math.random()<.5?colA:colB,shape:Math.random()<.35?'petal':'dot',rot:Math.random()*TAU});}
 A.rings.push({x,y,life:0,max:380,col:colA,w:kind==='perfect'?7:5,r0:20,r1:kind==='perfect'?96:72});if(kind==='perfect'&&!(A.lite||A.nofx))A.rings.push({x,y,life:-60,max:420,col:'#ffffff',w:3,r0:16,r1:120});}
function puff(x,y){if(A.nofx)return;const n=A.lite?3:8;for(let i=0;i<n;i++){const a=Math.random()*TAU,v=60+Math.random()*60;A.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-30,life:0,max:420,r:5+Math.random()*5,col:'rgba(160,170,180,.7)',shape:'smoke',rot:0});}}
function text(x,y,str,style,max=520){A.texts.push({x,y,str,style,life:0,max});if(A.texts.length>14)A.texts.shift();}
function step(dt){const g=900;
 A.parts=A.parts.filter(p=>(p.life+=dt)<p.max);for(const p of A.parts){p.vy+=g*dt/1000*(p.shape==='smoke'?-.1:1);p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.rot+=dt/200;}
 A.rings=A.rings.filter(r=>(r.life+=dt)<r.max);A.texts=A.texts.filter(s=>(s.life+=dt)<s.max);A.beams=A.beams.filter(b=>(b.life+=dt)<b.max);
 A.combo.bump=Math.max(0,A.combo.bump-dt/180);A.shake=Math.max(0,A.shake-dt/120);}
function drawFx(g){
 if(A.nofx){A.parts=[];A.rings=[];A.beams=[];}
 if(!(A.lite||A.nofx))g.globalCompositeOperation='lighter';
 for(const b of A.beams){const k=1-b.life/b.max;const gr=g.createLinearGradient(0,b.y0,0,b.y1);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,b.col.replace('A',(.22*k).toFixed(3)));g.fillStyle=gr;g.beginPath();g.moveTo(b.x0a,b.y0);g.lineTo(b.x0b,b.y0);g.lineTo(b.x1b,b.y1);g.lineTo(b.x1a,b.y1);g.closePath();g.fill();}
 for(const r of A.rings){if(r.life<0)continue;const k=r.life/r.max,rad=r.r0+(r.r1-r.r0)*(1-Math.pow(1-k,3));g.globalAlpha=(1-k)*.9;g.strokeStyle=r.col;g.lineWidth=r.w*(1-k)+1;g.beginPath();g.ellipse(r.x,r.y,rad,rad*.55,0,0,TAU);g.stroke();}
 for(const p of A.parts){const k=p.life/p.max;g.globalAlpha=(1-k)*(p.shape==='smoke'?.5:1);g.fillStyle=p.col;
  if(p.shape==='petal'){g.save();g.translate(p.x,p.y);g.rotate(p.rot);g.beginPath();g.ellipse(0,0,p.r*1.8,p.r*.8,0,0,TAU);g.fill();g.restore();}
  else{g.beginPath();g.arc(p.x,p.y,p.shape==='smoke'?p.r*(1+k*1.5):p.r*(1-k*.5),0,TAU);g.fill();}}
 g.globalAlpha=1;g.globalCompositeOperation='source-over';
 for(const s of A.texts){const k=s.life/s.max,pop=A.nofx?1:s.life<120?1.35-.35*(s.life/120):1;const y=A.nofx?s.y:s.y-(s.style==='score'?k*46:k*18);g.globalAlpha=k<.7?1:(1-k)/.3;
  const size=({perfect:46,good:38,miss:30,wrong:26,score:22,count:84,go:96,banner:64,small:24})[s.style]||30;
  g.save();g.translate(s.x,y);g.scale(pop,pop);g.textAlign='center';g.textBaseline='middle';g.font=`900 ${size}px "Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif`;g.lineJoin='round';
  const fill=({perfect:['#fff4c2','#f6c343'],good:['#d9fff9','#3fd6c9'],miss:['#e3e7ea','#9aa4ab'],wrong:['#efe2ff','#a77be0'],score:['#ffffff','#ffe08a'],count:['#fff7dd','#f6c343'],go:['#fff1c9','#e8562f'],banner:['#fff4c2','#f6c343'],small:['#ffffff','#dff3ee']})[s.style]||['#fff','#ccc'];
  const gr=g.createLinearGradient(0,-size/2,0,size/2);gr.addColorStop(0,fill[0]);gr.addColorStop(1,fill[1]);
  g.strokeStyle='rgba(23,20,40,.85)';g.lineWidth=Math.max(4,size/7);g.strokeText(s.str,0,0);g.fillStyle=gr;g.fillText(s.str,0,0);g.restore();}
 g.globalAlpha=1;}

/* ── 무대(캔버스 뒤 장식은 CSS, 여기서는 길·기호) ── */
function beatPulse(t,e8){if(t<0||A.nofx)return 0;const beat=3*e8<700?6*e8:3*e8/* 맥동은 1.5Hz 이하(Astra 12) */,ph=(t%beat)/beat;return Math.exp(-ph*7);}
function jangguGeo(w,h,mirror){const hitY=h*.80,top=h*.04,cxs=[w*.27,w*.73];if(mirror)cxs.reverse();return{hitY,top,cxs,lw:w*.36,vp:w/2};}
function proj(G,p){// p: 0(먼 곳)~1(판정선), 1보다 크면 지나감
 const s=.38+.62*p,y=G.top+(G.hitY-G.top)*(p<1?(p*.45+p*p*.55):p);return{s,y};}
function laneX(G,lane,s){return G.vp+(G.cxs[lane]-G.vp)*s;}
function drawJanggu(g,w,h,t,C,run,mirror){const G=jangguGeo(w,h,mirror),pulse=(A.lite||A.nofx)?0:beatPulse(t,C.e8);
 // 길 두 줄
 for(let l=0;l<2;l++){const L=l===0?LANE.gung:LANE.chae,s0=.38,x0=laneX(G,l,s0),x1=laneX(G,l,1),hw0=G.lw*s0/2,hw1=G.lw/2;
  const gr=g.createLinearGradient(0,G.top,0,h);gr.addColorStop(0,'rgba(10,14,40,0)');gr.addColorStop(.6,L.dark+'cc');gr.addColorStop(1,L.dark+'ee');
  g.fillStyle=gr;g.beginPath();g.moveTo(x0-hw0,G.top);g.lineTo(x0+hw0,G.top);g.lineTo(x1+hw1*1.08,h);g.lineTo(x1-hw1*1.08,h);g.closePath();g.fill();
  g.strokeStyle=L.glow;g.globalAlpha=.55;g.lineWidth=2.5;g.stroke();g.globalAlpha=1;
  // 색동 가장자리 점
  if(!(A.lite||A.nofx))for(let k=0;k<8;k++){const p=((k/8)+(t>0?t/(C.lead*1.0):0))%1,{s,y}=proj(G,p),x=laneX(G,l,s),hw=G.lw*s/2;g.fillStyle=OBANG[k%5];g.globalAlpha=.35+.4*p;g.fillRect(x-hw-3*s,y-2*s,5*s,4*s);g.fillRect(x+hw-2*s,y-2*s,5*s,4*s);}g.globalAlpha=1;}
 // 마디·박 줄
 const beat=3*C.e8;for(let k=-1;k*beat<C.end+C.lead;k++){const tt=k*beat,p=1-(tt-t)/C.lead;if(p<0||p>1.12)continue;const {s,y}=proj(G,p),isBar=k%3===0;
  for(let l=0;l<2;l++){const x=laneX(G,l,s),hw=G.lw*s/2;g.strokeStyle=isBar?'rgba(255,236,190,.55)':'rgba(255,255,255,.14)';g.lineWidth=(isBar?2.5:1.2)*s;g.beginPath();g.moveTo(x-hw,y);g.lineTo(x+hw,y);g.stroke();}}
 // 판정 북(오방색 테)
 for(let l=0;l<2;l++){const L=l===0?LANE.gung:LANE.chae,x=laneX(G,l,1),rx=G.lw*.40*(1+pulse*.05),ry=rx*.36;
  const gr=g.createRadialGradient(x,G.hitY-ry*.3,4,x,G.hitY,rx);gr.addColorStop(0,'rgba(255,248,230,.95)');gr.addColorStop(.55,'rgba(240,226,196,.85)');gr.addColorStop(1,L.base);
  g.fillStyle=gr;g.beginPath();g.ellipse(x,G.hitY,rx,ry,0,0,TAU);g.fill();
  for(let k=0;k<5;k++){g.strokeStyle=OBANG[k];g.lineWidth=6;g.beginPath();g.ellipse(x,G.hitY,rx+4,ry+3,0,k*TAU/5+t/4000,(k+1)*TAU/5+t/4000-.05);g.stroke();}
  if(!(A.lite||A.nofx)){g.strokeStyle=L.glow;g.globalAlpha=.35+pulse*.4;g.lineWidth=10;g.beginPath();g.ellipse(x,G.hitY,rx+12,ry+8,0,0,TAU);g.stroke();g.globalAlpha=1;}
  g.fillStyle='rgba(60,30,10,.55)';g.font='800 16px "Noto Sans KR",system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(l===0?'궁편':'채편',x,G.hitY);}
 // 두 북 사이 매듭(조임줄)
 {const xa=laneX(G,0,1),xb=laneX(G,1,1),l=Math.min(xa,xb)+G.lw*.40+8,r=Math.max(xa,xb)-G.lw*.40-8;if(r>l){g.strokeStyle='#f6c343';g.lineWidth=5;g.beginPath();g.moveTo(l,G.hitY);g.lineTo(r,G.hitY);g.stroke();const mx=(l+r)/2;g.fillStyle='#d8322f';g.beginPath();g.moveTo(mx-16,G.hitY-9);g.lineTo(mx+16,G.hitY-9);g.lineTo(mx+16,G.hitY+9);g.lineTo(mx-16,G.hitY+9);g.closePath();g.fill();g.strokeStyle='#f6c343';g.lineWidth=2;g.stroke();for(let k=-1;k<=1;k++){g.beginPath();g.moveTo(mx+k*7-4,G.hitY-9);g.lineTo(mx+k*7+4,G.hitY+9);g.stroke();}}}
 // 기호(먼 것부터)
 const vis=C.notes.filter(n=>n.state==='wait'&&n.t-t<C.lead*1.02&&n.t-t>-C.W[1]-80).sort((a,b)=>b.t-a.t);
 for(const n of vis){const p=1-(n.t-t)/C.lead,{s,y}=proj(G,p),xs=n.lanes.map(l=>laneX(G,l,s)),R=30*s;
  if(xs.length===2){const gr=g.createLinearGradient(xs[0],0,xs[1],0);gr.addColorStop(0,'#ffb15e');gr.addColorStop(.5,'#ffe08a');gr.addColorStop(1,'#5cf0e4');g.strokeStyle=gr;g.lineWidth=10*s;g.lineCap='round';g.beginPath();g.moveTo(xs[0],y);g.lineTo(xs[1],y);g.stroke();
   if(!(A.lite||A.nofx)){g.globalAlpha=.25;g.lineWidth=22*s;g.stroke();g.globalAlpha=1;}}
  for(const x of xs)gem(g,x,y,R,n.stroke,s);}
 return G;}
function gem(g,x,y,R,label,s,col){const [c1,c2]=col||NOTE_COL[label]||['#fff','#888'];
 if(!(A.lite||A.nofx)){g.fillStyle=c1;g.globalAlpha=.22;g.beginPath();g.arc(x,y,R*1.55,0,TAU);g.fill();g.globalAlpha=1;}
 const gr=g.createRadialGradient(x-R*.35,y-R*.4,R*.1,x,y,R);gr.addColorStop(0,'#ffffff');gr.addColorStop(.35,c1);gr.addColorStop(1,c2);
 g.fillStyle=gr;g.beginPath();g.arc(x,y,R,0,TAU);g.fill();g.strokeStyle='#f6c343';g.lineWidth=3*s;g.stroke();g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1.2*s;g.beginPath();g.arc(x,y,R-3*s,0,TAU);g.stroke();
 if(A.sinmyeong){g.strokeStyle='#ffe08a';g.lineWidth=2.5*s;g.beginPath();g.arc(x,y,R+6*s,0,TAU);g.stroke();g.beginPath();g.arc(x,y,R+11*s,0,TAU);g.globalAlpha=.5;g.stroke();g.globalAlpha=1;}
 g.font=`900 ${Math.round(R*.95)}px "Noto Sans KR","Apple SD Gothic Neo",system-ui`;g.textAlign='center';g.textBaseline='middle';g.lineWidth=Math.max(2,R*.16);g.strokeStyle='rgba(30,20,10,.75)';g.strokeText(label,x,y+1);g.fillStyle='#fff';g.fillText(label,x,y+1);}
function drawGayageum(g,w,h,t,C,strings){const hitX=w*.80,rows=strings.length,rh=h/rows,pulse=(A.lite||A.nofx)?0:beatPulse(t,C.e8);
 // 오동나무 판
 const wood=g.createLinearGradient(0,0,0,h);wood.addColorStop(0,'rgba(70,36,18,.55)');wood.addColorStop(1,'rgba(40,20,10,.7)');g.fillStyle=wood;g.fillRect(0,0,w,h);
 const beat=3*C.e8;for(let k=-1;k*beat<C.end+C.lead;k++){const x=hitX-(k*beat-t)/C.lead*hitX;if(x<-4||x>w)continue;g.strokeStyle=k%3===0?'rgba(255,236,190,.4)':'rgba(255,255,255,.08)';g.lineWidth=k%3===0?2:1;g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
 for(let l=0;l<rows;l++){const y=rh*l+rh/2,pl=A.pluck[l]||0,k=Math.max(0,1-(t-pl)/320),busy=C.notes.some(n=>n.state==='wait'&&n.lanes[0]===l&&n.t-t<C.lead*.35&&n.t-t>-80);
  if(k>0&&!(A.lite||A.nofx)){g.strokeStyle='#f6c343';g.lineWidth=4;g.globalAlpha=k;g.beginPath();for(let x=0;x<=w;x+=12){const yy=y+Math.sin(x/18+t/30)*4*k*Math.sin(Math.PI*x/w);x?g.lineTo(x,yy):g.moveTo(x,yy);}g.stroke();g.globalAlpha=1;}
  g.strokeStyle=busy||k>0?'#ffe08a':'#f3dfb0';g.globalAlpha=.85;g.lineWidth=(busy?3:1.5)+l*.35;g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();g.globalAlpha=1;
  // 안족(기러기발)
  g.fillStyle='#f6efd9';g.beginPath();g.moveTo(hitX+46,y+10);g.lineTo(hitX+54,y-6);g.lineTo(hitX+62,y+10);g.closePath();g.fill();
  g.fillStyle='rgba(255,240,210,.85)';g.font='800 14px "Noto Sans KR",system-ui';g.textAlign='left';g.textBaseline='middle';g.fillText(strings[l].hyeon+'현 '+strings[l].name,8,y-13);}
 // 판정 선
 if(!(A.lite||A.nofx)){g.fillStyle='rgba(246,195,67,'+(.18+pulse*.25).toFixed(3)+')';g.fillRect(hitX-14,0,28,h);}
 const lg=g.createLinearGradient(0,0,0,h);OBANG.slice(0,4).forEach((c,i)=>lg.addColorStop(i/3,c));g.fillStyle=lg;g.fillRect(hitX-3,0,6,h);
 for(const n of C.notes){if(n.state!=='wait')continue;const x=hitX-(n.t-t)/C.lead*hitX,len=n.len/C.lead*hitX;if(x>w+40||x+len<-40)continue;const y=rh*n.lanes[0]+rh/2,R=Math.min(24,rh*.4);
  const tg=g.createLinearGradient(x-len,0,x,0);tg.addColorStop(0,'rgba(92,240,228,0)');tg.addColorStop(1,'rgba(92,240,228,.55)');g.fillStyle=tg;g.fillRect(x-len,y-R*.42,len,R*.84);
  gem(g,x,y,R,strings[n.lanes[0]].name,1,STR_COL[n.lanes[0]%STR_COL.length]);if(n.syl){const ty=y-R-13;g.fillStyle='#f6c343';g.beginPath();g.roundRect?g.roundRect(x-13,ty-11,26,22,7):g.rect(x-13,ty-11,26,22);g.fill();g.fillStyle='#07191c';g.font='900 15px "Noto Sans KR",system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(n.syl,x,ty+1);}}
 return{hitX,rh};}
function drawCombo(g,w,h,combo,mult){if(combo<3)return;const b=A.nofx?0:A.combo.bump,size=58*(1+b*.35),y=h*.30;
 const col=combo>=50?null:combo>=30?['#ffd2c4','#e8562f']:combo>=20?['#fff4c2','#f6c343']:combo>=10?['#e6fffb','#3fd6c9']:['#ffffff','#cfd8dc'];
 g.save();g.textAlign='center';g.textBaseline='middle';g.font=`900 ${size}px "Noto Sans KR",system-ui`;g.lineJoin='round';
 let fill;if(col){fill=g.createLinearGradient(0,y-size/2,0,y+size/2);fill.addColorStop(0,col[0]);fill.addColorStop(1,col[1]);}else{fill=g.createLinearGradient(w/2-80,0,w/2+80,0);OBANG.slice(0,4).concat('#e8562f').forEach((c,i)=>fill.addColorStop(i/4,c));}
 g.globalAlpha=.62;g.strokeStyle='rgba(15,12,35,.8)';g.lineWidth=9;g.strokeText(String(combo),w/2,y);g.fillStyle=fill;g.fillText(String(combo),w/2,y);
 g.font='800 20px "Noto Sans KR",system-ui';g.lineWidth=5;g.strokeText(mult>1?'연속 · 신명 ×'+mult:'연속',w/2,y+size*.62);g.fillStyle='#fff';g.fillText(mult>1?'연속 · 신명 ×'+mult:'연속',w/2,y+size*.62);g.restore();g.globalAlpha=1;}

/* ── 흥 게이지·신명 ── */
function addGauge(kind,now){if(A.sinmyeong)return false;A.gauge=Math.max(0,Math.min(100,A.gauge+(kind==='perfect'?5:kind==='good'?3:-12)));if(A.gauge>=100){A.sinmyeong=1;A.sinUntil=now+9000;return true;}return false;}
function tickGauge(now){if(A.sinmyeong){const left=A.sinUntil-now;A.gauge=Math.max(0,100*left/9000);if(left<=0){A.sinmyeong=0;A.gauge=0;return 'end';}}return null;}

/* ── 자동 낮춤 ── */
const perf={n:0,sum:0,last:0,checked:false};
function watchPerf(now,onSlow){if(perf.checked||A.lite)return;if(perf.last){const d=now-perf.last;if(d<200){perf.sum+=d;perf.n++;}}perf.last=now;if(perf.n>=120){perf.checked=true;if(perf.sum/perf.n>30)onSlow(Math.round(1000/(perf.sum/perf.n)));}}
function reset(){A.pluck={};A.parts=[];A.rings=[];A.texts=[];A.beams=[];A.combo={n:0,bump:0};A.gauge=0;A.sinmyeong=0;A.shake=0;perf.n=0;perf.sum=0;perf.last=0;perf.checked=false;}
window.GugakArcade={A,SFX,burst,puff,text,step,drawFx,drawJanggu,drawGayageum,drawCombo,addGauge,tickGauge,watchPerf,reset,jangguGeo,proj,laneX,LANE,
 beam(x0a,x0b,x1a,x1b,y0,y1,col){if(A.lite)return;A.beams.push({x0a,x0b,x1a,x1b,y0,y1,col,life:0,max:220});}};
})();
