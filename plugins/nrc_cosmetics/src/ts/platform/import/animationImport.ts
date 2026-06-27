import { CosmeticType } from '../../cosmetics/types';
import { lockPropKey } from '../../domain/meta';
import { log } from '../../core/log';

// Imports a parsed <name>.animation.json onto the current rig using Blockbench's own
// Animator.loadFile (it constructs the Animations correctly for the project), then writes our
// NRC animation metadata onto each created animation. Per-keyframe easing is restored by our
// Keyframe.prototype.extend patch during loadFile.
export function importAnimation(type: CosmeticType, file: any): any {
    const animations = (file && file.animations) || {};

    const before = new Set((Animation.all || []).map((a: any) => a.uuid));
    try {
        Animator.loadFile({ json: file, content: JSON.stringify(file), path: '' });
    } catch (e: any) {
        log('importAnimation loadFile ERROR: ' + (e && e.stack ? e.stack : String(e)));
        return null;
    }
    const added = (Animation.all || []).filter((a: any) => !before.has(a.uuid));

    for (const anim of added) {
        const data = animations[anim.name];
        if (!data) continue;
        for (const f of type.metaFields) if (data[f.jsonKey] !== undefined) (anim as any)[f.key] = !!data[f.jsonKey];
        if (type.hasLockBones && data.lockVanillaBones) {
            for (const b of type.bones) if (data.lockVanillaBones[b] !== undefined) (anim as any)[lockPropKey(b)] = !!data.lockVanillaBones[b];
        }
    }

    const first = added[0];
    if (first && first.select) first.select();
    return first;
}
