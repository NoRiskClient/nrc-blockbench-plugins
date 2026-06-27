import { Registry } from '../../core/registry';
import { easingEnabled } from '../format';
import { evaluate, isArgsEasing, argDefault, reverseEasing } from './functions';

const DEFAULT = 'linear';

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// When reversing keyframes, the easing of each segment flips In<->Out and shifts one frame.
function rotateEasings() {
    const sel = (Timeline.selected || []) as any[];
    if (!sel.length) return;
    const groups: { [k: string]: any[] } = {};
    for (const kf of sel) {
        const key = (kf.animator && kf.animator.uuid) + '|' + kf.channel;
        (groups[key] = groups[key] || []).push(kf);
    }
    Undo.initEdit({ keyframes: sel });
    for (const k in groups) {
        const arr = groups[k].sort((a, b) => a.time - b.time);
        const data = arr.map((kf) => ({ easing: reverseEasing(kf.easing), easingArgs: kf.easingArgs }));
        arr.forEach((kf, i) => {
            if (i === 0) { kf.easing = undefined; kf.easingArgs = undefined; return; }
            kf.easing = data[i - 1].easing;
            kf.easingArgs = data[i - 1].easingArgs;
        });
    }
    Undo.finishEdit('Reverse keyframe easing');
}

// Patches Keyframe.prototype so easing affects both the live preview (getLerp) and the
// exported JSON (compileBedrockKeyframe), and persists through undo / .bbmodel. All gated to
// our format; other formats fall through to the original behaviour.
export function installEasingPatches(registry: Registry) {
    registry.monkeypatch(Keyframe.prototype, 'getLerp', (orig: any) => function (this: any, other: any, axis: any, amount: number) {
        if (!easingEnabled()) return orig.apply(this, arguments);
        const easing = other.easing || DEFAULT;
        const arg = isArgsEasing(easing)
            ? (Array.isArray(other.easingArgs) && other.easingArgs.length ? other.easingArgs[0] : argDefault(easing))
            : undefined;
        const eased = evaluate(easing, amount, arg);
        const start = this.data_points.length === 1 ? this.calc(axis) : this.calc(axis, 1);
        const stop = other.calc(axis);
        const result = lerp(start, stop, eased);
        return Number.isNaN(result) ? orig.apply(this, arguments) : result;
    });

    registry.monkeypatch(Keyframe.prototype, 'compileBedrockKeyframe', (orig: any) => function (this: any) {
        const result = orig.apply(this, arguments);
        if (!easingEnabled()) return result;

        // Bezier: emit lerp_mode + handle arrays exactly as the runtime parser reads them,
        // independent of whether Blockbench bakes bezier by default.
        if (this.interpolation === 'bezier') {
            const vec = Array.isArray(result) ? result : (result && result.vector) || result;
            return {
                vector: vec,
                lerp_mode: 'bezier',
                bezier_left_time: this.bezier_left_time,
                bezier_left_value: this.bezier_left_value,
                bezier_right_time: this.bezier_right_time,
                bezier_right_value: this.bezier_right_value,
            };
        }

        const easing = this.easing;
        if (!easing || easing === DEFAULT) return result;

        let out: any;
        if (Array.isArray(result)) out = { vector: result, easing };
        else if (result && typeof result === 'object') out = Object.assign({}, result, { easing });
        else out = { vector: result, easing }; // molang string / scalar — keep value, don't spread
        if (isArgsEasing(easing) && Array.isArray(this.easingArgs)) out.easingArgs = this.easingArgs;
        return out;
    });

    registry.monkeypatch(Keyframe.prototype, 'getUndoCopy', (orig: any) => function (this: any) {
        const r = orig.apply(this, arguments);
        if (easingEnabled() && this.easing) {
            r.easing = this.easing;
            if (isArgsEasing(this.easing) && this.easingArgs) r.easingArgs = this.easingArgs;
        }
        return r;
    });

    registry.monkeypatch(Keyframe.prototype, 'extend', (orig: any) => function (this: any, data: any) {
        if (easingEnabled() && data) {
            const src = (data.values && typeof data.values === 'object' && !Array.isArray(data.values)) ? data.values : data;
            if (src.easing !== undefined) this.easing = src.easing;
            if (Array.isArray(src.easingArgs)) this.easingArgs = src.easingArgs;
            // Normalize {vector,...} back to a plain array for the original extend.
            if (data.values && !Array.isArray(data.values) && Array.isArray(data.values.vector)) data.values = data.values.vector;
        }
        return orig.apply(this, arguments);
    });

    // Reverse Keyframes button: also rotate the easings of the reversed keyframes.
    if (typeof BarItems !== 'undefined' && BarItems.reverse_keyframes) {
        registry.monkeypatch(BarItems.reverse_keyframes, 'click', (orig: any) => function (this: any) {
            orig.apply(this, arguments);
            if (!easingEnabled()) return;
            try { rotateEasings(); if (typeof Animator !== 'undefined' && Animator.preview) Animator.preview(); } catch (e) { /* ignore */ }
        });
    }
}
