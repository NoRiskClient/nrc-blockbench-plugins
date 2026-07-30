import { CosmeticType } from '../cosmetics/types';
import { readFlag, buildLockMap } from '../domain/meta';
import { retargetSoundIds } from '../platform/emoteIdentity';
import { mcId } from '../core/util';

export function buildAnimationJson(type: CosmeticType, only?: any[], emoteId?: string): object {
    const animations: { [name: string]: any } = {};
    const source = only ?? (Animation.all as any[]);

    for (const anim of source) {
        const compiled: any = anim.compileBedrockAnimation();

        for (const f of type.metaFields) compiled[f.jsonKey] = readFlag(anim, f.key, f.default);
        if (type.hasLockBones) compiled.lockVanillaBones = buildLockMap(anim, type);
        if (emoteId) retargetSoundIds(compiled, anim, type, emoteId);

        animations[mcId(anim.name) || type.defaultName] = compiled;
    }

    return { format_version: '1.8.0', animations };
}
