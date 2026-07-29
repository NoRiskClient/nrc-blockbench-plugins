import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { isCosmeticFormat } from '../platform/format';
import { emoteSettingsState, applyEmoteSettings, EMOTE_SETTINGS_TEMPLATE } from './emoteSettingsPanel';

export function createSettingsAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_edit_settings_' + type.id, {
        name: 'Edit ' + type.formatName + ' Settings',
        description: 'Edit NoRisk Client metadata for the selected animation',
        icon: 'tune',
        category: 'animation',
        condition: () => isCosmeticFormat(type) && !!Animation.selected,
        click() {
            openSettingsDialog(type);
        },
    });
}

export function openSettingsDialog(type: CosmeticType, anim?: any, onDone?: () => void) {
    const target = anim || (Animation.selected as any);
    if (!target) return;

    const state = emoteSettingsState(target, type);

    new Dialog('nrc_settings_' + type.id, {
        title: 'NRC ' + type.formatName + ' Settings',
        width: 480,
        component: {
            data: () => state,
            template: `<div class="nrc-x">${EMOTE_SETTINGS_TEMPLATE}</div>`,
        },
        onConfirm() {
            applyEmoteSettings(target, type, state);
            if (onDone) onDone();
        },
    }).show();
}
