(function () {
  'use strict';
  const INK = '#25352b';
  let uid = 0;
  const f = n => +n.toFixed(2);
  const wrap = (kind, st, defs, body) =>
    `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><defs>${defs}</defs>` +
    `<g class="pet pet-${kind} pet-s${st}" style="--d:${(-Math.random() * 6).toFixed(2)}s">${body}</g></svg>`;

  // ---------------------------------------------------------------- helpers
  function kit(id, mood) {
    const lg = (n, a, b, x2 = 0, y2 = 1) =>
      `<linearGradient id="${id}${n}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    const rg = (n, a, b, cx = 0.35, cy = 0.3, r = 0.85) =>
      `<radialGradient id="${id}${n}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
    const u = n => `url(#${id}${n})`;
    // Eyes follow the mood: open (idle), happy arcs (done today), sleepy arcs (rest day).
    const eye = (x, y, r = 2) =>
      mood === 'happy'
        ? `<g class="pet-eye"><path d="M${f(x - r)} ${f(y + r * 0.4)}Q${x} ${f(y - r * 1.2)} ${f(x + r)} ${f(y + r * 0.4)}" fill="none" stroke="${INK}" stroke-width="${f(r * 0.55)}" stroke-linecap="round"/></g>`
        : mood === 'rest'
          ? `<g class="pet-eye"><path d="M${f(x - r)} ${f(y - r * 0.1)}Q${x} ${f(y + r * 0.9)} ${f(x + r)} ${f(y - r * 0.1)}" fill="none" stroke="${INK}" stroke-width="${f(r * 0.5)}" stroke-linecap="round"/></g>`
          : `<g class="pet-eye"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${f(x + r * 0.2)}" cy="${f(y + r * 0.1)}" r="${f(r * 0.64)}" fill="${INK}"/><circle cx="${f(x + r * 0.45)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.24)}" fill="#fff"/></g>`;
    const mouth = (x, y, w = 2.4) =>
      mood === 'happy'
        ? `<path d="M${f(x - w)} ${y}Q${x} ${f(y + w * 1.2)} ${f(x + w)} ${y}z" fill="#8a3342"/>`
        : mood === 'rest'
          ? `<path d="M${f(x - w * 0.6)} ${y}h${f(w * 1.2)}" stroke="${INK}" stroke-width=".9" stroke-linecap="round"/>`
          : `<path d="M${f(x - w)} ${y}Q${x} ${f(y + w * 0.85)} ${f(x + w)} ${y}" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`;
    const blush = (x, y, rx = 2) =>
      `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${f(rx * 0.6)}" fill="#ff8fa3" opacity="${mood === 'happy' ? 0.7 : 0.42}"/>`;
    const sparkle = (x, y) =>
      `<path class="pet-spark" d="M${x} ${y - 3.2}l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" fill="#f2c94c"/>`;
    const zzz = () =>
      mood === 'rest'
        ? `<text class="pet-spark" x="30" y="10" font-size="7" font-weight="800" fill="#8aa0c8">z</text><text class="pet-spark" x="34" y="6" font-size="5" font-weight="800" fill="#8aa0c8">z</text>`
        : '';
    const bubble = (x, y, r) =>
      `<circle class="pet-bubble" cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".35" stroke="#8cc4ec" stroke-width=".9"/>`;
    const shadow = rx => `<ellipse cx="20" cy="36.6" rx="${rx}" ry="1.9" fill="${INK}" opacity=".14"/>`;
    const spiral = (cx, cy, R, turns, a0 = 0) => {
      let d = '';
      for (let i = 0; i <= 44; i++) {
        const t = i / 44,
          a = a0 + t * turns * 6.2832,
          r = R * t;
        d += `${i ? 'L' : 'M'}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
      }
      return d;
    };
    const leaf = (x, y, rot, s, g) =>
      `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0C-3.6-3-3.6-9 0-12.8 3.6-9 3.6-3 0 0z" fill="${u(g)}"/><path d="M0-1V-10" stroke="#fff" stroke-opacity=".4" stroke-width=".8" stroke-linecap="round"/></g>`;
    return { lg, rg, u, eye, mouth, blush, sparkle, zzz, bubble, shadow, spiral, leaf, mood };
  }

  // ------------------------------------------------------------------- fish
  function fish(st, k) {
    const { lg, rg, u, eye, mouth, blush, sparkle, zzz, bubble, mood } = k;
    if (st === 0)
      return [
        rg('e', '#ffffff', '#9fd2f3', 0.3, 0.25) + lg('m', '#ffb38f', '#ff7a58'),
        `<circle cx="20" cy="21" r="11" fill="${u('e')}" fill-opacity=".8"/><circle cx="20" cy="21" r="11" fill="none" stroke="#7fbbe6" stroke-width="1.3"/>` +
          `<path d="M14.5 23c-.5-4.5 3-7 6.5-6s5.5 4.5 3 8c-2.5 3.5-8 2.5-9.5-2z" fill="${u('m')}"/><path d="M14.5 23 12 25.6" stroke="#ff7a58" stroke-width="1.6" stroke-linecap="round"/>` +
          `<circle cx="22.8" cy="20" r="1.2" fill="${INK}"/><ellipse cx="14.6" cy="15.4" rx="3.2" ry="1.7" fill="#fff" opacity=".85" transform="rotate(-35 14.6 15.4)"/>` +
          bubble(33, 9, 1.6) + bubble(7, 12, 1)
      ];
    if (st === 1)
      return [
        lg('b', '#9bdcff', '#4aa8ee') + lg('f', '#6dbdf5', '#3d96e0', 1, 0),
        `<path class="pet-tail" d="M14 21C11 18.5 8.5 16.5 6 15.5c1 3.5 1 7.5 0 11 2.5-1 5-3 8-5.5z" fill="${u('f')}"/>` +
          `<ellipse cx="21.5" cy="21" rx="9" ry="6.2" fill="${u('b')}"/><ellipse cx="22.5" cy="23.8" rx="6.4" ry="2.7" fill="#eaf7ff" opacity=".9"/>` +
          `<path d="M17.5 15.6c1.7-3.4 4.6-3.8 6.8-1.6-1.8.2-4.4.6-6.8 1.6z" fill="#3d96e0"/>` +
          `<ellipse cx="19" cy="17.6" rx="3.6" ry="1.1" fill="#fff" opacity=".4" transform="rotate(-8 19 17.6)"/>` +
          eye(26, 19.6, 2.3) + blush(27.2, 23.4) + mouth(30, 22.4, 1.6) + zzz() + bubble(32, 11, 1.4) + bubble(35, 16, 0.9)
      ];
    if (st === 2)
      return [
        lg('b', '#6cbcf5', '#2f86d6') + lg('f', '#58aeef', '#2a78c4', 1, 0),
        `<g class="pet-tail"><path d="M12 21C8.5 17.5 6.5 14.5 4 13c.9 4.2.9 10.8 0 15 2.5-1.5 4.5-4.5 8-7z" fill="${u('f')}"/><path d="M11 21 5 15M11 21 4.6 21M11 21l-6 6" stroke="#fff" stroke-opacity=".35" stroke-width=".7" fill="none"/></g>` +
          `<ellipse cx="21" cy="21" rx="10.8" ry="7.6" fill="${u('b')}"/><ellipse cx="22" cy="25.2" rx="7.4" ry="3" fill="#e6f5ff" opacity=".9"/>` +
          `<path d="M17 14.3c2 3 2 10.6 0 13.6M22 13.8c2 3.2 2 11 0 14" fill="none" stroke="#2a78c4" stroke-width="1.5" stroke-linecap="round" opacity=".4"/>` +
          `<path d="M15 14.8C17 9.4 22 8.8 26 13.8 22 12.6 18 13 15 14.8z" fill="#2a78c4"/><path d="M17.6 13.2 18 10.6M20.4 12.8 21.2 9.8M23 12.8l1-2.6" stroke="#fff" stroke-opacity=".3" stroke-width=".6"/>` +
          `<path d="M19.5 23c-2 2-2.2 4.2-.6 5.2 2-.5 3.4-2.6 3.4-4.6z" fill="#3a8fe0" opacity=".85"/>` +
          `<ellipse cx="19" cy="16.6" rx="4.4" ry="1.2" fill="#fff" opacity=".4" transform="rotate(-8 19 16.6)"/>` +
          eye(26.8, 18.8, 2.7) + blush(28.4, 23.8, 2.2) + mouth(30.8, 23.2, 1.8) + zzz() + bubble(34, 10, 1.5) + bubble(36.5, 15, 1)
      ];
    return [
      lg('b', '#3a9cf0', '#1b6fcb') + lg('t', '#1f78d1', '#8fdcff', 1, 0),
      `<g class="pet-tail"><path d="M10 21C6 16 3 12 1.5 7.5 7.5 8 11.5 12 13.5 16.5z" fill="${u('t')}"/><path d="M10 21C6 26 3 30 1.5 34.5 7.5 34 11.5 30 13.5 25.5z" fill="${u('t')}"/><path d="M11 20 3.6 10M11 22l-7.4 10" stroke="#fff" stroke-opacity=".4" stroke-width=".7" fill="none"/></g>` +
        `<ellipse cx="22" cy="21" rx="13.6" ry="9.2" fill="${u('b')}"/><ellipse cx="23" cy="25.8" rx="9.6" ry="3.8" fill="#d6efff" opacity=".92"/>` +
        `<path d="M14.4 18c2 1.5 2 5 0 6.5M18.4 16.6c2.2 2 2.2 7 0 9M22.4 16c2.2 2.2 2.2 8 0 10M26.4 16.6c2 1.8 2 6.4 0 8.6" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".28"/>` +
        `<path d="M12.5 17.6C18 13.8 28 13.2 33 17" fill="none" stroke="#f2c94c" stroke-width="1.7" stroke-linecap="round"/>` +
        `<path d="M14 13.4C17 4.8 25 3.8 31 12.4 26 10.6 19 10.6 14 13.4z" fill="${u('t')}"/><path d="M17 11.6 17.8 7.4M20.6 10.6 22 6M24.4 10.8l2-3.8M27.6 11.6l2-2.4" stroke="#fff" stroke-opacity=".35" stroke-width=".7"/>` +
        `<path d="M20 27.6c-2.5 3-3 5.6-1 7 3-.5 5.5-3 5.5-6.5z" fill="${u('t')}"/>` +
        `<ellipse cx="21" cy="15.8" rx="7" ry="1.4" fill="#fff" opacity=".38" transform="rotate(-6 21 15.8)"/>` +
        eye(30.2, 19.2, 3.1) + blush(31.2, 24.8, 2.4) + mouth(34.2, 23.8, 2.1) + zzz() + (mood === 'happy' ? '' : sparkle(36, 7)) + bubble(37, 12, 1.2)
    ];
  }

  // ------------------------------------------------------------------ snail
  function snail(st, k) {
    const { lg, rg, u, eye, mouth, blush, shadow, spiral, sparkle, zzz, mood } = k;
    const body = '#ecd8b6';
    if (st === 0)
      return [
        rg('e', '#fffaf0', '#e6d2ae', 0.35, 0.3),
        shadow(8) + `<ellipse cx="20" cy="26" rx="7.6" ry="9.6" fill="${u('e')}"/>` +
          `<circle cx="17" cy="23" r="1" fill="#d2b98f"/><circle cx="23" cy="27.4" r="1.2" fill="#d2b98f"/><circle cx="19" cy="31.2" r=".9" fill="#d2b98f"/><circle cx="22.6" cy="21.4" r=".8" fill="#d2b98f"/>` +
          `<ellipse cx="16.4" cy="19.6" rx="2" ry="3.2" fill="#fff" opacity=".75" transform="rotate(20 16.4 19.6)"/>`
      ];
    const cfg = [
      null,
      { sx: 22, rx: 12, hx: 31, hy: 28.5, hr: 4.3, cx: 20, cy: 25.5, R: 7, sh: 12, e1: [28.4, 19.8], e2: [35.2, 20.2], er: 1.8, st1: 'M29.8 25.6 28.6 20.6M33.2 26l2-5' },
      { sx: 21, rx: 14, hx: 32.2, hy: 28, hr: 5, cx: 19, cy: 23, R: 9.2, sh: 15, e1: [29.2, 17.8], e2: [36.8, 18.2], er: 1.9, st1: 'M30.6 24.4 29.4 18.4M34.4 24.8l2.4-6' },
      { sx: 21, rx: 16, hx: 33.6, hy: 27.6, hr: 5.6, cx: 18, cy: 21, R: 11.4, sh: 17, e1: [29.8, 15.6], e2: [37.4, 16.4], er: 2.1, st1: 'M31.6 23.6 30.2 16.6M35.4 24l1.8-6.6' }
    ][st];
    const defs =
      rg('sh', '#f6bf9a', '#c46b45', 0.3, 0.25) + lg('bd', '#f6e8cf', '#d9bf98') +
      (st === 3 ? rg('sh2', '#eaa37e', '#b45f3b', 0.3, 0.25) : '');
    const ring = (r, c, o = 1) => `<circle cx="${cfg.cx}" cy="${cfg.cy}" r="${f(r)}" fill="${c}" opacity="${o}"/>`;
    const shell =
      st === 1
        ? ring(cfg.R, u('sh')) + ring(cfg.R * 0.62, '#f2c3a0', 0.55)
        : ring(cfg.R, u('sh')) + ring(cfg.R * 0.76, '#e59b73', 0.55) + ring(cfg.R * 0.5, '#c46b45', 0.5) + ring(cfg.R * 0.26, '#e59b73', 0.6);
    return [
      defs,
      shadow(cfg.sh) +
        `<path d="M4 34.8c5 .7 10 .7 15 0" stroke="#fff" opacity=".4" stroke-width="1.2" stroke-linecap="round" fill="none"/>` +
        `<ellipse cx="${cfg.sx}" cy="32" rx="${cfg.rx}" ry="${f(4 + st * 0.3)}" fill="${u('bd')}"/>` +
        `<ellipse cx="${cfg.sx + 1}" cy="33.8" rx="${f(cfg.rx * 0.7)}" ry="1.4" fill="#fff" opacity=".4"/>` +
        `<circle cx="${cfg.hx}" cy="${cfg.hy}" r="${cfg.hr}" fill="${u('bd')}"/>` +
        `<path d="${cfg.st1}" stroke="#c9ae85" stroke-width="${f(1 + st * 0.15)}" stroke-linecap="round" fill="none"/>` +
        eye(cfg.e1[0], cfg.e1[1], cfg.er) + eye(cfg.e2[0], cfg.e2[1], cfg.er) +
        shell +
        `<path d="${spiral(cfg.cx, cfg.cy, cfg.R * 0.86, 2.3, 0.6)}" fill="none" stroke="#a95a38" stroke-width="${f(1 + st * 0.12)}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>` +
        `<ellipse cx="${f(cfg.cx - cfg.R * 0.38)}" cy="${f(cfg.cy - cfg.R * 0.55)}" rx="${f(cfg.R * 0.3)}" ry="${f(cfg.R * 0.16)}" fill="#fff" opacity=".5" transform="rotate(-40 ${f(cfg.cx - cfg.R * 0.38)} ${f(cfg.cy - cfg.R * 0.55)})"/>` +
        blush(cfg.hx + 1.4, cfg.hy + 2.2, 1.7) + mouth(cfg.hx - 0.4 + 0.6, cfg.hy + 2.7, 1.2) + zzz() +
        (st === 3
          ? `<g transform="translate(23 11.4)"><circle r="1.5" cx="0" cy="-2.2" fill="#f7b6c6"/><circle r="1.5" cx="2.1" cy="-.7" fill="#f7b6c6"/><circle r="1.5" cx="1.3" cy="1.8" fill="#f7b6c6"/><circle r="1.5" cx="-1.3" cy="1.8" fill="#f7b6c6"/><circle r="1.5" cx="-2.1" cy="-.7" fill="#f7b6c6"/><circle r="1" fill="#f2c94c"/></g>` + (mood === 'happy' ? '' : sparkle(7, 8))
          : '')
    ];
  }

  // ------------------------------------------------------------------ plant
  function plant(st, k) {
    const { lg, rg, u, eye, mouth, blush, shadow, leaf, sparkle, zzz, mood } = k;
    const leafDefs = lg('l1', '#b6e07a', '#5f9e45') + lg('l2', '#9ccc65', '#4f8a3f') + lg('l3', '#c5e88a', '#6aa84f');
    const face = (x = 20, y = 32.2) =>
      eye(x - 2.7, y, 1.35) + eye(x + 2.7, y, 1.35) + mouth(x, y + 1.9, 1.5) + blush(x - 4.8, y + 1.6, 1.4) + blush(x + 4.8, y + 1.6, 1.4);
    const pot =
      `<path d="M12.5 28h15l-2 8.2H14.5z" fill="${u('p')}"/><rect x="11" y="26" width="18" height="4" rx="2" fill="${u('pr')}"/>` +
      `<ellipse cx="20" cy="26.4" rx="7.8" ry="1.3" fill="#6b4b36"/><path d="M13.4 30.6l.8 4.4" stroke="#fff" stroke-opacity=".25" stroke-width="1" stroke-linecap="round"/>` +
      face();
    const potDefs = lg('p', '#dc8e6c', '#b9643f') + lg('pr', '#e8a686', '#d0764f');
    const sway = s => `<g class="pet-sway">${s}</g>`;
    if (st === 0)
      return [
        leafDefs + lg('so', '#9a7a5a', '#6a4f38') + lg('sd', '#d9b17e', '#b48555'),
        shadow(11) + `<ellipse cx="20" cy="33.6" rx="11" ry="4" fill="${u('so')}"/>` +
          sway(`<path d="M20 24.8c0-2.2 1.2-3.4 3-3.6" stroke="#6aa84f" stroke-width="1.6" fill="none" stroke-linecap="round"/>` + leaf(23.2, 21.4, 55, 0.45, 'l3')) +
          `<ellipse cx="20" cy="29" rx="5.8" ry="4.7" fill="${u('sd')}"/><ellipse cx="17.6" cy="27" rx="1.7" ry="1" fill="#fff" opacity=".5" transform="rotate(-30 17.6 27)"/>` +
          eye(17.9, 29.2, 1.1) + eye(22.1, 29.2, 1.1) + mouth(20, 31.2, 1.1) + zzz()
      ];
    const stems = [
      '',
      sway(`<path d="M20 26.4V19" stroke="#4f8a4f" stroke-width="2" stroke-linecap="round"/>` + leaf(20, 20, -38, 0.85, 'l2') + leaf(20, 20, 38, 0.85, 'l3')),
      sway(`<path d="M20 26.4V13.6" stroke="#4f8a4f" stroke-width="2.2" stroke-linecap="round"/>` + leaf(20, 23, -62, 0.95, 'l1') + leaf(20, 23, 62, 0.95, 'l2') + leaf(20, 17.5, -32, 1.05, 'l3') + leaf(20, 17.5, 32, 1.05, 'l2') + leaf(20, 14, 0, 0.8, 'l3')),
      sway(
        `<path d="M20 26.4V11" stroke="#4f8a4f" stroke-width="2.4" stroke-linecap="round"/>` +
          leaf(20, 24, -66, 1.1, 'l1') + leaf(20, 24, 66, 1.1, 'l2') + leaf(20, 19.5, -42, 1.15, 'l3') + leaf(20, 19.5, 42, 1.15, 'l2') + leaf(20, 15, -16, 0.95, 'l2') + leaf(20, 15, 16, 0.95, 'l3') +
          [0, 60, 120, 180, 240, 300].map(a => `<circle cx="${f(20 + 4.3 * Math.sin((a * Math.PI) / 180))}" cy="${f(7.6 - 4.3 * Math.cos((a * Math.PI) / 180))}" r="3.1" fill="#f7b6c6"/>`).join('') +
          [30, 102, 174, 246, 318].map(a => `<circle cx="${f(20 + 2.6 * Math.sin((a * Math.PI) / 180))}" cy="${f(7.6 - 2.6 * Math.cos((a * Math.PI) / 180))}" r="2.2" fill="#f08fa8"/>`).join('') +
          `<circle cx="20" cy="7.6" r="2.2" fill="#f5c94a"/><circle cx="19.2" cy="7" r=".5" fill="#fff" opacity=".7"/>`
      )
    ];
    return [leafDefs + potDefs, shadow(10) + pot + stems[st] + zzz() + (st === 3 && mood !== 'happy' ? sparkle(34, 8) : '')];
  }

  const PETS = { fish, snail, plant };

  function petSvg(species, stage, mood) {
    const kind = PETS[species] ? species : 'fish';
    const st = Math.max(0, Math.min(3, stage | 0));
    const m = mood === 'happy' || mood === 'rest' ? mood : 'idle';
    const k = kit('pg' + (++uid).toString(36), m);
    const [defs, body] = PETS[kind](st, k);
    // Happy companions get a little sparkle (adults already have their own).
    const extra = m === 'happy' && !(st === 3 && kind !== 'plant') ? k.sparkle(34.5, 7) : '';
    return wrap(kind, st, defs, body + extra);
  }

  // ----------------------------------------------------------------- scenes
  const star = (cx, cy, R, r) => {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2,
        rr = i % 2 ? r : R;
      d += `${i ? 'L' : 'M'}${f(cx + rr * Math.cos(a))} ${f(cy + rr * Math.sin(a))}`;
    }
    return d + 'z';
  };
  const svgOpen = '<svg class="zoo-scenery" viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">';

  function aquarium(p) {
    const kelp = (x, h, c, d, w) =>
      `<path class="zs-kelp" style="--kd:${d}s" d="M${x} 400C${x - 18} ${400 - h * 0.3} ${x + 18} ${400 - h * 0.6} ${x - 4} ${400 - h}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    const bubbles = [[150, 0], [152, -2.4], [420, -1], [660, -3.2], [664, -0.6]]
      .map(([x, d], i) => `<circle class="zs-bub" style="--bd:${6 + i}s;--bs:${d}s" cx="${x}" cy="340" r="${4 + (i % 3) * 2}" fill="#fff" fill-opacity=".25" stroke="#fff" stroke-opacity=".7"/>`)
      .join('');
    return (
      svgOpen +
      `<defs><linearGradient id="${p}ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="${p}sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1dba4"/><stop offset="1" stop-color="#cfa95f"/></linearGradient>` +
      `<linearGradient id="${p}rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa6b2"/><stop offset="1" stop-color="#5f6b78"/></linearGradient></defs>` +
      `<g class="zs-rays"><polygon points="90,0 150,0 300,400 170,400" fill="url(#${p}ray)"/><polygon points="300,0 345,0 480,400 390,400" fill="url(#${p}ray)"/><polygon points="520,0 590,0 710,400 570,400" fill="url(#${p}ray)"/></g>` +
      kelp(70, 210, '#4f9e6a', 6, 8) + kelp(98, 150, '#3f8a5a', 5, 7) + kelp(720, 230, '#4f9e6a', 7, 8) + kelp(748, 160, '#3f8a5a', 5.5, 7) + kelp(430, 120, '#5fae78', 6.5, 6) +
      `<path d="M0 352C110 338 230 362 360 350S640 336 800 354V400H0z" fill="url(#${p}sand)"/>` +
      `<path d="M60 372c40-6 80 4 130-2M300 380c50-6 100 4 160-2M560 372c40-6 90 4 150-2" stroke="#b78f4a" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<path d="M40 372c-6-26 14-42 38-40 22 2 34 18 30 40z" fill="url(#${p}rock)"/><path d="M52 346c8-8 22-10 32-6" stroke="#fff" stroke-opacity=".4" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      `<path d="M690 376c-4-22 12-36 32-34 18 2 28 14 26 34z" fill="url(#${p}rock)"/>` +
      `<g fill="none" stroke-linecap="round" stroke="#f08a6b" stroke-width="7"><path d="M590 376V330M590 354l-16-18M590 346l14-14M620 378V338M620 360l-12-14M620 352l10-10"/></g>` +
      `<g fill="#f7a58a"><circle cx="590" cy="328" r="5"/><circle cx="574" cy="334" r="4.5"/><circle cx="604" cy="331" r="4.5"/><circle cx="620" cy="336" r="5"/><circle cx="608" cy="344" r="4"/><circle cx="630" cy="340" r="4"/></g>` +
      `<path d="M260 392c14-26 46-26 60 0z" fill="#f0b7c8" opacity=".9"/><path d="M272 390c4-14 12-18 18-18M290 390c0-14 4-22 8-24M308 390c-2-12-8-18-14-20" stroke="#d98ba2" stroke-width="2" fill="none"/>` +
      `<path d="${star(470, 382, 13, 5.5)}" fill="#f29b6b"/><circle cx="470" cy="382" r="2" fill="#f7c4a2"/>` +
      `<g fill="#e4cf9a"><ellipse cx="180" cy="384" rx="6" ry="3.4"/><ellipse cx="205" cy="390" rx="4" ry="2.6"/><ellipse cx="520" cy="386" rx="5" ry="3"/><ellipse cx="660" cy="390" rx="4" ry="2.4"/></g>` +
      bubbles +
      '</svg>'
    );
  }

  function meadow(p) {
    const cloud = (x, y, s, d, o) =>
      `<g class="zs-cloud" style="--cd:${d}s;--cs:${o}s"><g transform="translate(${x} ${y}) scale(${s})" fill="#fff" fill-opacity=".88"><circle cx="0" cy="0" r="14"/><circle cx="18" cy="-7" r="19"/><circle cx="38" cy="0" r="14"/><rect x="-14" y="0" width="66" height="14" rx="7"/></g></g>`;
    const tree = (x, y, s) =>
      `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-7 0 -5 -50h10L7 0z" fill="#8a6a4d"/><circle cx="0" cy="-70" r="34" fill="url(#${p}can)"/><circle cx="-24" cy="-52" r="22" fill="url(#${p}can)"/><circle cx="24" cy="-52" r="22" fill="url(#${p}can)"/><circle cx="-8" cy="-84" r="9" fill="#fff" opacity=".12"/><circle cx="12" cy="-62" r="3.2" fill="#e85d5d"/><circle cx="-14" cy="-56" r="3.2" fill="#e85d5d"/><circle cx="2" cy="-78" r="3.2" fill="#e85d5d"/></g>`;
    const flowers = [[60, 372, '#f7b6c6'], [130, 385, '#f5c94a'], [210, 366, '#fff'], [330, 378, '#c9b3f0'], [410, 388, '#f7b6c6'], [500, 370, '#f5c94a'], [590, 382, '#fff'], [660, 368, '#f7b6c6'], [740, 380, '#c9b3f0'], [770, 366, '#f5c94a'], [270, 392, '#f5c94a'], [560, 394, '#c9b3f0']]
      .map(([x, y, c]) => `<g><path d="M${x} ${y}v9" stroke="#4f8a3f" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="4.2" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.6" fill="#f2a900"/></g>`)
      .join('');
    const tufts = [100, 240, 380, 470, 620, 720]
      .map((x, i) => `<path class="zs-tuft" style="--kd:${3 + (i % 3)}s" d="M${x} 396q-2-10-5-15M${x} 396q0-11 1-17M${x} 396q3-9 7-13" stroke="#3f7f35" stroke-width="2.2" fill="none" stroke-linecap="round"/>`)
      .join('');
    const stars = [[90, 40], [180, 90], [260, 30], [340, 70], [420, 36], [500, 84], [560, 28], [720, 60], [770, 120], [40, 110], [610, 130], [130, 150]]
      .map(([x, y], i) => `<circle class="zs-star" style="--kd:${2 + (i % 4)}s" cx="${x}" cy="${y}" r="${i % 3 ? 1.6 : 2.4}" fill="#fff"/>`)
      .join('');
    return (
      svgOpen +
      `<defs><linearGradient id="${p}far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d49a"/><stop offset="1" stop-color="#86bb74"/></linearGradient>` +
      `<linearGradient id="${p}mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fcc6c"/><stop offset="1" stop-color="#63a850"/></linearGradient>` +
      `<linearGradient id="${p}near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc15a"/><stop offset="1" stop-color="#4f9a45"/></linearGradient>` +
      `<radialGradient id="${p}can" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8fd16a"/><stop offset="1" stop-color="#3f8a3f"/></radialGradient>` +
      `<radialGradient id="${p}sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient></defs>` +
      `<g class="zs-stars">${stars}</g>` +
      `<g class="zs-sun"><circle cx="660" cy="92" r="64" fill="url(#${p}sun)"/><circle cx="660" cy="92" r="26" fill="#ffd56a"/></g>` +
      `<g class="zs-moon"><circle cx="660" cy="92" r="26" fill="#f4efc8"/><circle cx="650" cy="84" r="5" fill="#e1dcae"/><circle cx="672" cy="102" r="3.4" fill="#e1dcae"/></g>` +
      cloud(60, 70, 1.1, 90, -20) + cloud(300, 120, 0.8, 120, -70) +
      `<path d="M0 250C120 205 240 215 360 240S600 225 800 245V400H0z" fill="url(#${p}far)"/>` +
      tree(120, 262, 0.55) + tree(690, 258, 0.5) +
      `<path d="M0 300C160 268 300 300 450 284S680 268 800 296V400H0z" fill="url(#${p}mid)"/>` +
      tree(60, 312, 0.9) + tree(730, 308, 1) +
      `<path d="M0 335C140 318 260 345 400 332S660 318 800 338V400H0z" fill="url(#${p}near)"/>` +
      `<g transform="translate(330 372)"><path d="M-9 0c0-10 4-14 9-14s9 4 9 14z" fill="#e85d5d"/><circle cx="-3" cy="-8" r="1.8" fill="#fff"/><circle cx="3.5" cy="-5" r="1.4" fill="#fff"/><rect x="-3" y="0" width="6" height="8" rx="2" fill="#f4ead8"/></g>` +
      `<path d="M550 396c-3-14 6-22 20-22 12 0 18 8 16 22z" fill="#a9b3bd"/><path d="M558 382c5-5 13-6 19-3" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      flowers + tufts + '</svg>'
    );
  }

  const SCENES = { aquarium, meadow };
  function sceneSvg(kind, uidPrefix) {
    return (SCENES[kind] || aquarium)(String(uidPrefix || 'zs'));
  }
  function timeOfDay(d) {
    const h = (d || new Date()).getHours();
    return h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night';
  }

  window.EvridaArt = { petSvg, sceneSvg, timeOfDay, version: 1 };
})();