import { CosmeticType } from '../cosmetics/types';
import { readFlag, buildLockMap } from '../domain/meta';
import { retargetSoundIds } from '../platform/emoteIdentity';
import { animationId } from '../core/util';
import { log } from '../core/log';

export function buildAnimationJson(type: CosmeticType, only?: any[], emoteId?: string): object {
    const animations: { [name: string]: any } = {};
    const source = only ?? (Animation.all as any[]);

    for (const anim of source) {
        const compiled: any = anim.compileBedrockAnimation();

        for (const f of type.metaFields) compiled[f.jsonKey] = readFlag(anim, f.key, f.default);
        if (type.hasLockBones) compiled.lockVanillaBones = buildLockMap(anim, type);
        if (emoteId) retargetSoundIds(compiled, anim, type, emoteId);

        const id = animationId(anim.name) || type.defaultName;
        if (animations[id]) {
            log('buildAnimationJson: "' + anim.name + '" collides with an earlier animation on "' + id + '"');
            Blockbench.showQuickMessage('Two animations share the id "' + id + '", only the last one is exported', 2600);
        }
        animations[id] = compiled;
    }

    return { format_version: '1.8.0', animations };
}
