import { lockPropKey } from '../domain/meta';
import { openAnimationExportDialog } from '../ui/animationExportDialog';
import { currentType } from './format';
import { resolveParticleTexture } from './particleTexture';
import { animationId } from '../core/util';
import { log } from '../core/log';

const patched: Array<{ target: any; key: string; original: any }> = [];

function patch(target: any, key: string, replacement: (original: any) => any) {
    if (!target || typeof target[key] !== 'function') {
        log(`animationPatches: cannot patch ${key}, not a function`);
        return;
    }
    const original = target[key];
    patched.push({ target, key, original });
    target[key] = replacement(original);
    log('animationPatches: patched ' + key);
}

export function installAnimationPatches() {
    if (patched.length) return;

    patch(BarItems['export_animation_file'], 'click', (original) =>
        function (this: any, ...args: any[]) {
            const type = currentType();
            if (!type) return original.apply(this, args);
            openAnimationExportDialog(type);
        }
    );

    patch(Animator, 'loadParticleEmitter', (original) =>
        function (this: any, path: string, content: string) {
            const result = original.apply(this, [path, content]);
            if (!currentType()) return result;
            log('loadParticleEmitter: ' + path + ' (' + (content ? content.length : 0) + ' bytes)');
            resolveParticleTexture(path, content);
            return result;
        }
    );

    patch(Animator, 'loadFile', (original) =>
        function (this: any, file: any, ...rest: any[]) {
            const before = new Set(((Animation.all || []) as any[]).map((a) => a.uuid));
            const result = original.apply(this, [file, ...rest]);

            const type = currentType();
            if (!type) return result;

            const json = file && (file.json ?? safeParse(file.content));
            const animations = json && json.animations;
            if (!animations) return result;

            const added = ((Animation.all || []) as any[]).filter((a) => !before.has(a.uuid));
            for (const anim of added) {
                const data = animations[anim.name] ?? animations[animationId(anim.name)];
                if (!data) continue;
                for (const f of type.metaFields) {
                    if (data[f.jsonKey] !== undefined) (anim as any)[f.key] = !!data[f.jsonKey];
                }
                if (type.hasLockBones && data.lockVanillaBones) {
                    for (const b of type.bones) {
                        if (data.lockVanillaBones[b] !== undefined) {
                            (anim as any)[lockPropKey(b)] = !!data.lockVanillaBones[b];
                        }
                    }
                }
            }
            return result;
        }
    );
}

export function removeAnimationPatches() {
    for (const { target, key, original } of patched) target[key] = original;
    patched.length = 0;
}

function safeParse(text: any): any {
    if (typeof text !== 'string') return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}
