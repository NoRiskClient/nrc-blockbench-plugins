import { CosmeticType } from './cosmetics/types';
import { Registry } from './core/registry';
import { registerFormat, getFormat } from './platform/format';
import { lockPropKey } from './domain/meta';
import { createSettingsAction } from './ui/settingsDialog';
import { createExportAction } from './ui/exportDialog';
import { createImportAction, createImportAnimationAction } from './ui/importDialog';
import { createOutlineAction } from './tools/outline';
import { openTemplateDialog } from './ui/templateDialog';
import { makeToggleSkinAction, makeToggleLayerAction, makeToggleArmModelAction } from './platform/skinPreview';
import { createSkinAction } from './ui/skinDialog';
import { makeToggleRigLockAction } from './platform/playerModel';
import { loadRig } from './platform/rig';
import { installEffectsPanel } from './ui/effectsPanel';
import { createRenameAction } from './platform/emoteIdentity';

export function registerCosmeticType(type: CosmeticType, registry: Registry) {
    registerFormat(registry, type);

    getFormat(type).new = type.hasTemplatePicker
        ? function () { openTemplateDialog(type); }
        : function () { loadRig(type); };

    const condition = { formats: [type.formatId] };
    for (const f of type.metaFields) {
        registry.property(Animation, 'boolean', f.key, { default: f.default, exposed: false, condition });
    }
    if (type.hasLockBones) {
        for (const bone of type.bones) {
            registry.property(Animation, 'boolean', lockPropKey(bone), { default: false, exposed: false, condition });
        }
    }

    registry.menu(createSettingsAction(registry, type), 'animation');
    installEffectsPanel(registry, type);

    registry.menu(createOutlineAction(registry, type), 'tools');
    registry.menu(createRenameAction(registry, type), 'file');
    registry.menu(createImportAction(registry, type), 'file.import');
    if (type.hasBareAnimations) registry.menu(createImportAnimationAction(registry, type), 'file.import');
    registry.menu(createExportAction(registry, type), 'file.export');

    if (type.hasSkinPreview) {
        registry.previewMenu(makeToggleSkinAction(registry, type));
        registry.previewMenu(makeToggleLayerAction(registry, type));
        registry.previewMenu(makeToggleArmModelAction(registry, type));
        registry.menu(makeToggleRigLockAction(registry, type), 'edit');
        registry.previewMenu(createSkinAction(registry, type));
    }
}
