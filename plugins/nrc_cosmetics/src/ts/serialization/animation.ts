import { CosmeticType } from '../cosmetics/types';
import { readFlag, buildLockMap } from '../domain/meta';
import { retargetSoundIds } from '../platform/emoteIdentity';
import { animationId } from '../core/util';
import { log } from '../core/log';

export function exportedAnimationId(type: CosmeticType, anim: any): string {
    return animationId(anim.name) || type.defaultName;
}

function compileController(type: CosmeticType, controller: any): any {
    const animations = (Animation.all || []) as any[];
    const compiled: any = controller.compileForBedrock();
    for (const state of controller.states as any[]) {
        const json = compiled.states && compiled.states[state.name];
        if (!json || !Array.isArray(json.animations)) continue;
        json.animations = json.animations.map((item: any, i: number) => {
            const anim = animations.find((a) => a.uuid === state.animations[i]?.animation);
            if (!anim) return item;
            const key = exportedAnimationId(type, anim);
            return typeof item === 'string' ? key : { [key]: Object.values(item)[0] };
        });
    }
    return compiled;
}

function buildControllersJson(type: CosmeticType): { [name: string]: any } | undefined {
    const controllers = (AnimationController.all || []) as any[];
    if (!controllers.length) return undefined;
    const out: { [name: string]: any } = {};
    for (const controller of controllers) out[controller.name] = compileController(type, controller);
    return out;
}

export function buildAnimationJson(type: CosmeticType, only?: any[], emoteId?: string): object {
    const animations: { [name: string]: any } = {};
    const source = only ?? (Animation.all as any[]);

    for (const anim of source) {
        const compiled: any = anim.compileBedrockAnimation();

        for (const f of type.metaFields) compiled[f.jsonKey] = readFlag(anim, f.key, f.default);
        if (type.hasLockBones) compiled.lockVanillaBones = buildLockMap(anim, type);
        if (emoteId) retargetSoundIds(compiled, anim, type, emoteId);

        const id = exportedAnimationId(type, anim);
        if (animations[id]) {
            log('buildAnimationJson: "' + anim.name + '" collides with an earlier animation on "' + id + '"');
            Blockbench.showQuickMessage('Two animations share the id "' + id + '", only the last one is exported', 2600);
        }
        animations[id] = compiled;
    }

    const json: any = { format_version: '1.8.0', animations };
    const controllers = buildControllersJson(type);
    if (controllers) json.animation_controllers = controllers;
    return json;
}
