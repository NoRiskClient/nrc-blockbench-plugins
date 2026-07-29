import { CosmeticType } from '../cosmetics/types';
import { emoteSettingsState, applyEmoteSettings, EMOTE_SETTINGS_TEMPLATE } from './emoteSettingsPanel';
import { nrcAnimationCodec } from '../platform/animationCodec';

export function openAnimationExportDialog(type: CosmeticType) {
    const animations = (Animation.all || []) as any[];
    if (!animations.length) return;

    const initial = (Animation.selected as any) || animations[0];

    const state: any = {
        ...emoteSettingsState(initial, type),
        animations: animations.map((a) => ({ name: a.name, uuid: a.uuid })),
        selectedUuid: initial.uuid,
        pick(this: any, uuid: string) {
            if (this.selectedUuid === uuid) return;
            this.selectedUuid = uuid;
            const anim = animations.find((a) => a.uuid === uuid);
            if (anim) Object.assign(this, emoteSettingsState(anim, type));
        },
    };

    new Dialog('nrc_animation_export_' + type.id, {
        title: 'Export ' + type.formatName + ' Animations',
        width: 540,
        component: {
            data: () => state,
            template: `
                <div class="nrc-x">
                    <div class="nrc-x-sec-h">Animation</div>
                    <div class="nrc-x-chips">
                        <span class="nrc-x-chip" v-for="a in animations" :key="a.uuid"
                            :class="{on: selectedUuid === a.uuid}" @click="pick(a.uuid)">{{ a.name }}</span>
                    </div>
                    ${EMOTE_SETTINGS_TEMPLATE}
                </div>
            `,
        },
        onConfirm() {
            const target = animations.find((a) => a.uuid === state.selectedUuid);
            if (!target) return;

            applyEmoteSettings(target, type, state);

            Blockbench.export({
                resource_id: 'animation',
                type: 'JSON Animation',
                extensions: ['json'],
                name: target.name + '.animation',
                content: JSON.stringify(nrcAnimationCodec.compileFile([target]), null, 2),
            });
        },
    }).show();
}
