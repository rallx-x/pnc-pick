/* =====================================================================
   뉴럴 클라우드 최애픽 — 화면 동작
   - 취향표는 캔버스 하나로 그려요. 화면에 보이는 것 = 저장되는 PNG.
   ===================================================================== */
(() => {
"use strict";
const CFG = window.PNC_CONFIG, I18N = window.PNC_I18N, CHARS = window.PNC_CHARS;

const COMPANIES = ["42lab", "svarog", "ultilife", "uas", "cybermedia", "sanctifier", "entropics"];
const CLASSES = ["guard", "sniper", "warrior", "specialist", "medic"];
const TABS = {
  company: { code: "c", slots: [...COMPANIES, "joker"] },
  class:   { code: "k", slots: CLASSES },
  free:    { code: "f", slots: Array(8).fill("free") },
  total:   { sections: ["company", "class", "free"] }
};
// 조커칸 히든픽 하트 (id, 이모지, 칸 색)
const HEARTS = [
  ["red", "❤️", "#d9434b"], ["pink", "🩷", "#e68aac"], ["orange", "🧡", "#e8843a"], ["yellow", "💛", "#e2bf3c"],
  ["green", "💚", "#4fa865"], ["blue", "💙", "#3f7fd6"], ["lightblue", "🩵", "#7cc4e6"], ["purple", "💜", "#8a5bc9"],
  ["brown", "🤎", "#8a5a3c"], ["black", "🖤", "#24252a"], ["grey", "🩶", "#8d9097"], ["white", "🤍", "#ecebe8"]
].map(([id, e, c]) => ({ id: "h:" + id, e, c }));
const heartOf = id => HEARTS.find(h => h.id === id);
const validPick = id => !!(byImg[id] || heartOf(id));
const TAB_BY_CODE = { c: "company", k: "class", f: "free" };
const CREDIT = { ko: "제작", en: "Made by", zh: "制作", ja: "制作" };
const FONT = '"PNC Pixel", "PNC Pixel Emoji", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

/* ---------- 캐릭터 찾기 ---------- */
const byId = {}, byImg = {};
CHARS.forEach(c => { byId[c.id] = c; (c.variants || [c.id]).forEach(v => { byImg[v] = c; }); });
const sueVariants = CFG.sueyoi.variants.filter(v => byImg[v]);
const SUE_NOW = sueVariants[Math.floor(Math.random() * sueVariants.length)] || CFG.sueyoi.representative;
const imgOf = c => (c.variants ? SUE_NOW : c.id);

/* ---------- 저장 상태 ---------- */
const KEY = "pnc-pick-v1";
const blankPicks = () => ({ company: Array(8).fill(null), class: Array(5).fill(null), free: Array(8).fill(null) });
const guessLang = () => {
  const l = (navigator.language || "ko").toLowerCase();
  return l.startsWith("ja") ? "ja" : l.startsWith("zh") ? "zh" : l.startsWith("ko") ? "ko" : "en";
};
let S = { lang: guessLang(), theme: CFG.defaultTheme, bg: "", names: true, tab: "company", nick: "",
          picks: blankPicks(), room: { name: "", members: [] }, unlocked: false };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved) S = Object.assign(S, saved, { picks: Object.assign(blankPicks(), saved.picks || {}) });
} catch (e) { /* 저장소를 못 쓰는 환경이면 그냥 넘어가요 */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const T = () => I18N[S.lang] || I18N.ko;
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");
const charName = c => (c && (c[S.lang] || c.ko)) || "";

/* ---------- 테마 색 (캔버스용) ---------- */
const THEME = {
  black: { bg: "#121316", panel: "#1b1d22", text: "#e9e7e3", sub: "#9b9ea6", line: "#2e3138", empty: "#3b1e1f", emptyText: "#a8595a", frame: "#ffffff", logo: null, bgAlpha: .28 },
  gray:  { bg: "#393c43", panel: "#43464e", text: "#f0efed", sub: "#bcbfc6", line: "#575b64", empty: "#5a2b2c", emptyText: "#d08585", frame: "#ffffff", logo: null, bgAlpha: .28 },
  white: { bg: "#e7e8ea", panel: "#f5f5f6", text: "#22252a", sub: "#5f636b", line: "#c9ccd1", empty: "#dcc6c6", emptyText: "#985657", frame: "#4a4e56", logo: "#30333a", bgAlpha: .18 }
};
const ACCENT = "#f08a24";
const th = () => THEME[S.theme] || THEME.gray;

/* ---------- 이미지 불러오기 ---------- */
const imgCache = {};
let renderQueued = false;
function img(src) {
  if (!imgCache[src]) {
    const im = new Image();
    im.onload = queueRender;
    im.src = src;
    imgCache[src] = im;
  }
  return imgCache[src];
}
const portrait = id => img(`assets/portrait/${id}.png`);
const logoSrc = key => key === "alternatives" ? "assets/campany/alternatives.png"
  : CLASSES.includes(key) ? `assets/class/${key}.png` : `assets/campany/${key}.png`;
const tinted = {};
function logoImg(key) {
  const base = img(logoSrc(key));
  const col = th().logo;
  if (!col || !base.complete || !base.naturalWidth) return base;
  const k = key + col;
  if (!tinted[k]) {
    const c = document.createElement("canvas");
    c.width = base.naturalWidth; c.height = base.naturalHeight;
    const x = c.getContext("2d");
    x.drawImage(base, 0, 0); x.globalCompositeOperation = "source-in";
    x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    tinted[k] = c;
  }
  return tinted[k];
}
const ready = im => im && (im instanceof HTMLCanvasElement || (im.complete && im.naturalWidth));

/* ---------- 육각형 ---------- */
const R3 = Math.sqrt(3);
function hexPath(ctx, cx, cy, w, h, pointy) {
  ctx.beginPath();
  if (pointy) {
    ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx + w / 2, cy - h / 4); ctx.lineTo(cx + w / 2, cy + h / 4);
    ctx.lineTo(cx, cy + h / 2); ctx.lineTo(cx - w / 2, cy + h / 4); ctx.lineTo(cx - w / 2, cy - h / 4);
  } else {
    ctx.moveTo(cx - w / 4, cy - h / 2); ctx.lineTo(cx + w / 4, cy - h / 2); ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx + w / 4, cy + h / 2); ctx.lineTo(cx - w / 4, cy + h / 2); ctx.lineTo(cx - w / 2, cy);
  }
  ctx.closePath();
}
// 칸 하나 그리기 (프레임 = 흰 선 + 은은한 그림자, 원본 프레임 모양 재현)
function drawCell(ctx, cx, cy, w, h, pointy, imgId, opts = {}) {
  const t = th();
  ctx.save();
  hexPath(ctx, cx, cy, w, h, pointy);
  const heart = imgId && heartOf(imgId);
  if (heart) {
    ctx.fillStyle = heart.c; ctx.fill();
    ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
    g.addColorStop(0, "rgba(255,255,255,.18)"); g.addColorStop(1, "rgba(0,0,0,.22)");
    ctx.fillStyle = g; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
    const px = Math.max(12, Math.round(h * 0.42 / 12) * 12);
    ctx.font = `${px}px "PNC Pixel Emoji", ${FONT}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(heart.e, cx, cy + 2);
  } else if (imgId) {
    ctx.fillStyle = t.panel; ctx.fill();
    ctx.save(); ctx.clip();
    const im = portrait(imgId);
    if (ready(im)) {
      const s = Math.max(w, h);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(im, cx - s / 2, cy - s / 2, s, s);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = t.empty; ctx.fill();
    if (!opts.small) {
      ctx.fillStyle = t.emptyText; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.round(h * 0.33 / 12) * 12 || 12}px ${FONT}`;
      ctx.fillText("?", cx, cy + 2);
    }
  }
  hexPath(ctx, cx, cy, w, h, pointy);
  ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = opts.small ? 3 : 6;
  ctx.lineWidth = opts.hover ? 4 : (opts.small ? 2 : 3);
  ctx.strokeStyle = opts.hover ? ACCENT : t.frame;
  ctx.stroke();
  ctx.restore();
}
function hitHex(px, py, cx, cy, w, h, pointy) {
  const dx = Math.abs(px - cx), dy = Math.abs(py - cy);
  if (pointy) return dx <= w / 2 && dy <= h / 2 - dx * (h / 2) / w * 1;
  return dy <= h / 2 && dx <= w / 2 - dy * (w / 2) / h;
}

/* ---------- 글자 ---------- */
function setFont(ctx, px, bold) { ctx.font = `${bold ? 700 : 400} ${px}px ${FONT}`; }
function wrapName(ctx, text, maxW) {
  // 한 줄에 안 들어가면 · 이나 띄어쓰기 기준으로 두 줄, 그래도 길면 글자 단위
  if (ctx.measureText(text).width <= maxW) return [text];
  const words = text.split(/(\s*[·・]\s*|\s+|-)/).filter(Boolean);
  const lines = []; let cur = "";
  words.forEach(w => {
    const trial = cur + w;
    if (ctx.measureText(trial.trim()).width <= maxW || !cur.trim()) cur = trial;
    else { lines.push(cur.trim().replace(/[·・-]$/, "").trim()); cur = w.replace(/^\s*[·・]\s*/, ""); }
  });
  if (cur.trim()) lines.push(cur.trim());
  const out = [];
  lines.forEach(l => {
    if (ctx.measureText(l).width <= maxW) { out.push(l); return; }
    let c = "";
    for (const ch of l) { if (ctx.measureText(c + ch).width > maxW && c) { out.push(c); c = ch; } else c += ch; }
    if (c) out.push(c);
  });
  if (out.length > 2) out[1] = fitText(ctx, out.slice(1).join(" "), maxW);
  return out.slice(0, 2);
}
function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}
function drawPNC(ctx, x, y) {
  setFont(ctx, 24, true);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const a = "PROJECT.NEURAL.CL", o = "O", b = "UD";
  ctx.fillStyle = th().sub; ctx.fillText(a, x, y);
  let w = ctx.measureText(a).width;
  ctx.fillStyle = ACCENT; ctx.fillText(o, x + w, y);
  w += ctx.measureText(o).width;
  ctx.fillStyle = th().sub; ctx.fillText(b, x + w, y);
}
function drawFooter(ctx, W, y, pad) {
  drawPNC(ctx, pad, y);
  setFont(ctx, 12, false);
  ctx.textAlign = "right"; ctx.fillStyle = th().sub;
  ctx.fillText(`${CFG.copyright}  |  ${CREDIT[S.lang] || CREDIT.ko} ${CFG.author}`, W - pad, y);
}
function drawBackground(ctx, W, H) {
  const t = th();
  ctx.fillStyle = t.bg; ctx.fillRect(0, 0, W, H);
  const bg = CFG.backgrounds.find(b => b.id === S.bg);
  if (bg) {
    const im = img(bg.file);
    if (ready(im)) {
      const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
      ctx.save(); ctx.globalAlpha = t.bgAlpha;
      ctx.drawImage(im, (W - im.naturalWidth * s) / 2, (H - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
      ctx.restore();
    }
  }
}
function drawLogo(ctx, key, cx, top, box) {
  const im = logoImg(key);
  if (!ready(im)) return;
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  const s = Math.min(box / iw, box / ih);
  ctx.drawImage(im, cx - iw * s / 2, top + (box - ih * s) / 2, iw * s, ih * s);
}

/* =====================================================================
   1인 취향표 (가로 육각형, 지그재그)
   ===================================================================== */
const L1 = { pad: 56, W: 220, logo: 76, logoGap: 16, nameGap: 18, nameLine: 28, footer: 64, titleH: 120, secGap: 40, secLabel: 44 };
L1.H = L1.W * R3 / 2;
L1.pitch = L1.W * 0.75;          // 변끼리 딱 붙는 간격 (편성창 느낌)

// 이격 칸: 원본과 같은 크기. 지그재그 위쪽 칸은 바로 아래, 아래쪽 칸은 바로 위에 붙임 (골짜기에 쏙)
function alterSpots(cx, cy, low, count) {
  const out = [];
  let y = cy;
  const dir = low ? -1 : 1;
  for (let k = 0; k < count; k++) {
    const ny = y + dir * L1.H, ey = y + dir * L1.H / 2;
    out.push({ x: cx, y: ny, edge: [[cx - L1.W / 4, ey], [cx + L1.W / 4, ey]] });
    y = ny;
  }
  return out;
}
// 시트 한 덩어리(기업별/직군별/8인) 배치. top = 이 덩어리가 시작하는 높이
function layoutSection(tab, top) {
  const n = TABS[tab].slots.length, picks = S.picks[tab];
  let up = 0, down = 0;
  picks.forEach((pk, i) => {
    const k = pk && pk.extra ? pk.extra.length : 0;
    if (!k) return;
    if (i % 2) up = Math.max(up, k); else down = Math.max(down, k);
  });
  const headH = tab === "free" ? 0 : (tab === "class" ? 84 : L1.logo) + L1.logoGap;
  const stripTop = top + headH + (up ? (up - 0.5) * L1.H : 0);
  const x0 = L1.pad + L1.W / 2;
  const cells = Array.from({ length: n }, (_, i) => ({
    tab, i, low: i % 2 === 1, cx: x0 + i * L1.pitch, cy: stripTop + L1.H / 2 + (i % 2 ? L1.H / 2 : 0)
  }));
  const stripBottom = stripTop + L1.H * 1.5 + (down ? (down - 0.5) * L1.H : 0);
  const namesTop = stripBottom + L1.nameGap;
  const bottom = S.names ? namesTop + L1.nameLine * 2 + 8 : stripBottom + 12;
  return { tab, headTop: top, cells, namesTop, bottom, right: L1.pad * 2 + (n - 1) * L1.pitch + L1.W };
}
function layoutSingle(tab) {
  const sections = [];
  let y = L1.pad + L1.titleH;
  const tabs = tab === "total" ? TABS.total.sections : [tab];
  tabs.forEach((tb, k) => {
    if (tab === "total") { if (k) y += L1.secGap; y += L1.secLabel; }
    const sec = layoutSection(tb, y);
    sections.push(sec); y = sec.bottom;
  });
  const width = Math.max(760, ...sections.map(s => s.right));
  return { tab, width, height: y + L1.footer + L1.pad / 2, sections, cells: sections.flatMap(s => s.cells) };
}

function slotHeader(tab, i, pick) {
  if (tab === "company") {
    if (i < 7) return { logo: COMPANIES[i] };
    const c = pick && byImg[pick.img];
    if (!c) return { text: T().jokerShort };
    return { logo: c.company === "collab" ? "alternatives" : c.company };
  }
  if (tab === "class") return { logo: CLASSES[i], label: T().classes[CLASSES[i]] };
  return null;
}
function drawHeader(ctx, W, subtitle) {
  const t = th();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  setFont(ctx, 36, true); ctx.fillStyle = t.text;
  ctx.fillText(T().chartHead, W / 2, L1.pad + 40);
  setFont(ctx, 24, false); ctx.fillStyle = t.sub;
  ctx.fillText(subtitle, W / 2, L1.pad + 80);
  if (S.nick.trim()) {
    setFont(ctx, 24, true); ctx.textAlign = "right"; ctx.fillStyle = t.text;
    const nick = fitText(ctx, S.nick.trim(), 320);
    const nx = W - L1.pad, ny = L1.pad + 80;
    ctx.fillText(nick, nx, ny);
    const nw = ctx.measureText(nick).width;
    ctx.fillStyle = ACCENT; ctx.fillRect(nx - nw - 8, ny + 10, nw + 16, 3);
  }
}
function drawSection(ctx, sec, hover, W, labeled) {
  const t = th(), tab = sec.tab, picks = S.picks[tab];
  if (labeled) {
    setFont(ctx, 24, true); ctx.textAlign = "left"; ctx.fillStyle = ACCENT;
    ctx.fillText(T().chartTitle[tab], L1.pad, sec.headTop - 16);
    const lw = ctx.measureText(T().chartTitle[tab]).width;
    ctx.strokeStyle = t.line; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L1.pad + lw + 16, sec.headTop - 24); ctx.lineTo(W - L1.pad, sec.headTop - 24); ctx.stroke();
  }
  // 맨 위 로고 줄 (고정)
  sec.cells.forEach(cell => {
    const head = slotHeader(tab, cell.i, picks[cell.i]);
    if (!head) return;
    if (head.label) {
      drawLogo(ctx, head.logo, cell.cx, sec.headTop, 44);
      setFont(ctx, 24, false); ctx.textAlign = "center"; ctx.fillStyle = t.sub;
      ctx.fillText(head.label, cell.cx, sec.headTop + 76);
    } else if (head.logo) {
      drawLogo(ctx, head.logo, cell.cx, sec.headTop, L1.logo);
    } else if (head.text) {
      setFont(ctx, 24, true); ctx.textAlign = "center"; ctx.fillStyle = ACCENT;
      ctx.fillText(head.text, cell.cx, sec.headTop + L1.logo / 2 + 10);
    }
  });
  // 칸 (붙어 있는 지그재그)
  sec.cells.forEach(cell => drawCell(ctx, cell.cx, cell.cy, L1.W, L1.H, false, picks[cell.i] && picks[cell.i].img));
  // 이격 (같은 크기, 골짜기에) + 주황 테두리로 묶기
  sec.cells.forEach(cell => {
    const pick = picks[cell.i];
    if (!pick || !pick.extra || !pick.extra.length) return;
    const spots = alterSpots(cell.cx, cell.cy, cell.low, pick.extra.length);
    spots.forEach((sp, k) => drawCell(ctx, sp.x, sp.y, L1.W, L1.H, false, pick.extra[k]));
    [{ x: cell.cx, y: cell.cy }, ...spots].forEach(sp => {
      hexPath(ctx, sp.x, sp.y, L1.W, L1.H, false);
      ctx.save(); ctx.strokeStyle = ACCENT; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    });
    ctx.save();
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 6; ctx.lineCap = "round";
    spots.forEach(sp => {
      ctx.beginPath(); ctx.moveTo(sp.edge[0][0], sp.edge[0][1]); ctx.lineTo(sp.edge[1][0], sp.edge[1][1]); ctx.stroke();
      const mx = (sp.edge[0][0] + sp.edge[1][0]) / 2, my = (sp.edge[0][1] + sp.edge[1][1]) / 2;
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = t.bg; ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  });
  if (hover && hover.tab === tab) {
    const c = sec.cells[hover.i];
    hexPath(ctx, c.cx, c.cy, L1.W, L1.H, false);
    ctx.save(); ctx.strokeStyle = ACCENT; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  }
  // 이름 (칸이 끝난 아래에 한 줄)
  if (S.names) {
    setFont(ctx, 24, false); ctx.textAlign = "center"; ctx.fillStyle = t.text;
    sec.cells.forEach(cell => {
      const pick = picks[cell.i];
      if (!pick || !byImg[pick.img]) return;
      wrapName(ctx, charName(byImg[pick.img]), L1.pitch - 6)
        .forEach((line, k) => ctx.fillText(line, cell.cx, sec.namesTop + 22 + k * L1.nameLine));
    });
  }
}
function drawSingle(ctx, L, hover) {
  drawBackground(ctx, L.width, L.height);
  drawHeader(ctx, L.width, T().chartTitle[L.tab]);
  L.sections.forEach(sec => drawSection(ctx, sec, hover, L.width, L.tab === "total"));
  drawFooter(ctx, L.width, L.height - L1.pad / 2 - 4, L1.pad);
}

/* =====================================================================
   다인 모아보기 (세로 육각형, 사람마다 일렬)
   ===================================================================== */
const L2 = { pad: 48, W: 96, gap: 12, label: 220, head: 70, badge: 8, footer: 64 };  // 다인은 이격 표시 없음
L2.H = L2.W * 2 / R3;
L2.pitch = L2.W + L2.gap;

function layoutRoom(tab, count) {
  const n = TABS[tab].slots.length;
  const titleH = 104;
  const rowH = L2.badge + L2.H + (S.names ? 26 : 0) + 12;
  const top = L2.pad + titleH + L2.head;
  const width = L2.pad * 2 + L2.label + (n - 1) * L2.pitch + L2.W + 24;
  return { tab, n, width, top, rowH, titleH, height: top + Math.max(1, count) * rowH + L2.footer + L2.pad / 2 };
}
function drawRoom(ctx, L, members) {
  const t = th(), tab = L.tab;
  drawBackground(ctx, L.width, L.height);
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  setFont(ctx, 36, true); ctx.fillStyle = t.text;
  const title = S.room.name.trim() ? fmt(T().roomResult, { room: S.room.name.trim() }) : T().chartHead;
  ctx.fillText(fitText(ctx, title, L.width - L2.pad * 2), L.width / 2, L2.pad + 40);
  setFont(ctx, 24, false); ctx.fillStyle = t.sub;
  ctx.fillText(T().chartTitle[tab], L.width / 2, L2.pad + 78);
  const colX = i => L2.pad + L2.label + L2.W / 2 + i * L2.pitch;
  // 열 머리 (고정)
  TABS[tab].slots.forEach((slot, i) => {
    const y = L2.pad + L.titleH;
    if (tab === "company") {
      if (i < 7) drawLogo(ctx, COMPANIES[i], colX(i), y, 56);
      else { setFont(ctx, 24, true); ctx.fillStyle = ACCENT; ctx.textAlign = "center"; ctx.fillText(T().jokerShort, colX(i), y + 38); }
    } else if (tab === "class") {
      drawLogo(ctx, CLASSES[i], colX(i), y, 32);
      setFont(ctx, 12, false); ctx.fillStyle = t.sub; ctx.textAlign = "center";
      ctx.fillText(T().classes[CLASSES[i]], colX(i), y + 52);
    } else {
      setFont(ctx, 24, true); ctx.fillStyle = t.sub; ctx.textAlign = "center";
      ctx.fillText(String(i + 1), colX(i), y + 38);
    }
  });
  ctx.strokeStyle = t.line; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(L2.pad, L.top - 6); ctx.lineTo(L.width - L2.pad, L.top - 6); ctx.stroke();
  // 사람마다 한 줄
  if (!members.length) {
    setFont(ctx, 24, false); ctx.fillStyle = t.sub; ctx.textAlign = "center";
    ctx.fillText(T().roomEmpty.split(".")[0].split("。")[0], L.width / 2, L.top + L.rowH / 2);
  }
  members.forEach((m, r) => {
    const cy = L.top + r * L.rowH + L2.badge + L2.H / 2;
    setFont(ctx, 24, true); ctx.textAlign = "left"; ctx.fillStyle = r === 0 ? ACCENT : t.text;
    ctx.fillText(fitText(ctx, m.n || T().nobody, L2.label - 24), L2.pad, cy + 8);
    m.p.forEach((pick, i) => {
      drawCell(ctx, colX(i), cy, L2.W, L2.H, true, pick && pick.img);
      if (S.names && pick) {
        setFont(ctx, 12, false); ctx.textAlign = "center"; ctx.fillStyle = t.sub;
        ctx.fillText(fitText(ctx, charName(byImg[pick.img]), L2.pitch - 4), colX(i), cy + L2.H / 2 + 18);
      }
    });
    if (r < members.length - 1) {
      ctx.strokeStyle = t.line; ctx.lineWidth = 1;
      const ly = L.top + (r + 1) * L.rowH - 4;
      ctx.beginPath(); ctx.moveTo(L2.pad, ly); ctx.lineTo(L.width - L2.pad, ly); ctx.stroke();
    }
  });
  drawFooter(ctx, L.width, L.height - L2.pad / 2 - 4, L2.pad);
}

/* =====================================================================
   공유 코드
   ===================================================================== */
function b64enc(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64dec(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
}
function makeCode() {
  const tab = S.tab;
  const p = S.picks[tab].map(pk => !pk ? 0 : (pk.extra && pk.extra.length ? [pk.img, pk.extra] : pk.img));
  return "PNC1." + b64enc(JSON.stringify({ t: TABS[tab].code, n: S.nick.trim(), p }));
}
function readCode(code) {
  code = code.trim();
  if (!code.startsWith("PNC1.")) return null;
  try {
    const o = JSON.parse(b64dec(code.slice(5)));
    const tab = TAB_BY_CODE[o.t];
    if (!tab || !Array.isArray(o.p)) return null;
    const n = TABS[tab].slots.length;
    const p = Array.from({ length: n }, (_, i) => {
      const v = o.p[i];
      if (!v) return null;
      const [im, ex] = Array.isArray(v) ? v : [v, []];
      if (!validPick(im)) return null;
      return { img: im, extra: (ex || []).filter(x => byImg[x]).slice(0, 2) };
    });
    return { tab, n: String(o.n || "").slice(0, 20), p, code };
  } catch (e) { return null; }
}

/* =====================================================================
   화면
   ===================================================================== */
const $ = id => document.getElementById(id);
const singleCanvas = $("singleCanvas"), roomCanvas = $("roomCanvas");
let singleL = null, hoverIdx = null;

function fitCanvas(canvas, L) {
  const cssW = canvas.parentElement.clientWidth || L.width;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const R = Math.min(2, (cssW * dpr) / L.width);
  canvas.width = Math.round(L.width * R); canvas.height = Math.round(L.height * R);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(R, 0, 0, R, 0, 0);
  return ctx;
}
function roomMembers() {
  return S.room.members.map(readCode).filter(Boolean);
}
function render() {
  renderQueued = false;
  if (S.tab === "room") {
    const ms = roomMembers();
    const tab = ms[0] ? ms[0].tab : "company";
    const L = layoutRoom(tab, ms.length);
    drawRoom(fitCanvas(roomCanvas, L), L, ms);
  } else {
    singleL = layoutSingle(S.tab);
    drawSingle(fitCanvas(singleCanvas, singleL), singleL, hoverIdx);
  }
}
function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(render);
}
function textForFonts() {
  const parts = [T().chartHead, T().chartTitle.company, T().chartTitle.class, T().chartTitle.free, S.nick, S.room.name, CFG.copyright];
  Object.values(S.picks).flat().forEach(p => p && parts.push(charName(byImg[p.img])));
  roomMembers().forEach(m => { parts.push(m.n); m.p.forEach(p => p && parts.push(charName(byImg[p.img]))); });
  return parts.join("") + "PROJECT.NEURAL.CLOUD?JOKER0123456789";
}
function ensureFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const txt = textForFonts();
  return Promise.all([
    document.fonts.load(`400 24px "PNC Pixel"`, txt),
    document.fonts.load(`700 24px "PNC Pixel"`, txt),
    document.fonts.load(`24px "PNC Pixel Emoji"`, HEARTS.map(h => h.e).join("") + S.nick + S.room.name + roomMembers().map(m => m.n).join(""))
  ]).catch(() => {});
}
const refresh = () => ensureFonts().then(queueRender);

/* ---------- 문구 적용 ---------- */
function applyTexts() {
  const t = T();
  document.documentElement.lang = S.lang === "zh" ? "zh-CN" : S.lang;
  document.title = `${t.gameTitle} ${t.siteTitle}`;
  $("gameTitle").textContent = t.gameTitle;
  $("siteTitle").textContent = t.siteTitle;
  $("notice").replaceChildren(...t.notice.map(line => { const p = document.createElement("p"); p.textContent = line; return p; }));
  document.querySelectorAll("[data-t]").forEach(el => { if (t[el.dataset.t]) el.textContent = t[el.dataset.t]; });
  document.querySelectorAll("#tabs button").forEach(b => { b.textContent = t.tabs[b.dataset.tab]; });
  $("nickInput").placeholder = t.nicknamePh;
  $("roomNameInput").placeholder = t.roomNamePh;
  $("roomPaste").placeholder = t.roomPastePh;
  $("searchInput").placeholder = t.search;
  $("pickTitle").textContent = t.pickTitle;
  const ts = $("themeSel");
  ts.replaceChildren(...["black", "gray", "white"].map(k => new Option(t.themes[k], k)));
  ts.value = S.theme;
  const bgs = CFG.backgrounds || [];
  $("bgField").hidden = !bgs.length;
  $("bgSel").replaceChildren(new Option(t.bgNone, ""), ...bgs.map(b => new Option(b.name[S.lang] || b.name.ko, b.id)));
  $("bgSel").value = S.bg;
}
function applyTheme() {
  document.body.dataset.theme = S.theme;
  document.querySelector('meta[name="theme-color"]').content = th().bg;
  const bg = (CFG.backgrounds || []).find(b => b.id === S.bg);
  const layer = $("bgLayer");
  layer.style.backgroundImage = bg ? `url("${bg.file}")` : "";
  layer.classList.toggle("on", !!bg);
}
function applyTab() {
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
  $("singleView").hidden = S.tab === "room";
  $("roomView").hidden = S.tab !== "room";
  $("codeBox").hidden = true;
  $("codeBtn").hidden = S.tab === "total";
  if (S.tab === "room") renderMembers();
}

/* ---------- 알림 ---------- */
let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* =====================================================================
   캐릭터 고르기 창
   ===================================================================== */
let pickTab = "company", pickSlot = -1, pending = null;
const kanaToHira = s => s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
const norm = s => kanaToHira(String(s).toLowerCase()).replace(/[\s·・.\-_:;()（）]/g, "");
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const chosung = s => [...s].map(ch => {
  const c = ch.charCodeAt(0) - 0xac00;
  return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch;
}).join("");
function matches(c, q) {
  if (!q) return true;
  const nq = norm(q);
  const keys = [c.ko, c.en, c.zh, c.ja, c.id];
  if (S.lang === "ko") keys.push(...c.aliases);
  if (S.lang === "ja") keys.push(...c.yomi);
  if (keys.some(k => k && norm(k).includes(nq))) return true;
  if (S.lang === "ko" && /^[ㄱ-ㅎ]+$/.test(q.replace(/\s/g, ""))) {
    return [c.ko, ...c.aliases].some(k => chosung(norm(k)).includes(q.replace(/\s/g, "")));
  }
  return false;
}
const visible = c => !c.hidden || S.unlocked;
function candidates(tab, i) {
  const slot = TABS[tab].slots[i];
  const allowHidden = c => c.hidden && S.unlocked && (slot === "joker" || slot === "free" || (c.slots || []).includes(slot));
  return CHARS.filter(c => {
    if (c.hidden) return allowHidden(c);
    if (tab === "company") return slot === "joker" ? true : c.company === slot;
    if (tab === "class") return c.cls === slot && c.company !== "collab";
    return true;
  });
}
function familyOthers(c) {
  if (!c.family) return [];
  return CHARS.filter(o => o.family === c.family && o.id !== c.id && visible(o));
}
function cardEl(c, selected) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "card" + (selected ? " sel" : "");
  const hex = document.createElement("div"); hex.className = "hex";
  const im = document.createElement("img"); im.loading = "lazy"; im.alt = ""; im.src = `assets/portrait/${imgOf(c)}.png`;
  hex.append(im);
  const sp = document.createElement("span"); sp.textContent = charName(c);
  b.append(hex, sp);
  b.addEventListener("click", () => choose(c));
  return b;
}
function renderGrid() {
  const grid = $("pickGrid"), q = $("searchInput").value.trim();
  const cur = S.picks[pickTab][pickSlot];
  const list = candidates(pickTab, pickSlot).filter(c => matches(c, q));
  grid.replaceChildren();
  if (TABS[pickTab].slots[pickSlot] === "joker" && !q) {
    const h = document.createElement("h3"); h.textContent = T().hiddenPick; grid.append(h);
    const row = document.createElement("div"); row.className = "hearts";
    HEARTS.forEach(ht => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "heart" + (cur && cur.img === ht.id ? " sel" : "");
      b.style.setProperty("--hc", ht.c); b.textContent = ht.e; b.title = ht.id.slice(2);
      b.addEventListener("click", () => commit({ img: ht.id, extra: [] }));
      row.append(b);
    });
    grid.append(row);
  }
  if (!list.length) { const p = document.createElement("p"); p.className = "empty-msg"; p.textContent = T().noResult; grid.append(p); return; }
  const groupBy = pickTab === "class" ? null : (TABS[pickTab].slots[pickSlot] === "joker" || pickTab === "free");
  const groups = groupBy ? [...COMPANIES, "collab"].map(k => [k, list.filter(c => c.company === k)]).filter(g => g[1].length) : [[null, list]];
  groups.forEach(([k, cs]) => {
    if (k) {
      const h = document.createElement("h3");
      const li = document.createElement("img"); li.alt = ""; li.src = logoSrc(k === "collab" ? "alternatives" : k);
      h.append(li, document.createTextNode(T().companies[k]));
      grid.append(h);
    }
    if (k === "collab" || (!k && cs.some(c => c.company === "collab"))) {
      const n = document.createElement("p"); n.className = "note"; n.textContent = T().collabNote; grid.append(n);
    }
    const wrap = document.createElement("div"); wrap.className = "cards";
    cs.forEach(c => wrap.append(cardEl(c, cur && byImg[cur.img] === c)));
    grid.append(wrap);
  });
}
function openPicker(tab, i) {
  pickTab = tab; pickSlot = i; pending = null;
  $("searchInput").value = "";
  $("formsBar").hidden = true;
  $("clearSlot").parentElement.hidden = !S.picks[tab][i];
  renderGrid();
  $("picker").hidden = false;
  setTimeout(() => $("searchInput").focus({ preventScroll: true }), 30);
}
function closePicker() { $("picker").hidden = true; pickSlot = -1; pending = null; }
function commit(pick) {
  S.picks[pickTab][pickSlot] = pick;
  // 종합 탭: 기업 칸에서 고르면 그 직군 칸이 비어 있을 때만 한 번 같이 채움 (조커·하트 제외)
  if (S.tab === "total" && pickTab === "company" && pickSlot < 7 && pick) {
    const c = byImg[pick.img];
    const ci = c ? CLASSES.indexOf(c.cls) : -1;
    if (ci >= 0 && c.company !== "collab" && !S.picks.class[ci]) S.picks.class[ci] = { img: pick.img, extra: [] };
  }
  persist(); closePicker(); refresh();
}
function choose(c) {
  const others = familyOthers(c);
  const old = S.picks[pickTab][pickSlot];
  if (!others.length) { commit({ img: imgOf(c), extra: [] }); return; }
  const keep = old && byImg[old.img] && byImg[old.img].family === c.family ? old.extra.filter(x => others.some(o => o.id === x)) : [];
  pending = { img: imgOf(c), extra: keep };
  const chips = $("formChips"); chips.replaceChildren();
  others.forEach(o => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", String(pending.extra.includes(o.id)));
    const im = document.createElement("img"); im.alt = ""; im.src = `assets/portrait/${o.id}.png`;
    b.append(im, document.createTextNode(charName(o)));
    b.addEventListener("click", () => {
      const on = pending.extra.includes(o.id);
      pending.extra = on ? pending.extra.filter(x => x !== o.id) : [...pending.extra, o.id].slice(0, 2);
      b.setAttribute("aria-pressed", String(!on));
    });
    chips.append(b);
  });
  document.querySelectorAll("#pickGrid .card").forEach(el => el.classList.toggle("sel", el.querySelector("span").textContent === charName(c)));
  $("formsBar").hidden = false;
}

/* =====================================================================
   모아보기 (다인)
   ===================================================================== */
function renderMembers() {
  const ul = $("memberList");
  ul.replaceChildren(...roomMembers().map((m, i) => {
    const li = document.createElement("li");
    li.append(document.createTextNode(m.n || T().nobody));
    const x = document.createElement("button"); x.type = "button"; x.textContent = "✕"; x.title = T().remove;
    x.addEventListener("click", () => { S.room.members.splice(i, 1); persist(); renderMembers(); refresh(); });
    li.append(x); return li;
  }));
  $("roomNameInput").value = S.room.name;
}
function addCodes(text) {
  const codes = text.split(/\s+/).map(s => s.trim()).filter(Boolean);
  let bad = false, mismatch = "";
  codes.forEach(code => {
    const m = readCode(code);
    if (!m) { bad = true; return; }
    const first = roomMembers()[0];
    if (first && first.tab !== m.tab) { mismatch = first.tab; return; }
    S.room.members.push(m.code);
  });
  $("roomMsg").textContent = mismatch ? fmt(T().roomTabMismatch, { tab: T().tabs[mismatch] }) : bad ? T().roomBadCode : "";
  persist(); renderMembers(); refresh();
}

/* =====================================================================
   PNG 저장
   ===================================================================== */
async function savePNG(kind) {
  await ensureFonts();
  const EXPORT = 1.5;
  const c = document.createElement("canvas"), ctx = c.getContext("2d");
  let L, name;
  if (kind === "room") {
    const ms = roomMembers(); const tab = ms[0] ? ms[0].tab : "company";
    L = layoutRoom(tab, ms.length);
    c.width = Math.round(L.width * EXPORT); c.height = Math.round(L.height * EXPORT);
    ctx.scale(EXPORT, EXPORT); drawRoom(ctx, L, ms);
    name = `pnc_room_${S.room.name.trim() || tab}`;
  } else {
    L = layoutSingle(S.tab);
    c.width = Math.round(L.width * EXPORT); c.height = Math.round(L.height * EXPORT);
    ctx.scale(EXPORT, EXPORT); drawSingle(ctx, L, null);
    name = `pnc_${S.tab}_${S.nick.trim() || "pick"}`;
  }
  c.toBlob(blob => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name.replace(/[\\/:*?"<>|\s]+/g, "_") + ".png";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(T().saved);
  }, "image/png");
}

/* =====================================================================
   이벤트
   ===================================================================== */
function canvasPoint(e) {
  const r = singleCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * singleL.width, y: (e.clientY - r.top) / r.height * singleL.height };
}
function cellAt(e) {
  if (!singleL) return null;
  const p = canvasPoint(e);
  const c = singleL.cells.find(c => hitHex(p.x, p.y, c.cx, c.cy, L1.W, L1.H, false));
  return c ? { tab: c.tab, i: c.i } : null;
}
const sameCell = (a, b) => (a && b) ? a.tab === b.tab && a.i === b.i : a === b;
singleCanvas.addEventListener("click", e => { const c = cellAt(e); if (c) openPicker(c.tab, c.i); });
singleCanvas.addEventListener("mousemove", e => {
  const c = cellAt(e);
  singleCanvas.style.cursor = c ? "pointer" : "default";
  if (!sameCell(c, hoverIdx)) { hoverIdx = c; queueRender(); }
});
singleCanvas.addEventListener("mouseleave", () => { if (hoverIdx) { hoverIdx = null; queueRender(); } });

document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => {
  S.tab = b.dataset.tab; persist(); applyTab(); refresh();
}));
$("langSel").addEventListener("change", e => { S.lang = e.target.value; persist(); applyTexts(); applyTab(); refresh(); });
$("themeSel").addEventListener("change", e => { S.theme = e.target.value; persist(); applyTheme(); refresh(); });
$("bgSel").addEventListener("change", e => { S.bg = e.target.value; persist(); applyTheme(); refresh(); });
$("namesChk").addEventListener("change", e => { S.names = e.target.checked; persist(); refresh(); });
$("nickInput").addEventListener("input", e => { S.nick = e.target.value; persist(); refresh(); });
$("roomNameInput").addEventListener("input", e => { S.room.name = e.target.value; persist(); refresh(); });

$("saveBtn").addEventListener("click", () => savePNG("single"));
$("roomSaveBtn").addEventListener("click", () => savePNG("room"));
$("codeBtn").addEventListener("click", () => {
  $("codeOut").value = makeCode(); $("codeBox").hidden = false; $("codeOut").select();
});
$("copyBtn").addEventListener("click", () => {
  const ta = $("codeOut");
  const fallback = () => { ta.focus(); ta.select(); try { document.execCommand("copy") ? toast(T().copied) : toast(T().copyFail); } catch (e) { toast(T().copyFail); } };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(() => toast(T().copied), fallback);
  else fallback();
});
let resetArmed = 0;
$("resetBtn").addEventListener("click", () => {
  if (Date.now() - resetArmed < 3000) {
    if (S.tab === "total") S.picks = blankPicks(); else S.picks[S.tab] = blankPicks()[S.tab];
    persist(); resetArmed = 0; $("codeBox").hidden = true; refresh();
  } else { resetArmed = Date.now(); toast(T().resetConfirm); }
});
$("roomAddBtn").addEventListener("click", () => { addCodes($("roomPaste").value); $("roomPaste").value = ""; });
$("roomMineBtn").addEventListener("click", () => {
  const prevTab = S.tab;
  const first = roomMembers()[0];
  S.tab = first ? first.tab : "company";
  const code = makeCode(); S.tab = prevTab;
  addCodes(code);
});

$("pickClose").addEventListener("click", closePicker);
$("picker").addEventListener("click", e => { if (e.target.id === "picker") closePicker(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("picker").hidden) closePicker(); });
$("searchInput").addEventListener("input", renderGrid);
$("clearSlot").addEventListener("click", () => commit(null));
$("formsDone").addEventListener("click", () => { if (pending) commit(pending); });

// 이스터에그: CLOUD의 주황 O를 3번
let eggClicks = [];
$("eggO").addEventListener("click", () => {
  const now = Date.now();
  eggClicks = eggClicks.filter(t => now - t < 1500).concat(now);
  if (eggClicks.length >= 3) {
    eggClicks = [];
    if (S.unlocked) { toast(T().unlockAlready); return; }
    S.unlocked = true; persist();
    toast(CFG.unlockMessage[S.lang] || CFG.unlockMessage.ko);
  }
});

new ResizeObserver(() => queueRender()).observe(document.querySelector("main"));

/* ---------- 시작 ---------- */
$("langSel").value = S.lang;
$("namesChk").checked = S.names;
$("nickInput").value = S.nick;
applyTexts(); applyTheme(); applyTab(); refresh();

// 확인용 (개발자 도구에서 사용)
window.PNC_DEBUG = { state: () => S, layout: () => singleL, makeCode, readCode, render: queueRender };
})();
