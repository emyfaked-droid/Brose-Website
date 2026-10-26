'use strict';
/* =====================================================================
   STICK-FIGURE ENGINE (shared by all films in this folder)
   Skeleton + IK, foot-locked walk planner, drawing helpers, test mode.
   Nothing here reads the clock or Math.random: the same t gives the same pixels.
   ===================================================================== */

const W = 720, H = 1280, FPS = 30;

// ---------------------------------------------------------------- math
const PI = Math.PI, TAU = 2 * PI, D2R = PI / 180;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const sstep = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
const s5 = x => x * x * x * (x * (x * 6 - 15) + 10);
const E = {
  io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  io2: x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,
  sine: x => -(Math.cos(PI * x) - 1) / 2,
  out: x => 1 - Math.pow(1 - x, 3),
  out2: x => 1 - (1 - x) * (1 - x),
  in2: x => x * x,
  s5,
  // in-out that overshoots slightly and settles with zero velocity
  over: (x, k = 4) => s5(x) + k * x * x * x * (1 - x) * (1 - x),
  overK: k => x => E.over(x, k),
  // anticipation + overshoot
  back: (x, c = 0.9) => {
    const c2 = c * 1.525;
    return x < .5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
                  : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
  },
};
// deterministic smooth noise in [-1, 1]
const nz = (t, s) => 0.5 * Math.sin(t * 1.31 + s * 12.99) + 0.3 * Math.sin(t * 2.17 + s * 78.23) + 0.2 * Math.sin(t * 3.73 + s * 37.72);
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 3D vectors: [x (screen right), d (depth, away from camera), z (up)]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const madd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const UP = [0, 0, 1];
const fwd = yaw => [Math.cos(yaw * D2R), Math.sin(yaw * D2R), 0];
const rgt = yaw => [Math.sin(yaw * D2R), -Math.cos(yaw * D2R), 0];

// two-bone IK: root A, target T, bone lengths a and b, pole point.
// Returns [joint, end] with the end clamped to what the limb can reach.
function ik2(A, Tg, a, b, pole) {
  const D = sub(Tg, A); const d = len(D);
  const dc = clamp(d, Math.abs(a - b) + 1e-3, (a + b) * 0.9999);
  const u = d > 1e-6 ? mul(D, 1 / d) : [0, 0, -1];
  const Pp = sub(pole, A);
  let v = sub(Pp, mul(u, dot(Pp, u)));
  if (len(v) < 1e-6) v = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  v = norm(v);
  const x = (a * a - b * b + dc * dc) / (2 * dc);
  const y = Math.sqrt(Math.max(0, a * a - x * x));
  return [add(A, add(mul(u, x), mul(v, y))), add(A, mul(u, dc))];
}
const smin = (a, b, k) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));

// ---------------------------------------------------------------- tracks
// Keyframed channel. Each segment eases from wherever the channel is at its
// start to a new value, so overlapping segments blend instead of popping.
class Track {
  constructor(v) { this.v0 = v; this.segs = []; }
  to(t0, t1, v, ease = E.io) { this.segs.push({ t0, t1, v, ease }); return this; }
  at(t) {
    let v = this.v0;
    for (const s of this.segs) {
      if (t <= s.t0) continue;
      const p = (t - s.t0) / (s.t1 - s.t0);
      v = p >= 1 ? s.v : lerp(v, s.v, s.ease(p));
    }
    return v;
  }
}

// Damped spring integrated on a fixed grid from t0, so the result depends
// only on t (memoised so playback stays cheap).
const SPR = {};
function spring(key, input, t, t0, freq, zeta) {
  if (t <= t0) return input(t0);
  const dt = 1 / 240, w = TAU * freq, N = Math.floor((t - t0) / dt);
  let c = SPR[key];
  if (!c || c.n > N || c.t0 !== t0) c = { t0, n: 0, x: input(t0), v: 0 };
  while (c.n < N) {
    const a = w * w * (input(t0 + c.n * dt) - c.x) - 2 * zeta * w * c.v;
    c.v += a * dt; c.x += c.v * dt; c.n++;
  }
  SPR[key] = c;
  return c.x;
}

// ---------------------------------------------------------------- skeleton
const DIM = {
  torso: 100, neck: 15, headR: 27,
  upper: 56, fore: 52,
  thigh: 82, shin: 80,
  ankleH: 7, heel: 5, toe: 18,          // ankle sits above a point 5px in front of the heel
  hipW: 7, shW: 12, footW: 8,
  limbW: 13, outline: 3.5,
};
const FL = DIM.heel + DIM.toe;           // heel-to-toe length
const LEG = DIM.thigh + DIM.shin;
const H0 = LEG + DIM.ankleH - 3;          // relaxed standing pelvis height
const LMAX = LEG * 0.995;

// Gait moods. L = step length (px), cad = steps per second.
// Walk speed is always L * cad, which keeps the planted foot locked.
//   ds      half stance in step lengths (0.6 = walking, double support; < 0.5 = running, with a flight phase)
//   elBase  elbow bend added while moving (deg); arm = shoulder swing; twist = shoulder counter-rotation
//   knee    how far the pelvis sits lower than standing (px); lean = forward lean at full speed (deg)
const MOOD = {
  walk:   { name: 'walk',   L: 118, cad: 1.95, lift: 11, bob: 5.5, up: 1.0, down: 1.0, arm: 17, elbow: 8, elBase: 6, landPitch: 17, heelOff: 30, knee: 3, lean: 2, twist: 4 },
  bouncy: { name: 'bouncy', L: 34, cad: 2.1, lift: 7, bob: 4, up: 1.1, down: 0.9, arm: 9, elbow: 6, elBase: 6, landPitch: 12, heelOff: 20, knee: 3, lean: 2, twist: 3 },
  back:   { name: 'back',   L: 34,  cad: 2.2, lift: 6, bob: 2.5, up: 1, down: 1, arm: 4, elbow: 3, elBase: 8, landPitch: -6, heelOff: 4, knee: 2, lean: -2, twist: 0, ta: 0.3, td: 0.35 },
  heavy:  { name: 'heavy',  L: 70,  cad: 1.45, lift: 5,  bob: 5.5, up: 0.45, down: 1.35, arm: 6, elbow: 6, elBase: 14, landPitch: 9, heelOff: 20, knee: 7, lean: 6, twist: 3, ta: 0.78, td: 0.86 },
  forced: { name: 'forced', L: 112, cad: 2.1, lift: 12, bob: 6.5, up: 1.1, down: 0.9, arm: 21, elbow: 9, elBase: 7, landPitch: 19, heelOff: 33, knee: 2, lean: 1, twist: 4, ta: 0.45, td: 0.55 },
  // normal run: long stride, ~40% flight, steady upright-ish lean, elbows ~90 deg with an even swing
  run:    { name: 'run',    L: 165, cad: 2.85, lift: 34, kick: 80, bob: 7, arm: 34, armBias: -7, elbow: 14, elBase: 70, landPitch: 8, heelOff: 42, knee: 10, lean: 14, twist: 6, ta: 0.55, td: 0.65, run: true, ds: 0.30, dsEdge: 0.5 },
  // easy jog (the look of the reference clip): shorter stride, more ground contact
  jog:    { name: 'jog',    L: 120, cad: 2.6,  lift: 30, kick: 62, bob: 6, arm: 27, armBias: -6, elbow: 12, elBase: 74, landPitch: 8, heelOff: 40, knee: 9, lean: 8, twist: 5, ta: 0.5, td: 0.6, run: true, ds: 0.36, dsEdge: 0.52 },
};
// pelvis height over one step: contact, down, passing, up
const BOB = [[0, 0], [0.13, -1], [0.45, 0.3], [0.72, 1]];
function bobCurve(q) {
  const n = BOB.length;
  let i = n - 1;
  for (let j = 0; j < n; j++) if (BOB[j][0] <= q) i = j;
  const k = (j) => BOB[((j % n) + n) % n];
  const q0 = BOB[i][0], q1 = i + 1 < n ? BOB[i + 1][0] : 1;
  const u = (q - q0) / (q1 - q0);
  const p0 = k(i - 1)[1], p1 = k(i)[1], p2 = k(i + 1)[1], p3 = k(i + 2)[1];
  const u2 = u * u, u3 = u2 * u;   // Catmull-Rom
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}

function mkPlant(t0, pos, yaw) {
  return { t0, t1: Infinity, pos, yaw, pitch: [{ from: -Infinity, fn: () => 0 }], swing: null };
}
const pitchOf = (pl, t) => { let f = pl.pitch[0].fn; for (const p of pl.pitch) if (p.from <= t) f = p.fn; return f(t); };

// foot on the floor: positive pitch = toe up, rolls on the heel;
// negative pitch = heel up, rolls on the toe
function groundFoot(pos, th, yaw) {
  const f = fwd(yaw), c = Math.cos(th * D2R), s = Math.sin(th * D2R);
  let heel, toe;
  if (th >= 0) { heel = [pos[0], pos[1], 0]; toe = [pos[0] + f[0] * FL * c, pos[1] + f[1] * FL * c, FL * s]; }
  else { toe = [pos[0] + f[0] * FL, pos[1] + f[1] * FL, 0]; heel = [toe[0] - f[0] * FL * c, toe[1] - f[1] * FL * c, -FL * s]; }
  return { heel, toe, ank: ankleFromHeel(heel, th, yaw), pitch: th, yaw };
}
function ankleFromHeel(heel, th, yaw) {
  const f = fwd(yaw), c = Math.cos(th * D2R), s = Math.sin(th * D2R);
  const a = DIM.heel * c - DIM.ankleH * s, z = DIM.heel * s + DIM.ankleH * c;
  return [heel[0] + f[0] * a, heel[1] + f[1] * a, heel[2] + z];
}
function heelFromAnkle(ank, th, yaw) {
  const f = fwd(yaw), c = Math.cos(th * D2R), s = Math.sin(th * D2R);
  const a = DIM.heel * c - DIM.ankleH * s, z = DIM.heel * s + DIM.ankleH * c;
  return [ank[0] - f[0] * a, ank[1] - f[1] * a, ank[2] - z];
}
const angLerp = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return a + d * t; };

class Fig {
  constructor(id, o) {
    this.id = id; this.seed = o.seed || 1; this.t0 = o.t0 || 0;
    const tr = this.tr = {};
    const defaults = {
      yaw: o.yaw, pf: 0, pl: 0, pz: 0, lean: 3, slump: 0, roll: 0, twist: 0,
      head: 0, headRoll: 0, shDrop: 0, breath: 1, dance: 0, laugh: 0, idle: 1, bounce: 0, settle: 1,
      ox: 0, od: 0,   // pelvis offset in world axes (skeleton units), e.g. a child being lifted
      roll2: 0,       // extra sideways roll of the upper spine only (lying on the side: roll -150, roll2 60)
      rollSh: 0,      // rotates the shoulder and hip lines with a sideways roll (lying on the side)
      dropL: 0, dropR: 0,   // pull one shoulder down (carrying something heavy)
      hyaw: 0, pant: 0,   // head yaw (deg, looking around) and fast breathing on top of the slow one (px, after a run)
      aSwL: 4, aOutL: 9, aElL: 12, aSwR: 4, aOutR: 9, aElR: 12,
    };
    for (const k in defaults) tr[k] = new Track(defaults[k]);
    this.goals = { L: [], R: [] };
    this.moves = [];
    // s scales the whole figure (children): the skeleton works in unscaled units and the finished pose is scaled
    // about the world origin, so planted feet stay exactly locked and strides shrink with the body
    this.s = o.s || 1;
    this.footGoals = { L: [], R: [] };
    const ox = o.x / this.s, od = o.d / this.s;
    this.root0 = [ox, od];
    const F = fwd(o.yaw), R = rgt(o.yaw);
    const foot = sg => [ox - F[0] * DIM.heel + R[0] * sg * DIM.footW, od - F[1] * DIM.heel + R[1] * sg * DIM.footW];
    this.plants = { L: [mkPlant(-Infinity, foot(-1), o.yaw)], R: [mkPlant(-Infinity, foot(1), o.yaw)] };
    this.cues = [];
    this.cup = o.cup || null;   // which hand holds a cup
  }
  // where the root (point on the floor under the pelvis) is
  rootAt(t) {
    let p = this.root0;
    for (const w of this.moves) { if (t < w.t0) break; const s = w.sAt(Math.min(t, w.t1)); p = [w.from[0] + w.dir[0] * s, w.from[1] + w.dir[1] * s]; }
    return p;
  }
  walkAt(t) {
    for (const w of this.moves) if (t >= w.t0 && t <= w.t1) return w;
    return null;
  }
  accAt(t) { const w = this.walkAt(t); return w ? w.acc(t) * (w.back ? -1 : 1) : 0; }
  toSkel(p) { return [p[0] / this.s, p[1] / this.s, p[2] / this.s]; }          // world -> skeleton units (for goal targets)
  worldRoot(t) { const r = this.rootAt(t); return [r[0] * this.s, r[1] * this.s]; }
  // pin a foot to a target (kneeling, stepping): fn(t) -> { ank:[x,d,z] skeleton units, pitch, yaw, lift }
  footGoal(side, fn) { const g = { w: new Track(0), fn }; this.footGoals[side].push(g); return g.w; }
  gaitW(t) { // 0..1, how much the figure is "in a walk" right now
    let g = 0;
    for (const w of this.moves) g = Math.max(g, sstep(w.t0 - 0.05, w.t0 + w.Ta * 0.8, t) * (1 - sstep(w.t1 - w.Td * 0.8, w.t1 + 0.1, t)));
    return g;
  }

  // Plan a walk from wherever the root is at t0 to `to`. Returns the end time.
  // opts.back: walk backwards (the body keeps facing the other way)
  walk(t0, to, m, lead = 'R', opts = {}) {
    to = [to[0] / this.s, to[1] / this.s];
    const back = !!opts.back;
    const from = this.rootAt(t0);
    const dx = to[0] - from[0], dd = to[1] - from[1], D = Math.hypot(dx, dd);
    const dir = [dx / D, dd / D], yaw = Math.atan2(dd, dx) / D2R + (back ? 180 : 0);
    const N = Math.max(2, Math.round(D / m.L));
    // a run shortens its first two and last two steps (getting going, braking); a walk keeps every step the same
    const shaped = !!m.run && N >= 4;
    const SF = k => k === 1 ? 0.62 : k === 2 ? 0.86 : k === N - 1 ? 0.8 : k === N ? 0.58 : 1;
    const L = shaped ? D / (N - 4 + 0.62 + 0.86 + 0.8 + 0.58) : D / N, v = L * m.cad;
    const Lk = k => shaped ? SF(clamp(k, 1, N)) * L : L;
    const PK = []; if (shaped) { PK[0] = 0; for (let k = 1; k <= N; k++) PK[k] = PK[k - 1] + Lk(k); }
    const Ta = m.ta ?? 0.95 / m.cad, Td = m.td ?? 1.05 / m.cad, Tt = D / v + (Ta + Td) / 2;
    // eased trapezoid speed profile (cosine ramps); s(t) is distance travelled
    const sAt = t => {
      const tau = t - t0;
      if (tau <= 0) return 0;
      if (tau >= Tt) return D;
      if (tau < Ta) return v * (tau / 2 - Ta / (2 * PI) * Math.sin(PI * tau / Ta));
      if (tau <= Tt - Td) return v * (Ta / 2 + tau - Ta);
      const r = Tt - tau;
      return D - v * (r / 2 - Td / (2 * PI) * Math.sin(PI * r / Td));
    };
    const acc = t => {
      const tau = t - t0;
      if (tau <= 0 || tau >= Tt) return 0;
      if (tau < Ta) return v * PI / (2 * Ta) * Math.sin(PI * tau / Ta);
      if (tau <= Tt - Td) return 0;
      return -v * PI / (2 * Td) * Math.sin(PI * (Tt - tau) / Td);
    };
    const tOf = s => { let a = t0, b = t0 + Tt; for (let i = 0; i < 50; i++) { const c = (a + b) / 2; if (sAt(c) < s) a = c; else b = c; } return (a + b) / 2; };
    const wk = { t0, t1: t0 + Tt, from, to, dir, yaw, D, L, N, v, Ta, Td, T: Tt, sAt, acc, tOf, m, lead, back };
    this.moves.push(wk);
    const yNow = this.tr.yaw.at(t0);
    const yTarget = yNow + (((yaw - yNow + 540) % 360) - 180);
    if (Math.abs(yTarget - yNow) > 0.5) this.tr.yaw.to(t0 - 0.1, t0 + 0.25, yTarget, E.io);
    wk.yaw = yTarget;
    const R = rgt(yTarget), F = fwd(yTarget);
    const hOff = back ? DIM.heel : -DIM.heel;      // the ankle sits 5px in front of the heel, along the FACING direction
    const heelAt = (P, side) => { const sg = side === 'R' ? 1 : -1; return [from[0] + dir[0] * (P + hOff) + R[0] * sg * DIM.footW, from[1] + dir[1] * (P + hOff) + R[1] * sg * DIM.footW]; };
    // stance pitch from where the pelvis is relative to the foot (r): heel strike rolls flat, then the heel peels off
    const rPitch = (P, rl, lp, ds = 0.6, Ls = L) => t => {
      const r = sAt(t) - P; let th = 0;
      if (rl !== null) th += lp * (1 - sstep(rl, rl + 0.2 * Ls * ds / 0.6, r));
      th -= m.heelOff * Math.pow(sstep(0.1 * ds * Ls, ds * Ls, r), 1.5);
      return th;
    };
    for (const side of ['L', 'R']) {
      const cur = this.plants[side][this.plants[side].length - 1];
      const P = (cur.pos[0] - from[0]) * dir[0] + (cur.pos[1] - from[1]) * dir[1] - hOff;
      cur.pitch.push({ from: t0, fn: rPitch(P, null, 0) });
    }
    const trail = lead === 'R' ? 'L' : 'R';
    const steps = [];
    // half stance per step: walk-like at the start and end of the move, the mood's own in the middle (a run only leaves the ground in between)
    const ds0 = m.ds ?? 0.6;
    const dsK = k => lerp(m.dsEdge ?? 0.6, ds0, clamp(Math.min(k - 1, N - k)));
    for (let k = 1; k <= N; k++) {
      const ds = dsK(k);
      if (shaped) steps.push({ side: k % 2 ? lead : trail, P: PK[k], ds, Ls: Lk(k), sLand: PK[k] - ds * Lk(k), sLift: k === 1 ? 0.02 * Lk(1) : PK[k - 2] + (k > 2 ? dsK(k - 2) : 0.6) * Lk(Math.max(1, k - 2)), close: false });
      else steps.push({ side: k % 2 ? lead : trail, P: k * L, ds, sLand: (k - ds) * L, sLift: k === 1 ? 0.02 * L : (k - 2 + (k > 2 ? dsK(k - 2) : 0.6)) * L, close: false });
    }
    steps.push({ side: N % 2 ? trail : lead, P: D, sLand: D, sLift: D - 0.4 * Lk(N), close: true });
    if (shaped) {
      // step phase from the real footfalls: k at the k-th heel contact (equals s / L + ds for even steps)
      const sc = k => k < 1 ? PK[1] - dsK(1) * Lk(1) - (1 - k) * Lk(1) : k > N ? PK[N] - dsK(N) * Lk(N) + (k - N) * Lk(N) : PK[k] - dsK(k) * Lk(k);
      wk.cphase = s => { let k = 0; while (k < N + 3 && sc(k + 1) <= s) k++; return k + (s - sc(k)) / (sc(k + 1) - sc(k)); };
    }
    for (const st of steps) {
      const tl = tOf(st.sLift), ta = st.close ? t0 + Tt - 0.04 : tOf(st.sLand);
      const list = this.plants[st.side], prev = list[list.length - 1];
      prev.t1 = tl;
      const np = mkPlant(ta, heelAt(st.P, st.side), yTarget);
      if (st.close) { const lp = m.landPitch * 0.35; np.pitch = [{ from: -Infinity, fn: t => lp * (1 - sstep(ta, ta + 0.16, t)) }]; }
      else np.pitch = [{ from: -Infinity, fn: rPitch(st.P, st.sLand - st.P, m.landPitch, st.ds, st.Ls ?? L) }];
      np.swing = { h: m.lift * (st.close ? 0.55 : 1) };
      if (m.run && !st.close) { np.swing.run = clamp((0.6 - st.ds) / (0.6 - m.ds)); np.swing.kick = m.kick; }
      list.push(np);
      this.cues.push({ t: ta, type: st.close ? 'settle' : 'step', fig: this.id, side: st.side, mood: m.name });
    }
    return wk.t1;
  }

  // A walk that changes gait on the way: the first n1 steps in mood m1 (e.g. one slow heavy step), the rest in m2.
  // The speed eases from m1's to m2's over the next step, and bob, posture and arm swing blend with it.
  // Every step is still planned from the distance travelled, so the planted feet stay locked.
  walkMix(t0, to, m1, n1, m2, lead = 'R') {
    to = [to[0] / this.s, to[1] / this.s];
    const from = this.rootAt(t0);
    const dx = to[0] - from[0], dd = to[1] - from[1], D = Math.hypot(dx, dd);
    const dir = [dx / D, dd / D], yaw = Math.atan2(dd, dx) / D2R;
    const L1 = m1.L, N2 = Math.max(2, Math.round((D - n1 * L1) / m2.L)), L2 = (D - n1 * L1) / N2, N = n1 + N2;
    const Lk = k => k <= n1 ? L1 : L2, Mk = k => k <= n1 ? m1 : m2;
    const Pk = k => k <= 0 ? 0 : k <= n1 ? k * L1 : n1 * L1 + (k - n1) * L2;
    const v1 = L1 * m1.cad, v2 = L2 * m2.cad;
    const Ta = m1.ta ?? 0.95 / m1.cad, Tb = 0.9 / m2.cad;
    const sB = Pk(n1) - 0.45 * L1;                 // the speed starts to build just after the last m1 step lands
    // speed profile: ease up to v1, hold, ease v1 -> v2, hold; tabulated, then an exact cosine stop at D
    const dt = 1 / 1200, S = [0], V = [0], Td0 = m2.td ?? 1.05 / m2.cad;
    let tb = null, tdec = null, Td = Td0;
    for (let i = 0; i < 400000 && tdec === null; i++) {
      const tau = (i + 1) * dt, s = S[i];
      if (tb === null && s >= sB && tau >= Ta) tb = tau;
      let v = tb === null ? v1 * (1 - Math.cos(PI * clamp(tau / Ta))) / 2 : lerp(v1, v2, (1 - Math.cos(PI * clamp((tau - tb) / Tb))) / 2);
      S.push(s + (V[i] + v) / 2 * dt); V.push(v);
      if (tb !== null && tau >= tb + Tb && S[i + 1] >= D - v2 * Td0 / 2) { tdec = tau; Td = 2 * (D - S[i + 1]) / v2; }
    }
    const Tt = tdec + Td;
    const sAt = t => {
      const tau = t - t0;
      if (tau <= 0) return 0;
      if (tau >= Tt) return D;
      if (tau < tdec) { const f = tau / dt, i = Math.floor(f); return lerp(S[i], S[i + 1], f - i); }
      const r = Tt - tau;
      return D - v2 * (r / 2 - Td / (2 * PI) * Math.sin(PI * r / Td));
    };
    const acc = t => {
      const tau = t - t0;
      if (tau <= 0 || tau >= Tt) return 0;
      if (tau < tdec) { const i = Math.min(V.length - 2, Math.floor(tau / dt)); return (V[i + 1] - V[i]) / dt; }
      return -v2 * PI / (2 * Td) * Math.sin(PI * (Tt - tau) / Td);
    };
    const tOf = s => { let a = t0, b = t0 + Tt; for (let i = 0; i < 50; i++) { const c = (a + b) / 2; if (sAt(c) < s) a = c; else b = c; } return (a + b) / 2; };
    // mood blend over the switch
    const tB = t0 + tb, keys = Object.keys(m2).filter(k => typeof m2[k] === 'number');
    const mAt = t => {
      const b = (1 - Math.cos(PI * inv(tB, tB + Tb, t))) / 2;
      if (b >= 1) return m2;
      const m = { ...m2, name: b < 0.5 ? m1.name : m2.name };
      for (const k of keys) m[k] = lerp(m1[k] ?? m2[k], m2[k], b);
      return m;
    };
    // step phase for the bob: 0 at each heel contact
    const sc = k => k <= 0 ? -0.6 * L1 : k <= N ? Pk(k) - 0.6 * Lk(k) : Pk(N) - 0.6 * L2 + (k - N) * L2;
    const phase = s => { let k = 0; while (k < N + 4 && sc(k + 1) <= s) k++; return clamp((s - sc(k)) / (sc(k + 1) - sc(k)), 0, 0.9999); };
    const wk = { t0, t1: t0 + Tt, from, to, dir, yaw, D, L: L2, N, v: v2, Ta, Td, T: Tt, sAt, acc, tOf, m: m2, mAt, phase, lead, back: false };
    this.moves.push(wk);
    const yNow = this.tr.yaw.at(t0);
    const yTarget = yNow + (((yaw - yNow + 540) % 360) - 180);
    if (Math.abs(yTarget - yNow) > 0.5) this.tr.yaw.to(t0 - 0.1, t0 + 0.25, yTarget, E.io);
    wk.yaw = yTarget;
    const R = rgt(yTarget), hOff = -DIM.heel;
    const heelAt = (P, side) => { const sg = side === 'R' ? 1 : -1; return [from[0] + dir[0] * (P + hOff) + R[0] * sg * DIM.footW, from[1] + dir[1] * (P + hOff) + R[1] * sg * DIM.footW]; };
    const rPitch = (P, rl, lp, L, m) => t => {
      const r = sAt(t) - P; let th = 0;
      if (rl !== null) th += lp * (1 - sstep(rl, rl + 0.2 * L, r));
      th -= m.heelOff * Math.pow(sstep(0.06 * L, 0.6 * L, r), 1.5);
      return th;
    };
    for (const side of ['L', 'R']) {
      const cur = this.plants[side][this.plants[side].length - 1];
      const P = (cur.pos[0] - from[0]) * dir[0] + (cur.pos[1] - from[1]) * dir[1] - hOff;
      cur.pitch.push({ from: t0, fn: rPitch(P, null, 0, L1, m1) });
    }
    const trail = lead === 'R' ? 'L' : 'R';
    const steps = [];
    for (let k = 1; k <= N; k++) steps.push({ k, side: k % 2 ? lead : trail, P: Pk(k), sLand: Pk(k) - 0.6 * Lk(k), sLift: k === 1 ? 0.02 * L1 : Pk(k - 2) + 0.6 * Lk(k), close: false });
    steps.push({ k: N + 1, side: N % 2 ? trail : lead, P: D, sLand: D, sLift: D - 0.4 * L2, close: true });
    for (const st of steps) {
      const m = Mk(Math.min(st.k, N)), L = Lk(Math.min(st.k, N));
      const tl = tOf(st.sLift), ta = st.close ? t0 + Tt - 0.04 : tOf(st.sLand);
      const list = this.plants[st.side], prev = list[list.length - 1];
      prev.t1 = tl;
      const np = mkPlant(ta, heelAt(st.P, st.side), yTarget);
      if (st.close) { const lp = m.landPitch * 0.35; np.pitch = [{ from: -Infinity, fn: t => lp * (1 - sstep(ta, ta + 0.16, t)) }]; }
      else np.pitch = [{ from: -Infinity, fn: rPitch(st.P, st.sLand - st.P, m.landPitch, L, m) }];
      np.swing = { h: m.lift * (st.close ? 0.55 : 1) };
      list.push(np);
      this.cues.push({ t: ta, type: st.close ? 'settle' : 'step', fig: this.id, side: st.side, mood: m.name });
    }
    return wk.t1;
  }

  // turn on the spot with small shuffle steps (no foot ever slides)
  turn(t0, t1, yawTo, o = {}) {
    const y0 = this.tr.yaw.at(t0), dy = yawTo - y0;
    this.tr.yaw.to(t0, t1, yawTo, o.ease || E.over);
    const n = o.steps || Math.max(2, Math.ceil(Math.abs(dy) / 70) + 1);
    const root = this.rootAt(t0);
    const first = o.first || (dy > 0 ? 'L' : 'R');
    const sl = (t1 - t0) / n;
    for (let j = 1; j <= n; j++) {
      const side = j % 2 ? first : (first === 'L' ? 'R' : 'L');
      const yj = y0 + dy * Math.min(1, j / (n - 1));
      const F = fwd(yj), R = rgt(yj), sg = side === 'R' ? 1 : -1;
      const pos = [root[0] - F[0] * DIM.heel + R[0] * sg * DIM.footW, root[1] - F[1] * DIM.heel + R[1] * sg * DIM.footW];
      const tl = t0 + (j - 1) * sl + sl * 0.04, ta = t0 + j * sl - sl * 0.1;
      const list = this.plants[side], prev = list[list.length - 1];
      prev.t1 = tl;
      const np = mkPlant(ta, pos, yj);
      np.pitch = [{ from: -Infinity, fn: t => 5 * (1 - sstep(ta, ta + 0.12, t)) }];
      np.swing = { h: o.lift || 6 };
      list.push(np);
      this.cues.push({ t: ta, type: 'shuffle', fig: this.id, side, mood: o.mood || 'shuffle' });
    }
  }

  footAt(side, t) {
    const P = this.plants[side];
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      if (t < p.t0) return this.swingFoot(P[i - 1], p, t);
      if (t <= p.t1) { const g = groundFoot(p.pos, pitchOf(p, t), p.yaw); g.planted = true; g.u = 1; g.plant = p; return g; }
    }
  }
  swingFoot(a, b, t) {
    if (b.swing.run) return this.runSwing(a, b, t);
    const A = groundFoot(a.pos, pitchOf(a, a.t1), a.yaw), B = groundFoot(b.pos, pitchOf(b, b.t0), b.yaw);
    const u = inv(a.t1, b.t0, t), e = E.sine(u);
    const th = u < 0.5 ? lerp(A.pitch, 3, E.out2(u / 0.5)) : lerp(3, B.pitch, E.in2((u - 0.5) / 0.5));
    const yaw = angLerp(a.yaw, b.yaw, e);
    const lift = b.swing.h * Math.sin(PI * Math.pow(u, 0.72));
    let ank = lerp3(A.ank, B.ank, e); ank[2] += lift;
    let heel = heelFromAnkle(ank, th, yaw);
    const f = fwd(yaw), c = Math.cos(th * D2R), s = Math.sin(th * D2R);
    let toe = [heel[0] + f[0] * FL * c, heel[1] + f[1] * FL * c, heel[2] + FL * s];
    const lo = Math.min(heel[2], toe[2]);
    if (lo < 0) { heel[2] -= lo; toe[2] -= lo; ank[2] -= lo; }
    return { heel, toe, ank, pitch: th, yaw, planted: false, u };
  }
  // Running swing: after the toe-off the foot lags behind and the heel kicks up toward the seat, then the knee drives
  // forward and the shin reaches out and comes down onto the next footfall. r blends from the walk swing (the
  // walk-like first and last steps of a run) to the full running swing.
  runSwing(a, b, t) {
    const A = groundFoot(a.pos, pitchOf(a, a.t1), a.yaw), B = groundFoot(b.pos, pitchOf(b, b.t0), b.yaw);
    const u = inv(a.t1, b.t0, t), r = b.swing.run;
    const e = lerp(E.sine(u), E.sine(Math.pow(u, 1.4)), r);               // the foot lingers behind, then swings through
    const thW = u < 0.5 ? lerp(A.pitch, 3, E.out2(u / 0.5)) : lerp(3, B.pitch, E.in2((u - 0.5) / 0.5));
    const thR = u < 0.35 ? lerp(A.pitch, -48, E.io(u / 0.35)) : u < 0.82 ? lerp(-48, 14, E.io((u - 0.35) / 0.47)) : lerp(14, B.pitch, E.io((u - 0.82) / 0.18));
    const th = lerp(thW, thR, r);
    const yaw = angLerp(a.yaw, b.yaw, E.sine(u));
    const liftW = b.swing.h * Math.sin(PI * Math.pow(u, 0.72));
    // height: the heel comes up quickly after the toe-off (Hermite rise, highest at 38% of the swing), held while the
    // foot passes under the body, then a soft drop onto the heel
    const x = u / 0.38;
    const liftR = b.swing.kick * (u < 0.38 ? 0.91 * x + 1.18 * x * x - 1.09 * x * x * x : (1 + Math.cos(PI * Math.pow((u - 0.38) / 0.62, 1.6))) / 2);
    let ank = lerp3(A.ank, B.ank, e); ank[2] += lerp(liftW, liftR, r);
    let heel = heelFromAnkle(ank, th, yaw);
    const f = fwd(yaw), c = Math.cos(th * D2R), s = Math.sin(th * D2R);
    let toe = [heel[0] + f[0] * FL * c, heel[1] + f[1] * FL * c, heel[2] + FL * s];
    const lo = Math.min(heel[2], toe[2]);
    if (lo < 0) { heel[2] -= lo; toe[2] -= lo; ank[2] -= lo; }
    return { heel, toe, ank, pitch: th, yaw, planted: false, u };
  }
  legFwd(side, t) { // how far ahead of the pelvis this foot is, about -1..1
    const w = this.walkAt(t) || null;
    const r = this.rootAt(t), F = fwd(this.tr.yaw.at(t)), a = this.footAt(side, t).ank;
    const n = w ? 0.6 * w.L : 40;
    return clamp(((a[0] - r[0]) * F[0] + (a[1] - r[1]) * F[1]) / n, -1.4, 1.4);
  }

  // fig.warp = t => t' freezes or retimes the figure's own motion (breathing keeps the real time)
  // skipGoals: leave the arm goals out (two figures that read each other's pose, e.g. a hug, would recurse)
  pose(t, skipGoals = false) {
    const tReal = t;
    if (this.warp) t = this.warp(t);
    const tr = this.tr, sd = this.seed, J = {};
    const yaw = tr.yaw.at(t), F = fwd(yaw), R = rgt(yaw);
    J.F = F; J.R = R; J.yaw = yaw;
    const root = this.rootAt(t);
    const wk = this.walkAt(t), gw = this.gaitW(t);
    const wm = wk ? (wk.mAt ? wk.mAt(t) : wk.m) : null;   // the walk's mood (a blend while walkMix switches gait)
    const feet = { L: this.footAt('L', t), R: this.footAt('R', t) };
    for (const side of ['L', 'R']) for (const g of this.footGoals[side]) {
      const w = g.w.at(t);
      if (w <= 0) continue;
      const tg = g.fn(t), ft = feet[side];
      const ank = lerp3(ft.ank, tg.ank, w), th = lerp(ft.pitch, tg.pitch ?? 0, w), yw = angLerp(ft.yaw, tg.yaw ?? ft.yaw, w);
      ank[2] += (tg.lift || 0) * Math.sin(PI * w);
      const heel = heelFromAnkle(ank, th, yw), f = fwd(yw), cc = Math.cos(th * D2R), sn = Math.sin(th * D2R);
      const toe = [heel[0] + f[0] * FL * cc, heel[1] + f[1] * FL * cc, heel[2] + FL * sn];
      const lo = Math.min(heel[2], toe[2]);
      if (lo < 0) { heel[2] -= lo; toe[2] -= lo; ank[2] -= lo; }
      // knee direction: blends from what the foot had (an earlier goal's kyaw / kdir) to this goal's, never jumps
      const kyFrom = ft.kyaw === undefined ? undefined : ft.kyaw;
      const kyaw = tg.kyaw !== undefined ? angLerp(kyFrom ?? ft.yaw, tg.kyaw, w) : kyFrom === undefined ? undefined : angLerp(kyFrom, angLerp(yaw, yw, 0.5), w);
      let kdir = tg.kdir, kw = w;
      if (ft.kdir && tg.kdir) { kdir = lerp3(norm(ft.kdir), norm(tg.kdir), w); kw = lerp(ft.kw, 1, w); }
      else if (ft.kdir) { kdir = ft.kdir; kw = ft.kw * (1 - w); }
      feet[side] = { heel, toe, ank, pitch: th, yaw: yw, kyaw, planted: w >= 1, u: w >= 1 ? 1 : w * 0.7, plant: g, kdir, kw };
    }
    J.feet = feet;

    const idle = tr.idle.at(t), dance = tr.dance.at(t), lg = tr.laugh.at(t);
    const beat = t * 2;                               // party music is 120 bpm
    let pf = tr.pf.at(t) + idle * 1.4 * nz(t * 0.6, sd);
    let pl = tr.pl.at(t) + idle * 1.6 * nz(t * 0.45, sd + 3) + dance * 4.2 * Math.sin(PI * beat + sd);
    let pz = tr.pz.at(t) - dance * 3.4 * (1 - Math.cos(TAU * beat + sd * 0.2)) / 2 - lg * 2;
    pz += tr.bounce.at(t) * 3 * Math.sin(TAU * 2.2 * t);
    let bob = 0;
    if (wk) {
      const m = wm, s = wk.sAt(t), L = wk.L;
      const ws = sstep(0, 0.5 * L, s) * (1 - sstep(wk.D - 0.55 * L, wk.D, s));
      if (m.run) {
        // running: the pelvis is lowest in mid-stance and highest in mid-flight
        const q = wk.cphase ? (wk.cphase(s) % 1 + 1) % 1 : (((s + m.ds * L) / L) % 1 + 1) % 1;
        bob = -m.bob * Math.cos(TAU * (q - m.ds)) * ws;
      } else {
        const q = wk.phase ? wk.phase(s) : (((s + 0.6 * L) / L) % 1 + 1) % 1;
        const b = bobCurve(q);
        bob = m.bob * (b > 0 ? b * m.up : b * m.down) * ws;
      }
      // weight shifts toward the stance foot
      const swingSide = !feet.L.planted ? -1 : !feet.R.planted ? 1 : 0;
      const sw = swingSide ? Math.sin(PI * (swingSide < 0 ? feet.L.u : feet.R.u)) : 0;
      pl += -swingSide * 2.4 * sw;
    }
    if (gw > 0) pz += bob - (wk ? wm.knee : 0) * gw;
    let br = Math.sin(TAU * tReal / 3.6 + sd) * tr.breath.at(t);
    const pant = tr.pant.at(t);
    if (pant) br += pant * Math.sin(TAU * tReal / 0.68 + sd);          // out of breath: quick, deep breaths

    let Pv = [root[0] + F[0] * pf + R[0] * pl + tr.ox.at(t), root[1] + F[1] * pf + R[1] * pl + tr.od.at(t), H0 + pz + br * 0.6];
    // hip rotation in the walk: the swinging leg's hip comes forward
    const fl = { L: gw > 0 ? this.legFwd('L', t) : 0, R: gw > 0 ? this.legFwd('R', t) : 0 };
    // a sideways roll (lying on the side) turns the hip and shoulder lines with the body
    const rs = tr.rollSh.at(t) * D2R;
    const Rh = rs ? norm(add(mul(R, Math.cos(rs)), [0, 0, -Math.sin(rs)])) : R;
    const hipOf = (side, P) => { const sg = side === 'R' ? 1 : -1; return add(add(P, mul(Rh, sg * DIM.hipW)), mul(F, 2.6 * fl[side] * gw)); };
    // never let the pelvis rise above what the planted legs can reach
    for (const side of ['L', 'R']) {
      const ft = feet[side], wgt = ft.planted ? 1 : sstep(0.72, 1, ft.u);
      if (wgt <= 0) continue;
      const hp = hipOf(side, Pv), h = Math.hypot(hp[0] - ft.ank[0], hp[1] - ft.ank[1]);
      const zmax = ft.ank[2] + Math.sqrt(Math.max(0, LMAX * LMAX - h * h));
      Pv[2] = lerp(Pv[2], smin(Pv[2], zmax, 2.5), wgt);
    }
    J.P = Pv;
    // legs
    J.hip = {}; J.knee = {}; J.ank = {}; J.toe = {}; J.heel = {};
    for (const side of ['L', 'R']) {
      const sg = side === 'R' ? 1 : -1, hp = hipOf(side, Pv), ft = feet[side];
      // knees point between where the body and the foot face (angular mean, never cancels out)
      const ky = ft.kyaw === undefined ? angLerp(yaw, ft.yaw, 0.5) : ft.kyaw;
      const kF = fwd(ky), kR = rgt(ky);
      let pole = add(add(hp, mul(kF, 140)), add(mul(kR, sg * 18), [0, 0, -25]));
      if (ft.kdir) pole = lerp3(pole, add(hp, mul(norm(ft.kdir), 140)), ft.kw);   // e.g. knees up when sitting on the floor
      const [kn, an] = ik2(hp, ft.ank, DIM.thigh, DIM.shin, pole);
      const off = sub(an, ft.ank);
      J.hip[side] = hp; J.knee[side] = kn; J.ank[side] = an; J.toe[side] = add(ft.toe, off); J.heel[side] = add(ft.heel, off);
    }

    // spine
    // lean into acceleration, rock back when braking (with a little overshoot), and lean forward with speed
    const spd = wk ? clamp((wk.sAt(t + 0.012) - wk.sAt(t - 0.012)) / 0.024 / wk.v, 0, 1.15) : 0;
    const sec = spring(this.id + ':lean', τ => this.accAt(τ) * 0.012, t, this.t0, 1.7, 0.42);
    const lean = (tr.lean.at(t) + (wk ? wm.lean : 0) * spd + sec * tr.settle.at(t) - lg * 6 + idle * 0.8 * nz(t * 0.5, sd + 7)) * D2R;
    const slump = tr.slump.at(t) * D2R;
    const roll = (tr.roll.at(t) + dance * 2.6 * Math.sin(PI * beat + sd + 0.4)) * D2R;
    const sdir = (p, r, FF = F, RR = R) => norm(add(add(mul(FF, Math.sin(p)), mul(RR, Math.sin(r))), [0, 0, Math.cos(p) * Math.cos(r)]));
    const C = madd(Pv, sdir(lean * 0.6, roll * 0.6), DIM.torso * 0.5);
    const twist = tr.twist.at(t) - (fl.L - fl.R) * (wk ? wm.twist : 4) * gw;      // shoulders counter-rotate against the hips
    const Ft = fwd(yaw + twist), Rt = rgt(yaw + twist);
    const shake = Math.sin(TAU * 8.5 * t + sd) * lg;
    let N = madd(C, sdir(lean + slump, roll + tr.roll2.at(t) * D2R, Ft, Rt), DIM.torso * 0.5 + br * 0.9);
    N[2] += shake * 2.6;
    J.C = C; J.N = N; J.Ft = Ft; J.Rt = Rt;

    // neck and head: the head counters the torso so it stays steadier than the body
    const hp = (tr.head.at(t) + dance * 2.5 * Math.sin(TAU * beat + 0.8) - lg * 13 + shake * 1.5) * D2R;
    const hr = (tr.headRoll.at(t) + dance * 2 * Math.sin(PI * beat + sd + 1.2)) * D2R;
    let NT = sub(madd(N, sdir((lean + slump) * 0.5 + hp * 0.5, roll * 0.5 + hr * 0.5, Ft, Rt), DIM.neck), [0, 0, bob * 0.3]);
    let Hc = madd(NT, sdir((lean + slump) * 0.3 + hp, roll * 0.3 + hr, Ft, Rt), DIM.headR * 0.9);
    const hy = tr.hyaw.at(t) * D2R;
    if (hy) {
      // head yaw (looking around): what the head's own pitch and roll add to the neck and head turns about the vertical
      const NT0 = sub(madd(N, sdir((lean + slump) * 0.5, roll * 0.5, Ft, Rt), DIM.neck), [0, 0, bob * 0.3]);
      const Hc0 = madd(NT0, sdir((lean + slump) * 0.3, roll * 0.3, Ft, Rt), DIM.headR * 0.9);
      const c = Math.cos(hy), sn = Math.sin(hy), rz = v => [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c, v[2]];
      const hd = sub(sub(Hc, NT), sub(Hc0, NT0));           // the head's own tilt, relative to the neck
      NT = add(NT0, rz(sub(NT, NT0)));
      Hc = add(add(NT, sub(Hc0, NT0)), rz(hd));
    }
    J.NT = NT; J.Hc = Hc; J.hp = hp;

    // arms
    J.sh = {}; J.el = {}; J.hand = {};
    const shDrop = tr.shDrop.at(t);
    for (const side of ['L', 'R']) {
      const sg = side === 'R' ? 1 : -1, S = side;
      const Rts = rs ? norm(add(mul(Rt, Math.cos(rs)), [0, 0, -Math.sin(rs)])) : Rt;
      let sh = add(add(N, mul(Rts, sg * DIM.shW)), [0, 0, -4 - shDrop - tr['drop' + S].at(t) + br * 1.1 + shake * 0.8]);
      sh = madd(sh, Ft, shDrop * 0.7);
      let sw = tr['aSw' + S].at(t), out = tr['aOut' + S].at(t), el = tr['aEl' + S].at(t);
      sw += dance * 3 * Math.sin(PI * beat + sd + sg);
      if (gw > 0 && wk && wm.run) {
        // running: one even sine swing, tied to the stride phase (0 = the lead-side foot touches down)
        const th = PI * ((wk.cphase ? wk.cphase(wk.sAt(t)) : wk.sAt(t) / wk.L + wm.ds) - 1), sgn = side === wk.lead ? 1 : -1;
        const ph = -sgn * Math.cos(th - 0.25);                 // +1 = this arm fully forward
        sw += (wm.arm * ph + wm.armBias) * gw;               // arms swing a little further back than forward
        el += (wm.elBase + wm.elbow * ph) * gw;
      } else if (gw > 0 && wk) {
        const lag1 = this.legFwd(side, t - 0.07), lag2 = this.legFwd(side, t - 0.15);
        sw += -wm.arm * lag1 * gw;
        el += (wm.elBase + wm.elbow * (0.45 + 0.55 * clamp(-lag2, -1, 1))) * gw;
      }
      sw *= D2R; out *= D2R; el *= D2R;
      const ud = norm(add(add(mul(Ft, Math.sin(sw) * Math.cos(out)), mul(Rt, sg * Math.sin(out))), [0, 0, -Math.cos(sw) * Math.cos(out)]));
      let wv = sub(Ft, mul(ud, dot(Ft, ud)));
      wv = len(wv) < 1e-4 ? [0, 0, 1] : norm(wv);
      const fd = add(mul(ud, Math.cos(el)), mul(wv, Math.sin(el)));
      const Efk = madd(sh, ud, DIM.upper), Hfk = madd(Efk, fd, DIM.fore);
      J.sh[side] = sh;
      let target = Hfk;
      let pole = add(add(Efk, mul(norm(sub(Efk, lerp3(sh, Hfk, 0.5))), 40)), add(mul(Ft, -12), mul(Rt, sg * 10)));
      for (const g of skipGoals ? [] : this.goals[side]) {
        const gwt = g.w.at(t);
        if (gwt <= 0) continue;
        target = lerp3(target, g.fn(t, J), gwt);
        if (g.pole) pole = lerp3(pole, g.pole(t, J), gwt);
      }
      const [E1, H1] = ik2(sh, target, DIM.upper, DIM.fore, pole);
      J.sh[side] = sh; J.el[side] = E1; J.hand[side] = H1;
    }
    if (this.s !== 1) {
      const s = this.s, sc = v => [v[0] * s, v[1] * s, v[2] * s];
      for (const k of ['P', 'C', 'N', 'NT', 'Hc']) J[k] = sc(J[k]);
      for (const k of ['hip', 'knee', 'ank', 'toe', 'heel', 'sh', 'el', 'hand']) for (const sd of ['L', 'R']) J[k][sd] = sc(J[k][sd]);
      const nf = {};
      for (const sd of ['L', 'R']) { const f = J.feet[sd]; nf[sd] = { ...f, ank: sc(f.ank), heel: sc(f.heel), toe: sc(f.toe) }; }
      J.feet = nf;
    }
    return J;
  }
  goal(side, fn, pole) { const g = { w: new Track(0), fn, pole }; this.goals[side].push(g); return g.w; }
}

// ---------------------------------------------------------------- camera
const cam = { x: 360, zoom: 1.15, hy: 700, h: 270, D0: 900 };
let MIRROR = false;
function P(p) {
  const k = cam.zoom * cam.D0 / (cam.D0 + p[1]);
  const z = MIRROR ? -p[2] : p[2];
  return [W / 2 + (p[0] - cam.x) * k, cam.hy + (cam.h - z) * k, k];
}

// ---------------------------------------------------------------- drawing
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const off = document.createElement('canvas'); off.width = W / 2; off.height = H / 2;   // reflections: half res
const octx = off.getContext('2d');
const soft = document.createElement('canvas'); soft.width = W / 4; soft.height = H / 4;  // light shafts / glows: quarter res
const sctx = soft.getContext('2d');
// Draw something heavily blurred (light shafts, pools) cheaply at quarter resolution.
function softLayer(blur, op, fn) {
  sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.clearRect(0, 0, soft.width, soft.height);
  sctx.setTransform(0.25, 0, 0, 0.25, 0, 0); sctx.filter = `blur(${blur / 4}px)`;
  fn(sctx);
  sctx.filter = 'none';
  ctx.save(); ctx.globalCompositeOperation = op; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(soft, 0, 0, W, H); ctx.restore();
}
const INK = '#060606';
let FSCALE = 1;                        // scale of the figure being drawn (children)
const OL = () => DIM.outline * Math.max(FSCALE, 0.7);
const FIG_FAR = [168, 168, 170], FIG_NEAR = [246, 246, 244];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function strokeLimb(c, pts, col, k, curve) {
  const pp = pts.map(P);
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(pp[0][0], pp[0][1]);
  if (curve) {   // torso: quadratic through the chest point
    const [a, m, b] = pp;
    c.quadraticCurveTo(2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2, b[0], b[1]);
    for (let i = 3; i < pp.length; i++) c.lineTo(pp[i][0], pp[i][1]);
  } else for (let i = 1; i < pp.length; i++) c.lineTo(pp[i][0], pp[i][1]);
  c.strokeStyle = INK; c.lineWidth = (DIM.limbW * FSCALE + 2 * OL()) * k; c.stroke();
  c.strokeStyle = col; c.lineWidth = DIM.limbW * FSCALE * k; c.stroke();
}
// torso (curved through the chest) + one leg as a single shape: both outlines first, then both fills
function strokeBody(c, torso, legs, col) {
  const tp = torso.map(P), lps = legs.map(l => l.map(P)), k = tp[0][2];
  const path = () => {
    c.beginPath();
    const [a, m, b] = tp;
    c.moveTo(a[0], a[1]);
    c.quadraticCurveTo(2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2, b[0], b[1]);
    for (let i = 3; i < tp.length; i++) c.lineTo(tp[i][0], tp[i][1]);
    for (const lp of lps) {
      c.moveTo(lp[0][0], lp[0][1]);
      for (let i = 1; i < lp.length; i++) c.lineTo(lp[i][0], lp[i][1]);
    }
  };
  c.lineCap = 'round'; c.lineJoin = 'round';
  path(); c.strokeStyle = INK; c.lineWidth = (DIM.limbW * FSCALE + 2 * OL()) * k; c.stroke();
  path(); c.strokeStyle = col; c.lineWidth = DIM.limbW * FSCALE * k; c.stroke();
}
// several capsule strokes drawn as ONE outlined shape (outlines first, then fills, so there are no seams)
function strokeShape(c, parts, col) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const pass of [0, 1]) for (const sp of parts) {
    const pp = sp.pts.map(P), k = pp[0][2];
    c.beginPath(); c.moveTo(pp[0][0], pp[0][1]);
    for (let i = 1; i < pp.length; i++) c.lineTo(pp[i][0], pp[i][1]);
    c.strokeStyle = pass ? col : INK; c.lineWidth = (sp.w + (pass ? 0 : 2 * DIM.outline)) * k; c.stroke();
  }
}
function dotJoint(c, p, col, r) {
  const [X, Y, k] = P(p);
  c.beginPath(); c.arc(X, Y, (r * FSCALE + OL()) * k, 0, TAU); c.fillStyle = INK; c.fill();
  c.beginPath(); c.arc(X, Y, r * FSCALE * k, 0, TAU); c.fillStyle = col; c.fill();
}
function drawCup(c, p, col) {
  const [X, Y, k] = P(p);
  const h = 24 * k, tw = 17 * k, bw = 12.5 * k, ol = DIM.outline * k;
  const dir = MIRROR ? -1 : 1;
  c.save(); c.translate(X, Y + dir * 2 * k); c.scale(1, dir);
  c.beginPath(); c.moveTo(-tw / 2, -h * 0.62); c.lineTo(tw / 2, -h * 0.62); c.lineTo(bw / 2, h * 0.38); c.lineTo(-bw / 2, h * 0.38); c.closePath();
  c.lineJoin = 'round'; c.lineWidth = ol * 2; c.strokeStyle = INK; c.stroke();
  c.fillStyle = rgb(mixc(col, [120, 120, 120], 0.25)); c.fill();
  c.beginPath(); c.moveTo(-tw / 2 + ol * 0.5, -h * 0.62 + ol * 1.6); c.lineTo(tw / 2 - ol * 0.5, -h * 0.62 + ol * 1.6);
  c.lineWidth = 1.4 * k; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.stroke();
  c.restore();
}

// Where a worn mask sits: in front of the face, following the head's facing
// direction (including its pitch). Returns everything drawMask needs.
function maskOnFace(J) {
  const upH = norm(sub(J.Hc, J.NT));
  const face = norm(sub(J.F, mul(upH, dot(J.F, upH))));
  const pos = add(madd(J.Hc, face, DIM.headR * 0.62), [0, -DIM.headR * 0.18, -1]);
  const toCam = -face[1];                 // 1 = looking straight at the camera
  return {
    pos, face: face[0] * 1.1, back: toCam < -0.05,
    wf: 0.38 + 0.62 * Math.abs(toCam), hf: 1 - 0.32 * Math.max(0, -face[2]),
    rot: -upH[0] * 0.9, depth: pos[1] - (toCam > 0 ? 2 : -2),
  };
}

// the mask: a flat oval, drawn foreshortened to the way it faces
function drawMask(c, m) {
  const [X, Y, k] = P(m.pos);
  const rx = 27.5 * k * m.wf, ry = 33 * k * m.hf;
  c.save(); c.translate(X, Y); if (MIRROR) c.scale(1, -1); c.rotate(m.rot || 0);
  c.beginPath(); c.ellipse(0, 0, rx + DIM.outline * k, ry + DIM.outline * k, 0, 0, TAU); c.fillStyle = INK; c.fill();
  const g = c.createLinearGradient(-rx, -ry, rx, ry);
  g.addColorStop(0, rgb(mixc([252, 252, 250], m.tint || [252, 252, 250], 0.5))); g.addColorStop(1, rgb(mixc([206, 206, 204], m.tint || [206, 206, 204], 0.5)));
  c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fillStyle = m.back ? rgb([150, 150, 150]) : g; c.fill();
  // the smile: the only face in the film (not visible from behind)
  if (m.back) { c.restore(); return; }
  const sx = (m.face || 0) * rx * 0.3;
  c.beginPath();
  c.moveTo(sx - rx * 0.52, ry * 0.12);
  c.quadraticCurveTo(sx, ry * 0.12 + ry * 0.62, sx + rx * 0.52, ry * 0.12);
  c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 3.6 * k * Math.min(1, m.hf + 0.3); c.stroke();
  c.restore();
}

// draw one figure, depth-sorted part by part (far limbs first and slightly grey)
function drawFigure(c, fig, J, extra = {}) {
  FSCALE = fig.s;
  try { drawFigureParts(c, fig, J, extra); } finally { FSCALE = 1; }
}
function drawFigureParts(c, fig, J, extra) {
  const parts = [];
  const torsoD = (J.P[1] + J.N[1]) / 2;
  const shadeFor = d => rgb(mixc(FIG_NEAR, FIG_FAR, sstep(1, 11, d - torsoD) * 0.95));
  // the leg nearer the camera is drawn together with the torso as ONE shape, so the hip has no seam
  const legD = side => (J.hip[side][1] + J.knee[side][1] + J.ank[side][1]) / 3;
  // seen from the front (both legs about equally far away) both legs join the torso
  const nearLeg = legD('L') <= legD('R') ? 'L' : 'R';
  const frontal = Math.abs(legD('L') - legD('R')) < 6;
  const legPts = side => [J.P, J.hip[side], J.knee[side], J.ank[side], J.toe[side]];
  const bodyLegs = frontal ? ['L', 'R'] : [nearLeg];
  for (const side of ['L', 'R']) {
    const ld = legD(side);
    // the back leg always goes behind the body, so its outline never cuts across the hip
    if (!bodyLegs.includes(side)) parts.push({ d: Math.max(ld, torsoD + 0.05), draw: () => strokeLimb(c, legPts(side), shadeFor(ld + (J.hip[side][1] - J.P[1]) * 1.2), P(J.P)[2]) });
    const armPts = [J.N, J.sh[side], J.el[side], J.hand[side]];
    const ad = (J.sh[side][1] + J.el[side][1] + J.hand[side][1]) / 3 - 0.5;
    const acol = shadeFor(ad + (J.sh[side][1] - J.N[1]) * 1.2);
    parts.push({ d: ad, draw: () => {
      strokeLimb(c, armPts, acol, P(J.N)[2]);
      // an arm in front of the body: paint over its outline where it leaves the torso, so the shoulder flows
      // seamlessly into the upper body (the rest of the arm keeps its outline)
      if (ad < torsoD) {
        const k = P(J.N)[2], wk = DIM.limbW * FSCALE * k;
        c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = wk;
        const root = [J.N, J.sh[side], lerp3(J.sh[side], J.el[side], 0.28)].map(P);
        c.beginPath(); c.moveTo(root[0][0], root[0][1]); for (let i = 1; i < root.length; i++) c.lineTo(root[i][0], root[i][1]);
        c.strokeStyle = acol; c.stroke();
        const tq = [J.N, lerp3(J.N, J.C, 0.22)].map(P);
        c.beginPath(); c.moveTo(tq[0][0], tq[0][1]); c.lineTo(tq[1][0], tq[1][1]);
        c.strokeStyle = rgb(FIG_NEAR); c.stroke();
      }
      if (fig.cup === side) { drawCup(c, add(J.hand[side], [0, -1, 6]), FIG_NEAR); dotJoint(c, J.hand[side], acol, DIM.limbW * 0.5); }
    } });
  }
  parts.push({ d: torsoD, draw: () => strokeBody(c, [J.P, J.C, J.N, J.NT], bodyLegs.map(legPts), rgb(FIG_NEAR)) });
  parts.push({ d: Math.min(torsoD - 0.2, J.Hc[1]), draw: () => {
    const [X, Y, k] = P(J.Hc), r = DIM.headR * FSCALE * k;
    c.beginPath(); c.arc(X, Y, r + OL() * k, 0, TAU); c.fillStyle = INK; c.fill();
    c.beginPath(); c.arc(X, Y, r, 0, TAU); c.fillStyle = rgb(FIG_NEAR); c.fill();
  } });
  if (extra.mask) parts.push({ d: extra.mask.depth, draw: () => drawMask(c, extra.mask) });
  if (extra.handOver) for (const side of extra.handOver) parts.push({ d: extra.mask.depth - 0.1, draw: () => dotJoint(c, J.hand[side], rgb(FIG_NEAR), DIM.limbW * 0.55) });
  // props held by the figure, sorted in with its limbs: [{ d, draw }]
  if (extra.props) for (const p of extra.props) parts.push(p);
  parts.sort((a, b) => b.d - a.d);
  for (const p of parts) p.draw();
}

// soft contact shadow under each figure
function contactShadow(c, J, strength = 0.55, sc = 1) {
  for (const side of ['L', 'R']) {
    const h = J.heel[side], tt = J.toe[side];
    const m = lerp3(h, tt, 0.5); const lift = Math.min(h[2], tt[2]);
    const [X, Y, k] = P([m[0], m[1], 0]);
    const g = c.createRadialGradient(X, Y, 0, X, Y, 26 * k * sc);
    g.addColorStop(0, `rgba(0,0,0,${strength * clamp(1 - lift / 30)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.save(); c.translate(X, Y); c.scale(1, 0.28); c.translate(-X, -Y);
    c.beginPath(); c.arc(X, Y, 26 * k * sc, 0, TAU); c.fill(); c.restore();
  }
  const [X, Y, k] = P([J.P[0], J.P[1], 0]);
  const g = c.createRadialGradient(X, Y, 0, X, Y, 60 * k * sc);
  g.addColorStop(0, `rgba(0,0,0,${strength * 0.55})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.save(); c.translate(X, Y); c.scale(1, 0.22); c.translate(-X, -Y);
  c.beginPath(); c.arc(X, Y, 60 * k * sc, 0, TAU); c.fill(); c.restore();
}

function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => { const q = P(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); }
// axis-aligned box in world space (x0..x1, d0..d1, z0..z1)
function box(c, b, col) {
  const { x0, x1, d0, d1, z0, z1 } = b;
  const front = [[x0, d0, z0], [x1, d0, z0], [x1, d0, z1], [x0, d0, z1]];
  const top = [[x0, d0, z1], [x1, d0, z1], [x1, d1, z1], [x0, d1, z1]];
  const showTop = !MIRROR && z1 < cam.h;
  // the side face that points toward the camera
  const sx = cam.x < x0 ? x0 : cam.x > x1 ? x1 : null;
  if (sx !== null) { poly(c, [[sx, d0, z0], [sx, d1, z0], [sx, d1, z1], [sx, d0, z1]]); c.fillStyle = col.side; c.fill(); }
  if (showTop) { poly(c, top); c.fillStyle = col.top; c.fill(); }
  poly(c, front); c.fillStyle = col.front; c.fill();
  c.lineWidth = 1.2; c.strokeStyle = col.edge || 'rgba(255,255,255,0.06)';
  if (showTop) { poly(c, top); c.stroke(); }
}

// letter-spaced monospace caption with a soft fade
function caption(text, a, rise, size = 50, sp = 15, y0 = 196, col = [244, 242, 236]) {
  if (a <= 0.002) return;
  ctx.save();
  ctx.font = `800 ${size}px "JetBrains Mono", "DejaVu Sans Mono", "Liberation Mono", monospace`;
  ctx.textBaseline = 'middle';
  const cw = ctx.measureText('M').width;
  const total = text.length * cw + (text.length - 1) * sp;
  let x = W / 2 - total / 2;
  const y = y0 - rise;
  ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 18;
  ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
  for (const ch of text) { ctx.fillText(ch, x, y); x += cw + sp; }
  ctx.restore();
}
function captionAt(t, text, t0, t1, size, sp, y0, col) {
  const a = sstep(t0, t0 + 0.28, t) * (1 - sstep(t1 - 0.35, t1, t));
  const rise = 10 * (1 - E.out(inv(t0, t0 + 0.5, t)));
  caption(text, a, rise, size, sp, y0, col);
}

// film grain (seeded, so it is deterministic per frame)
const GRAIN = [];
(function () {
  const rnd = mulberry32(1234);
  for (let n = 0; n < 4; n++) {
    const g = document.createElement('canvas'); g.width = 360; g.height = 640;
    const gc = g.getContext('2d'), id = gc.createImageData(360, 640);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (rnd() - 0.5) * 90; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0); GRAIN.push(g);
  }
})();
function grain(t, amt) {
  const f = Math.floor(t * FPS + 1e-6);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = amt;
  ctx.drawImage(GRAIN[f % 4], 0, 0, W, H); ctx.restore();
}
function vignette(strength) {
  const g = ctx.createRadialGradient(W / 2, H * 0.52, H * 0.22, W / 2, H * 0.52, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// glossy floor: draw the scene's objects mirrored into an offscreen layer, fade them out
function reflection(drawObjects, floorY, alpha) {
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, off.width, off.height);
  octx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  MIRROR = true;
  octx.save(); octx.filter = 'blur(0.6px)';
  drawObjects(octx);
  octx.restore();
  MIRROR = false;
  octx.globalCompositeOperation = 'destination-in';
  const g = octx.createLinearGradient(0, floorY, 0, floorY + 300);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`); g.addColorStop(0.45, `rgba(0,0,0,${alpha * 0.3})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  octx.fillStyle = g; octx.fillRect(0, 0, W, H);
  octx.globalCompositeOperation = 'destination-out';
  octx.fillStyle = '#000'; octx.fillRect(0, 0, W, floorY);
  octx.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(off, 0, 0, W, H); ctx.restore();
}


/* =====================================================================
   WALK TEST (index.html?test=walk&mood=heavy): side view, static camera,
   floor ruler and a marker at every heel contact, for checking foot locking.
   ===================================================================== */
const WALKTEST = (() => {
  const QS = new URLSearchParams(location.search);
  const mood = MOOD[QS.get('mood') || 'heavy'] || MOOD.heavy;
  const F = new Fig('TEST', { x: 110, d: 0, yaw: 0, seed: 2 });
  const end = F.walk(0.4, [QS.get('track') === '1' ? 1000 : 620, 0], mood, 'R');
  const dur = end + 0.8;
  function draw(t) {
    const track = QS.get('track') === '1';
    cam.x = track ? F.rootAt(t)[0] + 70 : 365; cam.zoom = track ? 1.5 : 1.22; cam.hy = track ? 560 : 640; cam.h = 250;
    ctx.fillStyle = '#101012'; ctx.fillRect(0, 0, W, H);
    const fy = P([0, 0, 0])[1];
    ctx.fillStyle = '#18181b'; ctx.fillRect(0, fy, W, H - fy);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (let x = 0; x <= 1300; x += 20) { const a = P([x, 0, 0]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0], a[1] + (x % 100 ? 8 : 18)); ctx.stroke(); }
    const J = F.pose(t);
    // heel contacts so far
    for (const c of F.cues) if (c.t <= t + 1e-6) {
      const pl = F.plants[c.side].find(p => Math.abs(p.t0 - c.t) < 1e-6);
      const a = P([pl.pos[0], 0, 0]);
      ctx.fillStyle = c.side === 'R' ? '#ff5544' : '#44aaff'; ctx.fillRect(a[0] - 2, a[1] + 20, 4, 14);
    }
    contactShadow(ctx, J, 0.6);
    drawFigure(ctx, F, J);
    // planted feet are tinted; a contact frame flashes
    const label = [];
    for (const side of ['L', 'R']) {
      const ft = J.feet[side];
      const a = P(ft.pitch >= 0 ? ft.heel : ft.toe);
      if (ft.planted) { ctx.fillStyle = side === 'R' ? '#ff5544' : '#44aaff'; ctx.beginPath(); ctx.arc(a[0], a[1], 4, 0, TAU); ctx.fill(); }
      label.push(side + (ft.planted ? ' planted' : ' swing  '));
      for (const c of F.cues) if (c.side === side && Math.round(c.t * FPS) === Math.round(t * FPS)) label.push('<< ' + side + ' HEEL CONTACT (frame ' + Math.round(c.t * FPS) + ')');
    }
    ctx.fillStyle = '#ddd'; ctx.font = '22px "DejaVu Sans Mono", monospace';
    ctx.fillText(`WALK TEST  mood=${mood.name}  L=${F.moves[0].L.toFixed(1)}px  cad=${mood.cad}/s`, 30, 60);
    ctx.fillText(`t=${t.toFixed(3)}s  frame=${Math.round(t * FPS)}  speed=${(F.moves[0].L * mood.cad).toFixed(1)}px/s`, 30, 92);
    label.forEach((l, i) => ctx.fillText(l, 30, 124 + i * 30));
  }
  return { draw, dur, fig: F };
})();

const TEST = new URLSearchParams(location.search).get('test') === 'walk';

// ---------------------------------------------------------------- generic checks for any film
// figs: [[fig, fromSec, toSec], ...]
function footCheckFor(figs, step = 1 / 120) {
  const res = [];
  for (const [f, a, b] of figs) {
    let reach = 0, reachT = 0, drift = 0, driftT = 0, below = 0;
    const last = { L: null, R: null };
    for (let t = a; t <= b; t += step) {
      const J = f.pose(t);
      for (const side of ['L', 'R']) {
        const ft = J.feet[side];
        if (ft.planted) {
          const e = len(sub(J.ank[side], ft.ank));
          if (e > reach) { reach = e; reachT = t; }
          const piv = ft.pitch >= 0 ? J.heel[side] : J.toe[side];
          const key = ft.pitch >= 0 ? 'h' : 't';
          const l = last[side];
          if (l && l.key === key && l.pl === ft.plant) { const d = Math.hypot(piv[0] - l.p[0], piv[1] - l.p[1], piv[2] - l.p[2]); if (d > drift) { drift = d; driftT = t; } }
          last[side] = { p: piv, key, pl: ft.plant };
        } else {
          last[side] = null;
          below = Math.min(below, J.toe[side][2], J.heel[side][2]);
        }
      }
    }
    res.push({ fig: f.id, maxReachError: +reach.toFixed(3), at: +reachT.toFixed(3), maxPlantedDriftPerTick: +drift.toFixed(3), driftAt: +driftT.toFixed(3), lowestSwingFoot: +below.toFixed(2) });
  }
  return res;
}
function popCheckFor(figs) {
  const res = [];
  for (const [f, a, b] of figs) {
    let prev = null, prev2 = null; const spikes = [];
    for (let fr = Math.ceil(a * FPS); fr <= Math.floor(b * FPS); fr++) {
      const t = fr / FPS, J = f.pose(t);
      const pts = [J.P, J.N, J.Hc, J.hand.L, J.hand.R, J.el.L, J.el.R, J.knee.L, J.knee.R, J.ank.L, J.ank.R];
      if (prev && prev2) {
        let worst = 0, wi = -1;
        pts.forEach((p, i) => { const acc = len(sub(add(p, prev2[i]), mul(prev[i], 2))); if (acc > worst) { worst = acc; wi = i; } });
        spikes.push({ t: +t.toFixed(3), acc: +worst.toFixed(2), joint: ['pelvis', 'neck', 'head', 'handL', 'handR', 'elbowL', 'elbowR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'][wi] });
      }
      prev2 = prev; prev = pts;
    }
    spikes.sort((x, y) => y.acc - x.acc);
    res.push({ fig: f.id, top: spikes.slice(0, 6) });
  }
  return res;
}
