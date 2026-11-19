/* 국악 놀이터 캐릭터 그림 v0.2 (2026-11-16, Claude Opus 5.5 · 국악 AI 총괄 개발 세션; v0.2 = 원래 4종 그림에 가깝게 다듬음)
 * 셈제작소 국악 캐릭터 4종(둥카·소리·가율·바람, 2026-11-09 수정본)을 평면(2D) 부품 그림으로 다시 그렸다.
 * 머리 모양·머리색·피부색·윗옷·옷 색·바지 색·신발 색·꾸미개·든 악기를 바꿀 수 있다. 모두 가상 캐릭터이며 사진·얼굴을 쓰지 않는다.
 * 3D 공연실 캐릭터는 공연실 세션 담당이며, 같은 '꾸미기 코드'(아래 encode/decode)를 읽어 맞춘다.
 */
(()=>{'use strict';
const SKIN=[['#f7d7bd','밝은 살구'],['#eec29f','살구'],['#d9a47c','구릿빛'],['#b47a52','갈색'],['#86553a','짙은 갈색'],['#ef8566','산호(도깨비)'],['#a8dccd','민트(도깨비)'],['#c9b8e8','라벤더(도깨비)'],['#f6efd9','미색(정령)']];
const HAIRC=[['#e8562f','코랄'],['#26211f','검정'],['#6b4226','갈색'],['#3f7d4e','초록'],['#2b3a67','남색'],['#6d4a8f','보라'],['#e0b13a','금빛'],['#e88aa7','분홍'],['#c7cdd4','은빛'],['#0b7a75','틸']];
const CLOTH=[['#0b7a75','틸'],['#e8562f','코랄'],['#f2c14e','노랑'],['#bfe8dc','연민트'],['#2b3a67','남색'],['#6b2f5b','자주'],['#f4ead5','미색'],['#c8322f','다홍'],['#7fb7e6','하늘'],['#4c8b3f','풀빛'],['#2d2a2a','먹색'],['#f3a6b8','연분홍'],['#3f8f78','옥빛'],['#b8562a','적갈색']];
const HAIR=[['spiky','삐죽 머리'],['wavy','곱슬 머리'],['sleek','결 머리'],['bob','단발'],['pony','꽁지 머리'],['bun','쪽 찐 머리']];
const TOP=[['jeogori','저고리'],['baeja','배자(조끼)'],['jumper','생활한복 점퍼'],['durumagi','두루마기']];
const ACC=[['none','없음'],['daenggi','댕기'],['flower','꽃핀'],['band','머리띠'],['gat','갓'],['norigae','노리개']];
const PROP=[['janggu','장구'],['gayageum','가야금'],['daegeum','대금'],['kkwaenggwari','꽹과리'],['none','없음'],['haegeum','해금']];
const BG=[['none','없음'],['#e3f3ee','연민트'],['#fde7d9','살구빛'],['#fff4cc','달빛'],['#e6e1f5','보랏빛']];
const BASES={
 dungka:{name:'둥카',role:'장구 치는 도깨비',letter:'D',def:{skin:5,hair:0,hairColor:0,top:0,topColor:0,bottomColor:3,shoeColor:0,acc:0,prop:0,bg:1,ears:'pointy'}},
 sori:{name:'소리',role:'소리 정령',letter:'S',def:{skin:8,hair:0,hairColor:6,top:0,topColor:12,bottomColor:0,shoeColor:0,acc:0,prop:3,bg:3}},
 gayul:{name:'가율',role:'가야금 타는 친구',letter:'G',def:{skin:0,hair:1,hairColor:3,top:1,topColor:13,bottomColor:4,shoeColor:6,acc:0,prop:1,bg:2}},
 baram:{name:'바람',role:'대금 부는 친구',letter:'B',def:{skin:1,hair:2,hairColor:1,top:2,topColor:5,bottomColor:10,shoeColor:5,acc:0,prop:2,bg:4}}};
const KEYS=['skin','hair','hairColor','top','topColor','bottomColor','shoeColor','acc','prop','bg'];
const LIMIT={skin:SKIN.length,hair:HAIR.length,hairColor:HAIRC.length,top:TOP.length,topColor:CLOTH.length,bottomColor:CLOTH.length,shoeColor:CLOTH.length,acc:ACC.length,prop:PROP.length,bg:BG.length};
function make(base='dungka',over={}){const b=BASES[base]?base:'dungka';const a={v:1,base:b,...BASES[b].def,...over};for(const k of KEYS)a[k]=Math.max(0,Math.min(LIMIT[k]-1,Number(a[k])||0));return a;}
// 꾸미기 코드: 바탕 글자 + 칸마다 36진수 한 자 + 검사 글자. 예) D50202030001-K
const C36='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',CK='ABCDEFGHJKLMNPQRSTUVWXYZ';
function sum(s){let h=11;for(const ch of s)h=(h*37+ch.charCodeAt(0))%CK.length;return CK[h];}
function encode(a){const x=make(a.base,a);const body=BASES[x.base].letter+KEYS.map(k=>C36[x[k]]).join('');return body+'-'+sum(body);}
function decode(code){const m=/^\s*([DSGB])([0-9A-Z]{10})-([A-Z])\s*$/i.exec(code||'');if(!m)return null;const body=(m[1]+m[2]).toUpperCase();if(sum(body)!==m[3].toUpperCase())return null;const base=Object.keys(BASES).find(k=>BASES[k].letter===body[0]);const o={};KEYS.forEach((k,i)=>o[k]=C36.indexOf(body[i+1]));for(const k of KEYS)if(o[k]<0||o[k]>=LIMIT[k])return null;return make(base,o);}
function random(base){const b=base||Object.keys(BASES)[Math.floor(Math.random()*4)];const r=k=>Math.floor(Math.random()*LIMIT[k]);const a=make(b,{hairColor:r('hairColor'),topColor:r('topColor'),bottomColor:r('bottomColor'),shoeColor:r('shoeColor'),acc:r('acc'),bg:r('bg')});if(b!=='sori'){a.hair=r('hair');a.top=r('top');}return a;}
const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const t=f<0?0:255,p=Math.abs(f);r=Math.round((t-r)*p+r);g=Math.round((t-g)*p+g);b=Math.round((t-b)*p+b);return'#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);};

/* ── 부품 그림 (viewBox 0 0 200 260) ── v0.2: 원래 4종 그림에 가깝게(눈·입·볼, 둥카 매듭·띠, 소리 옥구슬·리본, 가율 배자·땋은 머리, 바람 구름 무늬·건빵 주머니·바람 띠) */
const INK='#2a1d17';
const MOOD={dungka:['grin','dash'],sori:['open','dash'],gayul:['open','soft'],baram:['calm','soft']};
function knot(x,y,col='#e0b13a'){return`<g transform="translate(${x} ${y})" fill="${col}"><circle r="3.8"/><circle cx="-6" r="3.2"/><circle cx="6" r="3.2"/><circle cy="-5.5" r="3.2"/><path d="M-1.6 3 L-4.5 13 M1.6 3 L4.5 13" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/></g>`;}
function face(skin,mood='open',cheek='soft'){const brow=shade(skin,-.5);
 const eye=x=>mood==='calm'
  ?`<ellipse cx="${x}" cy="101" rx="6.8" ry="7.5" fill="${INK}"/><circle cx="${x}" cy="103" r="3.8" fill="#6b3f24"/><circle cx="${x+2.3}" cy="99" r="2.1" fill="#fff"/><path d="M${x-9} 97 Q${x} 92 ${x+9} 97 L${x+9} 91 L${x-9} 91Z" fill="${skin}"/><path d="M${x-9} 96.5 Q${x} 91.5 ${x+9} 96.5" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
  :`<ellipse cx="${x}" cy="99" rx="7.6" ry="9.6" fill="${INK}"/><circle cx="${x}" cy="102" r="4.8" fill="#6b3f24"/><circle cx="${x+2.6}" cy="95" r="2.8" fill="#fff"/><circle cx="${x-2.6}" cy="104.5" r="1.3" fill="#fff"/>`;
 const by=mood==='calm'?85:84;
 const brows=`<path d="M75 ${by} Q82 ${by-4} 89 ${by+(mood==='calm'?1:0)}" stroke="${brow}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M111 ${by+(mood==='calm'?1:0)} Q118 ${by-4} 125 ${by}" stroke="${brow}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
 const mouth=mood==='grin'
  ?`<path d="M83 111 Q100 108 117 111 Q115 131 100 132 Q85 131 83 111Z" fill="#6e2418"/><path d="M85 111.5 Q100 109 115 111.5 L114 116 Q100 113.5 86 116Z" fill="#fff"/><path d="M88 115 l2.6 5 l2.6 -5Z M107 115 l2.6 5 l2.6 -5Z" fill="#fff"/><path d="M91 127 Q100 121 109 127 Q100 132 91 127Z" fill="#e8706a"/>`
  :mood==='calm'
  ?`<path d="M92 115 Q101 120 109 113" stroke="#7a2e22" stroke-width="2.8" fill="none" stroke-linecap="round"/>`
  :`<path d="M88 112 Q100 111 112 112 Q110 127 100 127 Q90 127 88 112Z" fill="#7a2e22"/><path d="M90 112.5 L110 112.5 L109 116 L91 116Z" fill="#fff"/><path d="M93.5 122 Q100 117.5 106.5 122 Q100 127 93.5 122Z" fill="#e8706a"/>`;
 const cheeks=cheek==='dash'
  ?`<path d="M64 112 l3 -6 M70 112 l3 -6 M127 112 l3 -6 M133 112 l3 -6" stroke="#e0565a" stroke-width="2.6" stroke-linecap="round"/>`
  :`<ellipse cx="70" cy="112" rx="7" ry="4" fill="#f08a8a" opacity=".5"/><ellipse cx="130" cy="112" rx="7" ry="4" fill="#f08a8a" opacity=".5"/>`;
 return brows+eye(82)+eye(118)+mouth+cheeks;}
function hairBack(style,c){switch(style){
 case'wavy':return`<path d="M52 98 Q44 50 100 44 Q156 50 148 98 Q152 124 140 134 L136 104 Q100 88 64 104 L60 134 Q48 124 52 98Z" fill="${c}"/>`;
 case'bob':return`<path d="M48 120 Q40 46 100 42 Q160 46 152 120 L138 120 Q140 80 100 76 Q60 80 62 120Z" fill="${c}"/>`;
 case'pony':return`<path d="M138 74 Q182 88 170 156 Q162 128 140 112Z" fill="${c}"/><circle cx="146" cy="78" r="7" fill="${shade(c,-.35)}"/>`;
 case'bun':return`<circle cx="100" cy="40" r="15" fill="${c}"/><path d="M78 42 L124 36" stroke="#e0b13a" stroke-width="3.5" stroke-linecap="round"/>`;
 default:return'';}}
function hairFront(style,c){const d=shade(c,-.25),l=shade(c,.22);switch(style){
 case'spiky':return`<path d="M54 94 L48 64 L64 70 L60 42 L80 55 L84 28 L100 48 L116 28 L120 55 L140 42 L136 70 L152 64 L146 94 Q140 72 100 68 Q60 72 54 94Z" fill="${c}"/><g fill="${d}" opacity=".7"><path d="M64 70 L80 55 L74 80Z"/><path d="M120 55 L136 70 L127 78Z"/><path d="M100 48 L91 64 L109 64Z"/><path d="M48 64 L64 70 L56 84Z"/></g><g fill="${l}" opacity=".8"><path d="M84 28 L100 48 L90 52Z"/><path d="M140 42 L136 70 L130 56Z"/><path d="M60 42 L80 55 L68 58Z"/></g>`;
 case'wavy':return`<path d="M54 90 Q62 58 100 56 Q138 58 146 90 Q130 76 118 84 Q108 70 96 82 Q84 70 74 86 Q64 78 54 90Z" fill="${c}"/><path d="M54 88 Q48 108 58 124 Q60 106 68 96Z" fill="${c}"/><path d="M146 88 Q153 110 141 126 Q140 106 132 96Z" fill="${c}"/><path d="M64 66 Q70 58 80 60 M120 60 Q132 60 136 68" stroke="${d}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M100 50 Q106 28 122 30 Q108 36 104 52" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><g fill="${d}"><circle cx="58" cy="136" r="6"/><circle cx="57" cy="148" r="5.5"/><circle cx="56" cy="159" r="5"/></g><rect x="50.5" y="164" width="11" height="5.5" rx="2.5" fill="#0b7a75"/><path d="M53 169 L56 181 L59 169Z" fill="${d}"/>`;
 case'sleek':return`<path d="M66 58 Q62 42 78 46 Q84 32 98 42 Q110 30 120 44 Q134 38 136 58Z" fill="${c}"/><path d="M52 94 Q46 46 100 40 Q154 44 150 92 Q146 72 130 70 L136 94 Q122 74 106 76 L110 62 Q94 74 78 72 L82 60 Q62 70 56 98Z" fill="${c}"/><path d="M118 46 Q138 52 144 76 Q134 62 122 60Z" fill="#c8322f"/><path d="M120 44 Q134 38 136 52Z" fill="#c8322f"/><path d="M84 36 L98 42 L90 46Z" fill="${l}" opacity=".7"/>`;
 case'bob':return`<path d="M54 92 Q58 54 100 52 Q142 54 146 92 Q120 70 100 74 Q80 70 54 92Z" fill="${c}"/>`;
 case'pony':return`<path d="M54 92 Q56 50 100 48 Q144 50 146 92 Q126 66 100 70 Q74 66 54 92Z" fill="${c}"/>`;
 case'bun':return`<path d="M54 94 Q54 52 100 50 Q146 52 146 94 Q132 66 100 64 Q68 66 54 94Z" fill="${c}"/><path d="M100 52 L100 66" stroke="${d}" stroke-width="2"/>`;
 default:return'';}}
function ears(skin,pointy){const o=shade(skin,-.18);return pointy?`<path d="M58 90 L30 66 L60 110Z" fill="${skin}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/><path d="M142 90 L170 66 L140 110Z" fill="${skin}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/><path d="M54 92 L40 78 L56 102Z M146 92 L160 78 L144 102Z" fill="${shade(skin,-.12)}"/>`:`<ellipse cx="55" cy="100" rx="7" ry="10" fill="${skin}" stroke="${o}" stroke-width="2"/><ellipse cx="145" cy="100" rx="7" ry="10" fill="${skin}" stroke="${o}" stroke-width="2"/>`;}
function top(style,c,skin){const d=shade(c,-.22),l=shade(c,.55);const hands=`<circle cx="47" cy="186" r="9" fill="${skin}"/><circle cx="153" cy="186" r="9" fill="${skin}"/>`;
 const sleeve=col=>`<path d="M66 136 L40 178 L54 188 L76 154Z" fill="${col}"/><path d="M134 136 L160 178 L146 188 L124 154Z" fill="${col}"/>`;
 switch(style){
 case'baeja':return sleeve('#f4ead5')+`<path d="M64 132 Q100 122 136 132 L140 196 L60 196Z" fill="#f4ead5"/><path d="M88 132 L100 152 L112 132" fill="none" stroke="#fff" stroke-width="4.5"/><path d="M66 134 L90 134 L100 158 L110 134 L134 134 L137 194 L63 194Z" fill="${c}"/><path d="M66 134 L90 134 L100 158 L110 134 L134 134" fill="none" stroke="${d}" stroke-width="3"/><path d="M100 160 L100 194" stroke="${d}" stroke-width="2"/><rect x="95" y="162" width="10" height="6" rx="2" fill="${d}"/><path d="M40 178 L54 188" stroke="#7a4a22" stroke-width="6"/><path d="M160 178 L146 188" stroke="#7a4a22" stroke-width="6"/>`+hands;
 case'jumper':return sleeve(c)+`<path d="M60 134 Q100 120 140 134 L144 192 Q100 202 56 192Z" fill="${c}"/><path d="M58 186 Q100 196 142 186 L144 194 Q100 204 56 194Z" fill="${d}"/><path d="M88 130 L100 146 L112 130" fill="none" stroke="#f4ead5" stroke-width="5" stroke-linejoin="round"/><path d="M100 146 L100 186" stroke="#f4ead5" stroke-width="3"/>${knot(100,154,'#f4ead5')}<path d="M112 178 q2 -9 11 -6 q2 -8 11 -4 q7 3 3 9 q-3 4 -8 1" fill="none" stroke="${l}" stroke-width="3" stroke-linecap="round"/><path d="M40 178 L54 188" stroke="#f4ead5" stroke-width="7"/><path d="M160 178 L146 188" stroke="#f4ead5" stroke-width="7"/>`+hands;
 case'durumagi':return sleeve(c)+`<path d="M62 132 Q100 122 138 132 L150 238 L50 238Z" fill="${c}"/><path d="M100 140 L100 238" stroke="${d}" stroke-width="2"/><path d="M86 130 L100 154 L114 130" fill="none" stroke="#fff" stroke-width="5"/><path d="M106 152 Q122 158 116 182 M106 152 Q128 152 128 172" fill="none" stroke="${l}" stroke-width="5" stroke-linecap="round"/>`+hands;
 default:return sleeve(c)+`<path d="M64 132 Q100 122 136 132 L140 196 L60 196Z" fill="${c}"/><path d="M86 130 L100 154 L114 130" fill="none" stroke="#fff" stroke-width="5"/><path d="M106 152 Q122 158 116 184 M106 152 Q128 152 128 174" fill="none" stroke="#f2c14e" stroke-width="5" stroke-linecap="round"/><path d="M40 178 L54 188" stroke="${l}" stroke-width="7"/><path d="M160 178 L146 188" stroke="${l}" stroke-width="7"/>`+hands;}}
function bottom(c,shoe,cargo){const d=shade(c,-.25);return`<path d="M64 190 L56 232 Q74 240 96 232 L100 194Z" fill="${c}"/><path d="M136 190 L144 232 Q126 240 104 232 L100 194Z" fill="${c}"/><path d="M58 226 Q76 232 94 226 M142 226 Q124 232 106 226" stroke="${d}" stroke-width="4" fill="none"/>${cargo?`<rect x="59" y="204" width="14" height="15" rx="2" fill="${d}"/><rect x="127" y="204" width="14" height="15" rx="2" fill="${d}"/><path d="M59 208 L73 208 M127 208 L141 208" stroke="${shade(c,.2)}" stroke-width="1.5"/>`:''}<ellipse cx="78" cy="245" rx="20" ry="5.5" fill="#f4f1ea"/><ellipse cx="122" cy="245" rx="20" ry="5.5" fill="#f4f1ea"/><path d="M59 244 Q60 232 78 231 Q96 232 97 244Z" fill="${shoe}"/><path d="M103 244 Q104 232 122 231 Q140 232 141 244Z" fill="${shoe}"/><path d="M72 236 l7 -2.5 M74 240 l7 -2.5 M116 236 l7 -2.5 M118 240 l7 -2.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;}
function acc(kind,hairC){switch(kind){
 case'daenggi':return`<path d="M142 112 Q150 150 140 186 L148 188 Q160 150 150 112Z" fill="#c8322f"/><path d="M140 186 L136 198 L146 192 L150 200 L148 188Z" fill="#c8322f"/>`;
 case'flower':return`<g transform="translate(132 64)"><circle cx="0" cy="-7" r="5" fill="#f3a6b8"/><circle cx="7" cy="-2" r="5" fill="#f3a6b8"/><circle cx="4" cy="6" r="5" fill="#f3a6b8"/><circle cx="-4" cy="6" r="5" fill="#f3a6b8"/><circle cx="-7" cy="-2" r="5" fill="#f3a6b8"/><circle r="3.5" fill="#f2c14e"/></g>`;
 case'band':return`<path d="M56 80 Q100 38 144 80" fill="none" stroke="#e8562f" stroke-width="7" stroke-linecap="round"/>`;
 case'gat':return`<ellipse cx="100" cy="52" rx="62" ry="9" fill="#1f1d1d" opacity=".82"/><path d="M80 52 L82 22 Q100 16 118 22 L120 52Z" fill="#1f1d1d" opacity=".85"/><path d="M62 54 Q66 110 74 130 M138 54 Q134 110 126 130" stroke="#1f1d1d" stroke-width="1.5" fill="none" opacity=".6"/>`;
 case'norigae':return`<g transform="translate(116 176)"><circle r="6" fill="#0b7a75"/><path d="M0 6 L0 14" stroke="#c8322f" stroke-width="2"/><path d="M-4 14 L-6 34 M0 14 L0 36 M4 14 L6 34" stroke="#c8322f" stroke-width="2.5"/></g>`;
 default:return'';}}
function prop(kind){switch(kind){
 case'janggu':return`<g transform="translate(100 172)"><path d="M-30 -14 Q0 -2 30 -14 L30 14 Q0 2 -30 14Z" fill="#8a4b24"/><path d="M-24 -10 Q0 0 24 -10" stroke="#b0703a" stroke-width="2" fill="none"/><ellipse cx="-32" cy="0" rx="9" ry="20" fill="#f4ead5" stroke="#d9b98a" stroke-width="3.5"/><ellipse cx="32" cy="0" rx="9" ry="20" fill="#f4ead5" stroke="#d9b98a" stroke-width="3.5"/><path d="M-30 -18 L-8 14 L8 -14 L30 18 M-30 18 L-8 -14 L8 14 L30 -18" stroke="#c8322f" stroke-width="1.4" fill="none" opacity=".85"/></g><path d="M153 186 L170 140" stroke="#c99a4c" stroke-width="5" stroke-linecap="round"/><path d="M47 186 L34 146" stroke="#c99a4c" stroke-width="4" stroke-linecap="round"/><circle cx="33" cy="143" r="5.5" fill="#e9d9b6"/>`;
 case'gayageum':return`<g transform="rotate(-8 100 206)"><rect x="26" y="196" width="150" height="18" rx="6" fill="#9a5b2e"/><rect x="30" y="199" width="12" height="12" rx="2" fill="none" stroke="#e0b13a" stroke-width="1.5"/><g stroke="#f4ead5" stroke-width="1">${Array.from({length:6},(_,i)=>`<line x1="34" x2="168" y1="${199+i*2.4}" y2="${199+i*2.4}"/>`).join('')}</g><g fill="#f4ead5">${Array.from({length:6},(_,i)=>`<path d="M${70+i*14} 196 l4 -7 l4 7z"/>`).join('')}</g><path d="M164 196 L164 214" stroke="#7a1f1f" stroke-width="4"/><path d="M176 206 L186 226" stroke="#e0b13a" stroke-width="3"/><path d="M183 222 l-3 10 l5 -2 l2 6 l2 -10z" fill="#e0b13a"/></g>`;
 case'daegeum':return`<path d="M118 120 L192 92" stroke="#c99a4c" stroke-width="7" stroke-linecap="round"/><g fill="#5a3a1a"><circle cx="150" cy="108" r="1.8"/><circle cx="160" cy="104" r="1.8"/><circle cx="170" cy="100" r="1.8"/></g><path d="M126 117 L130 115" stroke="#c8322f" stroke-width="7"/><path d="M134 114 L136 113 M180 96.5 L182 95.8" stroke="#2f6b4f" stroke-width="7"/>`;
 case'haegeum':return`<path d="M160 206 L166 96" stroke="#7a4a22" stroke-width="5" stroke-linecap="round"/><path d="M166 96 q6 -6 2 -12" stroke="#7a4a22" stroke-width="4" fill="none" stroke-linecap="round"/><rect x="150" y="198" width="22" height="14" rx="4" fill="#a8683a" stroke="#6b3f1c" stroke-width="2"/><path d="M163 198 L167 108 M159 198 L164 108" stroke="#f4ead5" stroke-width="1"/><circle cx="165" cy="112" r="2.5" fill="#c8322f"/><path d="M128 160 L192 178" stroke="#5a3a1a" stroke-width="3" stroke-linecap="round"/><path d="M130 163 L190 180" stroke="#e9e2cf" stroke-width="1.4"/>`;
 case'kkwaenggwari':return`<path d="M164 178 L164 184" stroke="#8a2a2a" stroke-width="2.5"/><circle cx="164" cy="198" r="15" fill="#e0b13a" stroke="#b48a1d" stroke-width="3"/><circle cx="164" cy="198" r="7" fill="none" stroke="#b48a1d" stroke-width="1.5"/><path d="M157 192 Q160 189 164 189" stroke="#fff3c4" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M47 186 L30 150" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/><circle cx="29" cy="147" r="5.5" fill="#8a5a2b"/>`;
 default:return'';}}
// 바탕별 고정 무늬(꾸미기 칸과 따로): 둥카 매듭·노랑 띠, 바람 보랏빛 바람 띠(뒤)
function extraBack(base){return base==='baram'?`<g fill="none" stroke="#c9b8e8" stroke-width="5" stroke-linecap="round" opacity=".8"><path d="M44 196 Q12 182 22 150 Q32 124 58 134"/><path d="M150 214 Q188 204 182 168 Q178 146 158 150"/></g>`:'';}
function extraFront(base){return base==='dungka'?knot(100,147)+`<path d="M60 184 Q100 194 140 184 L141 195 Q100 205 59 195Z" fill="#f2c14e"/><path d="M62 192 Q42 200 22 222 Q36 216 44 222 Q50 206 66 198Z" fill="#f2c14e"/><path d="M60 194 Q44 204 32 218" stroke="#d9a520" stroke-width="2" fill="none"/>`:'';}
function sori(a){const body=SKIN[a.skin][0],rib=HAIRC[a.hairColor][0],bead=CLOTH[a.topColor===6?0:a.topColor][0],sh=shade(body,-.12),rl=shade(rib,.45);
 const ribbon=`<path d="M80 74 Q60 36 32 50 Q12 62 24 84 Q32 100 14 116" stroke="${rib}" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M76 70 Q60 44 36 54 Q20 64 28 82" stroke="${rl}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
 const beads=`<path d="M68 80 L68 86" stroke="#b48a1d" stroke-width="2"/><circle cx="68" cy="85" r="3" fill="#e0b13a"/><circle cx="68" cy="93" r="7" fill="${bead}"/><circle cx="65.5" cy="90.5" r="2" fill="#fff" opacity=".55"/>`;
 return`${ribbon}<g transform="translate(200 0) scale(-1 1)">${ribbon}</g>
<ellipse cx="52" cy="176" rx="10" ry="8" fill="${body}"/><ellipse cx="150" cy="182" rx="10" ry="8" fill="${body}"/>
<path d="M62 118 Q50 68 100 60 Q150 68 138 118 Q160 148 138 176 Q150 202 124 206 Q112 224 96 210 Q74 222 70 198 Q44 188 62 164 Q44 140 62 118Z" fill="${body}"/>
<path d="M82 200 q-10 -2 -8 -10 q6 -5 11 1 M118 198 q10 -1 8 -9 q-5 -5 -10 0" stroke="${sh}" stroke-width="3" fill="none" stroke-linecap="round"/>
${beads}<g transform="translate(200 0) scale(-1 1)">${beads}</g>
<path d="M78 138 L100 156 L122 138" fill="none" stroke="#e0b13a" stroke-width="5" stroke-linejoin="round"/>${[[100,163,7],[80,147,5.5],[120,147,5.5]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${bead}"/><circle cx="${x-r*.35}" cy="${y-r*.35}" r="${r*.3}" fill="#fff" opacity=".55"/>`).join('')}
<g transform="translate(0 6)">${face(body,'open','dash')}</g>`;}
function render(av,{size=200,animate=false,id=''}={}){const a=make(av?.base,av||{});const skin=SKIN[a.skin][0],hc=HAIRC[a.hairColor][0],tc=CLOTH[a.topColor][0],bc=CLOTH[a.bottomColor][0],sc=CLOTH[a.shoeColor][0];const hs=HAIR[a.hair][0],ts=TOP[a.top][0],ac=ACC[a.acc][0],pr=PROP[a.prop][0],bg=BG[a.bg][0];
 const back=bg==='none'?'':`<circle cx="100" cy="140" r="96" fill="${bg}"/>`;const [mood,cheek]=MOOD[a.base];
 let inner;
 if(a.base==='sori')inner=sori(a)+prop(pr)+(ac==='flower'||ac==='band'?acc(ac,hc):'');
 else inner=extraBack(a.base)+hairBack(hs,hc)+bottom(bc,sc,a.base==='baram')+top(ts,tc,skin)+extraFront(a.base)+ears(skin,a.base==='dungka')+`<ellipse cx="100" cy="94" rx="46" ry="44" fill="${skin}" stroke="${shade(skin,-.18)}" stroke-width="2.5"/>`+face(skin,mood,cheek)+hairFront(hs,hc)+acc(ac,hc)+prop(pr);
 return`<svg xmlns="http://www.w3.org/2000/svg" ${id?`id="${id}" `:''}class="gg-avatar${animate?' gg-anim':''}" viewBox="0 0 200 260" width="${size}" height="${Math.round(size*1.3)}" role="img" aria-label="${BASES[a.base].name} 캐릭터">${back}<ellipse cx="100" cy="252" rx="58" ry="6" fill="#000" opacity=".12"/><g class="gg-body">${inner}</g></svg>`;}
const KEY='gugak-avatar-v1';
function load(){try{const s=localStorage.getItem(KEY);if(s){const a=decode(s);if(a)return a;}}catch(e){}return null;}
function save(a){try{localStorage.setItem(KEY,encode(a));}catch(e){}}
window.GugakAvatar={BASES,KEYS,LIMIT,SKIN,HAIRC,CLOTH,HAIR,TOP,ACC,PROP,BG,make,encode,decode,random,render,load,save};
})();
