import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { isCosmeticFormat } from '../platform/format';
import { initFlags, initLocks, writeMeta, lockPropKey } from '../domain/meta';

// "Edit Settings" — edits the selected animation's metadata, driven by the type's schema.
export function createSettingsAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_edit_settings_' + type.id, {
        name: 'Edit ' + type.formatName + ' Settings',
        description: 'Edit NoRisk Client metadata for the selected animation',
        icon: 'tune',
        category: 'animation',
        condition: () => isCosmeticFormat(type) && !!Animation.selected,
        click() {
            const anim: any = Animation.selected;
            if (!anim) return;

            const flags = initFlags(anim, type);
            const locks = initLocks(anim, type);
            const form: { [key: string]: any } = {};

            for (const f of type.metaFields) {
                form[f.key] = { label: f.label, description: f.description, type: 'checkbox', value: flags[f.key] };
            }

            if (type.hasLockBones) {
                form._lock_divider = '_';
                form._lock_label = { type: 'info', text: 'Lock vanilla bones (freeze the vanilla animation for that bone):' };
                for (const bone of type.bones) {
                    form[lockPropKey(bone)] = { label: bone, type: 'checkbox', value: locks[bone] };
                }
            }

            new Dialog('nrc_settings_' + type.id, {
                id: 'nrc_settings_' + type.id,
                title: 'NRC ' + type.formatName + ' Settings',
                width: 480,
                form,
                onConfirm(result: any) {
                    const newFlags: { [k: string]: boolean } = {};
                    for (const f of type.metaFields) newFlags[f.key] = !!result[f.key];
                    const newLocks: { [b: string]: boolean } = {};
                    for (const bone of type.bones) newLocks[bone] = !!result[lockPropKey(bone)];
                    writeMeta(anim, type, newFlags, newLocks);
                },
            }).show();
        },
    });
}
