import { CosmeticType } from './cosmetics/types';
import { Registry } from './core/registry';
import { registerFormat, getFormat } from './platform/format';
import { lockPropKey } from './domain/meta';
import { createSettingsAction } from './ui/settingsDialog';
import { createExportAction } from './ui/exportDialog';
import { ensureDialogCss } from './ui/dialogStyles';
import { ensureTemplateCss, openTemplateDialog } from './ui/templateDialog';
import { makeToggleSkinAction, makeToggleLayerAction, makeToggleArmModelAction, installSkinPreview } from './platform/skinPreview';
import { createSkinAction } from './ui/skinDialog';
import { makeToggleRigLockAction, installPlayerModel } from './platform/playerModel';
import { installEffectsPanel } from './ui/effectsPanel';
import { createRenameAction } from './platform/emoteIdentity';

export function registerCosmeticType(type: CosmeticType, registry: Registry) {
    registerFormat(registry, type);

    ensureTemplateCss(registry);
    getFormat(type).new = function () { openTemplateDialog(type); };

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

    ensureDialogCss(registry);
    registry.menu(createRenameAction(registry, type), 'file');
    registry.menu(createExportAction(registry, type), 'file.export');

    if (type.hasSkinPreview) {
        registry.previewMenu(makeToggleSkinAction(registry, type));
        registry.previewMenu(makeToggleLayerAction(registry, type));
        registry.previewMenu(makeToggleArmModelAction(registry, type));
        registry.menu(makeToggleRigLockAction(registry, type), 'edit');
        installPlayerModel(registry);
        registry.previewMenu(createSkinAction(registry, type));
        installSkinPreview(registry);
    }
}
