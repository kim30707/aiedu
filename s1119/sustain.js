(function(root){
'use strict';
const cache=new WeakMap();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function prepare(ctx,input){
 if(cache.has(input))return cache.get(input);
 const sr=input.sampleRate,N=input.length,channels=input.numberOfChannels;
 if(N<128)throw new Error('지속 발음에 사용할 녹음 구간이 너무 짧습니다.');
 const mono=new Float32Array(N);
 for(let ch=0;ch<channels;ch++){const a=input.getChannelData(ch);for(let i=0;i<N;i++)mono[i]+=a[i]/channels;}
 const hop=Math.max(32,Math.round(sr*.02)),energy=[];
 for(let i=0;i<N;i+=hop){let sum=0;const end=Math.min(N,i+hop);for(let j=i;j<end;j++)sum+=mono[j]*mono[j];energy.push(Math.sqrt(sum/Math.max(1,end-i)));}
 const peak=Math.max(...energy),threshold=Math.max(1e-7,peak*.12);
 let first=energy.findIndex(x=>x>=threshold),last=energy.length-1;
 if(first<0)throw new Error('지속 발음에 사용할 유효한 녹음을 찾지 못했습니다.');
 while(last>first&&energy[last]<threshold)last--;
 const activeStart=first*hop,activeEnd=Math.min(N,(last+1)*hop);
 let earliest=Math.min(activeEnd-80,activeStart+Math.round(sr*.16));
 const available=activeEnd-earliest;
 if(available<sr*.20)earliest=Math.min(activeEnd-80,activeStart+Math.round(sr*.025));
 const span=activeEnd-earliest;
 const length=Math.min(span,Math.round(sr*clamp(span/sr*.6,.30,1.20)));
 let A=earliest,B=earliest+length,best=Infinity;
 for(let start=earliest;start+length<=activeEnd;start+=hop){
  const lo=Math.max(0,Math.floor(start/hop)),hi=Math.min(energy.length,Math.ceil((start+length)/hop));
  let mean=0,square=0;for(let i=lo;i<hi;i++){mean+=energy[i];square+=energy[i]*energy[i];}mean/=Math.max(1,hi-lo);
  if(mean<peak*.2)continue;
  const variance=Math.max(0,square/Math.max(1,hi-lo)-mean*mean);
  const score=Math.sqrt(variance)/Math.max(mean,1e-12)+.025*(start-earliest)/Math.max(1,span);
  if(score<best){best=score;A=start;B=start+length;}
 }
 B=Math.min(N,Math.max(A+80,B));
 const X=Math.max(16,Math.min(Math.round(sr*.14),Math.floor((B-A)*.24)));
 // Align phases across the overlap. This changes a copied playback buffer only.
 const search=Math.min(Math.round(sr*.025),Math.floor((B-A-X)*.15));
 let aligned=A,correlation=-2;
 for(let offset=-search;offset<=search;offset+=Math.max(1,Math.round(sr*.0005))){
  const candidate=A+offset;if(candidate<activeStart||candidate+X>=B-X)continue;
  let cross=0,left=0,right=0;
  for(let j=0;j<X;j+=4){const x=mono[B-X+j],y=mono[candidate+j];cross+=x*y;left+=x*x;right+=y*y;}
  const c=cross/Math.sqrt(Math.max(1e-24,left*right));
  if(c>correlation){correlation=c;aligned=candidate;}
 }
 A=aligned;
 const out=ctx.createBuffer(channels,B,sr),rho=clamp(correlation,0,1);
 for(let ch=0;ch<channels;ch++){
  const source=input.getChannelData(ch),target=out.getChannelData(ch);target.set(source.subarray(0,B));
  for(let j=0;j<X;j++){
   const phase=(j+1)/X*Math.PI/2,c=Math.cos(phase),s=Math.sin(phase);
   const normalization=Math.sqrt(c*c+s*s+2*rho*c*s);
   target[B-X+j]=(source[B-X+j]*c+source[A+j]*s)/Math.max(1e-9,normalization);
  }
 }
 const result={buffer:out,loopStart:(A+X)/sr,loopEnd:B/sr,sourceStart:A/sr,sourceEnd:B/sr,crossfadeSeconds:X/sr,correlation,originalDuration:input.duration,method:'recorded steady region, phase-aligned crossfade loop',attackOnce:true};
 if(!(result.loopEnd>result.loopStart))throw new Error('지속 구간을 만들 수 없습니다.');
 cache.set(input,result);return result;
}
root.GugakSustain={prepare};
})(typeof globalThis==='object'?globalThis:this);
