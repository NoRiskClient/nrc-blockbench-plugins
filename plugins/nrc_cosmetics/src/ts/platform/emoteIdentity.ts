import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { nodePath } from '../core/node';
import { mcId } from '../core/util';
import { isCosmeticFormat } from './format';
import { soundEffectId } from './effectFiles';
import { effectsAnimator, firstDataPoint } from './effectKeyframes';
import { promptName } from '../ui/nameDialog';
import { log } from '../core/log';

export function currentEmoteId(type: CosmeticType): string {
    return mcId(Project && Project.name) || type.defaultName;
}

function soundKeyframesOf(animation: any): any[] {
    const animator = effectsAnimator(animation);
    return animator ? ((animator.sound || []) as any[]) : [];
}

export function soundIdFor(type: CosmeticType, emoteId: string, keyframe: any): string | null {
    const file = firstDataPoint(keyframe).file;
    if (!file || !nodePath) return null;
    return soundEffectId(type.assetNamespace, emoteId, nodePath.basename(file));
}

export function retargetSoundIds(compiled: any, animation: any, type: CosmeticType, emoteId: string) {
    const sounds = compiled && compiled.sound_effects;
    if (!sounds) return;

    for (const keyframe of soundKeyframesOf(animation)) {
        const entry = sounds[keyframe.getTimecodeString && keyframe.getTimecodeString()];
        if (!entry) continue;

        const id = soundIdFor(type, emoteId, keyframe);
        if (!id) continue;

        for (const point of (Array.isArray(entry) ? entry : [entry]) as any[]) point.effect = id;
    }
}

export function renameEmote(type: CosmeticType, newId: string) {
    const animations = (Animation.all || []) as any[];
    const previous = currentEmoteId(type);
    if (!newId || newId === previous) return 0;

    Undo.initEdit({ animations });

    if (Project) Project.name = newId;
    for (const animation of animations) {
        if (mcId(animation.name) === previous) animation.name = newId;
    }

    let updated = 0;
    for (const animation of animations) {
        for (const keyframe of soundKeyframesOf(animation)) {
            const id = soundIdFor(type, newId, keyframe);
            const point = firstDataPoint(keyframe);
            if (!id || point.effect === id) continue;
            point.effect = id;
            updated++;
        }
    }

    Undo.finishEdit('Rename emote');
    log('renameEmote: ' + previous + ' -> ' + newId + ', ' + updated + ' sound id(s) updated');
    return updated;
}

export function createRenameAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_rename_' + type.id, {
        name: 'Rename ' + type.formatName,
        description: 'Rename the project, its animation and every sound identifier at once',
        icon: 'drive_file_rename_outline',
        category: 'file',
        condition: () => isCosmeticFormat(type),
        click() {
            promptName(type, (id: string) => {
                const updated = renameEmote(type, id);
                Blockbench.showQuickMessage('Renamed to ' + id
                    + (updated ? ', ' + updated + ' sound id(s) updated' : ''), 2200);
            }, { title: 'Rename ' + type.formatName, value: currentEmoteId(type) });
        },
    });
}
