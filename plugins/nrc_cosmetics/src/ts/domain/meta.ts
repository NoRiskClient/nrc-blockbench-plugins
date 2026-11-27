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

export function writeFlags(anim: any, type: CosmeticType, flags: { [k: string]: boolean }) {
    for (const f of type.metaFields) anim[f.key] = !!flags[f.key];
    markUnsaved(anim);
}

export function writeLocks(anim: any, type: CosmeticType, locks: { [b: string]: boolean }) {
    if (type.hasLockBones) for (const b of type.bones) anim[lockPropKey(b)] = !!locks[b];
    markUnsaved(anim);
}

function markUnsaved(anim: any) {
    anim.saved = false;
    if (typeof Project !== 'undefined' && Project) Project.saved = false;
}

export function flagsDiffer(animations: any[], type: CosmeticType): boolean {
    return animations.some((anim) => type.metaFields.some((f) => readFlag(anim, f.key, f.default) !== readFlag(animations[0], f.key, f.default)));
}

export function buildLockMap(anim: any, type: CosmeticType): { [bone: string]: boolean } {
    const m: { [bone: string]: boolean } = {};
    for (const b of type.bones) m[b] = readFlag(anim, lockPropKey(b), false);
    return m;
}
