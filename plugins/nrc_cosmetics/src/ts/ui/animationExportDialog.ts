import { CosmeticType } from '../cosmetics/types';
import { emoteSettingsState, applyEmoteSettings, EmoteSettingsValues, EMOTE_SETTINGS_TEMPLATE } from './emoteSettingsPanel';
import { buildAnimationJson } from '../serialization/animation';
import { currentEmoteId } from '../platform/emoteIdentity';
import { animationId } from '../core/util';

export function openAnimationExportDialog(type: CosmeticType) {
    const animations = (Animation.all || []) as any[];
    if (!animations.length) return;

    const initial = (Animation.selected as any) || animations[0];

    const edits: { [uuid: string]: EmoteSettingsValues } = {};
    const selected: { [uuid: string]: boolean } = {};
    for (const anim of animations) {
        const { flags, locks, lockOpen } = emoteSettingsState(anim, type);
        edits[anim.uuid] = { flags, locks, lockOpen };
        selected[anim.uuid] = true;
    }

    const state: any = {
        ...emoteSettingsState(initial, type),
        animations: animations.map((a) => ({ name: a.name, uuid: a.uuid, id: animationId(a.name) })),
        selected,
        focusUuid: initial.uuid,
        base: currentEmoteId(type),
        flush(this: any) {
            edits[this.focusUuid] = { flags: { ...this.flags }, locks: { ...this.locks }, lockOpen: this.lockOpen };
        },
        pick(this: any, uuid: string) {
            if (this.focusUuid === uuid) return;
            this.flush();
            this.focusUuid = uuid;
            Object.assign(this, edits[uuid]);
        },
        toggle(this: any, uuid: string) {
            this.selected[uuid] = !this.selected[uuid];
        },
        setAll(this: any, on: boolean) {
            for (const a of this.animations) this.selected[a.uuid] = on;
        },
    };

    new Dialog('nrc_animation_export_' + type.id, {
        title: 'Export ' + type.formatName + ' Animations',
        width: 540,
        component: {
            data: () => state,
            computed: {
                focusName(this: any) {
                    const a = this.animations.find((x: any) => x.uuid === this.focusUuid);
                    return a ? a.name : '';
                },
                count(this: any) {
                    return this.animations.filter((a: any) => this.selected[a.uuid]).length;
                },
            },
            template: `
                <div class="nrc-x">
                    <div>
                        <div class="nrc-x-sec-h">Animations</div>
                        <div class="nrc-x-anims">
                            <div class="nrc-x-anim" v-for="a in animations" :key="a.uuid"
                                :class="{on: selected[a.uuid], focus: focusUuid === a.uuid}" @click="pick(a.uuid)">
                                <i class="material-icons box" @click.stop="toggle(a.uuid)">{{ selected[a.uuid] ? 'check_box' : 'check_box_outline_blank' }}</i>
                                <span class="nm">{{ a.name }}</span>
                                <span class="id">{{ a.id }}</span>
                            </div>
                        </div>
                        <div class="nrc-x-chips">
                            <span class="nrc-x-chip" @click="setAll(true)">select all</span>
                            <span class="nrc-x-chip" @click="setAll(false)">select none</span>
                        </div>
                    </div>

                    <div class="nrc-x-focus">Settings below apply to <b>{{ focusName }}</b></div>
                    ${EMOTE_SETTINGS_TEMPLATE}

                    <div class="nrc-x-foot" v-if="count">Exports <b>{{ count }}</b> animation(s) into <b>{{ base }}.animation.json</b></div>
                    <div class="nrc-x-foot" v-else>No animation selected</div>
                </div>
            `,
        },
        onConfirm() {
            const chosen = animations.filter((a) => state.selected[a.uuid]);
            if (!chosen.length) {
                Blockbench.showQuickMessage('No animation selected to export', 1800);
                return;
            }

            state.flush();
            for (const anim of chosen) applyEmoteSettings(anim, type, edits[anim.uuid]);

            const emoteId = currentEmoteId(type);
            Blockbench.export({
                resource_id: 'animation',
                type: 'JSON Animation',
                extensions: ['json'],
                name: emoteId + '.animation',
                content: JSON.stringify(buildAnimationJson(type, chosen, emoteId), null, 2),
            });
        },
    }).show();
}
