/* =====================================================================
   뉴럴 클라우드 취향픽 — 화면 동작
   - 취향표는 캔버스 하나로 그려요. 화면에 보이는 것 = 저장되는 PNG.
   ===================================================================== */
(() => {
"use strict";
const CFG = window.PNC_CONFIG, I18N = window.PNC_I18N, CHARS = window.PNC_CHARS;

const COMPANIES = ["42lab", "svarog", "ultilife", "uas", "cybermedia", "sanctifier", "entropics"];
const CLASSES = ["guard", "sniper", "warrior", "specialist", "medic"];
const TABS = {
  company: { code: "c", slots: [...COMPANIES, "joker"] },   // 8번째 = 조커픽 (모든 기업 + 콜라보)
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
const validPick = id => !!byImg[id];
const TAB_BY_CODE = { c: "company", k: "class", f: "free" };
const CREDIT = { ko: "제작", en: "Made by", zh: "制作", ja: "制作" };
const FONT = '"PNC Pixel", "PNC Pixel Emoji", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

/* ---------- 캐릭터 찾기 ---------- */
const byId = {}, byImg = {};
CHARS.forEach(c => { byId[c.id] = c; (c.variants || [c.id]).forEach(v => { byImg[v] = c; }); });
const sueVariants = CFG.sueyoi.variants.filter(v => byImg[v]);
const SUE_NOW = CFG.sueyoi.random ? (sueVariants[Math.floor(Math.random() * sueVariants.length)] || CFG.sueyoi.representative) : CFG.sueyoi.representative;
// 기본으로 보이는 일러스트 (스에요이는 config 대표, 다른 캐릭터는 원래 이미지)
const imgOf = c => (!c.variants ? c.id : c.id === "sueyoi" ? SUE_NOW : c.variants.includes(c.id) ? c.id : c.variants[0]);

/* ---------- 저장 상태 ---------- */
const KEY = "pnc-pick-v1";
const blankPicks = () => ({ company: Array(8).fill(null), class: Array(5).fill(null), free: Array(8).fill(null) });
const guessLang = () => {
  const l = (navigator.language || "ko").toLowerCase();
  return l.startsWith("ja") ? "ja" : l.startsWith("zh") ? "zh" : l.startsWith("ko") ? "ko" : "en";
};
let S = { lang: guessLang(), theme: CFG.defaultTheme, names: true, tab: "company", nick: "",
          picks: blankPicks(), room: { name: "", members: [] }, unlocked: false, heart: null, skins: [], skinChars: [] };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || "null");
  if (saved) S = Object.assign(S, saved, { picks: Object.assign(blankPicks(), saved.picks || {}) });
} catch (e) { /* 저장소를 못 쓰는 환경이면 그냥 넘어가요 */ }
if (!Array.isArray(S.skins)) S.skins = [];
if (!Array.isArray(S.skinChars)) S.skinChars = [];
// 예전 방식으로 해금한 스에요이 → 캐릭터 단위 해금으로 옮기기
if (S.sueUnlocked || S.skins.some(v => v.startsWith("sueyoi_"))) { S.skinChars = [...new Set([...S.skinChars, "sueyoi"])]; delete S.sueUnlocked; }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const T = () => I18N[S.lang] || I18N.ko;
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? "");
const charName = c => (c && (c[S.lang] || c.ko)) || "";

/* ---------- 테마 색 (캔버스용) ---------- */
const THEME = {
  black: { bg: "#121316", panel: "#1b1d22", text: "#e9e7e3", sub: "#9b9ea6", line: "#2e3138", empty: "#3b1e1f", emptyText: "#a8595a", frame: "#ffffff", logo: null },
  gray:  { bg: "#393c43", panel: "#43464e", text: "#f0efed", sub: "#bcbfc6", line: "#575b64", empty: "#5a2b2c", emptyText: "#d08585", frame: "#ffffff", logo: null },
  white: { bg: "#e7e8ea", panel: "#f5f5f6", text: "#22252a", sub: "#5f636b", line: "#c9ccd1", empty: "#dcc6c6", emptyText: "#985657", frame: "#4a4e56", logo: "#30333a" }
};
const ACCENT = "#f08a24";
// 히든 캐릭터(여제) 전용 테두리 — 일러스트 배경의 진한 분홍
const HIDDEN_FRAME = "#d61d62";
const isHiddenImg = id => !!(id && byImg[id] && byImg[id].hidden);
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

/* ---------- 빈칸 (assets/blank/missing.png) ---------- */
// 빈칸 색 = 고른 하트 색 (안 골랐으면 기본 빨강)
// 콜라보 캐릭터를 하나라도 골랐으면 랜덤 색 (들어올 때·픽을 바꿀 때마다 새로 뽑아요)
const blankSrc = "assets/blank/missing.png";
const blankRand = {};
const hasCollab = groups => groups.some(arr => (arr || []).some(pk => pk &&
  [pk.img, ...(pk.extra || [])].some(id => byImg[id] && byImg[id].company === "collab")));
function blankColor(key, heartId, groups) {
  if (hasCollab(groups)) {
    if (!blankRand[key]) blankRand[key] = HEARTS[Math.floor(Math.random() * HEARTS.length)].c;
    return blankRand[key];
  }
  return (heartOf(heartId) || HEARTS[0]).c;
}
const myBlank = () => blankColor("me", S.heart, [S.picks.company, S.picks.free]);
const tintedBlank = {};
function blankImg(col) {
  const base = img(blankSrc);
  if (!base.complete || !base.naturalWidth) return null;
  if (!tintedBlank[col]) {
    const c = document.createElement("canvas");
    c.width = base.naturalWidth; c.height = base.naturalHeight;
    const x = c.getContext("2d");
    x.drawImage(base, 0, 0);
    x.globalCompositeOperation = "multiply"; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = "destination-in"; x.drawImage(base, 0, 0);
    tintedBlank[col] = c;
  }
  return tintedBlank[col];
}

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
    drawHeartIcon(ctx, heart.e, cx, cy + 2, Math.max(12, Math.round(h * 0.42 / 12) * 12));
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
    const col = opts.blank || HEARTS[0].c;
    ctx.fillStyle = t.panel; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.globalAlpha = .22; ctx.fillStyle = col; ctx.fillRect(cx - w / 2, cy - h / 2, w, h); ctx.globalAlpha = 1;
    const bim = blankImg(col);
    if (bim) {
      const s = Math.max(w, h);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bim, cx - s / 2, cy - s / 2, s, s);
    }
    ctx.restore();
    if (!bim && !opts.small) {
      ctx.fillStyle = col; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.round(h * 0.33 / 12) * 12 || 12}px ${FONT}`;
      ctx.fillText("?", cx, cy + 2);
    }
  }
  hexPath(ctx, cx, cy, w, h, pointy);
  ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = opts.small ? 3 : 6;
  const hidden = isHiddenImg(imgId);
  ctx.lineWidth = opts.hover ? 4 : hidden ? 5 : (opts.small ? 2 : 3);
  ctx.strokeStyle = opts.hover ? ACCENT : hidden ? HIDDEN_FRAME : t.frame;
  ctx.stroke();
  ctx.restore();
}
function drawPlusCell(ctx, cx, cy) {
  const t = th();
  ctx.save();
  hexPath(ctx, cx, cy, L1.W, L1.H, false);
  ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = t.sub; ctx.stroke();
  ctx.setLineDash([]);
  setFont(ctx, 60, true); ctx.fillStyle = t.sub; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("+", cx, cy + 2);
  ctx.restore();
}
function drawHeartIcon(ctx, e, cx, cy, px) {
  ctx.save();
  ctx.font = `${px}px "PNC Pixel Emoji", ${FONT}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(e, cx, cy);
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
  // PROJECT.NEURAL.CLOUD — O는 전부 주황색
  setFont(ctx, 24, true);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  let cx = x;
  for (const ch of "PROJECT.NEURAL.CLOUD") {
    ctx.fillStyle = ch === "O" ? ACCENT : th().sub;
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width;
  }
}
function drawFooter(ctx, W, y, pad) {
  drawPNC(ctx, pad, y);
  setFont(ctx, 12, false);
  ctx.textAlign = "right"; ctx.fillStyle = th().sub;
  ctx.fillText(`${CFG.copyright}  |  ${CREDIT[S.lang] || CREDIT.ko} ${CFG.author}`, W - pad, y);
}
function drawBackground(ctx, W, H) {
  ctx.fillStyle = th().bg; ctx.fillRect(0, 0, W, H);
}
// 로고는 큰 원본(512px)을 한 번에 줄이면 가는 선이 깨져서, 반씩 여러 번 줄인 걸 따로 만들어 둬요
const scaledCache = {};
function scaledLogo(key, im, targetPx) {
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  const tw = Math.max(1, Math.round(targetPx));
  const ck = key + (th().logo || "") + "@" + tw;
  if (scaledCache[ck]) return scaledCache[ck];
  let src = im, w = iw, h = ih;
  while (w / 2 >= tw) {
    const c = document.createElement("canvas");
    c.width = Math.round(w / 2); c.height = Math.round(h / 2);
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high";
    x.drawImage(src, 0, 0, c.width, c.height);
    src = c; w = c.width; h = c.height;
  }
  scaledCache[ck] = src;
  return src;
}
function drawLogo(ctx, key, cx, top, box) {
  const im = logoImg(key);
  if (!ready(im)) return;
  const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  const s = Math.min(box / iw, box / ih);
  const devScale = Math.abs(ctx.getTransform().a) || 1;
  const src = scaledLogo(key, im, iw * s * devScale);
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, cx - iw * s / 2, top + (box - ih * s) / 2, iw * s, ih * s);
  ctx.restore();
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
function layoutSection(tab, top, forExport) {
  const picks = S.picks[tab];
  const n = TABS[tab].slots.length, plus = false;
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
    tab, i, low: i % 2 === 1, plus: plus && i === 7, cx: x0 + i * L1.pitch, cy: stripTop + L1.H / 2 + (i % 2 ? L1.H / 2 : 0)
  }));
  const stripBottom = stripTop + L1.H * 1.5 + (down ? (down - 0.5) * L1.H : 0);
  const namesTop = stripBottom + L1.nameGap;
  const bottom = S.names ? namesTop + L1.nameLine * 2 + 8 : stripBottom + 12;
  return { tab, headTop: top, cells, namesTop, bottom, right: L1.pad * 2 + (n - 1) * L1.pitch + L1.W };
}
function layoutSingle(tab, forExport) {
  const sections = [];
  let y = L1.pad + L1.titleH;
  const tabs = tab === "total" ? TABS.total.sections : [tab];
  tabs.forEach((tb, k) => {
    if (tab === "total") { if (k) y += L1.secGap; y += L1.secLabel; }
    const sec = layoutSection(tb, y, forExport);
    sections.push(sec); y = sec.bottom;
  });
  const width = Math.max(760, ...sections.map(s => s.right));
  // 칸이 적은 덩어리(직군별 5칸 등)는 가운데 정렬
  sections.forEach(sec => { const dx = (width - sec.right) / 2; sec.cells.forEach(c => { c.cx += dx; }); });
  return { tab, width, height: y + L1.footer + L1.pad / 2, sections, cells: sections.flatMap(s => s.cells) };
}

function slotHeader(tab, i, pick) {
  if (tab === "company") {
    if (i < 7) return { logo: COMPANIES[i] };
    const c = pick && byImg[pick.img];
    // 조커칸 위는 늘 하트 (기본 ❤️, 눌러서 색 변경)
    return { heart: (S.heart && heartOf(S.heart)) ? heartOf(S.heart).e : "❤️" };
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
    if (cell.plus) { ctx.save(); ctx.globalAlpha = .35; drawLogo(ctx, head.logo, cell.cx, sec.headTop, L1.logo); ctx.restore(); return; }
    if (head.label) {
      drawLogo(ctx, head.logo, cell.cx, sec.headTop, 44);
      setFont(ctx, 24, false); ctx.textAlign = "center"; ctx.fillStyle = t.sub;
      ctx.fillText(head.label, cell.cx, sec.headTop + 76);
    } else if (head.logo) {
      drawLogo(ctx, head.logo, cell.cx, sec.headTop, L1.logo);
    } else if (head.heart) {
      drawHeartIcon(ctx, head.heart, cell.cx, sec.headTop + L1.logo / 2, 48);
    } else if (head.text) {
      setFont(ctx, 24, true); ctx.textAlign = "center"; ctx.fillStyle = ACCENT;
      ctx.fillText(head.text, cell.cx, sec.headTop + L1.logo / 2 + 10);
    }
  });
  // 칸 (붙어 있는 지그재그)
  const blank = myBlank();
  sec.cells.forEach(cell => {
    if (cell.plus) { drawPlusCell(ctx, cell.cx, cell.cy); return; }
    drawCell(ctx, cell.cx, cell.cy, L1.W, L1.H, false, picks[cell.i] && picks[cell.i].img, { blank });
  });
  // 이격 (같은 크기, 골짜기에) + 주황 테두리로 묶기
  sec.cells.forEach(cell => {
    const pick = picks[cell.i];
    if (!pick || !pick.extra || !pick.extra.length) return;
    const spots = alterSpots(cell.cx, cell.cy, cell.low, pick.extra.length);
    spots.forEach((sp, k) => drawCell(ctx, sp.x, sp.y, L1.W, L1.H, false, pick.extra[k]));
    // 홍옥의 여제가 묶음에 있으면 묶음 전체가 분홍 테두리
    const gcol = [pick.img, ...pick.extra].some(isHiddenImg) ? HIDDEN_FRAME : ACCENT;
    [{ x: cell.cx, y: cell.cy }, ...spots].forEach(sp => {
      hexPath(ctx, sp.x, sp.y, L1.W, L1.H, false);
      ctx.save(); ctx.strokeStyle = gcol; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
    });
    ctx.save();
    ctx.strokeStyle = gcol; ctx.lineWidth = 6; ctx.lineCap = "round";
    spots.forEach(sp => {
      ctx.beginPath(); ctx.moveTo(sp.edge[0][0], sp.edge[0][1]); ctx.lineTo(sp.edge[1][0], sp.edge[1][1]); ctx.stroke();
      const mx = (sp.edge[0][0] + sp.edge[1][0]) / 2, my = (sp.edge[0][1] + sp.edge[1][1]) / 2;
      ctx.fillStyle = gcol; ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.fill();
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
const L2 = { pad: 48, W: 96, gap: 12, label: 220, head: 70, footer: 64, icon: 30 };  // 다인은 이격 표시 없음
L2.H = L2.W * 2 / R3;
L2.pitch = L2.W + L2.gap;
// 조합: cc = 기업별 + 직군별, fc = 내맘대로 8인 + 직군별
const COMBOS = { cc: "company", fc: "free" };

// part: "all" = 한 장 / "top" = 위 줄(기업별·8인)만 / "class" = 직군별만
function layoutRoom(combo, members, part = "all") {
  const topTab = COMBOS[combo] || "company";
  const showTop = part !== "class", showCls = part !== "top";
  const titleH = 104;
  const rowH = L2.H + (S.names ? 26 : 0) + 10;
  const blockH = (showTop ? rowH : 0) + (showCls ? rowH : 0) + 18;
  const head = showTop ? L2.head : 8;
  const top = L2.pad + titleH + head;
  const span = 7 * L2.pitch + L2.W;
  const width = L2.pad * 2 + L2.label + span + 24;
  const x0 = L2.pad + L2.label;
  // 직군 줄: 칸 왼쪽에 직군 아이콘, 위 줄 폭 안에서 가운데 정렬
  const unit = L2.icon + 6 + L2.W, cgap = 18, ctotal = 5 * unit + 4 * cgap;
  const cstart = x0 + (span - ctotal) / 2;
  return {
    combo, topTab, part, showTop, showCls, width, top, rowH, blockH, titleH, x0,
    colX: i => x0 + L2.W / 2 + i * L2.pitch,
    clsX: i => cstart + i * (unit + cgap) + L2.icon + 6 + L2.W / 2,
    clsIconX: i => cstart + i * (unit + cgap) + L2.icon / 2,
    height: top + Math.max(1, members.length) * blockH + L2.footer + L2.pad / 2
  };
}
function drawRoomRow(ctx, picks, xs, cy, blank) {
  const t = th();
  picks.forEach((pick, i) => {
    drawCell(ctx, xs(i), cy, L2.W, L2.H, true, pick && pick.img, { blank });
    if (S.names && pick && byImg[pick.img]) {
      setFont(ctx, 12, false); ctx.textAlign = "center"; ctx.fillStyle = t.sub;
      ctx.fillText(fitText(ctx, charName(byImg[pick.img]), L2.pitch - 4), xs(i), cy + L2.H / 2 + 18);
    }
  });
}
function drawRoom(ctx, L, members) {
  const t = th();
  drawBackground(ctx, L.width, L.height);
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  setFont(ctx, 36, true); ctx.fillStyle = t.text;
  const title = S.room.name.trim() ? fmt(T().roomResult, { room: S.room.name.trim() }) : T().chartHead;
  ctx.fillText(fitText(ctx, title, L.width - L2.pad * 2), L.width / 2, L2.pad + 40);
  setFont(ctx, 24, false); ctx.fillStyle = t.sub;
  const sub = L.part === "top" ? T().chartTitle[L.topTab] : L.part === "class" ? T().chartTitle.class
    : `${T().chartTitle[L.topTab]} + ${T().chartTitle.class}`;
  ctx.fillText(sub, L.width / 2, L2.pad + 78);
  // 열 머리 (위 줄 기준, 고정)
  if (L.showTop) {
    const y = L2.pad + L.titleH;
    for (let i = 0; i < 8; i++) {
      if (L.topTab === "company") {
        if (i < 7) drawLogo(ctx, COMPANIES[i], L.colX(i), y, 56);
        else drawHeartIcon(ctx, "⭐", L.colX(i), y + 28, 36);   // 조커픽 = 별
      } else {
        setFont(ctx, 24, true); ctx.fillStyle = t.sub; ctx.textAlign = "center";
        ctx.fillText(String(i + 1), L.colX(i), y + 38);
      }
    }
  }
  ctx.strokeStyle = t.line; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(L2.pad, L.top - 6); ctx.lineTo(L.width - L2.pad, L.top - 6); ctx.stroke();
  if (!members.length) {
    setFont(ctx, 24, false); ctx.fillStyle = t.sub; ctx.textAlign = "center";
    ctx.fillText(T().roomEmpty.split(".")[0].split("。")[0], L.width / 2, L.top + L.blockH / 2);
  }
  members.forEach((m, r) => {
    const by = L.top + r * L.blockH + 8;
    // 닉네임: 블록 세로 가운데
    const midY = by + (L.blockH - 18) / 2;
    setFont(ctx, 24, true); ctx.textAlign = "left"; ctx.fillStyle = r === 0 ? ACCENT : t.text;
    const nm = fitText(ctx, m.n || T().nobody, L2.label - 60);
    ctx.fillText(nm, L2.pad, midY + 8);
    if (m.heart && heartOf(m.heart)) drawHeartIcon(ctx, heartOf(m.heart).e, L2.pad + ctx.measureText(nm).width + 22, midY, 24);
    let y = by;
    const blank = blankColor("m:" + r, m.heart, [m.company, m.free]);
    if (L.showTop) { drawRoomRow(ctx, m.a, L.colX, y + L2.H / 2, blank); y += L.rowH; }
    if (L.showCls) {
      const cy = y + L2.H / 2;
      CLASSES.forEach((k, i) => drawLogo(ctx, k, L.clsIconX(i), cy - L2.icon / 2, L2.icon));
      drawRoomRow(ctx, m.b, L.clsX, cy, blank);
    }
    if (r < members.length - 1) {
      ctx.strokeStyle = t.line; ctx.lineWidth = 1;
      const ly = L.top + (r + 1) * L.blockH - 4;
      ctx.beginPath(); ctx.moveTo(L2.pad, ly); ctx.lineTo(L.width - L2.pad, ly); ctx.stroke();
    }
  });
  drawFooter(ctx, L.width, L.height - L2.pad / 2 - 4, L2.pad);
}

/* =====================================================================
   공유 코드 — 종합 탭에서만, 조합 2가지 (기업별+직군별 / 8인+직군별)
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
const packPicks = arr => arr.map(pk => !pk ? 0 : (pk.extra && pk.extra.length ? [pk.img, pk.extra] : pk.img));
// 공유 코드 하나에 기업별 + 직군별 + 8인 + 하트 전부 (모아보기에서 조합을 골라 봄)
/* ---------- 짧은 코드 (N1.) ----------
   캐릭터는 data.js 순서 번호, 스킨은 그 캐릭터 안의 순서 번호로 비트에 꾹꾹 담아요.
   ※ 새 캐릭터는 data.js 맨 끝에, 새 스킨은 그 캐릭터 variants 맨 끝에 추가해야 예전 코드가 안 깨져요. */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const charIndex = {}; CHARS.forEach((c, i) => { charIndex[c.id] = i; });
function packShort(groups, nick, heart) {
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  const hi = heart ? HEARTS.findIndex(h => h.id === heart) + 1 : 0;
  put(hi, 4);
  groups.forEach(arr => arr.forEach(pk => {
    if (!pk || !byImg[pk.img]) { put(0, 1); return; }
    const c = byImg[pk.img];
    put(1, 1); put(charIndex[c.id], 7);
    put(c.variants ? Math.max(0, c.variants.indexOf(pk.img)) : 0, 4);
    const ex = (pk.extra || []).filter(x => byImg[x]).slice(0, 2);
    put(ex.length, 2); ex.forEach(x => put(charIndex[byImg[x].id], 7));
  }));
  while (bits.length % 6) bits.push(0);
  let out = "";
  for (let i = 0; i < bits.length; i += 6) out += B64[parseInt(bits.slice(i, i + 6).join(""), 2)];
  return "N1." + out + (nick ? "." + b64enc(nick) : "");
}
function unpackShort(code) {
  const [, body, nickPart] = code.split(".");
  const bits = [];
  for (const ch of body) { const v = B64.indexOf(ch); if (v < 0) throw 0; for (let i = 5; i >= 0; i--) bits.push((v >> i) & 1); }
  let p = 0;
  const get = n => { let v = 0; for (let i = 0; i < n; i++) { if (p >= bits.length) throw 0; v = (v << 1) | bits[p++]; } return v; };
  const hi = get(4);
  const read = n => Array.from({ length: n }, () => {
    if (!get(1)) return null;
    const c = CHARS[get(7)], vi = get(4), exn = get(2);
    const ex = Array.from({ length: exn }, () => (CHARS[get(7)] || {}).id).filter(Boolean);
    if (!c) return null;
    const img = c.variants ? (c.variants[vi] || imgOf(c)) : c.id;
    return { img, extra: ex };
  });
  const company = read(8), cls = read(5), free = read(8);
  return { n: nickPart ? b64dec(nickPart).slice(0, 20) : "", company, cls, free, heart: hi ? (HEARTS[hi - 1] || {}).id || null : null };
}
function makeCode() {
  return packShort([S.picks.company, S.picks.class, S.picks.free], S.nick.trim(), S.heart);
}
function makeCodeLong() {
  const o = { n: S.nick.trim(), c: packPicks(S.picks.company), k: packPicks(S.picks.class), f: packPicks(S.picks.free) };
  if (S.heart) o.h = S.heart;
  return "PNC3." + b64enc(JSON.stringify(o));
}
function unpack(arr, n) {
  return Array.from({ length: n }, (_, i) => {
    const v = (arr || [])[i];
    if (!v) return null;
    const [im, ex] = Array.isArray(v) ? v : [v, []];
    if (!validPick(im)) return null;
    return { img: im, extra: (ex || []).filter(x => byImg[x]).slice(0, 2) };
  });
}
function readCode(code) {
  code = code.trim();
  try {
    if (code.startsWith("N1.")) return { ...unpackShort(code), code };
    if (code.startsWith("PNC3.")) {
      const o = JSON.parse(b64dec(code.slice(5)));
      return { n: String(o.n || "").slice(0, 20), company: unpack(o.c, 8), cls: unpack(o.k, 5), free: unpack(o.f, 8), code, heart: heartOf(o.h) ? o.h : null };
    }
    if (code.startsWith("PNC2.")) {      // 이전 형식도 읽어줌
      const o = JSON.parse(b64dec(code.slice(5)));
      const top = unpack(o.a, 8), empty = Array(8).fill(null);
      return { n: String(o.n || "").slice(0, 20), company: o.k === "cc" ? top : empty, cls: unpack(o.b, 5), free: o.k === "fc" ? top : empty, code, heart: heartOf(o.h) ? o.h : null };
    }
  } catch (e) { /* 깨진 코드 */ }
  return null;
}

/* =====================================================================
   화면
   ===================================================================== */
const $ = id => document.getElementById(id);
const singleCanvas = $("singleCanvas"), roomCanvas = $("roomCanvas");
let singleL = null, hoverIdx = null;

function fitCanvas(canvas, L) {
  // 칸이 적은 탭(직군별 5칸 등)이 화면 가득 커지지 않게 최대 크기 제한
  const cssW = Math.min(canvas.parentElement.clientWidth || L.width, L.width * 0.62);
  canvas.style.width = cssW + "px"; canvas.style.margin = "0 auto";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const R = Math.min(2, (cssW * dpr) / L.width);
  canvas.width = Math.round(L.width * R); canvas.height = Math.round(L.height * R);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(R, 0, 0, R, 0, 0);
  return ctx;
}
function roomMembers() {
  const combo = roomCombo();
  return S.room.members.map(readCode).filter(Boolean)
    .map(m => ({ ...m, a: combo === "cc" ? m.company : m.free, b: m.cls }));
}
const roomCombo = () => (S.room.combo === "fc" ? "fc" : "cc");
function render() {
  renderQueued = false;
  if (S.tab === "room") {
    const ms = roomMembers();
    const L = layoutRoom(roomCombo(), ms);
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
  roomMembers().forEach(m => { parts.push(m.n); [...m.a, ...m.b].forEach(p => p && byImg[p.img] && parts.push(charName(byImg[p.img]))); });
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
  $("gameTitle").textContent = I18N.en.gameTitle;   // 위 작은 제목은 언어 상관없이 영어 표기 고정
  $("siteTitle").textContent = t.siteTitle;
  document.querySelectorAll("#noticePop [data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === S.lang)));
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
}
function applyTheme() {
  document.body.dataset.theme = S.theme;
  document.querySelector('meta[name="theme-color"]').content = th().bg;
}
function applyTab() {
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
  $("singleView").hidden = S.tab === "room";
  $("roomView").hidden = S.tab !== "room";
  $("codeBox").hidden = true;
  $("codeBtn").hidden = S.tab !== "total";   // 공유 코드는 종합 탭에서만
  if (S.tab === "room" && typeof applyCombo === "function") applyCombo();
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
  b.type = "button"; b.className = "card" + (selected ? " sel" : "") + (c.hidden ? " hidden-char" : "");
  const hex = document.createElement("div"); hex.className = "hex";
  const im = document.createElement("img"); im.loading = "lazy"; im.alt = ""; im.src = `assets/portrait/${imgOf(c)}.png`;
  hex.append(im);
  const sp = document.createElement("span"); sp.textContent = charName(c);
  b.append(hex, sp);
  b.addEventListener("click", () => choose(c));
  return b;
}
function renderHearts() {
  const grid = $("pickGrid");
  const row = document.createElement("div"); row.className = "hearts";
  HEARTS.forEach(ht => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "heart" + (S.heart === ht.id ? " sel" : "");
    b.style.setProperty("--hc", ht.c); b.textContent = ht.e; b.title = ht.id.slice(2);
    b.addEventListener("click", () => { S.heart = ht.id; persist(); closePicker(); refresh(); });
    row.append(b);
  });
  grid.replaceChildren(row);
}
function openHeartPicker() {
  pickTab = "company"; pickSlot = "heart"; pending = null;
  $("pickTitle").textContent = T().hiddenPick;
  $("searchInput").hidden = true;
  $("formsBar").hidden = true;
  $("clearSlot").parentElement.hidden = !S.heart;
  renderHearts();
  $("picker").hidden = false;
}
function renderGrid() {
  const grid = $("pickGrid"), q = $("searchInput").value.trim();
  const cur = S.picks[pickTab][pickSlot];
  const list = candidates(pickTab, pickSlot).filter(c => matches(c, q));
  grid.replaceChildren();
  if (!list.length) { const p = document.createElement("p"); p.className = "empty-msg"; p.textContent = T().noResult; grid.append(p); return; }
  const groupBy = pickTab === "free" || TABS[pickTab].slots[pickSlot] === "joker";
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
  $("pickTitle").textContent = T().pickTitle;
  $("searchInput").hidden = false;
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
  delete blankRand.me;   // 콜라보 랜덤 색은 픽을 바꿀 때마다 새로
  // 종합 탭: 기업 칸에서 고르면 그 직군 칸이 비어 있을 때만 한 번 같이 채움 (조커·하트 제외)
  if (S.tab === "total" && pickTab === "company" && pickSlot < 7 && pick) {
    const c = byImg[pick.img];
    const ci = c ? CLASSES.indexOf(c.cls) : -1;
    if (ci >= 0 && c.company !== "collab" && !S.picks.class[ci]) S.picks.class[ci] = { img: pick.img, extra: [] };
  }
  persist(); closePicker(); refresh();
}
// 홍옥의 여제는 집도가 함께 있을 때만 "다른 모습"으로 나타나요
const EMPRESS_NEEDS = { persicaria3: "persicaria2" };
// 이 캐릭터에서 지금 고를 수 있는 일러스트 (기본 + 해금한 스킨), data.js 순서대로
const skinOptions = c => !c.variants ? [] : S.skinChars.includes(c.id) ? c.variants : c.variants.filter(v => v === imgOf(c) || S.skins.includes(v));
function choose(c) {
  const skins = skinOptions(c);
  const others = familyOthers(c);
  const old = S.picks[pickTab][pickSlot];
  if (skins.length <= 1 && !others.length) { commit({ img: imgOf(c), extra: [] }); return; }
  const keep = old && byImg[old.img] && byImg[old.img].family && byImg[old.img].family === c.family ? old.extra.filter(x => others.some(o => o.id === x)) : [];
  pending = { img: old && byImg[old.img] === c ? old.img : imgOf(c), extra: keep };
  const has = id => (byImg[pending.img] && byImg[pending.img].id === id) || pending.extra.includes(id);
  const chipEl = (src, label, on, cls, click) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip" + (cls ? " " + cls : "");
    b.setAttribute("aria-pressed", String(on));
    const im = document.createElement("img"); im.alt = ""; im.src = `assets/portrait/${src}.png`;
    im.onerror = () => { b.remove(); };   // 아직 이미지가 없는 스킨은 안 보이게
    b.append(im, document.createTextNode(label));
    b.addEventListener("click", click);
    return b;
  };
  const draw = () => {
    // 스킨 줄
    const showSkins = skins.length > 1;
    $("skinLabel").hidden = $("skinChips").hidden = !showSkins;
    if (showSkins) {
      $("skinLabel").textContent = fmt(T().skinChoose, { name: charName(c) });
      $("skinChips").replaceChildren(...skins.map(v => chipEl(v, T().skinNames[v] || I18N.ko.skinNames[v] || v, pending.img === v, "",
        () => { pending.img = v; draw(); })));
    }
    // 다른 모습 줄 (조건이 빠지면 여제도 같이 빠짐)
    pending.extra = pending.extra.filter(x => !EMPRESS_NEEDS[x] || has(EMPRESS_NEEDS[x]));
    const vis = others.filter(o => !EMPRESS_NEEDS[o.id] || has(EMPRESS_NEEDS[o.id]));
    $("formsLabel").hidden = $("formChips").hidden = !vis.length;
    $("formChips").replaceChildren(...vis.map(o => chipEl(o.id, charName(o), pending.extra.includes(o.id), o.hidden ? "hidden-chip" : "", () => {
      const on = pending.extra.includes(o.id);
      pending.extra = on ? pending.extra.filter(x => x !== o.id) : [...pending.extra, o.id].slice(0, 2);
      draw();
    })));
  };
  draw();
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
  let bad = false;
  codes.forEach(code => {
    const m = readCode(code);
    if (!m) { bad = true; return; }
    S.room.members.push(m.code);
  });
  $("roomMsg").textContent = bad ? T().roomBadCode : "";
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
  if (kind === "roomSplit") {          // 분류별 2장: 위 줄(기업별/8인) + 직군별
    await savePNG("room:top");
    setTimeout(() => savePNG("room:class"), 600);
    return;
  }
  if (kind.startsWith("room")) {
    const ms = roomMembers(); const combo = roomCombo();
    const part = kind.split(":")[1] || "all";
    L = layoutRoom(combo, ms, part);
    c.width = Math.round(L.width * EXPORT); c.height = Math.round(L.height * EXPORT);
    ctx.scale(EXPORT, EXPORT); drawRoom(ctx, L, ms);
    name = `pnc_room_${S.room.name.trim() || combo}${part === "all" ? "" : "_" + (part === "top" ? COMBOS[combo] : "class")}`;
  } else {
    L = layoutSingle(S.tab, true);
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
  if (c) return { tab: c.tab, i: c.i };
  // 조커칸 위 JOKER 글씨(하트) 자리 → 히든픽 하트 고르기
  const sec = singleL.sections.find(s => s.tab === "company");
  if (sec) {
    const j = sec.cells[7];
    if (Math.abs(p.x - j.cx) < L1.W * 0.4 && p.y >= sec.headTop - 8 && p.y <= sec.headTop + L1.logo + 8) return { tab: "company", i: 7, head: true };
  }
  return null;
}
const sameCell = (a, b) => (a && b) ? a.tab === b.tab && a.i === b.i : a === b;
singleCanvas.addEventListener("click", e => { const c = cellAt(e); if (!c) return; if (c.head) openHeartPicker(); else openPicker(c.tab, c.i); });
singleCanvas.addEventListener("mousemove", e => {
  const c = cellAt(e);
  singleCanvas.style.cursor = c ? "pointer" : "default";
  const hc = c && c.head ? null : c;
  if (!sameCell(hc, hoverIdx)) { hoverIdx = hc; queueRender(); }
});
singleCanvas.addEventListener("mouseleave", () => { if (hoverIdx) { hoverIdx = null; queueRender(); } });

document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => {
  S.tab = b.dataset.tab; persist(); applyTab(); refresh();
}));
function setLang(l) { S.lang = l; $("langSel").value = l; persist(); applyTexts(); applyTab(); refresh(); }
$("langSel").addEventListener("change", e => setLang(e.target.value));

/* ---------- 공지 팝업 ---------- */
const NOTICE_VER = CFG.noticeVersion || 1;
function openNotice() { $("noticeHide").checked = S.noticeHidden === NOTICE_VER; $("noticePop").hidden = false; }
function closeNotice() {
  S.noticeHidden = $("noticeHide").checked ? NOTICE_VER : 0; persist();
  $("noticePop").hidden = true;
}
document.querySelectorAll("#noticePop [data-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
$("noticeBtn").addEventListener("click", openNotice);
$("noticeOk").addEventListener("click", closeNotice);
$("noticeClose").addEventListener("click", closeNotice);
$("noticePop").addEventListener("click", e => { if (e.target.id === "noticePop") closeNotice(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("noticePop").hidden) closeNotice(); });
$("themeSel").addEventListener("change", e => { S.theme = e.target.value; persist(); applyTheme(); refresh(); });
$("namesChk").addEventListener("change", e => { S.names = e.target.checked; persist(); refresh(); });
$("nickInput").addEventListener("input", e => { S.nick = e.target.value; persist(); refresh(); });
$("roomNameInput").addEventListener("input", e => { S.room.name = e.target.value; persist(); refresh(); });

$("saveBtn").addEventListener("click", () => savePNG("single"));
$("roomSaveBtn").addEventListener("click", () => savePNG("room"));
$("roomSplitBtn").addEventListener("click", () => savePNG("roomSplit"));
$("codeBtn").addEventListener("click", () => { $("codeOut").value = makeCode(); $("codeBox").hidden = false; $("codeOut").select(); });
// 모아보기 조합 고르기
const applyCombo = () => {
  ["cc", "fc"].forEach(k => $("combo" + k.toUpperCase()).setAttribute("aria-pressed", String(roomCombo() === k)));
};
["cc", "fc"].forEach(k => $("combo" + k.toUpperCase()).addEventListener("click", () => {
  S.room.combo = k; persist(); applyCombo(); refresh();
}));
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
    if (S.tab === "total" || S.tab === "company") S.heart = null;
    persist(); resetArmed = 0; $("codeBox").hidden = true; refresh();
  } else { resetArmed = Date.now(); toast(T().resetConfirm); }
});
$("roomAddBtn").addEventListener("click", () => { addCodes($("roomPaste").value); $("roomPaste").value = ""; });
$("roomMineBtn").addEventListener("click", () => {
  addCodes(makeCode());
});

$("pickClose").addEventListener("click", closePicker);
$("picker").addEventListener("click", e => { if (e.target.id === "picker") closePicker(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("picker").hidden) closePicker(); });
$("searchInput").addEventListener("input", renderGrid);
$("clearSlot").addEventListener("click", () => {
  if (pickSlot === "heart") { S.heart = null; persist(); closePicker(); refresh(); } else commit(null);
});
$("formsDone").addEventListener("click", () => { if (pending) commit(pending); });

// 해금 연출: 로그 줄이 하나씩 복호화되고, 마지막에 "云图计划 - UNLOCK"이 맞춰짐. 끝나면 저절로 닫혀요.
let decodeBusy = false;
function playDecode(message, hex = CFG.unlockHex, archive = "0x07E1") {
  if (decodeBusy) return;
  decodeBusy = true;
  const box = $("decode"), log = $("decodeLog"), msg = $("decodeMsg");
  const POOL = "01ABCDEF0123456789#$%&@*+=<>/\\|{}[]?!";
  const rnd = () => POOL[Math.floor(Math.random() * POOL.length)];
  const bytes = (hex || "").split(/\s+/).filter(Boolean);
  const bin = bytes.slice(0, 6).map(b => parseInt(b, 16).toString(2).padStart(8, "0")).join(" ");
  const lines = [
    `> INIT  PROJECT.NEURAL.CLOUD  // ARCHIVE ${archive}`,
    `> LOAD  ${bytes.join(" ")}`,
    `> BIN   ${bin} …`,
    "> UTF-8 DECODE ........ OK"
  ];
  const finalMsg = `${message}  -  UNLOCK`;
  log.replaceChildren(); msg.textContent = "";
  box.hidden = false;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const close = () => { box.hidden = true; decodeBusy = false; };
  const scramble = (el, text, per, done) => {
    const chars = [...text], start = performance.now();
    const tick = now => {
      const solved = Math.floor((now - start) / per);
      el.replaceChildren(...chars.map((ch, i) => {
        if (i < solved || /\s/.test(ch)) return document.createTextNode(ch);
        const sp = document.createElement("span"); sp.className = "sc"; sp.textContent = rnd(); return sp;
      }));
      if (solved >= chars.length) { el.textContent = text; done(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (reduce) {
    lines.forEach(l => { const p = document.createElement("p"); p.textContent = l; log.append(p); });
    msg.textContent = finalMsg; setTimeout(close, 4000); return;
  }
  let k = 0;
  const nextLine = () => {
    if (k >= lines.length) { setTimeout(() => scramble(msg, finalMsg, 70, () => setTimeout(close, 3000)), 200); return; }
    const p = document.createElement("p"); log.append(p);
    scramble(p, lines[k++], 9, () => setTimeout(nextLine, 120));
  };
  nextLine();
}

// 이스터에그: CLOUD의 주황 O를 3번
let eggClicks = [];
$("eggO").addEventListener("click", () => {
  const now = Date.now();
  eggClicks = eggClicks.filter(t => now - t < 1500).concat(now);
  if (eggClicks.length >= 3) {
    eggClicks = [];
    if (S.unlocked) return;              // 다시 보기는 PROJECT 의 O
    S.unlocked = true; persist();
    playDecode(CFG.unlockMessage[S.lang] || CFG.unlockMessage.ko);
  }
});

// 스킨 해금 키워드: 닉네임 칸에 config.triggers 의 단어를 치고 Enter
let nickAtFocus = "";
$("nickInput").addEventListener("focus", e => { nickAtFocus = e.target.value; });
$("nickInput").addEventListener("keydown", e => {
  if (e.key !== "Enter" || e.isComposing) return;
  e.preventDefault();
  const norm1 = w => w.trim().toLowerCase();
  const findTrig = w => (CFG.triggers || []).find(t => t.words.some(x => norm1(x) === norm1(w)));
  const trig = findTrig(e.target.value);
  if (!trig) return;
  // 키워드는 닉네임으로 남기지 않고 원래 닉네임으로 되돌림
  const back = findTrig(nickAtFocus) ? "" : nickAtFocus;
  e.target.value = back; S.nick = back;
  S.skinChars = [...new Set([...S.skinChars, ...trig.chars])]; persist(); refresh();
  e.target.blur();
  const hex = [...new TextEncoder().encode(trig.message)].map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
  playDecode(trig.message, hex, "0x" + (0x0A00 + (CFG.triggers.indexOf(trig) + 1) * 0x12).toString(16).toUpperCase().padStart(4, "0"));
});

// PROJECT 의 O: 해금한 사람은 눌러서 연출 다시 보기
$("eggO2").addEventListener("click", () => { if (S.unlocked) playDecode(CFG.unlockMessage[S.lang] || CFG.unlockMessage.ko); });

new ResizeObserver(() => queueRender()).observe(document.querySelector("main"));

/* ---------- 시작 ---------- */
$("langSel").value = S.lang;
$("namesChk").checked = S.names;
$("nickInput").value = S.nick;
applyTexts(); applyTheme(); applyTab(); refresh();
if (S.noticeHidden !== NOTICE_VER) openNotice();

// 확인용 (개발자 도구에서 사용)
window.PNC_DEBUG = { state: () => S, layout: () => singleL, makeCode, readCode, render: queueRender };
})();
