// Self-contained easing math (standard Penner-style curves), name helpers and curve-thumbnail
// SVG generation. Names match what GeckoLib emits and what GeoEasingType.fromName accepts
// (case/underscore-insensitive on the runtime side).

const PI = Math.PI;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Base curve types shown in the selector, in order.
export const BASES = ['linear', 'step', 'sine', 'quad', 'cubic', 'quart', 'quint', 'expo', 'circ', 'back', 'elastic', 'bounce'];

type EaseFn = (t: number) => number;
type ArgEaseFn = (arg: number, t: number) => number;

function inPow(p: number): EaseFn { return (t) => Math.pow(t, p); }
function outPow(p: number): EaseFn { return (t) => 1 - Math.pow(1 - t, p); }
function inOutPow(p: number): EaseFn { return (t) => (t < 0.5 ? Math.pow(2, p - 1) * Math.pow(t, p) : 1 - Math.pow(-2 * t + 2, p) / 2); }

function bounceOut(t: number): number {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
    if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
    t -= 2.625 / d1; return n1 * t * t + 0.984375;
}

// Map of full easing name -> function. Args-easings take (arg, t); the rest take (t).
const FN: { [name: string]: EaseFn | ArgEaseFn } = {
    linear: (t) => t,
    step: ((n: number, t: number) => { const s = Math.max(n || 5, 2); return Math.floor(t * s) / s; }) as ArgEaseFn,

    easeInSine: (t) => 1 - Math.cos((t * PI) / 2),
    easeOutSine: (t) => Math.sin((t * PI) / 2),
    easeInOutSine: (t) => -(Math.cos(PI * t) - 1) / 2,

    easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeInOutExpo: (t) => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),

    easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
    easeOutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    easeInOutCirc: (t) => (t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2),

    easeInBack: ((s: number, t: number) => { const c1 = s || 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; }) as ArgEaseFn,
    easeOutBack: ((s: number, t: number) => { const c1 = s || 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }) as ArgEaseFn,
    easeInOutBack: ((s: number, t: number) => { const c1 = (s || 1.70158) * 1.525; return t < 0.5 ? (Math.pow(2 * t, 2) * ((c1 + 1) * 2 * t - c1)) / 2 : (Math.pow(2 * t - 2, 2) * ((c1 + 1) * (t * 2 - 2) + c1) + 2) / 2; }) as ArgEaseFn,

    easeInElastic: ((b: number, t: number) => { if (t === 0) return 0; if (t === 1) return 1; const c4 = (2 * PI) / 3 * (b || 1); return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4); }) as ArgEaseFn,
    easeOutElastic: ((b: number, t: number) => { if (t === 0) return 0; if (t === 1) return 1; const c4 = (2 * PI) / 3 * (b || 1); return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; }) as ArgEaseFn,
    easeInOutElastic: ((b: number, t: number) => { if (t === 0) return 0; if (t === 1) return 1; const c5 = (2 * PI) / 4.5 * (b || 1); return t < 0.5 ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2 : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1; }) as ArgEaseFn,

    easeInBounce: ((_b: number, t: number) => 1 - bounceOut(1 - t)) as ArgEaseFn,
    easeOutBounce: ((_b: number, t: number) => bounceOut(t)) as ArgEaseFn,
    easeInOutBounce: ((_b: number, t: number) => (t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2)) as ArgEaseFn,
};

// Polynomial curves built generically.
const POLY: { [base: string]: number } = { quad: 2, cubic: 3, quart: 4, quint: 5 };
for (const base of Object.keys(POLY)) {
    const p = POLY[base];
    FN['easeIn' + cap(base)] = inPow(p);
    FN['easeOut' + cap(base)] = outPow(p);
    FN['easeInOut' + cap(base)] = inOutPow(p);
}

export function isArgsEasing(name = ''): boolean {
    return /Back|Elastic|Bounce/.test(name) || name === 'step';
}

export function argLabel(name = ''): string {
    if (/Back/.test(name)) return 'Overshoot';
    if (/Elastic|Bounce/.test(name)) return 'Bounciness';
    if (name === 'step') return 'Steps';
    return '';
}

export function argDefault(name = ''): number {
    if (/Bounce/.test(name)) return 0.5;
    if (name === 'step') return 5;
    return 1; // back, elastic
}

export function parseArg(name: string, value: string): number {
    if (name === 'step') return Math.max(parseInt(value, 10) || 5, 2);
    return parseFloat(value);
}

// Evaluates an easing at t∈[0,1], passing the arg for args-easings.
export function evaluate(name: string, t: number, arg?: number): number {
    const f = FN[name] || FN.linear;
    if (isArgsEasing(name)) return (f as ArgEaseFn)(arg == null ? argDefault(name) : arg, t);
    return (f as EaseFn)(t);
}

export function combineName(base: string, dir: string): string {
    if (base === 'linear' || base === 'step') return base;
    const d = dir === 'out' ? 'Out' : dir === 'inout' ? 'InOut' : 'In';
    return 'ease' + d + cap(base);
}

// Swaps In<->Out (InOut/linear/step unchanged) — used when reversing a keyframe sequence.
export function reverseEasing(name?: string): string | undefined {
    if (!name) return name;
    const { base, dir } = splitName(name);
    if (base === 'linear' || base === 'step' || dir === 'inout') return name;
    return combineName(base, dir === 'in' ? 'out' : 'in');
}

export function splitName(name = 'linear'): { base: string; dir: string } {
    if (name === 'linear' || name === 'step') return { base: name, dir: 'in' };
    const m = name.match(/^ease(InOut|In|Out)(.+)$/);
    if (!m) return { base: 'linear', dir: 'in' };
    return { base: m[2].toLowerCase(), dir: m[1].toLowerCase() };
}

// Generates a small SVG curve thumbnail by sampling the easing function.
export function iconSvg(name: string, accent: boolean): string {
    const W = 24, H = 24, pad = 3, n = 18;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        const v = evaluate(name, t, argDefault(name));
        const x = pad + t * (W - 2 * pad);
        const y = (H - pad) - v * (H - 2 * pad);
        pts.push(x.toFixed(2) + ',' + Math.max(-4, Math.min(H + 4, y)).toFixed(2));
    }
    const stroke = accent ? 'var(--color-accent)' : 'var(--color-text)';
    return `<svg viewBox="0 0 ${W} ${H}" width="22" height="22" style="overflow:visible">` +
        `<polyline points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
