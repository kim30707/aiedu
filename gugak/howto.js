/* 국악 웹악기 — ‘어떻게 쳐요?’ 처음 쓰는 사람용 사용법 (셈제작소, 2026-11-11).
   악기 이름 줄의 단추 → 지금 악기·연주 방법·왼손 배치에 맞는 짧은 안내와 악기 그림 손 자리 번호.
   안내 글은 앱에 미리 넣은 글이다(외부 전송 없음). 처음 한 번만 저절로 뜨고, 그 뒤엔 단추로 연다. */
(function(){
  'use strict';
  const KEY='gugak-howto-seen-v1';
  const $=id=>document.getElementById(id);
  const app=()=>window.gugakApp;
  const mirrored=()=>document.querySelector('#scene svg#real-instrument')?.dataset.mirror==='left';
  const swap=s=>s.replace(/왼손|오른손|왼쪽|오른쪽/g,m=>({'왼손':'오른손','오른손':'왼손','왼쪽':'오른쪽','오른쪽':'왼쪽'})[m]);

  // a: 악기 그림에 이미 있는 글자(왼·오른 낱말 없이) — 그 옆에 번호를 붙인다. 없으면 번호만 글에.
  const GUIDE={
    gayageum:{
      realistic:[
        {a:'뜯기 · 쓸기',t:'오른손: 안족(ㅅ 받침) 오른쪽 줄을 톡 뜯어요. 여러 줄을 스치면 쓸기.'},
        {a:'누름 · 농현',t:'왼손: 안족 왼쪽 줄을 누르거나 흔들면 소리가 올라가고 떨려요. 오른손으로 뜯으면서 해요.'}],
      easy:[{a:'뜯기 · 쓸기',t:'줄 아무 곳이나 눌러요. 줄마다 소리 높이가 달라요.'}],
      song:{realistic:'검은 점(●) 줄을 안족 오른쪽에서 뜯으면 다음 점(○)으로 가요. 지금은 왼쪽 누름을 쓰지 않아요.',
            easy:'검은 점(●) 줄을 누르면 다음 점(○)으로 가요.'}},
    haegeum:{
      realistic:[
        {a:'위치 ↕',t:'왼손: 줄을 짚어요. 아래로 옮기면 높게, 위로 옮기면 낮게.'},
        {a:'활 ↔',t:'오른손: 활을 누른 채 좌우로 움직이면 소리가 나요.'}],
      easy:[{a:'위치 ↕',t:'줄을 누르고 있으면 활이 저절로 움직여 소리가 나요. 누른 채 아래로 옮기면 높게, 위로 옮기면 낮게.'}],
      song:{realistic:'‘중현’ 줄 검은 점 자리를 짚고 활을 그어요. 틀리면 “조금 더 위로/아래로”가 나와요.',
            easy:'‘중현’ 줄 검은 점 자리를 누르고 있어요. 틀리면 “조금 더 위로/아래로”가 나와요.'}},
    ajaeng:{
      realistic:[
        {a:'활 이동',t:'오른손: 오른쪽 현 위에서 활을 누른 채 좌우로 그어요.'},
        {a:'누름 · 농현',t:'왼손: 안족 왼쪽 현을 누르면 소리가 올라가요.'}],
      easy:[{a:'활 이동',t:'줄을 누르고 있으면 활이 저절로 움직여 소리가 나요.'}],
      song:{realistic:'검은 점 줄(4~7현)을 활로 그어요. ‘누름’ 음은 안족 왼쪽을 눌러 올리고 그어요.',
            easy:'검은 점 줄(4~7현)을 누르고 있어요. ‘누름’ 음은 앱이 대신 눌러 줘요.'}},
    janggu:{
      realistic:[
        {a:'궁편 ·',t:'궁편(손·궁굴채 쪽)을 치면 “쿵”.'},
        {a:'채편 ·',t:'채편(열채 쪽)을 치면 “덕”.'},
        {a:null,t:'궁편과 채편을 거의 함께 치면 “덩”.'}],
      song:{realistic:'칸에 적힌 대로 쳐요. 덩은 양손, 덕은 채편, 쿵은 궁편.'}}
  };
  GUIDE.janggu.easy=GUIDE.janggu.realistic;
  GUIDE.janggu.song.easy=GUIDE.janggu.song.realistic;

  function current(){
    const st=app()?.state||{};
    const inst=st.instrument,mode=st.interaction==='easy'?'easy':'realistic';
    const g=GUIDE[inst];
    const m=mirrored();
    const fix=t=>m?swap(t):t;
    if(!g){
      const hint=document.querySelector('#scene .real-hint, #scene [data-hint]')?.textContent||$('performance-hint')?.textContent||'';
      return {inst,mode,steps:[{a:null,t:hint||'악기 그림을 눌러 소리를 내 보세요.'}],song:null};
    }
    return {inst,mode,steps:g[mode].map(s=>({a:s.a,t:fix(s.t)})),song:fix(g.song[mode])};
  }

  function anchorEl(text){
    if(!text)return null;
    for(const el of document.querySelectorAll('#scene svg text')){
      if(el.textContent.includes(text)){const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)return el;}
    }
    return null;
  }

  let layer=null,card=null,open=false,raf=0;

  function build(){
    if(layer)return;
    layer=document.createElement('div');
    layer.id='howto-layer';layer.className='howto-layer';layer.hidden=true;
    card=document.createElement('section');
    card.id='howto-card';card.className='howto-card';card.setAttribute('role','dialog');card.setAttribute('aria-label','악기 사용법');
    document.body.append(layer,card);
    card.hidden=true;
    card.addEventListener('click',e=>{if(e.target.closest('[data-howto-close]'))close();});
  }

  function render(){
    if(!open)return;
    const c=current();
    const name=$('instrument-title')?.textContent||'';
    card.replaceChildren();
    const h=document.createElement('div');h.className='howto-head';
    const t=document.createElement('strong');t.textContent=name+' · 어떻게 쳐요?';
    const sub=document.createElement('span');sub.className='howto-sub';sub.textContent=(c.mode==='easy'?'쉬운 연주':'실물 주법')+(mirrored()?' · 왼손 배치':'');
    h.append(t,sub);
    const ol=document.createElement('ol');ol.className='howto-steps';
    c.steps.forEach((s,i)=>{const li=document.createElement('li');const b=document.createElement('b');b.className='howto-num';b.textContent=String(i+1);li.append(b,document.createTextNode(s.t));ol.append(li);});
    card.append(h,ol);
    if(c.song){const p=document.createElement('p');p.className='howto-song';const b=document.createElement('b');b.textContent='곡 따라 하기 ';p.append(b,document.createTextNode(c.song));card.append(p);}
    const foot=document.createElement('div');foot.className='howto-foot';
    const tip=document.createElement('span');tip.textContent='안내를 띄운 채 쳐 봐도 돼요.';
    const ok=document.createElement('button');ok.type='button';ok.dataset.howtoClose='1';ok.className='howto-ok';ok.textContent='알겠어요';
    foot.append(tip,ok);card.append(foot);
    place(c);
  }

  function place(c=current()){
    if(!open)return;
    const scene=$('scene');if(!scene)return;
    const sr=scene.getBoundingClientRect();
    layer.replaceChildren();
    c.steps.forEach((s,i)=>{
      const el=anchorEl(s.a);if(!el)return;
      const r=el.getBoundingClientRect();
      const d=document.createElement('span');d.className='howto-mark';d.textContent=String(i+1);d.dataset.step=String(i+1);
      d.style.left=Math.round(r.left-30)+'px';d.style.top=Math.round(r.top+r.height/2-12)+'px';
      layer.append(d);
      const u=document.createElement('span');u.className='howto-under';
      u.style.left=Math.round(r.left-4)+'px';u.style.top=Math.round(r.bottom+1)+'px';u.style.width=Math.round(r.width+8)+'px';
      layer.append(u);
    });
    // 카드 자리: 연주면 안 여러 자리·두 너비 중 악기 연주 자리(real-target)를 가장 덜 가리고 번호를 가리지 않는 곳.
    const narrow=sr.width<720,vb=Math.min(sr.bottom,innerHeight);
    card.classList.toggle('howto-narrow',narrow);
    const targets=[...document.querySelectorAll('#scene .real-target')].map(e=>e.getBoundingClientRect());
    const marks=[...layer.children].map(e=>e.getBoundingClientRect());
    const over=(a,x,y,w,h)=>[Math.max(0,Math.min(x+w,a.right)-Math.max(x,a.left)),Math.max(0,Math.min(y+h,a.bottom)-Math.max(y,a.top))];
    const score=(x,y,w,h)=>{let n=0;
      for(const a of targets){const [ix,iy]=over(a,x,y,w,h);
        if(a.height<=2)n+=(a.top>=y&&a.top<=y+h)?ix:0; else if(a.width<=2)n+=(a.left>=x&&a.left<=x+w)?iy:0; else n+=ix*iy/Math.max(a.width,a.height);}
      for(const m of marks){const [ix,iy]=over(m,x,y,w,h);if(ix>0&&iy>0)n+=5000;}
      n+=Math.max(0,y+h-vb)*20+Math.max(0,sr.top-y)*20;return n;};
    const widths=narrow?[Math.min(sr.width-16,520)]:[Math.min(300,Math.max(240,sr.width*0.27)),Math.min(sr.width-16,620)];
    let best=null;
    for(const w of widths){
      card.style.width=Math.round(w)+'px';const h=card.offsetHeight;
      const xs=[sr.left+8,sr.left+(sr.width-w)/2,sr.right-w-8];
      const ys=[sr.top+8,(sr.top+vb-h)/2,vb-h-8];
      for(const y of ys)for(const x of xs){const c=score(x,y,w,h);if(!best||c<best.c-0.5)best={x,y,w,c};}
    }
    card.style.width=Math.round(best.w)+'px';
    card.style.left=Math.round(best.x)+'px';card.style.top=Math.round(Math.max(8,best.y))+'px';
    card.dataset.cover=String(Math.round(best.c));
  }

  function schedule(){if(!open)return;cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>place());}

  function show(){build();open=true;layer.hidden=false;card.hidden=false;render();$('howto-open')?.setAttribute('aria-expanded','true');return true;}
  function close(){if(!open)return false;open=false;layer.hidden=true;card.hidden=true;layer.replaceChildren();
    try{localStorage.setItem(KEY,'1');}catch{}
    $('howto-open')?.setAttribute('aria-expanded','false');return true;}

  function addButton(){
    const meta=document.querySelector('#view-play .play-meta');
    if(!meta||$('howto-open'))return;
    const b=document.createElement('button');
    b.type='button';b.id='howto-open';b.className='howto-open';b.textContent='어떻게 쳐요?';b.setAttribute('aria-expanded','false');
    b.addEventListener('click',()=>open?close():show());
    meta.prepend(b);
  }

  function seen(){try{return localStorage.getItem(KEY)==='1';}catch{return true;}}
  function autoAllowed(){const h=location.hash.toLowerCase();return !/class|teacher|kit-|tune/.test(h)&&!/howto-off/.test(h);}

  function init(){
    addButton();
    addEventListener('gugak:scene',()=>{if(open)requestAnimationFrame(render);});
    addEventListener('resize',schedule);
    addEventListener('scroll',schedule,{passive:true});
    $('song-panel')?.addEventListener('toggle',schedule);
    if(window.ResizeObserver&&$('scene'))new ResizeObserver(schedule).observe($('scene'));
    addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    const forced=/howto(?!-off)/i.test(location.hash);
    if(forced||(autoAllowed()&&!seen()))setTimeout(()=>{if(!$('view-play')?.hidden)show();},400);
  }

  window.GugakHowto={open:show,close,isOpen:()=>open,current,guide:GUIDE,place};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else setTimeout(init,0);
})();
