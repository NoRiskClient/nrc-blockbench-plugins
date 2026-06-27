import { CosmeticType } from '../cosmetics/types';
import { readFlag, buildLockMap } from '../domain/meta';
import { mcId } from '../core/util';

// Native Bedrock animation compile + NRC metadata injected per animation, driven by the
// type's schema. Output keys match GeoEmoteParser exactly.
export function buildAnimationJson(type: CosmeticType): object {
    const animations: { [name: string]: any } = {};

    for (const anim of Animation.all as any[]) {
        const compiled: any = anim.compileBedrockAnimation();

        for (const f of type.metaFields) compiled[f.jsonKey] = readFlag(anim, f.key, f.default);
        if (type.hasLockBones) compiled.lockVanillaBones = buildLockMap(anim, type);

        animations[mcId(anim.name) || type.defaultName] = compiled;
    }

    return { format_version: '1.8.0', animations };
}
