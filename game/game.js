/* 메이플 어드벤처 — 메이플스토리 느낌의 2D 횡스크롤 사냥 게임
 * 외부 의존성 없이 캔버스 하나로 동작한다. 모든 그래픽은 코드로 그린다.
 * 조작: ←→ 이동, ↑↓ 로프·포탈·NPC, Space/Alt 점프, Z/Ctrl 공격, X 파워 스트라이크, C 슬래시 블러스트, 1/2 포션, H 도움말, M 소리 */
(function () {
  'use strict';

  // ---------- 상수 ----------
  const W = 960, H = 540, STEP = 1000 / 60;
  const GRAV = 0.55, MOVE = 3.4, JUMP = 11.8, CLIMB = 2.6, GROUND_Y = 440;
  const SAVE_KEY = 'maple-adv.v1';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = (n) => Math.floor(n).toLocaleString('ko-KR');
  const FONT = "'IBM Plex Sans KR', system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";

  // ---------- 몬스터 도감 ----------
  const MOBS = {
    snail:      { name: '달팽이',     lv: 1,  hp: 15,   atk: 4,  exp: 3,    meso: [2, 8],       speed: 0.45, w: 34,  h: 26,  passive: true, draw: 'snail', shell: '#8ccf5a', shell2: '#5c9e36' },
    blueSnail:  { name: '파란 달팽이', lv: 2,  hp: 30,   atk: 7,  exp: 5,    meso: [5, 14],      speed: 0.55, w: 34,  h: 26,  passive: true, draw: 'snail', shell: '#5fa8f0', shell2: '#2f6fc0' },
    slime:      { name: '슬라임',     lv: 4,  hp: 55,   atk: 11, exp: 10,   meso: [10, 24],     speed: 0.9,  w: 36,  h: 30,  draw: 'slime' },
    orangeMush: { name: '주황버섯',   lv: 6,  hp: 100,  atk: 17, exp: 18,   meso: [18, 40],     speed: 1.1,  w: 40,  h: 46,  draw: 'mush', cap: '#f0862a', cap2: '#b85a12' },
    greenMush:  { name: '초록버섯',   lv: 9,  hp: 170,  atk: 25, exp: 32,   meso: [30, 65],     speed: 1.2,  w: 40,  h: 46,  draw: 'mush', cap: '#5fbe4c', cap2: '#3a8a2c' },
    pig:        { name: '리본돼지',   lv: 12, hp: 280,  atk: 36, exp: 52,   meso: [45, 90],     speed: 1.7,  w: 46,  h: 36,  draw: 'pig' },
    mushmom:    { name: '머쉬맘',     lv: 18, hp: 2600, atk: 62, exp: 1200, meso: [800, 1500],  speed: 1.3,  w: 120, h: 112, draw: 'mushmom', cap: '#e8702a', cap2: '#9c3f0c', boss: true },
  };

  // ---------- 맵 ----------
  const MAPS = {
    henesys: {
      name: '헤네시스 사냥터', width: 2600, theme: 'meadow',
      platforms: [
        { x: 0, y: GROUND_Y, w: 2600, ground: true },
        { x: 320, y: 340, w: 260 }, { x: 720, y: 260, w: 220 }, { x: 1080, y: 350, w: 320 },
        { x: 1560, y: 280, w: 260 }, { x: 1960, y: 360, w: 300 }, { x: 2280, y: 250, w: 220 },
      ],
      ropes: [{ x: 450, y1: 340, y2: GROUND_Y }, { x: 830, y1: 260, y2: GROUND_Y }, { x: 1240, y1: 350, y2: GROUND_Y }, { x: 1690, y1: 280, y2: GROUND_Y }, { x: 2110, y1: 360, y2: GROUND_Y }, { x: 2390, y1: 250, y2: GROUND_Y }],
      portals: [{ x: 2540, y: GROUND_Y, to: 'ellinia', x2: 130 }],
      npcs: [{ id: 'stan', name: '스탠', x: 110, y: GROUND_Y }],
      spawns: [{ type: 'snail', n: 5 }, { type: 'blueSnail', n: 3 }, { type: 'slime', n: 3 }],
    },
    ellinia: {
      name: '엘리니아 숲길', width: 2800, theme: 'forest',
      platforms: [
        { x: 0, y: GROUND_Y, w: 2800, ground: true },
        { x: 260, y: 330, w: 240 }, { x: 640, y: 240, w: 260 }, { x: 1020, y: 320, w: 300 }, { x: 1440, y: 220, w: 220 },
        { x: 1760, y: 330, w: 320 }, { x: 2200, y: 260, w: 260 }, { x: 2500, y: 350, w: 240 },
      ],
      ropes: [{ x: 380, y1: 330, y2: GROUND_Y }, { x: 770, y1: 240, y2: GROUND_Y }, { x: 1170, y1: 320, y2: GROUND_Y }, { x: 1550, y1: 220, y2: GROUND_Y }, { x: 1920, y1: 330, y2: GROUND_Y }, { x: 2330, y1: 260, y2: GROUND_Y }, { x: 2620, y1: 350, y2: GROUND_Y }],
      portals: [{ x: 60, y: GROUND_Y, to: 'henesys', x2: 2470 }, { x: 2740, y: GROUND_Y, to: 'mushroom', x2: 130 }],
      npcs: [],
      spawns: [{ type: 'orangeMush', n: 5 }, { type: 'greenMush', n: 3 }, { type: 'slime', n: 2 }],
    },
    mushroom: {
      name: '버섯의 숲 깊은 곳', width: 2000, theme: 'dusk',
      platforms: [
        { x: 0, y: GROUND_Y, w: 2000, ground: true },
        { x: 300, y: 320, w: 260 }, { x: 800, y: 260, w: 400 }, { x: 1400, y: 330, w: 280 },
      ],
      ropes: [{ x: 430, y1: 320, y2: GROUND_Y }, { x: 1000, y1: 260, y2: GROUND_Y }, { x: 1540, y1: 330, y2: GROUND_Y }],
      portals: [{ x: 60, y: GROUND_Y, to: 'ellinia', x2: 2670 }],
      npcs: [],
      spawns: [{ type: 'greenMush', n: 3 }, { type: 'pig', n: 4 }, { type: 'mushmom', n: 1 }],
    },
  };

  const THEMES = {
    meadow: { sky: ['#7fcbff', '#e3f6ff'], hill: '#86cf72', hill2: '#5fae52', dirt: '#8a5a2b', dirt2: '#5e3a18', grass: '#5fb847', trunk: '#7a4b24', leaf: ['#4f9f3d', '#6cbf4a', '#8bd36a'], sun: '#fff1a8' },
    forest: { sky: ['#4f8fbd', '#c9e8d6'], hill: '#3f8a4a', hill2: '#2f6f3a', dirt: '#6d4a2a', dirt2: '#46301a', grass: '#3f9a3a', trunk: '#5c3a1e', leaf: ['#2f7a33', '#459a44', '#63b45a'], sun: '#fff6d0' },
    dusk:   { sky: ['#2f2552', '#e08a6e'], hill: '#4b3c6e', hill2: '#352b52', dirt: '#4a3a35', dirt2: '#2c2220', grass: '#6c5a8a', trunk: '#3a2a2a', leaf: ['#4d3470', '#6b4d94', '#8a6ab5'], sun: '#ffd0a0' },
  };

  // ---------- 스킬 ----------
  const SKILLS = {
    basic: { name: '공격',          key: 'Z', mp: 0,  mult: 1.0, range: 72,  targets: 1, dur: 18, hitAt: 6,  lvReq: 1, color: '#ffffff' },
    ps:    { name: '파워 스트라이크', key: 'X', mp: 6,  mult: 2.6, range: 88,  targets: 1, dur: 24, hitAt: 10, lvReq: 3, color: '#ffd84a' },
    sb:    { name: '슬래시 블러스트', key: 'C', mp: 10, mult: 1.5, range: 135, targets: 6, dur: 26, hitAt: 10, lvReq: 6, color: '#7fe3ff' },
  };

  // ---------- 퀘스트 ----------
  const QUESTS = [
    { title: '달팽이 소탕',     desc: '마을 근처에 달팽이가 너무 많아졌어요.\n달팽이(파란 달팽이 포함) 10마리를 잡아 주세요.', need: { snail: 10 }, counts: ['snail', 'blueSnail'], reward: { meso: 300, exp: 60, hpPot: 5 } },
    { title: '버섯 숲의 소란',   desc: '엘리니아 숲길의 주황버섯이 길을 막고 있어요.\n주황버섯 10마리를 처치해 주세요. (오른쪽 끝 포탈로 이동)', need: { orangeMush: 10 }, counts: ['orangeMush'], reward: { meso: 1500, exp: 400, mpPot: 5 } },
    { title: '머쉬맘 토벌',     desc: '버섯의 숲 깊은 곳에 거대한 머쉬맘이 나타났어요!\n꼭 처치해 주세요. 포션을 넉넉히 챙기세요.', need: { mushmom: 1 }, counts: ['mushmom'], reward: { meso: 10000, exp: 3000 } },
  ];

  // ---------- 상태 ----------
  const player = {
    x: 160, y: GROUND_Y, vx: 0, vy: 0, face: 1, onGround: true, climbing: false, rope: null,
    lv: 1, exp: 0, hp: 50, mp: 20, meso: 0, weapon: 0,
    bag: { hpPot: 5, mpPot: 3 },
    kills: {}, quest: { idx: 0, active: false, start: {} },
    attack: 0, attackType: null, cooldown: 0, invul: 0, kb: 0, kbv: 0, walkT: 0, regenT: 0, dead: false,
  };
  const maxHp = () => 50 + (player.lv - 1) * 22;
  const maxMp = () => 20 + (player.lv - 1) * 10;
  const expNeed = (lv) => Math.floor(15 * Math.pow(lv, 1.9) + 10);
  const atkBase = () => 6 + player.lv * 2.2 + player.weapon * 3;
  const weaponCost = () => 200 * Math.pow(2, player.weapon);

  let mode = 'title'; // title | play | dead
  let mapId = 'henesys', map = MAPS[mapId];
  let mobs = [], drops = [], effects = [], logs = [];
  let toastMsg = null, dialog = null, showHelp = false, muted = false;
  let tick = 0, cam = { x: 0 }, saveT = 0;
  const keys = {}; let pressed = {};

  // ---------- 저장 ----------
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        lv: player.lv, exp: player.exp, hp: player.hp, mp: player.mp, meso: player.meso, weapon: player.weapon,
        bag: player.bag, kills: player.kills, quest: player.quest, mapId, muted,
      }));
    } catch (e) { /* 저장 불가 환경 */ }
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!s) return false;
      player.lv = s.lv || 1; player.exp = s.exp || 0; player.meso = s.meso || 0; player.weapon = s.weapon || 0;
      player.bag = Object.assign({ hpPot: 0, mpPot: 0 }, s.bag || {});
      player.kills = s.kills || {}; player.quest = Object.assign({ idx: 0, active: false, start: {} }, s.quest || {});
      player.hp = clamp(s.hp || maxHp(), 1, maxHp()); player.mp = clamp(s.mp == null ? maxMp() : s.mp, 0, maxMp());
      mapId = MAPS[s.mapId] ? s.mapId : 'henesys'; muted = !!s.muted;
      return true;
    } catch (e) { return false; }
  }
  const hasSave = load();

  // ---------- 소리 (WebAudio 합성) ----------
  let actx = null;
  function sfx(kind) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const t = actx.currentTime;
      const tone = (type, f1, f2, dur, vol, delay) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.setValueAtTime(f1, t + delay); o.frequency.exponentialRampToValueAtTime(f2, t + delay + dur);
        g.gain.setValueAtTime(vol, t + delay); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
        o.connect(g).connect(actx.destination); o.start(t + delay); o.stop(t + delay + dur + 0.02);
      };
      switch (kind) {
        case 'swing': tone('square', 320, 140, 0.08, 0.05, 0); break;
        case 'hit': tone('triangle', 700, 180, 0.12, 0.09, 0); break;
        case 'crit': tone('sawtooth', 900, 200, 0.16, 0.09, 0); break;
        case 'coin': tone('sine', 900, 1500, 0.1, 0.07, 0); tone('sine', 1200, 1800, 0.1, 0.05, 0.06); break;
        case 'hurt': tone('sawtooth', 220, 70, 0.22, 0.08, 0); break;
        case 'potion': tone('sine', 500, 900, 0.14, 0.07, 0); break;
        case 'portal': tone('sine', 300, 1200, 0.35, 0.06, 0); break;
        case 'levelup': [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.18, 0.08, i * 0.1)); break;
        case 'quest': tone('triangle', 660, 660, 0.12, 0.07, 0); tone('triangle', 880, 880, 0.2, 0.07, 0.12); break;
        case 'die': tone('sawtooth', 300, 40, 0.8, 0.08, 0); break;
      }
    } catch (e) { /* 오디오 미지원 */ }
  }

  // ---------- 유틸 ----------
  function log(text) { logs.push({ text, until: tick + 60 * 6 }); if (logs.length > 5) logs.shift(); }
  function toast(text, frames) { toastMsg = { text, until: tick + (frames || 90) }; }
  function addEffect(e) { effects.push(e); }
  function dmgNumber(x, y, value, color) { addEffect({ kind: 'num', x: x + rnd(-6, 6), y, text: String(value), color, life: 55, max: 55 }); }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- 몬스터 ----------
  function placeMob(m) {
    const def = m.def;
    const plats = map.platforms.filter(p => p.w >= def.w + 40);
    const total = plats.reduce((n, p) => n + p.w, 0);
    const pick = () => { let r = Math.random() * total; for (const p of plats) { r -= p.w; if (r <= 0) return p; } return plats[plats.length - 1]; };
    let plat, x, tries = 0;
    do {
      plat = def.boss ? map.platforms[0] : pick();
      x = def.boss ? map.width * 0.62 : rnd(plat.x + def.w / 2 + 10, plat.x + plat.w - def.w / 2 - 10);
      tries++;
    } while (tries < 20 && Math.abs(x - player.x) < 220 && Math.abs(plat.y - player.y) < 60);
    m.plat = plat; m.x = x; m.y = plat.y; m.hp = def.hp; m.max = def.hp; m.dead = false;
    m.dir = Math.random() < 0.5 ? -1 : 1; m.state = 'idle'; m.t = rint(30, 120); m.flash = 0; m.kb = 0; m.vx = 0; m.anim = rnd(0, 6);
  }
  function spawnMobs() {
    mobs = [];
    map.spawns.forEach(s => {
      for (let i = 0; i < s.n; i++) { const m = { type: s.type, def: MOBS[s.type] }; placeMob(m); mobs.push(m); }
    });
  }
  function changeMap(id, x) {
    mapId = id; map = MAPS[id]; drops = [];
    player.x = x; player.y = GROUND_Y; player.vx = 0; player.vy = 0; player.climbing = false; player.onGround = true;
    spawnMobs();
    cam.x = clamp(player.x - W / 2, 0, map.width - W);
    log(`${map.name}에 도착했다.`); toast(map.name, 120); sfx('portal'); save();
  }

  // ---------- 전투 ----------
  function startAttack(id) {
    const s = SKILLS[id];
    if (player.lv < s.lvReq) { toast(`${s.name}은(는) Lv.${s.lvReq}부터 사용할 수 있어요`); return; }
    if (player.mp < s.mp) { toast('MP가 부족합니다'); return; }
    player.mp -= s.mp; player.attack = s.dur; player.attackType = id; player.cooldown = 6; sfx('swing');
    if (id !== 'basic') addEffect({ kind: 'skill', x: player.x, y: player.y - 84, text: s.name, color: s.color, life: 40, max: 40 });
  }
  function resolveHit() {
    const s = SKILLS[player.attackType];
    const x1 = player.face > 0 ? player.x - 10 : player.x - s.range, x2 = player.face > 0 ? player.x + s.range : player.x + 10;
    const targets = mobs
      .filter(m => !m.dead && m.x + m.def.w / 2 > x1 && m.x - m.def.w / 2 < x2 && Math.abs(m.y - player.y) < 70)
      .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))
      .slice(0, s.targets);
    if (s.targets > 1) addEffect({ kind: 'slash', x: player.x, y: player.y - 36, face: player.face, range: s.range, color: s.color, life: 14, max: 14 });
    targets.forEach(m => {
      const crit = Math.random() < 0.15;
      let dmg = atkBase() * s.mult * rnd(0.85, 1.15) * (crit ? 1.6 : 1);
      dmg = Math.max(1, Math.floor(dmg));
      m.hp -= dmg; m.flash = 8; m.kb = 10; m.vx = player.face * (m.def.boss ? 0.6 : 2.6); m.hurtT = tick;
      dmgNumber(m.x, m.y - m.def.h - 14, dmg, crit ? '#ff6b6b' : '#ffd94a');
      addEffect({ kind: 'spark', x: m.x, y: m.y - m.def.h / 2, life: 12, max: 12, color: s.color });
      sfx(crit ? 'crit' : 'hit');
      if (m.hp <= 0) killMob(m);
    });
  }
  function killMob(m) {
    const def = m.def;
    m.dead = true; m.respawnAt = tick + 60 * (def.boss ? 150 : rnd(6, 14));
    player.kills[m.type] = (player.kills[m.type] || 0) + 1;
    gainExp(def.exp);
    log(`${def.name}을(를) 처치했다. 경험치 ${def.exp}`);
    addDrop(m.x, m.y, 'meso', rint(def.meso[0], def.meso[1]));
    if (Math.random() < 0.12) addDrop(m.x + rnd(-20, 20), m.y, 'hpPot', 1);
    if (Math.random() < 0.09) addDrop(m.x + rnd(-20, 20), m.y, 'mpPot', 1);
    if (def.boss) { toast('머쉬맘을 처치했다!', 180); sfx('quest'); }
    checkQuest();
  }
  function gainExp(e) {
    player.exp += e;
    while (player.exp >= expNeed(player.lv)) {
      player.exp -= expNeed(player.lv); player.lv++;
      player.hp = maxHp(); player.mp = maxMp();
      addEffect({ kind: 'levelup', life: 110, max: 110 });
      log(`레벨 업! Lv.${player.lv}`); sfx('levelup');
      Object.values(SKILLS).forEach(s => { if (s.lvReq === player.lv) toast(`새 스킬: ${s.name} (${s.key})`, 180); });
    }
  }
  function hurtPlayer(m) {
    const dmg = Math.max(1, Math.round(m.def.atk * rnd(0.8, 1.2)));
    player.hp -= dmg; player.invul = 70; player.kb = 12; player.kbv = Math.sign(player.x - m.x || 1) * 4.5;
    player.vy = -5; player.climbing = false; player.onGround = false;
    dmgNumber(player.x, player.y - 80, dmg, '#c89bff'); sfx('hurt');
    if (player.hp <= 0) { player.hp = 0; die(); }
  }
  function die() {
    mode = 'dead'; player.dead = true; sfx('die');
    const loss = Math.floor(player.exp * 0.1); player.exp -= loss;
    log(`사망했다... 경험치 ${loss}을(를) 잃었다.`); save();
  }
  function revive() {
    mode = 'play'; player.dead = false; player.hp = Math.floor(maxHp() * 0.5); player.mp = Math.floor(maxMp() * 0.5); player.invul = 90;
    changeMap('henesys', 160);
  }
  function usePot(kind) {
    if (kind === 'hp') {
      if (player.bag.hpPot <= 0) { toast('빨간 포션이 없습니다'); return; }
      if (player.hp >= maxHp()) { toast('HP가 가득 찼습니다'); return; }
      player.bag.hpPot--; const heal = Math.min(maxHp() - player.hp, 60 + player.lv * 4); player.hp += heal;
      addEffect({ kind: 'num', x: player.x, y: player.y - 80, text: '+' + heal, color: '#7dff8a', life: 50, max: 50 });
    } else {
      if (player.bag.mpPot <= 0) { toast('파란 포션이 없습니다'); return; }
      if (player.mp >= maxMp()) { toast('MP가 가득 찼습니다'); return; }
      player.bag.mpPot--; const heal = Math.min(maxMp() - player.mp, 40 + player.lv * 3); player.mp += heal;
      addEffect({ kind: 'num', x: player.x, y: player.y - 80, text: '+' + heal, color: '#7fb8ff', life: 50, max: 50 });
    }
    sfx('potion');
  }

  // ---------- 드롭 ----------
  function addDrop(x, y, type, amount) {
    drops.push({ x, y: y - 10, landY: y, vx: rnd(-1.6, 1.6), vy: rnd(-6, -3.5), type, amount, landed: false, born: tick, anim: rnd(0, 6) });
  }
  function updateDrops() {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      if (!d.landed) { d.vy += GRAV; d.y += d.vy; d.x += d.vx; if (d.y >= d.landY) { d.y = d.landY; d.landed = true; } }
      d.anim += 0.1;
      if (tick - d.born > 60 * 40) { drops.splice(i, 1); continue; }
      if (d.landed && tick - d.born > 15 && Math.abs(d.x - player.x) < 26 && Math.abs(d.y - player.y) < 24) {
        if (d.type === 'meso') { player.meso += d.amount; log(`${fmt(d.amount)} 메소를 얻었다.`); }
        else if (d.type === 'hpPot') { player.bag.hpPot++; log('빨간 포션을 얻었다.'); }
        else { player.bag.mpPot++; log('파란 포션을 얻었다.'); }
        sfx('coin'); drops.splice(i, 1);
      }
    }
  }

  // ---------- 퀘스트 / NPC ----------
  function questProgress() {
    const q = QUESTS[player.quest.idx]; if (!q || !player.quest.active) return 0;
    return q.counts.reduce((n, t) => n + ((player.kills[t] || 0) - (player.quest.start[t] || 0)), 0);
  }
  function questNeed() { const q = QUESTS[player.quest.idx]; return q ? Object.values(q.need)[0] : 0; }
  function checkQuest() {
    if (player.quest.active && questProgress() >= questNeed()) toast('퀘스트 완료! 스탠에게 돌아가세요 (헤네시스)', 150);
  }
  function openNpc(npc) {
    const q = QUESTS[player.quest.idx];
    let text = `안녕, 모험가! 나는 ${npc.name}이야.\n무엇을 도와줄까?`;
    const opts = [];
    if (q) {
      if (!player.quest.active) {
        opts.push({ label: `퀘스트 받기: ${q.title}`, act: () => {
          player.quest.active = true; player.quest.start = {}; q.counts.forEach(t => { player.quest.start[t] = player.kills[t] || 0; });
          sfx('quest'); showDialog(npc.name, `[${q.title}]\n${q.desc}`, [{ label: '알겠어요!', act: closeDialog }]);
        } });
      } else if (questProgress() >= questNeed()) {
        opts.push({ label: `퀘스트 완료: ${q.title}`, act: () => {
          const r = q.reward; player.meso += r.meso || 0; if (r.hpPot) player.bag.hpPot += r.hpPot; if (r.mpPot) player.bag.mpPot += r.mpPot;
          gainExp(r.exp || 0); player.quest.idx++; player.quest.active = false; sfx('quest');
          const parts = [r.meso && `${fmt(r.meso)} 메소`, r.exp && `경험치 ${r.exp}`, r.hpPot && `빨간 포션 ${r.hpPot}개`, r.mpPot && `파란 포션 ${r.mpPot}개`].filter(Boolean).join(', ');
          log(`퀘스트 [${q.title}] 완료!`);
          showDialog(npc.name, `고마워! 정말 큰 도움이 됐어.\n보상: ${parts}`, [{ label: '천만에요', act: closeDialog }]); save();
        } });
      } else {
        text = `[${q.title}] 진행 중 (${questProgress()}/${questNeed()})\n${q.desc}`;
      }
    } else {
      text = '모든 퀘스트를 끝냈구나! 넌 진정한 버섯 사냥꾼이야.\n이제 자유롭게 사냥을 즐겨.';
    }
    opts.push({ label: '상점 (포션 · 무기 강화)', act: openShop });
    opts.push({ label: '닫기', act: closeDialog });
    showDialog(npc.name, text, opts);
  }
  function openShop() {
    const text = `보유 메소: ${fmt(player.meso)}\n빨간 포션 ${player.bag.hpPot}개 · 파란 포션 ${player.bag.mpPot}개 · 무기 강화 +${player.weapon}`;
    showDialog('스탠의 상점', text, [
      { label: '빨간 포션 구매 (30 메소)', act: () => buy('hpPot', 30) },
      { label: '파란 포션 구매 (40 메소)', act: () => buy('mpPot', 40) },
      { label: `무기 강화 +${player.weapon + 1} (${fmt(weaponCost())} 메소, 공격력 +3)`, act: () => {
        if (player.meso < weaponCost()) { toast('메소가 부족합니다'); return; }
        player.meso -= weaponCost(); player.weapon++; sfx('levelup'); log(`무기를 +${player.weapon}로 강화했다!`); save(); openShop();
      } },
      { label: '닫기', act: closeDialog },
    ]);
  }
  function buy(item, cost) {
    if (player.meso < cost) { toast('메소가 부족합니다'); return; }
    player.meso -= cost; player.bag[item]++; sfx('coin'); save(); openShop();
  }
  const dlgEl = document.getElementById('dialog');
  function showDialog(name, text, opts) {
    dialog = { opts };
    document.getElementById('dlg-name').textContent = name;
    document.getElementById('dlg-text').textContent = text;
    const box = document.getElementById('dlg-opts'); box.innerHTML = '';
    opts.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button';
      b.innerHTML = `<b>${i + 1}.</b> `; b.appendChild(document.createTextNode(o.label));
      b.addEventListener('click', () => o.act()); box.appendChild(b);
    });
    dlgEl.hidden = false;
  }
  function closeDialog() { dialog = null; dlgEl.hidden = true; }

  // ---------- 입력 ----------
  const CODES = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    Space: 'jump', AltLeft: 'jump', AltRight: 'jump',
    ControlLeft: 'attack', ControlRight: 'attack', KeyZ: 'attack', KeyA: 'attack',
    KeyX: 'skill1', KeyS: 'skill1', KeyC: 'skill2', KeyD: 'skill2',
    Digit1: 'pot1', Digit2: 'pot2', KeyH: 'help', KeyM: 'mute', Escape: 'esc',
  };
  function press(k) { if (!keys[k]) pressed[k] = true; keys[k] = true; }
  function release(k) { keys[k] = false; }
  window.addEventListener('keydown', e => {
    if (dialog) {
      const n = /^Digit([1-9])$/.exec(e.code);
      if (n) { const o = dialog.opts[+n[1] - 1]; if (o) o.act(); e.preventDefault(); }
      else if (e.code === 'Escape') { closeDialog(); e.preventDefault(); }
      return;
    }
    const k = CODES[e.code]; if (!k) return;
    if (!e.repeat) press(k); e.preventDefault();
  });
  window.addEventListener('keyup', e => { const k = CODES[e.code]; if (k) release(k); });
  window.addEventListener('blur', () => { Object.keys(keys).forEach(k => keys[k] = false); });

  const touchEl = document.getElementById('touch');
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (isTouch) touchEl.hidden = false;
  // 포인터 이벤트가 없는 구형 iPad/Safari는 터치 이벤트로 대신 받는다
  const hasPointer = 'PointerEvent' in window;
  const onDown = (el, fn) => {
    if (hasPointer) el.addEventListener('pointerdown', fn);
    else { el.addEventListener('touchstart', fn, { passive: false }); el.addEventListener('mousedown', fn); }
  };
  const onUp = (el, fn) => {
    if (hasPointer) ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, fn));
    else ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(t => el.addEventListener(t, fn, { passive: false }));
  };
  touchEl.querySelectorAll('button').forEach(b => {
    const k = b.dataset.k;
    const down = e => { if (e.cancelable) e.preventDefault(); b.classList.add('on'); press(k); if (mode === 'title') pressed.any = true; };
    const up = e => { if (e.cancelable) e.preventDefault(); b.classList.remove('on'); release(k); };
    onDown(b, down); onUp(b, up);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  onDown(canvas, e => {
    if (e.cancelable && e.type === 'touchstart') e.preventDefault();
    if (mode === 'title') pressed.any = true;
    else if (mode === 'dead') pressed.attack = true;
    sfx('swing');
  });
  // 터치 기기 여부를 실제 터치가 들어왔을 때도 다시 판단한다 (iPad의 데스크톱 모드 등)
  window.addEventListener('touchstart', () => { touchEl.hidden = false; }, { once: true, passive: true });

  // 화면 크기 맞추기
  const stage = document.getElementById('stage');
  function resize() {
    // 뷰어(iframe)마다 보고하는 값이 달라서 여러 값 중 가장 작은 쪽을 쓴다
    const vv = window.visualViewport, de = document.documentElement;
    const vw = Math.min(window.innerWidth || 1e9, de.clientWidth || 1e9, vv ? vv.width : 1e9);
    const vh = Math.min(window.innerHeight || 1e9, de.clientHeight || 1e9, vv ? vv.height : 1e9);
    const rot = vh > vw * 1.15 && vw < 760; // 세로로 든 휴대폰: 무대를 돌려 가로 화면처럼
    const aw = rot ? vh : vw, ah = rot ? vw : vh;
    const s = Math.min(aw / W, ah / H, 1.2);
    stage.classList.toggle('rot', rot);
    stage.style.width = Math.floor(W * s) + 'px'; stage.style.height = Math.floor(H * s) + 'px';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(document.documentElement);
  resize(); setTimeout(resize, 300);

  // ---------- 업데이트 ----------
  function step() {
    tick++;
    if (toastMsg && tick > toastMsg.until) toastMsg = null;
    logs = logs.filter(l => tick < l.until);
    if (pressed.mute) { muted = !muted; toast(muted ? '소리 끔' : '소리 켬'); save(); }
    if (pressed.help) showHelp = !showHelp;

    if (mode === 'title') {
      if (Object.keys(pressed).length) startGame();
      pressed = {}; return;
    }
    if (mode === 'dead') {
      if (pressed.attack || pressed.jump) revive();
      pressed = {}; updateEffects(); return;
    }
    if (dialog) { pressed = {}; updateEffects(); return; }

    updatePlayer();
    updateMobs();
    updateDrops();
    updateEffects();
    const target = clamp(player.x - W / 2, 0, Math.max(0, map.width - W));
    cam.x += (target - cam.x) * 0.12;
    if (++saveT % 300 === 0) save();
    pressed = {};
  }
  function startGame() {
    mode = 'play';
    changeMap(mapId, mapId === 'henesys' ? 160 : 130);
    if (!hasSave) toast('스탠(왼쪽)에게 ↑ 키로 말을 걸어 퀘스트를 받아 보세요', 240);
  }

  function updatePlayer() {
    const p = player;
    if (p.cooldown > 0) p.cooldown--;
    if (p.invul > 0) p.invul--;
    if (p.attack > 0) {
      p.attack--;
      if (p.attack === SKILLS[p.attackType].dur - SKILLS[p.attackType].hitAt) resolveHit();
    }
    if (++p.regenT % 90 === 0) { p.hp = Math.min(maxHp(), p.hp + 1 + Math.floor(p.lv / 5)); p.mp = Math.min(maxMp(), p.mp + 2 + Math.floor(p.lv / 4)); }
    if (pressed.pot1) usePot('hp');
    if (pressed.pot2) usePot('mp');

    if (pressed.up && !p.climbing && p.onGround) {
      const portal = map.portals.find(pt => Math.abs(pt.x - p.x) < 34 && Math.abs(pt.y - p.y) < 10);
      if (portal) { changeMap(portal.to, portal.x2); return; }
      const npc = map.npcs.find(n => Math.abs(n.x - p.x) < 44 && Math.abs(n.y - p.y) < 10);
      if (npc) { openNpc(npc); return; }
    }

    if (p.climbing) {
      const r = p.rope;
      p.x = r.x; p.vx = 0; p.vy = 0;
      if (keys.up) p.y -= CLIMB;
      if (keys.down) p.y += CLIMB;
      if (p.y <= r.y1) { p.y = r.y1; if (keys.up) { p.climbing = false; p.onGround = true; } }
      if (p.y >= r.y2) { p.y = r.y2; p.climbing = false; p.onGround = true; }
      if (pressed.jump && (keys.left || keys.right)) {
        p.climbing = false; p.vy = -JUMP * 0.7; p.vx = keys.left ? -MOVE : MOVE; p.face = Math.sign(p.vx);
      }
      return;
    }

    // 이동
    const dir = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    if (p.kb > 0) { p.kb--; p.vx = p.kbv; }
    else if (p.attack > 0 && p.onGround) p.vx = 0;
    else if (dir) { p.vx = dir * MOVE; p.face = dir; }
    else p.vx = 0;

    if (pressed.jump && p.onGround && p.kb === 0) { p.vy = -JUMP; p.onGround = false; }

    // 로프 잡기
    if (keys.up || keys.down) {
      const r = map.ropes.find(r => Math.abs(r.x - p.x) < 14 && (
        (keys.up && p.y > r.y1 + 6 && p.y <= r.y2 + 2) ||
        (keys.down && p.onGround && Math.abs(p.y - r.y1) < 4)));
      if (r) { p.climbing = true; p.rope = r; p.vx = 0; p.vy = 0; p.x = r.x; if (keys.down && Math.abs(p.y - r.y1) < 4) p.y += 8; p.onGround = false; return; }
    }

    // 물리
    const prevY = p.y;
    p.vy = Math.min(p.vy + GRAV, 16);
    p.y += p.vy; p.x = clamp(p.x + p.vx, 16, map.width - 16);
    p.onGround = false;
    if (p.vy >= 0) {
      for (const pl of map.platforms) {
        if (prevY <= pl.y && p.y >= pl.y && p.x >= pl.x - 6 && p.x <= pl.x + pl.w + 6) { p.y = pl.y; p.vy = 0; p.onGround = true; break; }
      }
    }
    if (p.onGround && p.vx !== 0) p.walkT += 0.28;

    // 공격
    if (p.attack === 0 && p.cooldown === 0 && p.kb === 0) {
      if (pressed.attack) startAttack('basic');
      else if (pressed.skill1) startAttack('ps');
      else if (pressed.skill2) startAttack('sb');
    }
  }

  function updateMobs() {
    for (const m of mobs) {
      const def = m.def;
      if (m.dead) { if (tick >= m.respawnAt) { placeMob(m); if (def.boss) toast('머쉬맘이 다시 나타났다!', 150); } continue; }
      if (m.flash > 0) m.flash--;
      if (m.kb > 0) { m.kb--; m.x += m.vx; m.vx *= 0.85; }
      else {
        if (--m.t <= 0) { m.t = rint(60, 180); m.state = Math.random() < 0.35 ? 'idle' : 'walk'; m.dir = Math.random() < 0.5 ? -1 : 1; }
        const dx = player.x - m.x;
        if (!def.passive && !player.dead && Math.abs(dx) < 280 && Math.abs(player.y - m.y) < 30) { m.state = 'walk'; m.dir = dx < 0 ? -1 : 1; }
        if (m.state === 'walk') m.x += m.dir * def.speed;
      }
      const pl = m.plat, half = def.w / 2;
      if (m.x < pl.x + half) { m.x = pl.x + half; m.dir = 1; }
      if (m.x > pl.x + pl.w - half) { m.x = pl.x + pl.w - half; m.dir = -1; }
      m.anim += 0.08;
      if (player.invul === 0 && !player.dead && !player.climbing &&
          Math.abs(m.x - player.x) < half + 10 && player.y > m.y - def.h && player.y - 60 < m.y) hurtPlayer(m);
    }
  }

  function updateEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i]; e.life--;
      if (e.kind === 'num' || e.kind === 'skill') e.y -= 0.9;
      if (e.life <= 0) effects.splice(i, 1);
    }
  }

  // ---------- 그리기: 배경 ----------
  function drawBackground() {
    const th = THEMES[map.theme];
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 해/달
    ctx.fillStyle = th.sun; ctx.beginPath(); ctx.arc(W - 160 - cam.x * 0.05, 90, 38, 0, Math.PI * 2); ctx.fill();
    // 구름
    const rc = seeded(7);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 9; i++) {
      const bx = rc() * 2400, by = 50 + rc() * 150, sz = 22 + rc() * 22;
      const x = ((bx - cam.x * 0.3 + tick * 0.15) % 2600 + 2600) % 2600 - 150;
      ctx.beginPath(); ctx.arc(x, by, sz, 0, Math.PI * 2); ctx.arc(x + sz, by + 6, sz * 0.8, 0, Math.PI * 2); ctx.arc(x - sz, by + 8, sz * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    // 먼 언덕
    for (let layer = 0; layer < 2; layer++) {
      const par = layer === 0 ? 0.25 : 0.45, base = layer === 0 ? 330 : 390, amp = layer === 0 ? 70 : 50;
      ctx.fillStyle = layer === 0 ? th.hill : th.hill2;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) {
        const wx = x + cam.x * par;
        ctx.lineTo(x, base + Math.sin(wx / 160) * amp * 0.6 + Math.sin(wx / 73 + 2) * amp * 0.4);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    }
    // 나무
    const rt = seeded(map.width);
    const count = Math.ceil(map.width / 170) + 4;
    for (let i = 0; i < count; i++) {
      const wx = i * 170 + rt() * 120 - 200, scale = 0.7 + rt() * 0.6, leaf = th.leaf[Math.floor(rt() * 3)];
      const x = wx - cam.x * 0.75;
      if (x < -120 || x > W + 120) continue;
      const base = GROUND_Y + 8, trunkH = 90 * scale;
      ctx.fillStyle = th.trunk; ctx.fillRect(x - 7 * scale, base - trunkH, 14 * scale, trunkH);
      ctx.fillStyle = leaf;
      ctx.beginPath();
      ctx.arc(x, base - trunkH - 20 * scale, 42 * scale, 0, Math.PI * 2);
      ctx.arc(x - 32 * scale, base - trunkH + 4 * scale, 30 * scale, 0, Math.PI * 2);
      ctx.arc(x + 32 * scale, base - trunkH + 4 * scale, 30 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlatforms() {
    const th = THEMES[map.theme];
    for (const pl of map.platforms) {
      if (pl.x + pl.w < cam.x - 20 || pl.x > cam.x + W + 20) continue;
      if (pl.ground) {
        const g = ctx.createLinearGradient(0, pl.y, 0, H); g.addColorStop(0, th.dirt); g.addColorStop(1, th.dirt2);
        ctx.fillStyle = g; ctx.fillRect(pl.x, pl.y, pl.w, H - pl.y);
        ctx.fillStyle = th.grass; ctx.fillRect(pl.x, pl.y - 4, pl.w, 12);
        // 풀 장식
        ctx.strokeStyle = th.grass; ctx.lineWidth = 2;
        for (let x = Math.floor(cam.x / 40) * 40; x < cam.x + W; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, pl.y - 3); ctx.lineTo(x - 4, pl.y - 12); ctx.moveTo(x + 6, pl.y - 3); ctx.lineTo(x + 9, pl.y - 11); ctx.stroke();
        }
      } else {
        ctx.fillStyle = th.dirt2; roundRect(pl.x, pl.y, pl.w, 20, 8); ctx.fill();
        ctx.fillStyle = th.dirt; roundRect(pl.x + 2, pl.y + 2, pl.w - 4, 14, 6); ctx.fill();
        ctx.fillStyle = th.grass; roundRect(pl.x, pl.y - 4, pl.w, 10, 5); ctx.fill();
      }
    }
    // 로프
    for (const r of map.ropes) {
      if (r.x < cam.x - 20 || r.x > cam.x + W + 20) continue;
      ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(r.x, r.y1 - 2); ctx.lineTo(r.x, r.y2); ctx.stroke();
      ctx.strokeStyle = '#a97a3f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x, r.y1 - 2); ctx.lineTo(r.x, r.y2); ctx.stroke();
      ctx.fillStyle = '#5a3a18';
      for (let y = r.y1 + 10; y < r.y2; y += 18) { ctx.fillRect(r.x - 4, y, 8, 4); }
    }
    // 포탈
    for (const pt of map.portals) {
      const pulse = 1 + Math.sin(tick / 10) * 0.08;
      const g = ctx.createRadialGradient(pt.x, pt.y - 40, 6, pt.x, pt.y - 40, 46 * pulse);
      g.addColorStop(0, 'rgba(180,240,255,0.95)'); g.addColorStop(0.6, 'rgba(70,150,255,0.7)'); g.addColorStop(1, 'rgba(70,150,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(pt.x, pt.y - 40, 34 * pulse, 48 * pulse, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(pt.x, pt.y - 40, 24, 38, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(MAPS[pt.to].name, pt.x, pt.y - 96);
      if (Math.abs(player.x - pt.x) < 34 && player.onGround && mode === 'play') ctx.fillText('↑ 이동', pt.x, pt.y + 20);
    }
    // NPC
    for (const n of map.npcs) {
      drawCharacter(n.x, n.y, -1, { hair: '#3a2a1a', shirt: '#2f6fd6', pants: '#333', walk: 0, attack: 0 });
      const q = QUESTS[player.quest.idx];
      const mark = !q ? '' : !player.quest.active ? '!' : questProgress() >= questNeed() ? '★' : '?';
      if (mark) { ctx.fillStyle = mark === '★' ? '#ffd84a' : '#ffcc33'; ctx.font = `700 22px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(mark, n.x, n.y - 84 + Math.sin(tick / 8) * 3); }
      nameTag(n.x, n.y + 6, n.name, '#f3b23a');
      if (Math.abs(player.x - n.x) < 44 && player.onGround && mode === 'play') { ctx.fillStyle = '#fff'; ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('↑ 대화', n.x, n.y + 34); }
    }
  }
  function nameTag(x, y, text, color) {
    ctx.font = `600 11px ${FONT}`; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 12;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(x - w / 2, y, w, 16, 4); ctx.fill();
    ctx.fillStyle = color || '#fff'; ctx.fillText(text, x, y + 12);
  }

  // ---------- 그리기: 캐릭터 ----------
  function drawCharacter(x, y, face, o) {
    ctx.save(); ctx.translate(x, y); if (face < 0) ctx.scale(-1, 1);
    const walk = Math.sin(o.walk) * 6;
    // 다리/신발
    ctx.fillStyle = o.pants; ctx.fillRect(-9 + walk * 0.4, -22, 8, 20); ctx.fillRect(1 - walk * 0.4, -22, 8, 20);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-10 + walk * 0.6, -5, 10, 5); ctx.fillRect(0 - walk * 0.6, -5, 10, 5);
    // 몸통
    ctx.fillStyle = o.shirt; roundRect(-12, -42, 24, 22, 5); ctx.fill();
    // 팔 & 무기
    ctx.fillStyle = '#f3d7b5';
    if (o.attack > 0) {
      const t = 1 - o.attack / o.attackDur; const ang = -1.6 + t * 2.6;
      ctx.save(); ctx.translate(8, -36); ctx.rotate(ang);
      ctx.fillStyle = '#f3d7b5'; ctx.fillRect(-3, 0, 6, 14);
      ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-2, 12, 4, 8);
      ctx.fillStyle = '#cfd8e6'; ctx.fillRect(-2.5, 18, 5, 30);
      ctx.fillStyle = '#fff'; ctx.fillRect(-0.5, 18, 1.5, 28);
      ctx.restore();
    } else {
      ctx.fillRect(-15, -40, 6, 16); ctx.fillRect(9, -40, 6, 16);
      // 등에 멘 검
      ctx.fillStyle = '#cfd8e6'; ctx.fillRect(-15, -58, 3, 26);
    }
    // 머리
    ctx.fillStyle = '#f7dcc0'; ctx.beginPath(); ctx.arc(0, -56, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = o.hair; ctx.beginPath(); ctx.arc(0, -58, 16, Math.PI, Math.PI * 2); ctx.lineTo(16, -52); ctx.lineTo(10, -56); ctx.lineTo(5, -50); ctx.lineTo(-2, -56); ctx.lineTo(-10, -52); ctx.lineTo(-16, -52); ctx.closePath(); ctx.fill();
    // 얼굴
    ctx.fillStyle = '#222'; ctx.fillRect(3, -56, 3, 5); ctx.fillRect(10, -56, 3, 5);
    ctx.strokeStyle = '#a0583a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(8, -48, 3, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
  }
  function drawPlayer() {
    const p = player;
    if (p.invul > 0 && Math.floor(tick / 4) % 2 === 0) ctx.globalAlpha = 0.45;
    const walk = p.onGround && p.vx !== 0 ? p.walkT : (p.climbing ? tick * 0.15 : 0);
    const s = p.attackType ? SKILLS[p.attackType] : null;
    drawCharacter(p.x, p.y, p.face, { hair: '#5a3a22', shirt: '#e0523a', pants: '#2d3d6b', walk, attack: p.attack, attackDur: s ? s.dur : 1 });
    ctx.globalAlpha = 1;
    nameTag(p.x, p.y + 6, `모험가 Lv.${p.lv}`);
  }

  // ---------- 그리기: 몬스터 ----------
  function drawMob(m) {
    const def = m.def, bob = Math.sin(m.anim) * 1.5;
    ctx.save(); ctx.translate(m.x, m.y);
    if (m.flash > 0 && Math.floor(m.flash / 2) % 2 === 0) ctx.filter = 'brightness(2.2)';
    switch (def.draw) {
      case 'snail': drawSnail(def, m, bob); break;
      case 'slime': drawSlime(m); break;
      case 'mush': drawMush(def, m, bob, 1); break;
      case 'mushmom': drawMush(def, m, bob, 2.6); break;
      case 'pig': drawPig(m, bob); break;
    }
    ctx.restore();
    // 체력바
    if (!def.boss && m.hp < m.max && tick - (m.hurtT || 0) < 240) {
      const w = 44, y = m.y - def.h - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(m.x - w / 2 - 1, y - 1, w + 2, 6);
      ctx.fillStyle = '#e94b4b'; ctx.fillRect(m.x - w / 2, y, w * clamp(m.hp / m.max, 0, 1), 4);
    }
    nameTag(m.x, m.y + 4, `${def.name} Lv.${def.lv}`, def.boss ? '#ff9a5a' : '#eee');
  }
  function drawSnail(def, m, bob) {
    if (m.dir > 0) ctx.scale(-1, 1);
    ctx.fillStyle = '#e4d2ad'; roundRect(-17, -11 + bob / 2, 32, 11, 5); ctx.fill();
    ctx.fillStyle = def.shell2; ctx.beginPath(); ctx.arc(2, -14 + bob, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.shell; ctx.beginPath(); ctx.arc(2, -14 + bob, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = def.shell2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(2, -14 + bob, 6, 0, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = '#e4d2ad'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-13, -9); ctx.lineTo(-18, -22 + bob); ctx.moveTo(-8, -9); ctx.lineTo(-11, -24 + bob); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-18, -23 + bob, 3.5, 0, Math.PI * 2); ctx.arc(-11, -25 + bob, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-19, -23 + bob, 1.6, 0, Math.PI * 2); ctx.arc(-12, -25 + bob, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  function drawSlime(m) {
    const sq = 1 + Math.sin(m.anim * 2) * 0.1;
    ctx.fillStyle = '#3f9f3f'; ctx.beginPath(); ctx.ellipse(0, -14 * sq, 19 * (2 - sq), 15 * sq, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6fdc6f'; ctx.beginPath(); ctx.ellipse(0, -15 * sq, 16 * (2 - sq), 12 * sq, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-7, -22 * sq, 4, 3, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#143'; ctx.beginPath(); ctx.ellipse(-6 * m.dir, -14 * sq, 2.2, 3.5, 0, 0, Math.PI * 2); ctx.ellipse(-12 * m.dir, -14 * sq, 2.2, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#143'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-9 * m.dir, -9 * sq, 3, 0.3, Math.PI - 0.3); ctx.stroke();
  }
  function drawMush(def, m, bob, k) {
    ctx.scale(k, k);
    const boss = k > 1;
    ctx.fillStyle = '#f3e2c3'; roundRect(-11, -24, 22, 24, 6); ctx.fill();
    ctx.fillStyle = '#d9c39b'; ctx.fillRect(-13, -4, 10, 4); ctx.fillRect(3, -4, 10, 4);
    // 얼굴 (몸통)
    ctx.fillStyle = '#222';
    if (boss) { ctx.fillRect(-7, -16, 4, 2); ctx.fillRect(3, -16, 4, 2); ctx.fillRect(-5, -9, 10, 3); ctx.fillStyle = '#fff'; ctx.fillRect(-4, -9, 2, 3); ctx.fillRect(2, -9, 2, 3); }
    else { ctx.beginPath(); ctx.arc(-4, -14, 1.6, 0, Math.PI * 2); ctx.arc(4, -14, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -9, 2.5, 0.2, Math.PI - 0.2); ctx.stroke(); }
    // 갓
    ctx.fillStyle = def.cap2; ctx.beginPath(); ctx.ellipse(0, -28 + bob, 24, 14, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(-24, -28 + bob, 48, 4);
    ctx.fillStyle = def.cap; ctx.beginPath(); ctx.ellipse(0, -29 + bob, 22, 12, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6ea';
    ctx.beginPath(); ctx.arc(-10, -34 + bob, 3.5, 0, Math.PI * 2); ctx.arc(6, -37 + bob, 2.8, 0, Math.PI * 2); ctx.arc(14, -31 + bob, 2.2, 0, Math.PI * 2); ctx.fill();
    if (boss) { ctx.strokeStyle = '#4a2008'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14, -36 + bob); ctx.lineTo(-6, -33 + bob); ctx.moveTo(14, -36 + bob); ctx.lineTo(6, -33 + bob); ctx.stroke(); }
  }
  function drawPig(m, bob) {
    if (m.dir > 0) ctx.scale(-1, 1);
    ctx.fillStyle = '#e88aa8'; ctx.fillRect(-14, -8, 7, 8); ctx.fillRect(7, -8, 7, 8);
    ctx.fillStyle = '#f7b3c8'; ctx.beginPath(); ctx.ellipse(0, -20 + bob, 22, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f7b3c8'; ctx.beginPath(); ctx.moveTo(-6, -32 + bob); ctx.lineTo(-2, -42 + bob); ctx.lineTo(4, -32 + bob); ctx.moveTo(8, -30 + bob); ctx.lineTo(14, -40 + bob); ctx.lineTo(16, -28 + bob); ctx.fill();
    ctx.fillStyle = '#e98bb0'; ctx.beginPath(); ctx.ellipse(-20, -18 + bob, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b5456f'; ctx.beginPath(); ctx.arc(-22, -19 + bob, 1.4, 0, Math.PI * 2); ctx.arc(-18, -19 + bob, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-10, -25 + bob, 2, 0, Math.PI * 2); ctx.fill();
    // 리본
    ctx.fillStyle = '#e23a3a'; ctx.beginPath(); ctx.moveTo(4, -36 + bob); ctx.lineTo(-6, -42 + bob); ctx.lineTo(-4, -32 + bob); ctx.moveTo(4, -36 + bob); ctx.lineTo(14, -42 + bob); ctx.lineTo(12, -32 + bob); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -36 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- 그리기: 드롭·이펙트 ----------
  function drawDrops() {
    for (const d of drops) {
      const y = d.y - 6 + (d.landed ? Math.sin(d.anim) * 2 : 0);
      if (d.type === 'meso') {
        ctx.fillStyle = '#c98a1a'; ctx.beginPath(); ctx.ellipse(d.x, y, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.ellipse(d.x, y - 2, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9a6410'; ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('₩', d.x, y + 1);
      } else {
        ctx.fillStyle = d.type === 'hpPot' ? '#e2493f' : '#3f7ae2'; roundRect(d.x - 6, y - 8, 12, 14, 5); ctx.fill();
        ctx.fillStyle = '#d9d9d9'; ctx.fillRect(d.x - 3, y - 12, 6, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(d.x - 4, y - 5, 2, 7);
      }
    }
  }
  function drawEffects() {
    for (const e of effects) {
      const a = clamp(e.life / e.max, 0, 1);
      if (e.kind === 'num') {
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.font = `700 ${e.color === '#ff6b6b' ? 22 : 18}px ${FONT}`; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(e.text, e.x, e.y); ctx.fillStyle = e.color; ctx.fillText(e.text, e.x, e.y);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'skill') {
        ctx.globalAlpha = a; ctx.font = `700 14px ${FONT}`; ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(e.text, e.x, e.y); ctx.fillStyle = e.color; ctx.fillText(e.text, e.x, e.y);
        ctx.globalAlpha = 1;
      } else if (e.kind === 'spark') {
        ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.globalAlpha = a;
        for (let i = 0; i < 6; i++) { const ang = i * Math.PI / 3 + (1 - a); const r = 8 + (1 - a) * 22; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(ang) * r * 0.5, e.y + Math.sin(ang) * r * 0.5); ctx.lineTo(e.x + Math.cos(ang) * r, e.y + Math.sin(ang) * r); ctx.stroke(); }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'slash') {
        ctx.globalAlpha = a * 0.8; ctx.strokeStyle = e.color; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(e.x + e.face * e.range * 0.45, e.y, e.range * 0.55, 34, 0, e.face > 0 ? -1.2 : Math.PI - 1.2, e.face > 0 ? 1.2 : Math.PI + 1.2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'levelup') {
        const t = 1 - a;
        ctx.strokeStyle = `rgba(255,220,80,${a})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(player.x, player.y - 30, 20 + t * 70, 10 + t * 30, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(255,240,150,${a})`;
        for (let i = 0; i < 10; i++) { const ang = i * 0.628 + t * 2; ctx.beginPath(); ctx.arc(player.x + Math.cos(ang) * (30 + t * 60), player.y - 40 - t * 80 + Math.sin(ang * 3) * 10, 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.font = `700 26px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = `rgba(90,40,0,${a})`;
        ctx.strokeText('LEVEL UP!', player.x, player.y - 110 - t * 20); ctx.fillStyle = `rgba(255,220,80,${a})`; ctx.fillText('LEVEL UP!', player.x, player.y - 110 - t * 20);
      }
    }
  }

  // ---------- 그리기: HUD ----------
  function bar(x, y, w, h, ratio, color, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(x, y, w, h, 4); ctx.fill();
    ctx.fillStyle = color; roundRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(ratio, 0, 1)), h - 2, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(label, x + w / 2, y + h - 4);
  }
  function drawHUD() {
    const p = player;
    // 하단 바
    ctx.fillStyle = 'rgba(16,20,32,0.86)'; ctx.fillRect(0, H - 60, W, 60);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, H - 60, W, 1);
    ctx.fillStyle = '#243052'; roundRect(10, H - 50, 92, 40, 8); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.font = `700 18px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(`Lv. ${p.lv}`, 56, H - 27);
    ctx.fillStyle = '#cfd8f0'; ctx.font = `600 10px ${FONT}`; ctx.fillText('모험가', 56, H - 14);
    bar(112, H - 50, 170, 16, p.hp / maxHp(), '#e24b4b', `HP ${p.hp} / ${maxHp()}`);
    bar(112, H - 30, 170, 16, p.mp / maxMp(), '#3f7ae2', `MP ${p.mp} / ${maxMp()}`);
    bar(292, H - 50, 230, 16, p.exp / expNeed(p.lv), '#e0c23a', `EXP ${fmt(p.exp)} / ${fmt(expNeed(p.lv))} (${(p.exp / expNeed(p.lv) * 100).toFixed(2)}%)`);
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffd34a'; ctx.font = `700 13px ${FONT}`; ctx.fillText(`● ${fmt(p.meso)} 메소`, 294, H - 17);
    ctx.fillStyle = '#9fb0d0'; ctx.font = `600 11px ${FONT}`; ctx.fillText(`공격력 ${Math.floor(atkBase())}  무기 +${p.weapon}`, 420, H - 17);
    // 퀵슬롯
    const slots = [
      { key: 'Z', label: '공격', draw: () => { ctx.fillStyle = '#cfd8e6'; ctx.fillRect(-2, -14, 4, 22); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-6, 6, 12, 3); } },
      { key: 'X', label: 'PS', lock: SKILLS.ps.lvReq, draw: () => star('#ffd84a') },
      { key: 'C', label: 'SB', lock: SKILLS.sb.lvReq, draw: () => star('#7fe3ff') },
      { key: '1', label: String(p.bag.hpPot), draw: () => pot('#e2493f') },
      { key: '2', label: String(p.bag.mpPot), draw: () => pot('#3f7ae2') },
    ];
    function star(c) { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    function pot(c) { ctx.fillStyle = c; roundRect(-7, -8, 14, 18, 6); ctx.fill(); ctx.fillStyle = '#ddd'; ctx.fillRect(-4, -13, 8, 6); }
    slots.forEach((s, i) => {
      const x = 700 + i * 50, y = H - 52;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(x, y, 44, 44, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; roundRect(x, y, 44, 44, 8); ctx.stroke();
      ctx.save(); ctx.translate(x + 22, y + 20); if (s.lock && p.lv < s.lock) ctx.globalAlpha = 0.3; s.draw(); ctx.restore();
      ctx.fillStyle = '#ffd84a'; ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(s.key, x + 4, y + 12);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(s.lock && p.lv < s.lock ? `Lv${s.lock}` : s.label, x + 40, y + 40);
    });

    // 상단: 맵 이름 + 미니맵
    ctx.fillStyle = 'rgba(16,20,32,0.7)'; roundRect(10, 10, 190, 78, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 13px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(map.name, 18, 28);
    const mx = 18, my = 36, mw = 174, mh = 44, sx = mw / map.width, sy = mh / H;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#8fd36a'; map.platforms.forEach(pl => ctx.fillRect(mx + pl.x * sx, my + pl.y * sy, Math.max(2, pl.w * sx), 2));
    ctx.fillStyle = '#6fb4ff'; map.portals.forEach(pt => ctx.fillRect(mx + pt.x * sx - 2, my + (pt.y - 40) * sy, 4, 6));
    ctx.fillStyle = '#ff6b6b'; mobs.forEach(m => { if (!m.dead) ctx.fillRect(mx + m.x * sx - 1.5, my + (m.y - 10) * sy, 3, 3); });
    ctx.fillStyle = '#ffd84a'; map.npcs.forEach(n => ctx.fillRect(mx + n.x * sx - 2, my + (n.y - 20) * sy, 4, 4));
    ctx.fillStyle = '#fff'; ctx.fillRect(mx + p.x * sx - 2, my + (p.y - 20) * sy - 2, 4, 5);

    // 퀘스트 표시
    const q = QUESTS[p.quest.idx];
    if (q && p.quest.active) {
      ctx.fillStyle = 'rgba(16,20,32,0.7)'; roundRect(10, 96, 190, 40, 8); ctx.fill();
      ctx.fillStyle = '#ffd84a'; ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(`퀘스트: ${q.title}`, 18, 113);
      const done = questProgress() >= questNeed();
      ctx.fillStyle = done ? '#7dff8a' : '#fff'; ctx.font = `600 11px ${FONT}`; ctx.fillText(done ? '완료! 스탠에게 돌아가기' : `${Math.min(questProgress(), questNeed())} / ${questNeed()} 처치`, 18, 129);
    }

    // 보스 체력
    const boss = mobs.find(m => m.def.boss && !m.dead);
    if (boss) {
      ctx.fillStyle = 'rgba(16,20,32,0.75)'; roundRect(W / 2 - 180, 10, 360, 34, 8); ctx.fill();
      ctx.fillStyle = '#ff9a5a'; ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText(`${boss.def.name} Lv.${boss.def.lv}`, W / 2 - 170, 24);
      bar(W / 2 - 170, 28, 340, 12, boss.hp / boss.max, '#e24b4b', `${fmt(boss.hp)} / ${fmt(boss.max)}`);
    }

    // 우상단 힌트
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = `600 11px ${FONT}`; ctx.textAlign = 'right';
    ctx.fillText(`H 조작법 · M 소리 ${muted ? '꺼짐' : '켜짐'}`, W - 12, 22);

    // 메시지 로그
    ctx.textAlign = 'left'; ctx.font = `600 12px ${FONT}`;
    logs.forEach((l, i) => {
      const y = H - 112 - (logs.length - 1 - i) * 17;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(l.text, 14, y); ctx.fillStyle = '#f4f4f4'; ctx.fillText(l.text, 14, y);
    });
    // 토스트
    if (toastMsg) {
      ctx.font = `700 16px ${FONT}`; ctx.textAlign = 'center';
      const w = ctx.measureText(toastMsg.text).width + 30;
      ctx.fillStyle = 'rgba(16,20,32,0.8)'; roundRect(W / 2 - w / 2, 110, w, 34, 10); ctx.fill();
      ctx.fillStyle = '#ffe9a8'; ctx.fillText(toastMsg.text, W / 2, 133);
    }
    if (showHelp) drawHelp();
  }
  function drawHelp() {
    ctx.fillStyle = 'rgba(10,12,20,0.88)'; roundRect(W / 2 - 230, 70, 460, 330, 14); ctx.fill();
    ctx.fillStyle = '#ffd84a'; ctx.font = `700 20px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('조작법', W / 2, 104);
    const lines = [
      ['← →', '이동'], ['↑ ↓', '로프 타기 · 포탈 이동 · NPC 대화'], ['Space / Alt', '점프 (로프에서 ←→ + 점프로 뛰어내리기)'],
      ['Z / Ctrl', '공격'], ['X', '파워 스트라이크 (MP 6, 강한 한 방, Lv.3)'], ['C', '슬래시 블러스트 (MP 10, 여러 마리, Lv.6)'],
      ['1 / 2', '빨간 포션 (HP) / 파란 포션 (MP)'], ['M', '소리 켜기/끄기'], ['H', '이 창 닫기'],
    ];
    ctx.font = `600 14px ${FONT}`;
    lines.forEach(([k, v], i) => {
      const y = 140 + i * 27;
      ctx.textAlign = 'right'; ctx.fillStyle = '#7fe3ff'; ctx.fillText(k, W / 2 - 60, y);
      ctx.textAlign = 'left'; ctx.fillStyle = '#eee'; ctx.fillText(v, W / 2 - 40, y);
    });
    ctx.textAlign = 'center'; ctx.fillStyle = '#aaa'; ctx.font = `600 12px ${FONT}`;
    ctx.fillText('떨어진 메소와 포션은 가까이 가면 자동으로 얻습니다. 진행 상황은 자동 저장됩니다.', W / 2, 385);
  }
  function drawTitle() {
    ctx.fillStyle = 'rgba(10,12,20,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = `700 64px ${FONT}`; ctx.lineWidth = 10; ctx.strokeStyle = '#6b3a0c'; ctx.strokeText('메이플 어드벤처', W / 2, 200);
    const g = ctx.createLinearGradient(0, 150, 0, 210); g.addColorStop(0, '#fff2b0'); g.addColorStop(1, '#f5a623');
    ctx.fillStyle = g; ctx.fillText('메이플 어드벤처', W / 2, 200);
    ctx.font = `600 18px ${FONT}`; ctx.fillStyle = '#e8ecf5'; ctx.fillText('달팽이부터 머쉬맘까지, 사냥하고 레벨을 올려 보세요', W / 2, 240);
    ctx.font = `600 14px ${FONT}`; ctx.fillStyle = '#cfd8f0';
    ['← → 이동   ↑↓ 로프·포탈·대화   Space 점프', 'Z 공격   X 파워 스트라이크   C 슬래시 블러스트   1/2 포션', isTouch ? '화면의 버튼으로도 조작할 수 있어요' : 'H 키로 언제든 조작법을 볼 수 있어요'].forEach((t, i) => ctx.fillText(t, W / 2, 290 + i * 24));
    if (Math.floor(tick / 30) % 2 === 0) { ctx.font = `700 20px ${FONT}`; ctx.fillStyle = '#ffd84a'; ctx.fillText(hasSave ? `이어하기 — 아무 키나 누르거나 화면을 터치하세요 (Lv.${player.lv})` : '아무 키나 누르거나 화면을 터치하세요', W / 2, 400); }
  }
  function drawDead() {
    ctx.fillStyle = 'rgba(40,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffb3b3'; ctx.font = `700 44px ${FONT}`; ctx.fillText('사망했습니다...', W / 2, 230);
    ctx.fillStyle = '#fff'; ctx.font = `600 16px ${FONT}`; ctx.fillText('경험치의 10%를 잃었습니다. 공격 또는 점프 키를 누르면 헤네시스에서 부활합니다.', W / 2, 275);
  }

  // ---------- 렌더 ----------
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBackground();
    ctx.save(); ctx.translate(-Math.round(cam.x), 0);
    drawPlatforms();
    drawDrops();
    mobs.forEach(m => { if (!m.dead) drawMob(m); });
    if (mode !== 'title') drawPlayer();
    drawEffects();
    ctx.restore();
    if (mode === 'title') drawTitle();
    else { drawHUD(); if (mode === 'dead') drawDead(); }
  }

  // ---------- 루프 ----------
  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(now - last, 120); last = now;
    while (acc >= STEP) { step(); acc -= STEP; }
    render();
    requestAnimationFrame(frame);
  }
  map = MAPS[mapId]; spawnMobs(); cam.x = 0;
  requestAnimationFrame(frame);
  window.addEventListener('beforeunload', () => { if (mode !== 'title') save(); });

  // 테스트·디버그용 훅
  window.__maple = { player, get mobs() { return mobs; }, get mode() { return mode; }, get map() { return map; }, press, release, MAPS, MOBS };
})();
