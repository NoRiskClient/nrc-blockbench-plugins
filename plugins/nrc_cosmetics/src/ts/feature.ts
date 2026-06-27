import { CosmeticType } from './cosmetics/types';
import { Registry } from './core/registry';
import { registerFormat, getFormat } from './platform/format';
import { lockPropKey } from './domain/meta';
import { createSettingsAction } from './ui/settingsDialog';
import { createExportAction, ensureExportCss } from './ui/exportDialog';
import { ensureTemplateCss, openTemplateDialog } from './ui/templateDialog';
import { makeToggleSkinAction, reapplyIfActive } from './platform/skinPreview';

// Wires one cosmetic type into Blockbench. Everything is tracked by the registry, so a
// single registry.disposeAll() in onunload tears it all down. New types = call this again.
export function registerCosmeticType(type: CosmeticType, registry: Registry) {
    registerFormat(registry, type);

    // File -> New tile opens the template card picker.
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

    ensureExportCss(registry);
    registry.menu(createExportAction(registry, type), 'file.export');

    if (type.hasSkinPreview) {
        registry.previewMenu(makeToggleSkinAction(registry, type));
        // Blockbench rebuilds cube meshes (resetting materials) on these events.
        registry.event('update_view', reapplyIfActive);
        registry.event('finished_edit', reapplyIfActive);
        registry.event('add_cube', reapplyIfActive);
    }
}
