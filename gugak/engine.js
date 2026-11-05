(function(){
'use strict';
const HELD=new Set(['haegeum','ajaeng','daegeum','danso']);
const MODEL=new Set(['gayageum','haegeum','ajaeng','janggu']);
const bounded=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;};
class AudioEngine{
 constructor(options={}){
  this.ctx=options.context||null;this.offline=!!(this.ctx&&typeof this.ctx.startRendering==='function');this.skipModel=!!options.skipModel;
  this.cache=new Map();this.cacheSizes=new Map();this.cacheBytes=0;this.voices=new Map();this.liveVoices=new Set();this.counter=0;this.serial=0;this.masterVolume=.45;this.modelNode=null;this.readyPromise=null;this.modelReadyPromise=null;this.debug=[];this.backend='준비 전';
 }
 async ready(){
  if(!this.readyPromise)this.readyPromise=(async()=>{
   if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
   this.master=this.ctx.createGain();this.master.gain.value=this.masterVolume;this.master.connect(this.ctx.destination);this.backend='원음 기반 Web Audio';if(this.pendingReverb){const l=this.pendingReverb;this.pendingReverb=0;this.setReverb(l);}
  })();
  await this.readyPromise;if(!this.offline&&this.ctx.state==='suspended')await this.ctx.resume();
 }
 async ensureModel(){
  if(this.skipModel)return;
  if(!this.modelReadyPromise)this.modelReadyPromise=(async()=>{
   const code=`const {Kernel}=${window.GUGAK_DSP_SOURCE};class GugakProcessor extends AudioWorkletProcessor{constructor(){super();this.k=new Kernel(sampleRate);this.port.onmessage=e=>{const d=e.data;if(d.op==='on')this.k.start(d.id,d.p);if(d.op==='update')this.k.update(d.id,d.p);if(d.op==='off')this.k.stop(d.id);if(d.op==='clear')this.k.allOff();};}process(i,o){if(o[0]&&o[0][0])this.k.process(o[0][0]);return true;}}registerProcessor('gugak-modal',GugakProcessor);`;
   try{await this.ctx.audioWorklet.addModule('data:application/javascript,'+encodeURIComponent(code));this.modelNode=new AudioWorkletNode(this.ctx,'gugak-modal',{outputChannelCount:[1]});this.backend='AudioWorklet 모달 엔진';}
   catch(e){this.backendError=e.message;this.kernel=new GugakModel.Kernel(this.ctx.sampleRate);this.modelNode=this.ctx.createScriptProcessor(1024,0,1);this.modelNode.onaudioprocess=e=>this.kernel.process(e.outputBuffer.getChannelData(0));this.backend='호환 모드 · ScriptProcessor';}
   this.modelGain=this.ctx.createGain();this.modelGain.gain.value=.7;this.modelNode.connect(this.modelGain);this.modelGain.connect(this.master);
  })();await this.modelReadyPromise;
 }
 send(op,id,p){if(!this.modelNode)return;if(this.modelNode.port)this.modelNode.port.postMessage({op,id,p});else{if(op==='on')this.kernel.start(id,p);if(op==='off')this.kernel.stop(id);if(op==='update')this.kernel.update(id,p);if(op==='clear')this.kernel.allOff();}}
 async decode(s){
  if(!s)throw new Error('이 음의 녹음이 없습니다.');
  if(this.cache.has(s.id)){const cached=this.cache.get(s.id);this.cache.delete(s.id);this.cache.set(s.id,cached);return cached;}
  const promise=(async()=>{
   let bytes;if(s.dataUri){const b=atob(s.dataUri.split(',').pop());bytes=Uint8Array.from(b,c=>c.charCodeAt(0)).buffer;}
   else if(location.protocol==='file:')throw new Error('직접 열기용 음원 데이터가 없습니다.');
   else{const response=await fetch(s.path);if(!response.ok)throw new Error('음원 파일을 읽을 수 없습니다.');bytes=await response.arrayBuffer();}
   const buffer=await this.ctx.decodeAudioData(bytes);
   if(this.cache.get(s.id)===promise){const size=buffer.length*buffer.numberOfChannels*4;this.cacheSizes.set(s.id,size);this.cacheBytes+=size;while(this.cache.size>48||this.cacheBytes>64*1024*1024){const oldest=this.cache.keys().next().value;this.cache.delete(oldest);this.cacheBytes-=this.cacheSizes.get(oldest)||0;this.cacheSizes.delete(oldest);}}
   return buffer;
  })();
  this.cache.set(s.id,promise);try{return await promise;}catch(e){if(this.cache.get(s.id)===promise){this.cache.delete(s.id);this.cacheBytes-=this.cacheSizes.get(s.id)||0;this.cacheSizes.delete(s.id);}throw e;}
 }
 parameters(p){return {...p,lessonCents:bounded(p.lessonCents,-1200,1200,0),lessonGain:bounded(p.lessonGain,0,1.5,1),gestureGain:bounded(p.gestureGain,0,1,1),physicalCents:bounded(p.physicalCents,-3600,3600,0),brightness:bounded(p.brightness,0,1,1),damping:bounded(p.damping,0,1,0)};}
 tone(p){return Math.min(this.ctx.sampleRate*.46,800+19200*Math.pow(p.brightness??1,1.5));}
 dampLevel(p){return p.realistic===true?Math.pow(1-(p.damping??0),2):1;}
 isHeld(p,mode){return mode!=='raw'&&p.sustain===true&&HELD.has(p.instrument);}
 baseLevel(p,mode){
  const strength=bounded(p.strength,0,1,.6);
  const bowScale=mode!=='raw'&&mode!=='performance'&&['haegeum','ajaeng'].includes(p.instrument)?Math.sqrt(bounded(p.bowSpeed,0,1,.5)):1;
  return strength*(mode==='raw'?.65:.42)*bowScale;
 }
 cents(p,mode){return (p.lessonCents??0)+(mode==='raw'?0:(Number(p.bend)||0)+(Number(p.physicalCents)||0)+(mode==='model'?1200*Math.log2(Math.sqrt(bounded(p.tension,.1,10,1))/bounded(p.size,.1,10,1)):0));}
 async note(s,p={},mode='performance',key){
  if(mode==='model'&&!MODEL.has(p.instrument))mode='sample';
  const id=key||'voice-'+(++this.counter),old=this.voices.get(id);
  if(old?.pending)this.cleanup(old);
  const v={id,internalId:id+'@'+(++this.serial),s,p:this.parameters(p),mode,pending:true,released:false,cleaned:false,held:this.isHeld(p,mode)};
  this.voices.set(id,v);this.liveVoices.add(v);
  try{
   await this.ready();if(mode==='model')await this.ensureModel();
   if(this.voices.get(id)!==v||v.released){this.cleanup(v);return id;}
   const original=await this.decode(s);
   if(this.voices.get(id)!==v||v.released){this.cleanup(v);return id;}
   p=v.p;v.held=this.isHeld(p,mode);
   while([...this.voices.values()].filter(x=>!x.pending&&!x.released).length>=12){const victim=[...this.voices.values()].find(x=>x!==v&&!x.pending&&!x.released);if(!victim)break;this.retire(victim,.025);}
   const previous=[...this.liveVoices].filter(x=>x.id===id&&x!==v&&!x.cleaned&&!x.released);
   const loop=v.held?window.GugakSustain?.prepare(this.ctx,original):null;
   if(v.held&&!loop)throw new Error('지속 발음 모듈을 불러오지 못했습니다.');
   const src=this.ctx.createBufferSource(),base=this.ctx.createGain(),lesson=this.ctx.createGain(),gesture=this.ctx.createGain(),envelope=this.ctx.createGain();
   src.buffer=loop?loop.buffer:original;src.playbackRate.value=1;src.detune.value=this.cents(p,mode);
   if(loop){src.loop=true;src.loopStart=loop.loopStart;src.loopEnd=loop.loopEnd;}
   base.gain.value=this.baseLevel(p,mode);lesson.gain.value=p.lessonGain;gesture.gain.value=mode==='raw'?1:p.gestureGain;
   const now=this.ctx.currentTime,fade=previous.some(x=>x.src)?.035:0;
   envelope.gain.setValueAtTime(fade?0:1,now);if(fade)envelope.gain.linearRampToValueAtTime(1,now+fade);
   // Tone and hand damping are explicit performance approximations. Raw comparison bypasses them.
   let tone=null,hand=null;
   if(mode!=='raw'&&p.realistic===true){tone=this.ctx.createBiquadFilter();tone.type='lowpass';tone.Q.value=.5;tone.frequency.value=this.tone(p);hand=this.ctx.createGain();hand.gain.value=this.dampLevel(p);src.connect(tone);tone.connect(hand);hand.connect(base);}else src.connect(base);
   base.connect(lesson);lesson.connect(gesture);gesture.connect(envelope);envelope.connect(this.master);
   Object.assign(v,{src,tone,handGain:hand,baseGain:base,gain:lesson,lessonGainNode:lesson,gestureGainNode:gesture,envelope,pending:false,loop,bowed:['haegeum','ajaeng'].includes(p.instrument),startedAt:now,originalDuration:original.duration});
   if(mode!=='raw'){
    v.lfo=this.ctx.createOscillator();v.lfo.frequency.value=5.2;v.lfoGain=this.ctx.createGain();v.lfoGain.gain.value=bounded(p.vibrato,0,500,0);v.lfo.connect(v.lfoGain);v.lfoGain.connect(src.detune);v.lfo.start(now);
    if(mode==='model')this.send('on',v.internalId,p);
   }
   src.onended=()=>{if(v.mode==='model')this.send('off',v.internalId);this.cleanup(v);};
   src.start(now);for(const prior of previous)this.retire(prior,.035);this.relevel();
   // Native onended owns one-shot cleanup. There is deliberately no 12-second held-voice timeout.
   this.debug.push({id,request:v.internalId,sample:s.id,mode,playbackRate:src.playbackRate.value,detune:src.detune.value,parameters:{...p},duration:original.duration,sustain:!!loop,loop:loop?{start:loop.loopStart,end:loop.loopEnd,crossfade:loop.crossfadeSeconds,correlation:loop.correlation,attackOnce:true}:null});
   if(this.debug.length>200)this.debug.shift();return id;
  }catch(error){
   if(this.voices.get(id)===v)for(const other of [...this.liveVoices])if(other.id===id&&other!==v)this.retire(other,.035);
   this.cleanup(v);throw error;
  }
 }
 update(id,patch){
  const v=this.voices.get(id);if(!v||v.released||v.mode==='raw')return;
  v.p=this.parameters({...v.p,...patch});
  if(v.p.realistic===true&&v.p.damping>=.999&&!v.held){this.retire(v,.035);return;}
  if(v.pending)return;
  const now=this.ctx.currentTime;
  v.src.detune.setTargetAtTime(this.cents(v.p,v.mode),now,.025);
  v.lfoGain?.gain.setTargetAtTime(bounded(v.p.vibrato,0,500,0),now,.03);
  v.baseGain.gain.setTargetAtTime(this.baseLevel(v.p,v.mode),now,.03);
  v.lessonGainNode.gain.setTargetAtTime(v.p.lessonGain,now,.015);
  v.gestureGainNode.gain.setTargetAtTime(v.p.gestureGain,now,.012);
  v.tone?.frequency.setTargetAtTime(this.tone(v.p),now,.018);
  v.handGain?.gain.setTargetAtTime(this.dampLevel(v.p),now,.012);
  if(v.mode==='model')this.send('update',v.internalId,v.p);
 }
 damp(id,amount=1){const v=this.voices.get(id);if(!v||v.mode==='raw')return;this.update(id,{realistic:true,damping:amount});if(amount>=.999&&!v.held)this.retire(v,.035);}
 release(id){
  const v=this.voices.get(id);if(!v||!v.held)return;
  // A short tap still plays a pending one-shot; a released held gesture never starts late.
  for(const voice of [...this.liveVoices])if(voice.id===id)this.retire(voice,.065);
 }
 holdValue(param,now){if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(now);else{const value=param.value;param.cancelScheduledValues(now);param.setValueAtTime(value,now);}}
 retire(v,seconds=.035){
  if(!v||v.cleaned)return;
  v.released=true;if(this.voices.get(v.id)===v)this.voices.delete(v.id);
  if(v.pending||!v.src){this.cleanup(v);return;}
  if(v.stopScheduled)return;v.stopScheduled=true;
  const now=this.ctx.currentTime,end=now+seconds;
  this.holdValue(v.envelope.gain,now);v.envelope.gain.linearRampToValueAtTime(0,end);
  if(v.mode==='model')this.send('off',v.internalId);
  try{v.src.stop(end+.005);}catch{}try{v.lfo?.stop(end+.005);}catch{}
  this.relevel();
 }
 cleanup(v){
  if(!v||v.cleaned)return;v.cleaned=true;v.released=true;
  clearTimeout(v.timeout);
  for(const node of [v.src,v.tone,v.handGain,v.baseGain,v.lessonGainNode,v.gestureGainNode,v.envelope,v.lfo,v.lfoGain]){try{if(node===v.src||node===v.lfo)node?.stop();node?.disconnect();}catch{}}
  this.liveVoices.delete(v);
  // A late old onended/decode/error must never remove the replacement voice.
  if(this.voices.get(v.id)===v)this.voices.delete(v.id);
  this.relevel();
 }
 kill(id){for(const v of [...this.liveVoices])if(v.id===id)this.retire(v,.025);}
 allOff(){for(const v of [...this.liveVoices])this.retire(v,.025);this.voices.clear();if(this.modelNode)this.send('clear');this.relevel();}
 relevel(){if(this.master){const count=[...this.liveVoices].filter(v=>!v.pending&&!v.cleaned&&v.src).length;const target=this.masterVolume/Math.max(1,count),now=this.ctx.currentTime;this.master.gain.cancelScheduledValues(now);if(target<this.master.gain.value)this.master.gain.setValueAtTime(target,now);else this.master.gain.setTargetAtTime(target,now,.02);}}
 volume(value){this.masterVolume=bounded(value,0,.8,.45);this.relevel();}
 // v0.11(2026-11-05, Claude): 울림(공간감) 3단계. 0=없음(기존과 같은 소리 경로), 1=조금, 2=많이.
 // 기기 안에서 만든 인공 잔향(고정 씨앗의 감쇠 잡음)이며 녹음한 공간의 소리가 아니다. 원음 경로(master→destination)는 그대로 두고 젖은 소리만 더한다.
 reverbLevel(){return this.reverb?.level||0;}
 setReverb(level){
  level=[0,1,2].includes(Number(level))?Number(level):0;
  if(!this.ctx||!this.master){this.pendingReverb=level;return level;}
  const R=[null,{seconds:1.3,wet:.2,dry:.95},{seconds:2.6,wet:.36,dry:.88}][level];
  if(!this.reverb){this.reverb={level:0,dry:this.ctx.createGain(),wet:this.ctx.createGain(),node:this.ctx.createConvolver(),buffers:{}};this.master.disconnect();this.master.connect(this.reverb.dry);this.reverb.dry.connect(this.ctx.destination);this.master.connect(this.reverb.node);this.reverb.node.connect(this.reverb.wet);this.reverb.wet.connect(this.ctx.destination);this.reverb.wet.gain.value=0;}
  const r=this.reverb,now=this.ctx.currentTime;
  if(R){if(!r.buffers[level])r.buffers[level]=this.impulse(R.seconds);if(r.node.buffer!==r.buffers[level])r.node.buffer=r.buffers[level];}
  r.wetTarget=R?R.wet:0;r.dryTarget=R?R.dry:1;r.wet.gain.setTargetAtTime(r.wetTarget,now,.03);r.dry.gain.setTargetAtTime(r.dryTarget,now,.03);r.level=level;return level;
 }
 impulse(seconds){const rate=this.ctx.sampleRate,n=Math.max(1,Math.floor(rate*seconds)),b=this.ctx.createBuffer(2,n,rate);let seed=20261105;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1;};for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++){const t=i/n;d[i]=rnd()*Math.pow(1-t,3)*(i<rate*.004?i/(rate*.004):1);}}return b;}
}
window.GugakEngine=AudioEngine;
})();
