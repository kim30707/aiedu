/* 연주자 영상 무대: 연주자마다 쉼·연주 조각이 있고, 그 자리에 소리가 나는 동안만 연주 조각을 보인다.
   조각 안의 손동작은 생성된 것이라 한 음 한 음과 맞지 않는다. */
const W0=1920,H0=1080;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const RISE=160,HOLD=650,FALL=520,LOOP_FADE=.6;
const FONT='-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';

function makeVideo(url){
 const v=document.createElement('video');
 v.src=url;v.muted=true;v.playsInline=true;v.preload='auto';v.crossOrigin='anonymous';
 v.setAttribute('muted','');v.setAttribute('playsinline','');
 return v;
}
function loaded(v){
 if(v.readyState>=2)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const ok=()=>{off();resolve();},bad=()=>{off();reject(Error('영상 조각을 읽지 못했습니다: '+decodeURIComponent(v.src.split('/').pop())));};
  const timer=setTimeout(bad,20000); // 20초 안에 못 읽으면 실패로 보고 장면 A로 바꿀 수 있게 한다.
  const off=()=>{clearTimeout(timer);v.removeEventListener('loadeddata',ok);v.removeEventListener('error',bad);};
  v.addEventListener('loadeddata',ok);v.addEventListener('error',bad);
 });
}
function seek(v,time){
 if(Math.abs(v.currentTime-time)<.0005&&v.readyState>=2)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{off();reject(Error('영상 조각 위치를 맞추지 못했습니다.'));},8000);
  const ok=()=>{off();resolve();};
  const off=()=>{clearTimeout(timer);v.removeEventListener('seeked',ok);};
  v.addEventListener('seeked',ok);v.currentTime=time;
 });
}

/* 한 조각. 라이브는 반복 재생, 최종본은 시각마다 위치를 맞춘다(끝과 처음은 0.6초 겹쳐 이음매를 숨긴다). */
class Clip{
 constructor(url,mode){this.url=url;this.mode=mode;this.main=makeVideo(url);this.tail=null;this.duration=0;}
 async load(){
  await loaded(this.main);
  this.duration=this.main.duration;
  if(!(this.duration>1))throw Error('영상 조각 길이가 너무 짧습니다: '+this.url);
  this.width=this.main.videoWidth;this.height=this.main.videoHeight;
  if(this.mode==='live'){this.main.loop=true;await this.main.play().catch(()=>{});}
  else{this.tail=makeVideo(this.url);await loaded(this.tail);}
 }
 /* 최종본용: 시각 t(ms)에 보일 위치 두 곳(본체·겹침)과 겹침 비율. */
 at(t){
  const span=this.duration-LOOP_FADE-.05;
  const p=((t/1000)%span+span)%span;
  if(p<LOOP_FADE)return {main:p,tail:p+span,blend:1-p/LOOP_FADE};
  return {main:p,tail:null,blend:0};
 }
 async prepare(t){
  const want=this.at(t);
  const jobs=[seek(this.main,want.main)];
  if(want.tail!==null)jobs.push(seek(this.tail,want.tail));
  await Promise.all(jobs);
  this.ready={...want};
 }
 draw(g,src,dst,alpha){
  if(alpha<=0.002)return;
  // 바깥에서 정한 투명도(예: 전체 조각 섞기)에 곱한다. 덮어쓰지 않는다.
  const base=g.globalAlpha;
  g.save();g.globalAlpha=base*alpha;
  if(this.mode==='final'&&this.ready?.tail!==null&&this.ready?.blend>0){
   g.drawImage(this.tail,...src,...dst);
   g.globalAlpha=base*alpha*(1-this.ready.blend);
  }
  g.drawImage(this.main,...src,...dst);
  g.restore();
 }
 nudge(){if(this.mode==='live'&&this.main.paused)this.main.play().catch(()=>{});}
 dispose(){for(const v of [this.main,this.tail])if(v){v.pause();v.removeAttribute('src');v.load();}}
}

/* 원본 영상에서 잘라 올 부분. focus는 원본 안의 중심(0~1), zoom은 확대. */
function cropFor(clip,dst,{focus=[.5,.5],zoom=1,box=null}={}){
 const vw=clip.width,vh=clip.height,aspect=dst[2]/dst[3];
 if(box){
  // box=[x,y,w,h](0~1)를 화면 비율에 맞춰 넓힌다.
  let w=box[2]*vw,h=box[3]*vh;
  if(w/h<aspect)w=h*aspect;else h=w/aspect;
  w/=zoom;h/=zoom;
  const cx=(box[0]+box[2]/2)*vw,cy=(box[1]+box[3]/2)*vh;
  const x=clamp(cx-w/2,0,Math.max(0,vw-w)),y=clamp(cy-h/2,0,Math.max(0,vh-h));
  return [x,y,Math.min(w,vw),Math.min(h,vh)];
 }
 let w=vw,h=vw/aspect;
 if(h>vh){h=vh;w=vh*aspect;}
 w/=zoom;h/=zoom;
 const x=clamp(focus[0]*vw-w/2,0,vw-w),y=clamp(focus[1]*vh-h/2,0,vh-h);
 return [x,y,w,h];
}

export async function createVideoStage({seats,width=W0,height=H0,mode='live',manifestUrl='assets/manifest.json'}){
 const manifest=await (await fetch(manifestUrl,{cache:'no-cache',signal:AbortSignal.timeout(15000)})).json();
 const base=manifestUrl.replace(/[^/]*$/,'');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const g=canvas.getContext('2d',{alpha:false});g.imageSmoothingQuality='high';
 const sx=width/W0,sy=height/H0;
 const clips=[];
 const clip=url=>{const c=new Clip(url,mode);clips.push(c);return c;};
 // 영상을 열기 전에 모든 자리의 연주자를 먼저 확인한다(중간에 실패해도 열린 영상이 남지 않게).
 const picks=seats.map(seat=>{
  const want=seat.character?.real||seat.performer;
  const p=manifest.performers.find(x=>x.id===want&&x.instrument===seat.instrument)||manifest.performers.find(x=>x.instrument===seat.instrument);
  if(!p||!p.clips?.play||!p.clips?.rest)throw Error(`${seat.label} 가상 연주자 영상이 없습니다. assets/b/manifest.json을 확인해 주세요.`);
  return p;
 });
 // 영상을 만들고 읽는 동안 무엇이든 실패하면 이미 연 영상을 모두 닫고 실패를 알린다(재생이 남지 않게).
 let performers,bySeat,trioOk,trio;
 try{
 performers=seats.map((seat,i)=>{
  const p=picks[i];
  return {seat:seat.seat,instrument:seat.instrument,label:seat.label,info:p,rest:clip(base+p.clips.rest),play:clip(base+p.clips.play),notes:[],byKey:new Map()};
 });
 bySeat=new Map(performers.map(p=>[p.seat,p]));
 trioOk=manifest.trio?.clips?.play&&manifest.trio?.clips?.rest&&Array.isArray(manifest.trio.order)&&seats.length===manifest.trio.order.length&&seats.every((s,i)=>s.instrument===manifest.trio.order[i])
  &&performers.every((p,i)=>(!manifest.trio.performers||p.info.id===manifest.trio.performers[i]));
 trio=trioOk?{rest:clip(base+manifest.trio.clips.rest),play:clip(base+manifest.trio.clips.play)}:null;
 await Promise.all(clips.map(c=>c.load()));
 }catch(error){for(const c of clips)c.dispose();throw error;}
 let contacts=[];

 /* 그 자리에 소리가 나는 정도(0~1). 연주 기록만으로 정해지므로 라이브와 최종본이 같다. */
 function weight(perf,t){
  let w=0;
  for(let i=perf.notes.length-1;i>=0;i--){
   const n=perf.notes[i];
   if(n.contact-RISE>t)continue;
   const end=Math.max(n.off??(n.sustain?t+FALL:n.contact),n.contact)+HOLD;
   if(end+FALL<t){if(t-n.contact>20000)break;continue;}
   const up=smooth((t-(n.contact-RISE))/RISE);
   const down=1-smooth((t-end)/FALL);
   w=Math.max(w,Math.min(up,down));
   if(w>=1)break;
  }
  return w;
 }
 function solo(perf,dst,w,opts){
  const src=cropFor(perf.rest,dst,opts);
  perf.rest.draw(g,src,dst,1);
  perf.play.draw(g,cropFor(perf.play,dst,opts),dst,w);
 }
 function split(t,ws,zoom){
  const n=performers.length,colW=width/n;
  performers.forEach((perf,i)=>{
   const dst=[Math.round(i*colW),0,Math.round(colW)+1,height];
   if(perf.info.fit){ // 4종은 그림 전체가 칸 안에 들어오게 줄이고 남는 위아래를 바탕색으로 채운다.
    g.fillStyle=perf.info.bg||'#fbf5ef';g.fillRect(...dst);
    const [,,bw,bh]=perf.info.fit,a=(bw*perf.rest.width)/(bh*perf.rest.height),w=Math.min(dst[2],dst[3]*a),h=w/a;
    solo(perf,[dst[0]+(dst[2]-w)/2,dst[1]+(dst[3]-h)/2,w,h],ws[i],{box:perf.info.fit,zoom:1});
   }else solo(perf,dst,ws[i],{focus:perf.info.focus||[.5,.55],zoom:(perf.info.splitZoom||1.15)*zoom});
  });
  g.fillStyle='rgba(6,6,6,.9)';
  for(let i=1;i<n;i++)g.fillRect(Math.round(i*colW)-2*sx,0,4*sx,height);
 }
 function plan(t,shot){
  const age=Math.max(0,t-(shot.since??t));
  const push=1+.045*smooth(age/9000);
  const ws=performers.map(p=>weight(p,t));
  const m=/^(seat|hands)(\d)$/.exec(shot.name||'');
  if(m&&bySeat.has(+m[2])){
   const perf=bySeat.get(+m[2]),w=ws[performers.indexOf(perf)];
   if(m[1]==='seat')return {kind:'solo',perf,w,opts:{focus:perf.info.focus||[.5,.5],zoom:(perf.info.soloZoom||1)*push}};
   return {kind:'solo',perf,w,opts:{box:perf.info.hands||[.3,.45,.4,.4],zoom:push}};
  }
  if(shot.name==='wide'&&trio){
   const lo=Math.min(...ws),hi=Math.max(...ws);
   // 모두 쉬거나 모두 연주할 때만 전체 조각이 보인다. 섞여 있으면 세 칸 화면이 보인다.
   return {kind:'wide',ws,trioAlpha:1-smooth(hi-lo),trioPlay:(lo+hi)/2,zoom:1+.025*smooth(age/9000)};
  }
  return {kind:'split',ws,zoom:shot.name==='side'?1.28*push:push};
 }
 function used(p){
  if(p.kind==='solo')return [p.perf.rest,p.perf.play];
  const list=performers.flatMap(x=>[x.rest,x.play]);
  if(p.kind==='wide'&&p.trioAlpha>.002)list.push(trio.rest,trio.play);
  return list;
 }
 function paintTag(){
  g.save();
  const text=manifest.label||'AI로 만든 가상 연주자 · 실제 연주 촬영 아님';
  g.font=`600 ${Math.round(24*sy)}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
  const w=g.measureText(text).width+36*sx;
  g.fillStyle='rgba(6,10,10,.66)';g.beginPath();g.roundRect(width/2-w/2,height-50*sy,w,36*sy,8*sy);g.fill();
  g.fillStyle='#f3efe6';g.fillText(text,width/2,height-32*sy);
  g.restore();
 }
 let prepared=null;
 const api={
  canvas,style:'b',manifest,
  noteOn(seat,note){
   const perf=bySeat.get(seat);if(!perf)return null;
   const entry={...note};
   perf.notes.push(entry);if(perf.notes.length>64)perf.notes.shift();
   if(note.key){perf.byKey.set(note.key,entry);if(perf.byKey.size>96)perf.byKey.delete(perf.byKey.keys().next().value);}
   contacts.push(note.contact);if(contacts.length>64)contacts.shift();
   return entry;
  },
  noteOff(seat,key,at){const n=bySeat.get(seat)?.byKey.get(key);if(n)n.off=at;},
  update(){},
  clear(seat,at){const perf=bySeat.get(seat);if(!perf)return;for(const n of perf.notes)if(n.off===undefined)n.off=at;},
  contactBetween(a,b){return contacts.some(c=>c>a&&c<=b);},
  /* 최종본: 이 프레임에 보일 조각들을 정확한 위치로 옮겨 둔다. 라이브에서는 부르지 않는다. */
  async prepare(t,shot){
   const p=plan(t,shot);
   await Promise.all([...new Set(used(p))].map(c=>c.prepare(t)));
   prepared={t,shot:shot.name,p};
  },
  render(t,shot){
   const p=mode==='final'&&prepared&&prepared.t===t&&prepared.shot===shot.name?prepared.p:plan(t,shot);
   if(mode==='live')for(const c of used(p))c.nudge();
   g.fillStyle='#070605';g.fillRect(0,0,width,height);
   if(p.kind==='solo')solo(p.perf,[0,0,width,height],p.w,p.opts);
   else{
    if(p.kind==='split'||p.trioAlpha<.998)split(t,p.ws,p.zoom??1);
    if(p.kind==='wide'&&p.trioAlpha>.002){
     g.save();g.globalAlpha=p.trioAlpha;
     const dst=[0,0,width,height],opts={focus:manifest.trio.focus||[.5,.5],zoom:p.zoom};
     trio.rest.draw(g,cropFor(trio.rest,dst,opts),dst,1);
     trio.play.draw(g,cropFor(trio.play,dst,opts),dst,p.trioPlay);
     g.restore();
    }
   }
   paintTag();
   return canvas;
  },
  performers,
  weights(t){return performers.map(p=>({seat:p.seat,w:+weight(p,t).toFixed(3)}));},
  shots(){const list=['wide','front','side'];for(const p of performers)list.push('seat'+p.seat,'hands'+p.seat);return list;},
  dispose(){for(const c of clips)c.dispose();}
 };
 return api;
}
