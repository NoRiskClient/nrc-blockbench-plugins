import { CosmeticType } from '../cosmetics/types';

export const lockPropKey = (bone: string) => `nrc_lock_${bone}`;

export function readFlag(anim: any, key: string, fallback: boolean): boolean {
    return anim && typeof anim[key] === 'boolean' ? anim[key] : fallback;
}

export function initFlags(anim: any, type: CosmeticType): { [key: string]: boolean } {
    const out: { [key: string]: boolean } = {};
    for (const f of type.metaFields) out[f.key] = readFlag(anim, f.key, f.default);
    return out;
}

export function initLocks(anim: any, type: CosmeticType): { [bone: string]: boolean } {
    const out: { [bone: string]: boolean } = {};
    for (const b of type.bones) out[b] = readFlag(anim, lockPropKey(b), false);
    return out;
}

export function anyLocked(anim: any, type: CosmeticType): boolean {
    return type.bones.some((b) => readFlag(anim, lockPropKey(b), false));
}

// Writes flag + lock values from a dialog back onto the animation.
export function writeMeta(anim: any, type: CosmeticType, flags: { [k: string]: boolean }, locks: { [b: string]: boolean }) {
    for (const f of type.metaFields) anim[f.key] = !!flags[f.key];
    if (type.hasLockBones) for (const b of type.bones) anim[lockPropKey(b)] = !!locks[b];
    anim.saved = false;
    if (typeof Project !== 'undefined' && Project) Project.saved = false;
}

// The lockVanillaBones map written into the exported animation JSON.
export function buildLockMap(anim: any, type: CosmeticType): { [bone: string]: boolean } {
    const m: { [bone: string]: boolean } = {};
    for (const b of type.bones) m[b] = readFlag(anim, lockPropKey(b), false);
    return m;
}
