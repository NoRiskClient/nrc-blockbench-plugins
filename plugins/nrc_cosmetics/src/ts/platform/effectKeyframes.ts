export const CHANNEL_SUFFIX: { [channel: string]: string } = {
    particle: '.particle.json',
    sound: '.ogg',
};

export const EFFECT_CHANNELS = Object.keys(CHANNEL_SUFFIX);

const SUFFIX_PATTERN = /\.particle\.json$|\.ogg$/i;

export function isCompanionFile(name: string): boolean {
    return SUFFIX_PATTERN.test(name);
}

export function withoutSuffix(name: string): string {
    return name.replace(SUFFIX_PATTERN, '').toLowerCase();
}

export function effectsAnimator(animation: any, create = false): any {
    if (!animation || !animation.animators) return null;
    if (!animation.animators.effects && create) {
        animation.animators.effects = new EffectAnimator(animation);
    }
    return animation.animators.effects || null;
}

function collect(animation: any, out: any[]) {
    const animator = effectsAnimator(animation);
    if (!animator) return;
    for (const channel of EFFECT_CHANNELS) {
        for (const keyframe of (animator[channel] || []) as any[]) out.push(keyframe);
    }
}

export function allEffectKeyframes(): any[] {
    const out: any[] = [];
    for (const animation of (Animation.all || []) as any[]) collect(animation, out);
    return out;
}

export function selectedEffectKeyframes(): any[] {
    const out: any[] = [];
    collect(Animation.selected, out);
    return out.sort((a, b) => a.time - b.time);
}

export function findEffectKeyframe(uuid: string): any {
    for (const keyframe of selectedEffectKeyframes()) {
        if (keyframe.uuid === uuid) return keyframe;
    }
    return null;
}

export function firstDataPoint(keyframe: any): any {
    return (keyframe && (keyframe.data_points || [])[0]) || {};
}

export function countEffectKeyframes(channel: string): number {
    let total = 0;
    for (const keyframe of allEffectKeyframes()) {
        if (keyframe.channel === channel) total++;
    }
    return total;
}
