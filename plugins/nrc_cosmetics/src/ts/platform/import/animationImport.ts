import { CosmeticType } from '../../cosmetics/types';
import { lockPropKey } from '../../domain/meta';
import { log } from '../../core/log';
import { exportedAnimationId } from '../../serialization/animation';

function importControllers(type: CosmeticType, controllers: any) {
    if (!controllers || !Format || !Format.animation_controllers) return;
    let loaded: any[] = [];
    try {
        loaded = (AnimationCodec as any).codecs.bedrock_animation_controller.loadFile({ json: { animation_controllers: controllers }, path: '' }) || [];
    } catch (e: any) {
        log('importControllers loadFile ERROR: ' + (e && e.stack ? e.stack : String(e)));
        return;
    }
    const animations = (Animation.all || []) as any[];
    for (const controller of loaded) {
        for (const state of controller.states) {
            for (const entry of state.animations) {
                if (entry.animation) continue;
                const anim = animations.find((a) => exportedAnimationId(type, a) === entry.key);
                if (anim) entry.animation = anim.uuid;
            }
        }
    }
}

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
    importControllers(type, file && file.animation_controllers);

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
