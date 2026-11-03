/* AI교육 수업 안내 — 홈페이지 스크립트
   - 화면: #home #programs #<수업id> #schedule #ask #apply (해시 토큰)
   - 공유 일정: db `schedule/days` (모두 읽기, 관리자만 쓰기)
   - 접수: db `requests/<id>` (본인·관리자만 읽기). 쓸 수 없는 방문자는 복사용 접수 메시지로 안내
   - AI: sample (방문자 본인의 Claude 계정). 없으면 규칙 추천·FAQ 검색(‘AI 아님’ 표시) */
(function () {
  "use strict";

  const S = {
    P: null, SCH: null, days: {}, dbDays: null, dbState: "loading",
    db: null, user: null, uid: null, isAdmin: false, canWrite: null,
    sample: null, sampleState: "checking",
    cal: { y: 2026, m: 10 }, prefill: {}, requests: [], reqUnsub: null,
    chat: [], chatBusy: false,
  };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const won = (n) => (n % 10000 === 0 ? (n / 10000).toLocaleString("ko-KR") + "만 원" : n.toLocaleString("ko-KR") + "원");
  const ymd = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const ACC = { vermilion: "var(--brand)", indigo: "var(--violet)", jade: "var(--mint)", ochre: "var(--sky)" }; // 데이터의 옛 색 이름 → 새 브랜드 색
  const PHASE = { building: "building", ready: "ready", planned: "planned" };

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  async function copyText(text, btn) {
    try { await navigator.clipboard.writeText(text); if (btn) { btn.classList.add("ok"); btn.textContent = "복사됨"; setTimeout(() => { btn.classList.remove("ok"); btn.textContent = btn.dataset.label || "복사"; }, 1800); } }
    catch (e) {
      const r = document.createRange(); const target = btn && btn.dataset.sel ? $(btn.dataset.sel) : null;
      if (target) { r.selectNodeContents(target); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("복사가 막혀 있어 내용을 선택해 두었습니다. 직접 복사해 주세요."); }
      else toast("복사가 막혀 있습니다. 직접 선택해 복사해 주세요.");
    }
  }
  const prog = (id) => S.P.programs.find((p) => p.id === id);

  /* ───────── 일정 계산 ───────── */
  function readyFrom(p) { const b = S.SCH.blocks.find((x) => x.program === p.id); if (!b) return null; const d = parse(b.end); d.setDate(d.getDate() + 1); return d; }
  function availableOn(date) { return S.P.programs.filter((p) => { const r = readyFrom(p); return r && date >= r; }); }
  function dayInfo(date) {
    const key = ymd(date); const dow = date.getDay();
    const closed = S.SCH.closed.find((c) => c.date === key);
    const over = S.days[key];
    if (over && over.s) {
      const lab = { open: "희망일 신청", pending: "협의 중", booked: "예약 완료", closed: "닫힘" }[over.s] || "";
      const p = over.p ? prog(over.p) : null;
      return { s: over.s, label: (p ? p.short + " · " : "") + lab, key };
    }
    if (closed) return { s: "closed", label: closed.label, key };
    if (dow === 0 || dow === 6) return { s: "weekend", label: "", key };
    if (date < parse(S.SCH.openFrom)) return { s: "prep", label: "준비 기간", key };
    if (date > parse(S.SCH.openUntil)) return { s: "later", label: "", key };
    const av = availableOn(date);
    if (!av.length) return { s: "prep", label: "준비 기간", key };
    return { s: "open", label: av.length === 1 ? av[0].short : av[0].short + " 외 " + (av.length - 1), key, av };
  }
  function nextOpenDates(pid, n) {
    const out = []; const d = new Date(Math.max(Date.now(), parse(S.SCH.openFrom).getTime())); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < 400 && out.length < n; i++) {
      const info = dayInfo(d);
      if (info.s === "open" && (!pid || (info.av || []).some((p) => p.id === pid))) out.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  const fmtDay = (d) => (d.getMonth() + 1) + "월 " + d.getDate() + "일(" + "일월화수목금토"[d.getDay()] + ")";

  /* ───────── 공통 조각 ───────── */
  function pill(p) { return `<span class="pill ${PHASE[p.status.phase] || "planned"}">${esc(p.status.label)}</span>`; }
  function card(p, feature) {
    const facts = feature ? `<dl class="facts"><div><dt>대상</dt><dd>${esc(p.grades)}</dd></div><div><dt>시간</dt><dd>${esc(p.time)}</dd></div><div><dt>준비</dt><dd>${esc(p.devices)}</dd></div></dl>` : "";
    return `<a class="card rv${feature ? " feature" : ""}" href="#${p.id}">
      <div class="pic"><img src="${esc(p.image)}" alt="${esc(p.imageAlt || p.name + " 수업 장면 예시 (AI 생성 예시 이미지, 실제 수업 사진 아님)")}" loading="lazy" onerror="this.remove()"><span class="aitag" aria-hidden="true">${esc(p.imageTag || "AI 생성 예시")}</span></div>
      <div class="body">
        <div class="sub"><span>${String(p.order).padStart(2, "0")} · ${esc(p.track || p.subject)}</span>${pill(p)}</div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.tagline)}</p>${facts}
        <div class="foot"><span>${esc(p.status.window)}</span><span class="arrow" aria-hidden="true">→</span></div>
      </div></a>`;
  }
  function cards(list) {
    const feat = list.filter((p) => p.feature), rest = list.filter((p) => !p.feature);
    return `${feat.map((p) => card(p, true)).join("")}<div class="grid rail" role="region" aria-label="다른 수업 ${rest.length}가지" tabindex="0">${rest.map((p) => card(p)).join("")}</div><p class="rail-hint">옆으로 밀어 더 보기 →</p>`;
  }
  function timeline(highlight) {
    const start = parse("2026-11-01"), end = parse("2027-03-01"), span = end - start;
    const pct = (d) => Math.max(0, Math.min(100, ((parse(d) - start) / span) * 100));
    const rows = S.SCH.blocks.map((b) => {
      const p = b.program ? prog(b.program) : null;
      const cls = p ? p.accent : "";
      const l = pct(b.start), w = Math.max(1.5, pct(b.end) + (100 / 120) - l);
      return `<div class="row"><div class="lab"${highlight && p && p.id === highlight ? ' style="color:var(--brand)"' : ""}>${esc(p ? p.short : "여유")}</div>
        <div class="bar" title="${esc(b.label)} ${esc(b.start)} ~ ${esc(b.end)}"><i class="${cls}" style="left:${l}%;width:${w}%;${highlight && p && p.id !== highlight ? "opacity:.35" : ""}"></i></div></div>`;
    }).join("");
    const months = ["2026-11-01", "2026-12-01", "2027-01-01", "2027-02-01", "2027-03-01"];
    const ticks = months.map((m, i) => `<span style="left:${pct(m)}%${i === months.length - 1 ? ";transform:translateX(-100%)" : i === 0 ? ";transform:none" : ""}">${parse(m).getMonth() + 1}월</span>`).join("");
    return `<div class="tl" role="img" aria-label="일곱 분야 수업의 제작 목표 기간 표. 국악 11월 2일~22일, 교과 연극 11월 5일~22일, 협동연극 11월 4일~8일, 꿈 다이어리 11월 4일~8일, 게임 12월 28일~1월 10일, 수학 1월 11~17일, 영어 1월 18~31일, 과학 2월 1~14일.">${rows}<div class="axis"><div></div><div>${ticks}</div></div></div>`;
  }
  function checklist(items) {
    return `<ul class="check">${items.map((r) => `<li><span class="m ${r.state}" aria-hidden="true">${r.state === "done" ? "✓" : ""}</span><div><b>${esc(r.item)}</b>${r.note ? `<span>${esc(r.note)}</span>` : ""}</div></li>`).join("")}</ul>`;
  }
  function pricing() {
    const pr = S.P.pricing;
    return `<div class="tablewrap"><table><thead><tr><th>유형</th><th>단위</th><th>제안 범위</th><th>조건</th></tr></thead><tbody>${pr.rows.map((r) => `<tr><td><b>${esc(r.type)}</b></td><td>${esc(r.unit)}</td><td class="price num">${won(r.min)} ~ ${won(r.max)}</td><td class="muted small">${esc(r.cond)}</td></tr>`).join("")}</tbody></table></div><p class="tiny" style="margin-top:10px">${esc(pr.note)}</p>`;
  }
  function honestBox(title, items) { return `<div class="honest rv"><h3>${esc(title)}</h3><ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`; }

  /* ───────── 화면: 소개 ───────── */
  const HERO = `<section class="hero"><div class="wrap">
      <div>
        <span class="eyebrow appear appear--rise" style="--d:.05s">AI교육 수업 안내 · 2026–2027</span>
        <h1 style="margin-top:14px"><span class="line appear appear--blur" style="--d:.12s">AI가 만든 것을,</span><span class="line appear appear--blur" style="--d:.22s"><em>아이들이 고칩니다.</em></span></h1>
        <p class="lead appear appear--rise" style="--d:.36s">국악·연극·수학·게임… 일곱 분야의 수업에서 학생은 AI에게 요청하고, 결과를 듣고 보고 검산해서 직접 바로잡습니다. 2026년 11월 국악 수업부터 차례로 준비합니다.</p>
        <div class="ctas"><a class="btn primary appear appear--btn" style="--d:.48s" href="#gugak">국악 수업 먼저 보기</a><a class="btn appear appear--btn" style="--d:.56s" href="#schedule">일정 · 접수</a></div>
        <div class="meta appear appear--rise" style="--d:.64s"><span>첫 대상 <b>초등 5~6학년</b></span><span>구성 <b>2인 1조 · 80분</b></span><span>기기 <b>학교 태블릿</b></span></div>
      </div>
      <figure class="scene appear appear--rise" style="--d:.10s;--dur:1s">
        <div class="ph"><img src="img/hero.jpg" width="1280" height="956" fetchpriority="high" alt="AI 생성 예시 이미지: 책상 위에 가야금 줄과 안족, 파형이 뜬 태블릿, 빈 요청 카드와 연필이 놓여 있다. 가야금 줄 하나와 태블릿 파형 하나만 민트색으로 표시되어 있다."><span class="aitag">AI 생성 예시 이미지</span></div>
        <div class="bubble ai appear appear--rise" style="--d:.55s"><i class="d" aria-hidden="true">AI</i><span><span class="who">AI 답 · 예시</span>“높게 나는 줄을 낮춰 보세요”</span></div>
        <div class="bubble fix appear appear--rise" style="--d:.75s"><i class="d" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg></i><span><span class="who">학생</span>귀로 확인하고 직접 고침</span></div>
      </figure>
    </div></section>`;
  function viewHome(rest) {
    const g = prog("gugak");
    return `${rest ? "" : HERO}

    <div class="strip"><div class="wrap">
      <div class="cell"><div class="k">국악 웹악기</div><div class="v"><span class="ck" aria-hidden="true">✓</span>v0.8 완성</div><div class="n">국립국악원 녹음 · 4악기</div></div>
      <div class="cell"><div class="k">80분 교안</div><div class="v"><span class="ck" aria-hidden="true">✓</span>v0.3 완성</div><div class="n">아리랑 1구절 합주</div></div>
      <div class="cell"><div class="k">다음 단계</div><div class="v">강사 검수 · 리허설</div><div class="n">11월 중 목표</div></div>
      <div class="cell"><div class="k">실제 수업</div><div class="v num">0회</div><div class="n">11월 24일부터 희망일 신청</div></div>
    </div></div>

    <section class="section"><div class="wrap">
      <div class="head rv"><span class="eyebrow">7개 분야 · 수업 8가지</span><h2>학교가 필요한 수업 하나만 고르면 됩니다</h2><p>국악이 가장 먼저 준비되었고, 나머지는 제작 순서대로 열립니다. 각 수업을 누르면 진행 순서·준비물·준비 상황을 볼 수 있습니다.</p></div>
      ${cards(S.P.programs)}
    </div></section>

    <section class="section band"><div class="wrap method">
      <div>
        <div class="head rv"><span class="eyebrow">수업 방식</span><h2>요청하고, 확인하고, 직접 고칩니다</h2><p>모든 수업이 같은 세 단계를 거칩니다. AI는 도구이고, 판단은 학생이 합니다.</p></div>
        <ol class="steps">
          <li class="step rv"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v10H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg></div><div><h3><span class="n">01</span>요청하기</h3><p>바꿀 곳·그대로 둘 것·확인 방법을 정리해 AI에게 부탁합니다. 초등은 학생이 말하고 강사가 그대로 입력합니다.</p><p class="ex">국악 예: “3번 모둠 가야금에서 높게 나는 줄을 원래 높이로 돌리는 방법을 알려 줘.”</p></div></li>
          <li class="step rv"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg></div><div><h3><span class="n">02</span>확인하기</h3><p>AI의 답을 그대로 믿지 않습니다. 소리를 듣고, 근거표와 비교하고, 직접 검산해 맞는지 확인합니다.</p><p class="ex">국악 예: 합주에서 튀는 줄이 어디인지 귀로 찾기</p></div></li>
          <li class="step rv"><div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5l4 4L9 19H5v-4z"/><path d="M12.5 7.5l4 4"/></svg></div><div><h3><span class="n">03</span>직접 고치기</h3><p>학생이 설정과 대본·코드·답을 직접 고치고, 다시 합주하거나 발표해서 결과를 확인합니다.</p><p class="ex">정리: ‘AI가 한 일’과 ‘우리가 판단한 일’을 나누어 기록</p></div></li>
        </ol>
      </div>
      <div class="pitchlab rv" id="lab">
        <div class="lh"><b>높이 탐정 · 직접 해 보기</b><span class="pill">AI 아님 · 합성음</span></div>
        <div class="cvw"><canvas id="cv" tabindex="0" role="img" aria-label="가야금 열두 줄 그림. 줄을 쓸면 소리가 나고, 한 줄을 누르면 그 줄이 튀는 줄인지 알려 줍니다. 키보드는 위아래 화살표로 줄을 고르고 Enter로 고릅니다."></canvas></div>
        <div class="lf"><p class="lmsg" id="labmsg" aria-live="polite"></p><button type="button" class="btn sm primary" id="labbtn" hidden>이 줄 고치기</button></div>
      </div>
    </div></section>

    <section class="section"><div class="wrap two">
      <div class="rv"><span class="eyebrow">제작 순서</span><h2 style="font-size:clamp(1.5rem,2.6vw,2rem);margin:12px 0 18px">일곱 분야 제작 목표 기간</h2>${timeline()}<p class="tiny" style="margin-top:12px">${esc(S.SCH.note)}</p></div>
      <div class="rv"><span class="eyebrow">국악 준비 상황</span><h2 style="font-size:clamp(1.5rem,2.6vw,2rem);margin:12px 0 18px">끝난 것과 남은 것</h2>${checklist(g.readiness)}</div>
    </div></section>

    <section class="section band"><div class="wrap two">
      ${honestBox("지금 말씀드릴 수 있는 것과 아닌 것", [
        "아직 실제 수업을 한 적이 없습니다. 교육 효과나 만족도 수치를 드리지 않습니다.",
        "국악 웹악기의 시범 연주는 미리 넣은 악보로 동작하는 규칙형 기능이며 AI가 아닙니다.",
        "실제 AI는 교탁 화면이나 학교가 허용한 학생 계정에서 씁니다. 13세 미만은 어른이 입력합니다.",
        "이 페이지의 수업 사진은 AI로 만든 예시 이미지입니다. 실제 수업 사진이 아닙니다.",
        "아래 가격은 제안 견적이며 학교 조건에 따라 협의합니다.",
      ])}
      <div class="rv"><span class="eyebrow">제안 견적</span><h2 style="font-size:clamp(1.5rem,2.6vw,2rem);margin:12px 0 18px">국악 수업 기준 수업료</h2>${pricing()}</div>
    </div></section>

    <section class="section"><div class="wrap two">
      <div class="rv"><span class="eyebrow">자주 묻는 질문</span><h2 style="font-size:clamp(1.5rem,2.6vw,2rem);margin:12px 0 18px">학교 담당자가 많이 묻는 것</h2><p class="muted">더 궁금한 점은 <a href="#ask">질문 · AI</a> 화면에서 물어보세요.</p></div>
      <div class="faq rv">${S.P.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="a">${esc(f.a)}</div></details>`).join("")}</div>
    </div></section>

    <section class="section ink"><div class="wrap two" style="align-items:center">
      <div><span class="eyebrow">수업 접수</span><h2 style="font-size:clamp(1.7rem,3.2vw,2.5rem);margin-top:12px;color:var(--paper)">우리 학교에 맞는 수업을 함께 정합니다</h2><p class="muted" style="margin-top:14px">학년·학급 수·희망일만 알려 주시면 연락드려 기기와 시간을 함께 맞춥니다. 방문 또는 화상으로 15분 시연을 먼저 보여 드릴 수 있습니다.</p></div>
      <div class="ctas" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-start"><a class="btn primary" href="#apply">수업 접수하기</a><a class="btn" style="color:var(--paper);border-color:color-mix(in srgb,var(--paper) 40%,transparent)" href="#ask">AI에게 수업 추천 받기</a></div>
    </div></section>`;
  }

  /* ───────── 화면: 수업 목록 ───────── */
  function viewPrograms() {
    return `<section class="section view"><div class="wrap">
      <div class="head"><span class="eyebrow">7개 분야 · 수업 8가지</span><h1 style="font-size:clamp(1.9rem,4vw,3rem)">수업 안내</h1><p>국악부터 제작 순서대로 준비합니다. 준비 상황은 각 수업 화면에 그대로 적어 두었습니다.</p></div>
      ${cards(S.P.programs)}
      <div style="margin-top:48px">${timeline()}</div>
    </div></section>`;
  }

  /* ───────── 화면: 수업 상세 ───────── */
  function viewProgram(p) {
    const opens = nextOpenDates(p.id, 6);
    const flow = p.flow.map((f) => `<div class="part"><div class="pt">${esc(f.part)}</div><div class="mn num">${esc(f.min)}분</div><div><h4>${esc(f.title)}<span class="who${f.ai ? " ai" : ""}">${esc(f.who)}${f.ai ? " · AI 사용" : ""}</span></h4><p>${esc(f.desc)}</p></div></div>`).join("");
    const gugakExtra = p.id === "gugak" ? `
      <div class="subhead"><h3>실제 웹악기 화면</h3><span class="tiny">v0.8 · 2026-11-03 캡처</span></div>
      <div class="two">
        <figure class="rv" style="margin:0"><img src="img/app-demo.jpg" alt="웹악기 v0.8 시범 보기 화면. 가야금 4현 위에 칠 곳을 알리는 검은 점과 다음 칠 곳을 알리는 빈 동그라미가 보이고, 위쪽에 '미리 넣은 악보를 앱이 연주 · AI 아님' 표시가 있다." style="border-radius:var(--r-m);border:1px solid var(--line)"><figcaption class="tiny" style="margin-top:8px">1교시 ‘시범 보기’ · 칠 곳 ● 다음 칠 곳 ○ · 화면 오른쪽 위 ‘AI 아님’ 표시</figcaption></figure>
        <figure class="rv" style="margin:0"><img src="img/app-error.jpg" alt="웹악기 v0.8 오류 찾기 화면 '소리 탐정 연구실'. 정상 듣기, 문제 탐색, 증거·추측, 직접 수정, 다시 검증 다섯 단계가 보인다." style="border-radius:var(--r-m);border:1px solid var(--line)"><figcaption class="tiny" style="margin-top:8px">2교시 ‘소리 탐정 연구실’ · 듣기 → 찾기 → 고치기 → 다시 확인</figcaption></figure>
      </div>
      <div class="subhead"><h3>수업료 (제안 견적)</h3></div>${pricing()}` : "";
    const nav = S.P.programs.map((o) => `<a href="#${o.id}"${o.id === p.id ? ' class="on" aria-current="page"' : ""}>${esc(o.short)}</a>`).join("");
    return `<section class="section view" style="padding-top:28px"><div class="wrap">
      <div class="crumb"><a href="#home">홈</a><span>›</span><a href="#programs">수업</a><span>›</span><span>${esc(p.name)}</span></div>
      <div class="phero"><img src="${esc(p.image)}" alt="" onerror="this.remove()"><div class="in">${pill(p)}${p.track ? `<span class="mono" style="font-size:.78rem;letter-spacing:.06em;color:rgba(255,255,255,.82)">${esc(p.track)}</span>` : ""}<h1>${esc(p.name)}</h1><p>${esc(p.tagline)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:6px"><a class="btn primary" href="#apply" data-pick="${esc(p.id)}">이 수업 접수하기</a><a class="btn" style="color:#fff;border-color:rgba(255,255,255,.45)" href="#ask" data-ask="${esc(p.id)}">이 수업 질문하기</a></div></div></div>
      <p class="tiny" style="margin-top:8px">${esc(p.imageCaption || "사진: AI 생성 예시 이미지(Higgsfield) · 실제 수업 사진 아님")}</p>
      <div class="meta-grid">
        <div><div class="k">교과</div><div class="v">${esc(p.subject)}</div></div>
        <div><div class="k">대상</div><div class="v">${esc(p.grades)}</div></div>
        <div><div class="k">시간</div><div class="v">${esc(p.time)}</div></div>
        <div><div class="k">진행</div><div class="v">${esc(p.team)}</div></div>
        <div><div class="k">학교 준비</div><div class="v">${esc(p.devices)}</div></div>
      </div>
      <div class="subhead"><h3>수업 진행</h3><span class="tiny">${esc(p.time)}</span></div>
      <div class="flow">${flow}</div>
      <div class="two" style="margin-top:8px">
        <div><div class="subhead"><h3>배우는 것</h3></div><ul class="list">${p.learn.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
        <div><div class="subhead"><h3>학교에서 준비할 것</h3></div><ul class="list">${p.prep.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      </div>
      ${gugakExtra}
      <div class="two" style="margin-top:8px">
        <div><div class="subhead"><h3>준비 상황</h3><span class="tiny">${esc(p.status.window)}</span></div>${checklist(p.readiness)}</div>
        <div><div class="subhead"><h3>일정 · 접수</h3><span class="tiny">${esc(p.status.booking)}</span></div>
          ${opens.length ? `<p class="muted small" style="margin-bottom:12px">희망일을 고르면 접수 화면으로 이어집니다. 접수 후 담당자가 연락해 확정합니다.</p><div class="chips">${opens.map((d) => `<button type="button" class="chip" data-date="${ymd(d)}" data-pick="${esc(p.id)}">${fmtDay(d)}</button>`).join("")}</div><p style="margin-top:14px"><a class="btn sm" href="#schedule">전체 달력 보기</a></p>` : `<p class="muted">아직 희망일을 받을 수 있는 날이 없습니다. 관심 학교로 먼저 접수해 주시면 준비되는 대로 연락드립니다.</p><p style="margin-top:14px"><a class="btn sm primary" href="#apply" data-pick="${esc(p.id)}">관심 학교로 접수</a></p>`}
        </div>
      </div>
      <div style="margin-top:40px">${honestBox("이 수업에 대해 정확히 말씀드리면", p.honest)}</div>
      <div class="subhead"><h3>다른 수업</h3></div><div class="others">${nav}</div>
    </div></section>`;
  }

  /* ───────── 화면: 일정 ───────── */
  function viewSchedule() {
    return `<section class="section view"><div class="wrap">
      <div class="head"><span class="eyebrow">일정 · 접수</span><h1 style="font-size:clamp(1.9rem,4vw,3rem)">수업 일정</h1><p>희망일 신청이 가능한 평일을 누르면 접수 화면으로 이어집니다. 접수한 날은 ‘협의 중’으로 바뀌고, 담당자가 연락해 확정합니다.</p></div>
      <div id="adminbar"></div>
      <div class="two lean">
        <div><div class="cal" id="cal"></div>
          <div class="legend"><span><i class="open"></i>희망일 신청 가능</span><span><i class="pending"></i>협의 중</span><span><i class="booked"></i>예약 완료</span><span><i class="prep"></i>준비 기간</span><span><i></i>주말·휴일</span></div>
          <p class="tiny" style="margin-top:10px" id="calsrc"></p></div>
        <div><h3 style="font-size:1.2rem;margin-bottom:14px">수업별 접수 시작</h3>
          <ul class="check">${S.P.programs.map((p) => { const r = readyFrom(p); const start = r ? (r < parse(S.SCH.openFrom) ? parse(S.SCH.openFrom) : r) : null; return `<li><span class="m ${p.status.phase === "building" ? "done" : "todo"}" aria-hidden="true"></span><div><b><a href="#${p.id}">${esc(p.name)}</a></b><span>${start ? fmtDay(start) + "부터 희망일 신청" : ""} · ${esc(p.status.label)}</span></div></li>`; }).join("")}</ul>
          <p class="tiny" style="margin-top:12px">${esc(S.SCH.note)} 겨울방학 기간은 학교마다 다릅니다.</p></div>
      </div>
      <div class="subhead" style="margin-top:56px"><h3>제작 목표 기간</h3></div>${timeline()}
    </div></section>`;
  }
  function renderCal() {
    const el = $("#cal"); if (!el) return;
    const { y, m } = S.cal; const first = new Date(y, m, 1); const startDow = first.getDay();
    const daysIn = new Date(y, m + 1, 0).getDate(); const today = ymd(new Date());
    const minM = { y: 2026, m: 10 }, maxM = (() => { const d = parse(S.SCH.openUntil); return { y: d.getFullYear(), m: d.getMonth() }; })();
    const atMin = y === minM.y && m === minM.m, atMax = y === maxM.y && m === maxM.m;
    let cells = "";
    for (let i = 0; i < startDow; i++) cells += `<div class="day out" aria-hidden="true"></div>`;
    for (let d = 1; d <= daysIn; d++) {
      const date = new Date(y, m, d); const info = dayInfo(date);
      const clickable = S.isAdmin ? info.s !== "weekend" : info.s === "open";
      const cls = ["day", info.s, info.key === today ? "today" : "", S.isAdmin ? "admin" : ""].join(" ");
      const label = `${m + 1}월 ${d}일 ${{ open: "희망일 신청 가능", pending: "협의 중", booked: "예약 완료", closed: "휴일", weekend: "주말", prep: "준비 기간", later: "" }[info.s] || ""} ${info.label || ""}`.trim();
      cells += clickable
        ? `<button type="button" class="${cls}" data-day="${info.key}" aria-label="${esc(label)}"><span class="d num">${d}</span><span class="s">${esc(info.label)}</span></button>`
        : `<div class="${cls}" aria-label="${esc(label)}"><span class="d num">${d}</span><span class="s">${esc(info.label)}</span></div>`;
    }
    const rem = (startDow + daysIn) % 7; if (rem) for (let i = rem; i < 7; i++) cells += `<div class="day out" aria-hidden="true"></div>`;
    el.innerHTML = `<div class="hd"><b>${y}년 ${m + 1}월</b><div class="nav"><button type="button" data-cal="-1" aria-label="이전 달"${atMin ? " disabled" : ""}>‹</button><button type="button" data-cal="1" aria-label="다음 달"${atMax ? " disabled" : ""}>›</button></div></div>
      <div class="dow">${"일월화수목금토".split("").map((c) => `<div>${c}</div>`).join("")}</div><div class="days">${cells}</div>`;
    const src = $("#calsrc");
    if (src) src.textContent = S.dbState === "live" ? "공유 일정과 연결됨 · 담당자가 바꾸면 바로 반영됩니다." : S.dbState === "slow" ? "공유 일정을 아직 불러오지 못했습니다. 기본 일정으로 보여 드립니다." : S.dbState === "off" ? "기본 일정입니다. 정확한 가능 날짜는 문의해 주세요." : "공유 일정 불러오는 중…";
  }
  function renderAdminBar() {
    const el = $("#adminbar"); if (!el) return;
    el.innerHTML = S.isAdmin ? `<div class="admin-bar"><b>관리자 보기</b><span>평일을 누르면 상태가 바뀝니다: 기본 → 희망일 신청 → 협의 중 → 예약 완료 → 닫힘 → 기본. 학교 이름은 달력에 표시되지 않습니다.</span></div>` : "";
  }
  async function cycleDay(key) {
    const order = [undefined, "open", "pending", "booked", "closed"];
    const cur = S.days[key] && S.days[key].s; const next = order[(order.indexOf(cur) + 1) % order.length];
    const nextDays = Object.assign({}, S.days);
    if (next) nextDays[key] = { s: next, p: (S.days[key] && S.days[key].p) || "" }; else delete nextDays[key];
    S.days = nextDays; renderCal();
    try { await S.db.doc("schedule/days").set({ days: nextDays, updated: new Date().toISOString() }); }
    catch (e) { toast("저장하지 못했습니다: " + (e && e.code ? e.code : "오류")); }
  }

  /* ───────── 화면: 질문 · AI ───────── */
  function viewAsk() {
    const subjects = [["music", "음악·국악"], ["korean", "국어·사회·역사"], ["career", "진로"], ["coding", "정보·코딩"], ["math", "수학"], ["english", "영어"], ["science", "과학"]];
    return `<section class="section view"><div class="wrap">
      <div class="head"><span class="eyebrow">질문 · AI</span><h1 style="font-size:clamp(1.9rem,4vw,3rem)">학교에 맞는 수업 찾기</h1><p>조건을 고르면 AI가 이 페이지의 수업 자료만 보고 맞는 수업과 이유를 정리합니다. 궁금한 점은 오른쪽에서 물어보세요.</p><p class="tiny" id="aistate"></p></div>
      <div class="two" style="align-items:start">
        <div>
          <form id="rec" class="form" novalidate>
            <label class="fld"><span>학년</span><select id="r-grade"><option value="초1~3">초등 1~3학년</option><option value="초4">초등 4학년</option><option value="초5~6" selected>초등 5~6학년</option><option value="중1~3">중학생</option></select></label>
            <label class="fld"><span>쓸 수 있는 시간</span><select id="r-time"><option value="1교시">1교시 (40~45분)</option><option value="2교시" selected>2교시 연속 (80~90분)</option><option value="4차시 이상">4차시 이상 (여러 번 방문)</option></select></label>
            <fieldset class="fld full" style="border:0;padding:0;margin:0"><span>관심 교과 (여러 개 선택)</span><div class="chips" style="margin-top:6px">${subjects.map(([v, l]) => `<label class="chip"><input type="checkbox" name="r-sub" value="${v}"${v === "music" ? " checked" : ""}> ${esc(l)}</label>`).join("")}</div></fieldset>
            <label class="fld"><span>학생 기기</span><select id="r-dev"><option value="태블릿">태블릿</option><option value="크롬북·노트북">크롬북·노트북</option><option value="교탁 PC만">교탁 PC·프로젝터만</option><option value="모름">아직 모름</option></select></label>
            <label class="fld"><span>희망 시기</span><select id="r-when"><option value="2026년 11~12월">2026년 11~12월</option><option value="2027년 1~2월">2027년 1~2월</option><option value="2027년 1학기">2027년 1학기</option></select></label>
            <label class="fld full"><span>더 알려 주실 것 (선택)</span><input id="r-note" maxlength="300" placeholder="예: 학년말 행사로 강당 사용 가능, 펜즈 계정 사용 중"></label>
            <div class="full" style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" type="submit" id="r-go">수업 추천 받기</button><button class="btn ghost" type="button" id="r-stop" hidden>멈춤</button></div>
          </form>
          <div id="recout" style="margin-top:20px"></div>
        </div>
        <div class="chat" id="chat">
          <div class="bar"><span class="dot" id="chatdot"></span><span id="chatlabel">질문하기</span></div>
          <div class="log" id="log" aria-live="polite"><div class="msg sys">이 페이지의 수업 자료로만 답합니다. 자료에 없는 가격·일정은 ‘확인 필요’로 안내합니다.</div></div>
          <div style="padding:0 12px 10px" class="chips" id="examples">${["2교시에 꼭 태블릿이 있어야 하나요?", "13세 미만 학생도 AI를 쓰나요?", "국악 강사는 누가 오나요?", "교과 성취기준과 연결되나요?"].map((q) => `<button type="button" class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
          <form id="chatform"><label class="sr" for="chatin">질문</label><input id="chatin" maxlength="500" placeholder="예: 3학년도 국악 수업을 할 수 있나요?" autocomplete="off"><button class="btn primary sm" type="submit">보내기</button></form>
        </div>
      </div>
    </div></section>`;
  }
  function knowledge() {
    const c = S.P.contact;
    const progs = S.P.programs.map((p) => ({ id: p.id, 이름: p.name, 교과: p.subject, 대상: p.grades, 시간: p.time, 진행: p.team, 기기: p.devices, 상태: p.status.label + " · " + p.status.window, 접수: p.status.booking, 흐름: p.flow.map((f) => `${f.part} ${f.min}분 ${f.title}${f.ai ? "(AI 사용)" : ""}: ${f.desc}`), 배우는것: p.learn, 정확한사실: p.honest, 준비물: p.prep, 준비상황: p.readiness.map((r) => `${r.item}: ${r.state === "done" ? "완료" : "남음"}${r.note ? " — " + r.note : ""}`) }));
    return JSON.stringify({ 담당: `${c.name} (${c.role}) 전화 ${c.phone} 이메일 ${c.email} · 상호 미정`, 가격: S.P.pricing, 수업: progs, 자주묻는질문: S.P.faq, 일정메모: S.SCH.note });
  }
  const RULES = () => `당신은 학교 담당 교사에게 AI교육 수업을 안내하는 도우미입니다. 아래 [자료]에 적힌 내용만 근거로 한국어 존댓말로 답하세요.
규칙:
- 자료에 없는 가격·날짜·강사 이름·실적·교육 효과·수강생 수는 만들지 말고 "확인이 필요합니다. 담당자(${S.P.contact.phone}, ${S.P.contact.email})에게 문의해 주세요"라고 답합니다.
- 실제 수업은 아직 0회입니다. 효과를 약속하지 않습니다.
- 국악 웹악기의 시범 연주는 규칙형이며 AI가 아니라는 점을 정확히 말합니다.
- 학생 이름·연락처 같은 학생 개인정보를 묻거나 받지 않습니다.
- 3~6문장, 필요하면 짧은 목록. 마크다운 굵게 표시는 쓰지 않습니다.
[자료]
${knowledge()}`;

  function ruleRecommend(input) {
    const map = { music: ["gugak", "english"], korean: ["theater-basic", "theater"], career: ["diary"], coding: ["game"], math: ["math"], english: ["english"], science: ["science"] };
    const ids = []; input.subjects.forEach((s) => (map[s] || []).forEach((id) => { if (!ids.includes(id)) ids.push(id); }));
    if (!ids.length) ids.push("gugak");
    return ids.slice(0, 3).map((id) => { const p = prog(id); return { id, reason: `${p.subject} 관심과 맞습니다. 대상: ${p.grades}. ${p.status.booking}.`, fit: p.status.phase === "building" ? "가장 먼저 준비됨" : "준비 예정" }; });
  }
  function renderRec(out, data, isAI) {
    const picks = (data.picks || []).filter((x) => prog(String(x.id)));
    out.innerHTML = `<div class="result"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><b>${isAI ? "AI 추천" : "자동 규칙 추천 · AI 아님"}</b><span class="tiny">${isAI ? "이 페이지 자료만 보고 정리 · 최종 판단은 담당자 상담에서" : "AI를 쓸 수 없는 보기라 교과 선택으로만 골랐습니다"}</span></div>
      ${picks.map((x) => { const p = prog(String(x.id)); return `<a class="req" href="#${p.id}" style="text-decoration:none"><b>${esc(p.name)} ${pill(p)}</b><span class="muted small">${esc(x.reason || "")}</span>${x.fit ? `<span class="tiny">${esc(x.fit)}</span>` : ""}</a>`; }).join("")}
      ${data.caution ? `<div class="note">${esc(data.caution)}</div>` : ""}
      ${data.summary ? `<div><div class="tiny" style="margin-bottom:6px">학교 내부 검토용 요약 (복사해서 쓰세요)</div><pre id="recsum">${esc(data.summary)}</pre><div style="margin-top:8px"><button type="button" class="copy" data-label="요약 복사" data-sel="#recsum" data-copy="recsum">요약 복사</button></div></div>` : ""}
      <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn primary sm" href="#apply" data-pick="${esc(picks[0] ? picks[0].id : "gugak")}">이 조건으로 접수</a></div></div>`;
  }
  let recCtl = null;
  async function runRec(ev) {
    ev.preventDefault();
    const input = { grade: $("#r-grade").value, time: $("#r-time").value, subjects: $$('input[name="r-sub"]:checked').map((i) => i.value), device: $("#r-dev").value, when: $("#r-when").value, note: $("#r-note").value.trim() };
    S.prefill = Object.assign({}, S.prefill, { grade: input.grade });
    const out = $("#recout");
    if (!S.sample) { renderRec(out, { picks: ruleRecommend(input), caution: "희망 시기와 기기 조건은 상담에서 함께 확인합니다." }, false); return; }
    recCtl = new AbortController(); const go = $("#r-go"), stop = $("#r-stop"); go.disabled = true; stop.hidden = false;
    out.innerHTML = `<div class="result"><b>AI가 자료를 읽고 있습니다…</b><span class="tiny">보통 10~40초 걸립니다.</span></div>`;
    const prompt = `${RULES()}

[학교 조건]
학년: ${input.grade} / 시간: ${input.time} / 관심 교과: ${input.subjects.join(", ") || "미정"} / 기기: ${input.device} / 희망 시기: ${input.when} / 메모: ${input.note || "없음"}

위 조건에 맞는 수업을 자료에서 1~3개 고르세요. 희망 시기에 아직 준비되지 않는 수업이면 그 사실을 caution에 적으세요. 다음 JSON 하나로만 답하세요:
{"picks":[{"id":"수업 id","reason":"이 학교 조건에 맞는 이유 1~2문장","fit":"준비 상태 한 구절"}],"caution":"확인이 필요한 점 1~2문장","summary":"학교 내부 검토용 4~6줄 요약. 수업명·대상·시간·준비물·제안 견적(자료의 범위 그대로)·남은 확인 사항. 실적·효과 표현 금지"}`;
    try {
      const data = await S.sample.json(prompt, { signal: recCtl.signal, modelTier: "default", cache: { gcTime: 600000 } });
      renderRec(out, data && typeof data === "object" ? data : { picks: ruleRecommend(input) }, true);
    } catch (e) {
      if (e && e.code === "cancelled") out.innerHTML = "";
      else if (e && ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e.code)) { S.sample = null; setAIState(); renderRec(out, { picks: ruleRecommend(input) }, false); }
      else out.innerHTML = `<div class="note err">${esc(aiErr(e))}</div>`;
    } finally { go.disabled = false; stop.hidden = true; }
  }
  function aiErr(e) {
    const c = e && e.code;
    return c === "rate_limited" ? "질문이 많아 잠시 쉬어야 합니다. 조금 뒤 다시 눌러 주세요." : c === "refused" ? "이 질문에는 답할 수 없습니다. 다르게 물어봐 주세요." : c === "invalid_json" ? "답을 정리하지 못했습니다. 한 번 더 눌러 주세요." : c === "session_expired" ? "로그인이 끝났습니다. 다시 로그인한 뒤 눌러 주세요." : "잠시 연결이 끊겼습니다. 다시 눌러 주세요.";
  }
  function faqSearch(q) {
    const STOP = ["하나요", "있나요", "되나요", "인가요", "할까요", "까요", "나요", "어떻게", "무엇", "얼마", "언제", "있어야", "해야", "수업"];
    let clean = q.replace(/[?？.!,~]/g, " ").replace(/가격|비용|견적|단가|금액|요금/g, " 수업료 ").replace(/개인 ?정보|이름|실명/g, " 개인정보 ").replace(/기기|태블릿|크롬북|준비물/g, " 준비할 태블릿 ");
    STOP.forEach((w) => { clean = clean.split(w).join(" "); });
    const grams = new Set();
    clean.split(/\s+/).filter(Boolean).forEach((w) => { if (w.length === 1) return; for (let i = 0; i < w.length - 1; i++) grams.add(w.slice(i, i + 2)); });
    let best = null, score = 0;
    for (const f of S.P.faq) { let s = 0; grams.forEach((g) => { if (f.q.includes(g)) s += 2; if (f.a.includes(g)) s += 1; }); if (s > score) { score = s; best = f; } }
    return best && score >= 2 ? `자주 묻는 질문에서 찾은 답입니다 (AI 아님).\n\n${best.q}\n${best.a}` : `자주 묻는 질문에서 맞는 답을 찾지 못했습니다 (AI 아님). 담당자에게 문의해 주세요: ${S.P.contact.phone} · ${S.P.contact.email}`;
  }
  function addMsg(kind, text) { const log = $("#log"); if (!log) return null; const m = document.createElement("div"); m.className = "msg " + kind; m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
  async function ask(q) {
    q = q.trim(); if (!q || S.chatBusy) return;
    addMsg("me", q); const inp = $("#chatin"); if (inp) inp.value = "";
    if (!S.sample) { addMsg("ai", faqSearch(q)); return; }
    S.chatBusy = true; const bubble = addMsg("ai", "생각하는 중…");
    S.chat.push({ role: "user", content: q });
    const turns = [{ role: "user", content: RULES() }, { role: "assistant", content: "네, 자료에 있는 내용으로만 답하겠습니다." }, ...S.chat.slice(-8)];
    try {
      const { text } = await S.sample(turns, { cache: false, modelTier: "quick", onText: ({ text }) => { bubble.textContent = text; $("#log").scrollTop = 1e9; } });
      bubble.textContent = text; S.chat.push({ role: "assistant", content: text });
    } catch (e) {
      S.chat.pop();
      if (e && ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e.code)) { S.sample = null; setAIState(); bubble.textContent = faqSearch(q); }
      else bubble.textContent = (e && e.text ? e.text + "\n\n" : "") + aiErr(e);
    } finally { S.chatBusy = false; }
  }
  function setAIState() {
    const st = $("#aistate"), dot = $("#chatdot"), lab = $("#chatlabel");
    const on = !!S.sample;
    if (st) st.textContent = S.sampleState === "checking" ? "AI 연결 확인 중…" : on ? "AI 사용: 이 페이지를 보는 분의 Claude 계정으로 동작합니다. 처음 한 번 허용을 묻습니다." : "이 보기에서는 AI를 쓸 수 없어 규칙 추천과 자주 묻는 질문 검색으로 안내합니다 (AI 아님).";
    if (dot) dot.classList.toggle("off", !on);
    if (lab) lab.textContent = on ? "AI에게 질문하기 · Claude" : "자주 묻는 질문 검색 · AI 아님";
  }

  /* ───────── 화면: 접수 ───────── */
  function viewApply() {
    const pf = S.prefill; const c = S.P.contact;
    const opt = S.P.programs.map((p) => `<option value="${p.id}"${pf.program === p.id ? " selected" : ""}>${esc(p.name)} · ${esc(p.status.label)}</option>`).join("");
    return `<section class="section view"><div class="wrap">
      <div class="head"><span class="eyebrow">수업 접수</span><h1 style="font-size:clamp(1.9rem,4vw,3rem)">수업 접수</h1><p>학교와 담당 선생님의 업무 연락처만 받습니다. 학생 이름·연락처 등 학생 개인정보는 적지 마세요.</p></div>
      <div id="reqadmin"></div>
      <div class="two lean">
        <form id="apply" class="form" novalidate>
          <label class="fld"><span>학교명 <span class="must">*</span></span><input id="a-school" required maxlength="60" placeholder="예: ○○초등학교"></label>
          <label class="fld"><span>담당 선생님 <span class="must">*</span></span><input id="a-name" required maxlength="30" placeholder="성함"></label>
          <label class="fld"><span>담당 업무 · 직위</span><input id="a-role" maxlength="40" placeholder="예: 5학년 부장, 음악 전담"></label>
          <label class="fld"><span>업무 연락처 <span class="must">*</span></span><input id="a-phone" required maxlength="30" inputmode="tel" placeholder="학교 전화 또는 업무용 휴대폰"></label>
          <label class="fld full"><span>업무 이메일</span><input id="a-email" type="email" maxlength="80" placeholder="학교 메일 권장"></label>
          <label class="fld"><span>희망 수업 <span class="must">*</span></span><select id="a-prog" required>${opt}</select></label>
          <label class="fld"><span>학년</span><select id="a-grade">${["초1~3", "초4", "초5~6", "중1~3", "미정"].map((g) => `<option${(pf.grade || "초5~6") === g ? " selected" : ""}>${g}</option>`).join("")}</select></label>
          <label class="fld"><span>학급 수</span><input id="a-classes" type="number" min="1" max="20" value="1" inputmode="numeric"></label>
          <label class="fld"><span>학급당 인원 (대략)</span><input id="a-size" type="number" min="1" max="40" value="25" inputmode="numeric"></label>
          <label class="fld"><span>희망일 1</span><input id="a-date1" type="date" value="${esc(pf.date || "")}"></label>
          <label class="fld"><span>희망일 2</span><input id="a-date2" type="date"></label>
          <label class="fld"><span>학생 기기</span><select id="a-dev"><option>태블릿</option><option>크롬북·노트북</option><option>교탁 PC만</option><option>모름</option></select></label>
          <label class="fld"><span>AI 사용 방식</span><select id="a-ai"><option>교탁 화면에서 강사 입력</option><option>학교 허용 학생 계정 (펜즈 등)</option><option>상담 후 결정</option></select></label>
          <label class="fld full"><span>요청 · 문의 사항</span><textarea id="a-msg" maxlength="1500" placeholder="수업 가능 교시, 공간, 행사 일정 등을 적어 주세요. 학생 개인정보는 적지 마세요."></textarea></label>
          <label class="consent full"><input type="checkbox" id="a-ok" required><span>개인정보 수집·이용 동의(필수): 연락과 수업 협의를 위해 학교명·담당자 성함·업무 연락처·이메일과 적어 주신 내용을 받습니다. 상담·수업이 끝난 뒤 1년 안에 파기합니다.</span></label>
          <div class="full" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn primary" type="submit">접수하기</button><span class="tiny">* 표시는 꼭 적어 주세요</span></div>
          <div class="full" id="applyout"></div>
        </form>
        <aside style="display:grid;gap:16px;align-content:start">
          <div class="result"><b>접수 후 진행</b><ol class="list" style="padding-left:1.2em"><li>담당자가 내용을 보고 연락드립니다.</li><li>학년·학급 수·기기·AI 사용 방식을 함께 정합니다.</li><li>원하시면 15분 시연(방문 또는 화상)을 먼저 보여 드립니다.</li><li>날짜·견적을 확정하면 달력에 ‘예약 완료’로 표시됩니다.</li></ol></div>
          <div class="result"><b>바로 연락하기</b><div class="small">${esc(c.name)} · ${esc(c.role)}</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="mono num" id="c-phone">${esc(c.phone)}</span><button type="button" class="copy" data-label="번호 복사" data-sel="#c-phone" data-text="${esc(c.phone)}">번호 복사</button></div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="mono" id="c-mail">${esc(c.email)}</span><button type="button" class="copy" data-label="주소 복사" data-sel="#c-mail" data-text="${esc(c.email)}">주소 복사</button></div>
            <p class="tiny">문자로 보내실 때는 학교명·학년·희망일만 적어 주셔도 됩니다.</p></div>
        </aside>
      </div>
    </div></section>`;
  }
  function formData() {
    const v = (id) => ($("#" + id) ? $("#" + id).value.trim() : "");
    return { school: v("a-school"), name: v("a-name"), role: v("a-role"), phone: v("a-phone"), email: v("a-email"), program: v("a-prog"), grade: v("a-grade"), classes: v("a-classes"), size: v("a-size"), date1: v("a-date1"), date2: v("a-date2"), device: v("a-dev"), ai: v("a-ai"), msg: v("a-msg") };
  }
  function messageText(d) {
    const p = prog(d.program);
    return `[AI교육 수업 접수]
학교: ${d.school}
담당: ${d.name}${d.role ? " (" + d.role + ")" : ""}
연락처: ${d.phone}${d.email ? " / " + d.email : ""}
수업: ${p ? p.name : d.program}
학년·학급: ${d.grade} · ${d.classes}학급 · 학급당 약 ${d.size}명
희망일: ${[d.date1, d.date2].filter(Boolean).join(", ") || "협의"}
기기: ${d.device} / AI 사용: ${d.ai}
요청: ${d.msg || "없음"}`;
  }
  async function submitApply(ev) {
    ev.preventDefault();
    const out = $("#applyout"); const d = formData();
    const miss = [["school", "학교명"], ["name", "담당 선생님"], ["phone", "업무 연락처"]].filter(([k]) => !d[k]).map(([, l]) => l);
    if (miss.length) { out.innerHTML = `<div class="note err">${esc(miss.join(", "))}을(를) 적어 주세요.</div>`; return; }
    if (!$("#a-ok").checked) { out.innerHTML = `<div class="note err">개인정보 수집·이용에 동의해 주셔야 접수할 수 있습니다.</div>`; return; }
    const text = messageText(d);
    let saved = false, why = "";
    if (S.db && S.uid) {
      try {
        const ref = S.db.doc("requests/" + S.uid);
        const snap = await ref.get();
        const items = (snap.exists && Array.isArray(snap.data().items)) ? snap.data().items.slice(-19) : [];
        items.push(Object.assign({ at: new Date().toISOString(), state: "new" }, d));
        await ref.set({ items, updated: new Date().toISOString() });
        saved = true;
      } catch (e) { why = e && e.code ? e.code : "error"; }
    } else why = !S.db ? "nodb" : "noid";
    out.innerHTML = saved
      ? `<div class="note ok">접수되었습니다. 담당자가 확인 후 연락드립니다. 아래 내용은 기록용으로 복사해 두셔도 됩니다.</div><pre id="msgtext" style="margin-top:10px;white-space:pre-wrap;font-family:var(--mono);font-size:.82rem;background:var(--paper-2);padding:14px;border-radius:var(--r-m)">${esc(text)}</pre>`
      : `<div class="note">이 보기에서는 접수 내용을 바로 저장할 수 없습니다. 아래 내용을 복사해 문자(${esc(S.P.contact.phone)}) 또는 이메일(${esc(S.P.contact.email)})로 보내 주세요. 보내 주셔야 접수가 끝납니다.</div><pre id="msgtext" style="margin-top:10px;white-space:pre-wrap;font-family:var(--mono);font-size:.82rem;background:var(--paper-2);padding:14px;border-radius:var(--r-m)">${esc(text)}</pre><button type="button" class="copy" style="margin-top:8px" data-label="접수 내용 복사" data-sel="#msgtext" data-text="${esc(text)}">접수 내용 복사</button>`;
    if (!saved) console.info("접수 저장 안 됨:", why);
  }
  function renderReqAdmin() {
    const el = $("#reqadmin"); if (!el) return;
    if (!S.isAdmin) { el.innerHTML = ""; return; }
    const all = []; S.requests.forEach((doc) => (doc.items || []).forEach((it) => all.push(it)));
    all.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    el.innerHTML = `<div class="admin-bar" style="display:grid;gap:10px"><b>관리자 보기 · 받은 접수 ${all.length}건</b>${all.length ? all.slice(0, 30).map((it) => { const p = prog(it.program); return `<div class="req"><b>${esc(it.school)} · ${esc(p ? p.short : it.program)} · ${esc(it.grade)}</b><span class="small">${esc(it.name)} ${esc(it.role || "")} · ${esc(it.phone)} ${esc(it.email || "")}</span><span class="tiny">희망일 ${esc([it.date1, it.date2].filter(Boolean).join(", ") || "협의")} · 접수 ${esc(String(it.at).slice(0, 16).replace("T", " "))}</span>${it.msg ? `<span class="small muted">${esc(it.msg)}</span>` : ""}</div>`; }).join("") : `<span class="small">아직 받은 접수가 없습니다. 이 목록은 관리자에게만 보입니다.</span>`}</div>`;
  }

  /* ───────── 가야금 줄 (히어로) ───────── */
  const STR = [["G2", 98.0], ["C3", 130.81], ["D3", 146.83], ["G3", 196.0], ["A3", 220.0], ["C4", 261.63], ["D4", 293.66], ["E4", 329.63], ["G4", 392.0], ["A4", 440.0], ["C5", 523.25], ["D5", 587.33]];
  let strings = null;
  function initStrings() {
    const cv = $("#cv"); if (!cv) return;
    if (strings && strings.cv === cv) return;
    const ctx = cv.getContext("2d"); const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const st = STR.map(() => ({ a: 0, t0: 0, hit: 0 }));
    let W = 0, H = 0, dpr = 1, raf = 0, last = null, actx = null, label = null, down = null, sel = -1;
    const lab = $("#lab"), msg = $("#labmsg"), btn = $("#labbtn");
    const game = { odd: 0, found: false, fixed: false };
    const MSG = {
      start: "<b>12줄 중 한 줄이 한 옥타브 높게 맞춰져 있어요.</b> 줄을 쓸어 듣고, 튀는 줄을 눌러 보세요.",
      miss: (n) => `<b>${n}현은 제 높이예요.</b> 다른 줄도 들어 보세요.`,
      found: (n) => `<b>찾았어요! ${n}현이 한 옥타브 높았어요.</b> 수업에서는 이 단계에서 AI에게 고치는 방법을 묻고, 귀로 확인한 뒤 직접 고칩니다.`,
      fixed: (n) => `<b>${n}현을 제 높이로 돌렸어요.</b> 다시 쓸어서 모든 줄이 고르게 나는지 확인해 보세요.`,
    };
    function newRound() { let o; do { o = 2 + Math.floor(Math.random() * 8); } while (o === game.odd); Object.assign(game, { odd: o, found: false, fixed: false }); if (lab) lab.classList.remove("found"); say(MSG.start); if (btn) btn.hidden = true; kick(); }
    function say(html) { if (msg) msg.innerHTML = html; }
    function choose(i) {
      if (game.fixed) return;
      if (i === game.odd) { game.found = true; if (lab) lab.classList.add("found"); say(MSG.found(i + 1)); if (btn) { btn.textContent = "이 줄 고치기"; btn.hidden = false; } }
      else if (!game.found) say(MSG.miss(i + 1));
      kick();
    }
    if (btn) btn.addEventListener("click", () => {
      if (game.found && !game.fixed) { game.fixed = true; say(MSG.fixed(game.odd + 1)); btn.textContent = "다시 하기"; pluck(game.odd, 0.7); }
      else newRound();
    });
    const geom = () => { const top = H * 0.16, bot = H * 0.86; return STR.map((_, i) => top + (bot - top) * (i / (STR.length - 1))); };
    function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#999"; }
    function size() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = Math.max(10, r.width); H = Math.max(10, r.height); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(performance.now()); }
    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      const ys = geom(); const x0 = W * 0.07, x1 = W * 0.93; const ink = css("--ink"), line = css("--line-2"), red = css("--brand"), mint = css("--mint"), violet = css("--violet"), ink3 = css("--ink-3");
      // 몸통
      const g = ctx.createLinearGradient(0, ys[0] - 20, 0, ys[ys.length - 1] + 20);
      g.addColorStop(0, "rgba(43,91,255,.07)"); g.addColorStop(1, "rgba(109,74,255,.12)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x0 - 14, ys[0] - 22, x1 - x0 + 28, ys[ys.length - 1] - ys[0] + 44, 18); ctx.fill();
      // 현침
      ctx.fillStyle = ink; ctx.globalAlpha = .75; ctx.fillRect(x1 - 6, ys[0] - 16, 5, ys[ys.length - 1] - ys[0] + 32); ctx.globalAlpha = 1;
      let active = false;
      ys.forEach((y, i) => {
        const s = st[i]; const age = (now - s.t0) / 1000; const amp = s.a * Math.exp(-age * 3.2); if (amp > 0.15) active = true; else s.a = 0;
        const bx = x0 + (x1 - x0) * (0.30 + i * 0.032); // 안족 위치 (대각선)
        const hot = amp > 0.15; const mark = i === game.odd && game.found; const col = mark ? mint : red;
        if (i === sel && document.activeElement === cv) { ctx.fillStyle = "rgba(43,91,255,.10)"; ctx.fillRect(x0 - 18, y - 9, x1 - x0 + 30, 18); }
        ctx.strokeStyle = hot ? col : (mark ? mint : line); ctx.lineWidth = hot || mark ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(x0, y);
        if (hot && !reduce) {
          const f = 9 + i * 0.9; const phase = Math.cos(2 * Math.PI * f * age);
          for (let k = 0; k <= 40; k++) { const t = k / 40; const x = bx + (x1 - bx) * t; ctx.lineTo(x, y + amp * Math.sin(Math.PI * t) * phase); }
        } else ctx.lineTo(x1, y);
        ctx.lineTo(x1, y); ctx.stroke();
        // 안족
        ctx.fillStyle = hot || mark ? col : ink; ctx.globalAlpha = hot || mark ? 1 : .8;
        ctx.beginPath(); ctx.moveTo(bx - 7, y + 6); ctx.lineTo(bx, y - 4); ctx.lineTo(bx + 7, y + 6); ctx.lineTo(bx + 4, y + 6); ctx.lineTo(bx, y + 1); ctx.lineTo(bx - 4, y + 6); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        // 현 번호
        ctx.fillStyle = hot || mark ? col : ink3; ctx.font = "500 11px 'IBM Plex Mono', monospace"; ctx.textAlign = "right"; ctx.fillText(String(i + 1), x0 - 6, y + 4);
      });
      if (label && now - label.t < 1400) { ctx.globalAlpha = Math.max(0, 1 - (now - label.t) / 1400); ctx.fillStyle = red; ctx.font = "800 22px 'Noto Sans KR', sans-serif"; ctx.textAlign = "right"; ctx.fillText(label.txt, x1 - 16, ys[0] - 30 > 14 ? ys[0] - 30 + 22 : 26); ctx.globalAlpha = 1; active = true; }
      if (active) raf = requestAnimationFrame(draw); else raf = 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(draw); }
    function sound(i, vel) {
      try {
        if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === "suspended") actx.resume();
        const f = STR[i][1] * (i === game.odd && !game.fixed ? 2 : 1), sr = actx.sampleRate, N = Math.round(sr / f), len = Math.round(sr * 2.2);
        const buf = actx.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N);
        for (let k = 0; k < N; k++) ring[k] = Math.random() * 2 - 1;
        let p = 0; const decay = 0.996 - i * 0.0006;
        for (let k = 0; k < len; k++) { const nx = (p + 1) % N; const v = ring[p]; d[k] = v; ring[p] = decay * 0.5 * (v + ring[nx]); p = nx; }
        const src = actx.createBufferSource(); src.buffer = buf; const gn = actx.createGain(); gn.gain.value = 0.16 * vel; const lp = actx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400 + i * 260;
        src.connect(lp).connect(gn).connect(actx.destination); src.start();
      } catch (e) { /* 소리 없이 그림만 */ }
    }
    function pluck(i, vel) { const s = st[i]; if (performance.now() - s.hit < 70) return; s.hit = performance.now(); s.a = 6 + 8 * vel; s.t0 = performance.now(); label = { txt: (i + 1) + "현", t: performance.now() }; sound(i, 0.5 + vel * 0.5); kick(); }
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; }
    function cross(a, b) {
      const ys = geom(); const x0 = W * 0.07, x1 = W * 0.93; if (b.x < x0 || b.x > x1) return;
      const sp = Math.min(1, Math.abs(b.y - a.y) / Math.max(1, b.t - a.t) / 1.5);
      ys.forEach((y, i) => { if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) pluck(i, sp); });
    }
    const nearest = (y0) => { const ys = geom(); let best = -1, bd = Math.max(14, (ys[1] - ys[0]) * 0.6); ys.forEach((y, i) => { const dd = Math.abs(y - y0); if (dd < bd) { bd = dd; best = i; } }); return best; };
    cv.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") cv.setPointerCapture(e.pointerId); const p = pos(e); last = p; const best = nearest(p.y); down = { x: p.x, y: p.y, i: best }; if (best >= 0) pluck(best, 0.6); });
    cv.addEventListener("pointermove", (e) => { const p = pos(e); if (last && (e.buttons || e.pointerType === "mouse")) cross(last, p); last = p; });
    cv.addEventListener("pointerleave", () => { last = null; });
    cv.addEventListener("pointercancel", () => { last = null; down = null; });
    cv.addEventListener("pointerup", (e) => { const p = pos(e); if (down && down.i >= 0 && Math.hypot(p.x - down.x, p.y - down.y) < 8) choose(down.i); last = null; down = null; });
    cv.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = sel < 0 ? 0 : Math.max(0, Math.min(STR.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); pluck(sel, 0.6); }
      else if ((e.key === "Enter" || e.key === " ") && sel >= 0) { e.preventDefault(); pluck(sel, 0.6); choose(sel); }
    });
    cv.addEventListener("focus", kick); cv.addEventListener("blur", kick);
    new ResizeObserver(size).observe(cv);
    strings = { cv }; newRound(); size();
  }

  /* ───────── 라우팅 ───────── */
  const VIEWS = { home: viewHome, programs: viewPrograms, schedule: viewSchedule, ask: viewAsk, apply: viewApply };
  function route() {
    const h = (location.hash || "#home").slice(1) || "home";
    const p = prog(h); const key = p ? "program" : (VIEWS[h] ? h : "home");
    const app = $("#app");
    const keepHero = key === "home" && !S.booted && $(".hero", app);
    if (keepHero) { $$(".loading", app).forEach((el) => el.remove()); keepHero.insertAdjacentHTML("afterend", viewHome(true)); }
    else app.innerHTML = p ? viewProgram(p) : VIEWS[key]();
    S.booted = true;
    $$("nav.main a").forEach((a) => a.classList.toggle("on", a.dataset.nav === (p ? "programs" : key)));
    document.title = p ? p.name + " · 김민성 AI교육 수업 안내" : "김민성 AI교육 수업 안내";
    if (key === "home") initStrings();
    if (key === "schedule") { renderAdminBar(); renderCal(); }
    if (key === "ask") setAIState();
    if (key === "apply") renderReqAdmin();
    appear(); reveal();
    if (!keepHero) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }
  function appear() {
    const root = document.documentElement; const go = () => root.classList.add("fonts-ready");
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(go); setTimeout(go, 1200);
    const els = $$(".appear:not(.is-in)");
    els.forEach((el) => el.addEventListener("animationend", (e) => { if (e.target === el) el.classList.add("is-in"); }));
    setTimeout(() => els.forEach((el) => el.classList.add("is-in")), 3000);
  }
  function reveal() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    const phoneRail = matchMedia("(max-width:600px)").matches;
    $$(".rv").forEach((el) => { if (phoneRail && el.closest(".rail")) return; const r = el.getBoundingClientRect(); if (r.top > innerHeight) io.observe(el); });
  }
  function footer() {
    const c = S.P.contact;
    $("#foot").innerHTML = `<div class="ph"><div class="big">김민성 AI교육</div><div>${esc(c.role)} · ${esc(c.region)}</div><div class="row"><span class="mono num">${esc(c.phone)}</span><button type="button" class="copy" data-label="번호 복사" data-text="${esc(c.phone)}">번호 복사</button></div><div class="row"><span class="mono">${esc(c.email)}</span><button type="button" class="copy" data-label="주소 복사" data-text="${esc(c.email)}">주소 복사</button></div><div class="tiny">상호: <span style="border-bottom:1px dashed var(--ink-3)">확인 필요</span> · 사업자 정보는 등록 후 표시</div></div>
      <div><h4>자료와 표기</h4><p class="small">첫 화면과 수업 카드의 사진은 AI로 만든 예시 이미지(Higgsfield)이며 실제 수업 사진이 아닙니다. 협동연극 카드는 제작실 앱 v0.2 화면 캡처입니다. 웹악기 화면은 v0.8 실제 캡처입니다. 웹악기 소리는 국립국악원 국악기 디지털 음원(공공누리 제1유형)을 씁니다. ‘높이 탐정’ 체험의 가야금 줄 소리는 브라우저 합성음입니다(AI 아님).</p><p class="tiny" style="margin-top:8px">자료 기준일 ${esc(S.P.updated)}</p></div>
      <div><h4>휴대폰으로 열기</h4><div class="qr"><img src="img/qr-home.png" alt="이 홈페이지로 가는 QR 코드" onerror="this.replaceWith(document.createTextNode('QR 준비 중'))"></div></div>`;
  }

  /* ───────── 이벤트 ───────── */
  document.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]"); if (pick) { S.prefill = Object.assign({}, S.prefill, { program: pick.dataset.pick, date: pick.dataset.date || S.prefill.date }); if (pick.tagName === "BUTTON") location.hash = "apply"; }
    const askP = e.target.closest("[data-ask]"); if (askP) { const p = prog(askP.dataset.ask); setTimeout(() => { const i = $("#chatin"); if (i && p) { i.value = p.name + "에 대해 "; i.focus(); } }, 50); }
    const cal = e.target.closest("[data-cal]"); if (cal) { const d = new Date(S.cal.y, S.cal.m + Number(cal.dataset.cal), 1); S.cal = { y: d.getFullYear(), m: d.getMonth() }; renderCal(); }
    const day = e.target.closest("[data-day]"); if (day) { if (S.isAdmin) cycleDay(day.dataset.day); else { const info = dayInfo(parse(day.dataset.day)); S.prefill = Object.assign({}, S.prefill, { date: day.dataset.day, program: S.prefill.program || (info.av && info.av[0] ? info.av[0].id : "gugak") }); location.hash = "apply"; } }
    const q = e.target.closest("[data-q]"); if (q) ask(q.dataset.q);
    const cp = e.target.closest(".copy"); if (cp) { const t = cp.dataset.text || (cp.dataset.sel && $(cp.dataset.sel) ? $(cp.dataset.sel).textContent : ""); copyText(t, cp); }
    const stop = e.target.closest("#r-stop"); if (stop && recCtl) recCtl.abort();
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id === "rec") runRec(e);
    else if (e.target.id === "apply") submitApply(e);
    else if (e.target.id === "chatform") { e.preventDefault(); ask($("#chatin").value); }
  });
  window.addEventListener("hashchange", route);

  /* ───────── 시작 ───────── */
  async function boot() {
    try {
      const [P, SCH] = await Promise.all([fetch("data/programs.json").then((r) => r.json()), fetch("data/schedule.json").then((r) => r.json())]);
      S.P = P; S.SCH = SCH; S.days = Object.assign({}, SCH.days || {});
      const now = new Date(); if (now > parse("2026-11-01")) S.cal = { y: now.getFullYear(), m: now.getMonth() };
      if (S.cal.y < 2026 || (S.cal.y === 2026 && S.cal.m < 10)) S.cal = { y: 2026, m: 10 };
    } catch (e) { $("#app").innerHTML = `<section class="section"><div class="wrap"><div class="note err">자료를 불러오지 못했습니다. 새로 고침해 주세요.</div></div></section>`; return; }
    footer(); route();
    connect();
  }
  async function connect() {
    const C = window.claude;
    if (!C || !C.use) { S.dbState = "off"; S.sampleState = "off"; renderCal(); setAIState(); return; }
    C.use("sample").then((s) => { S.sample = s || null; S.sampleState = s ? "on" : "off"; setAIState(); }).catch(() => { S.sampleState = "off"; setAIState(); });
    const [db, user] = await Promise.all([C.use("db").catch(() => null), C.use("user").catch(() => null)]);
    S.db = db; S.user = user;
    if (user) { try { S.isAdmin = await user.canEdit(); S.uid = await user.id(); S.canWrite = await user.can("data.write"); } catch (e) { /* 읽기만 */ } }
    if (!db) { S.dbState = "off"; renderCal(); return; }
    const timer = setTimeout(() => { if (S.dbState === "loading") { S.dbState = "slow"; renderCal(); } }, 10000);
    db.doc("schedule/days").onSnapshot((snap) => {
      if (!snap.metadata.fromCache) { clearTimeout(timer); S.dbState = "live"; }
      const data = snap.exists ? snap.data() : null;
      S.days = Object.assign({}, S.SCH.days || {}, (data && data.days) || {});
      renderCal();
    }, () => { clearTimeout(timer); S.dbState = "off"; renderCal(); });
    if (S.isAdmin) {
      db.collection("requests").onSnapshot((qs) => { S.requests = qs.docs.map((d) => d.data() || {}); renderReqAdmin(); }, () => {});
    }
    renderAdminBar(); renderCal();
  }
  boot();
})();
