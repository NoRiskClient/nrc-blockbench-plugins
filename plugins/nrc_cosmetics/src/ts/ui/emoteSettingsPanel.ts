import { CosmeticType } from '../cosmetics/types';
import { initFlags, initLocks, anyLocked, writeFlags, writeLocks } from '../domain/meta';

export interface EmoteSettingsValues {
    flags: { [key: string]: boolean };
    locks: { [bone: string]: boolean };
    lockOpen: boolean;
}

export interface EmoteSettingsState extends EmoteSettingsValues {
    flagDefs: any[];
    bones: string[];
    hasLockBones: boolean;
    hasController: boolean;
}

const hasController = () => ((AnimationController.all || []) as any[]).length > 0;

export function emoteSettingsState(anim: any, type: CosmeticType): EmoteSettingsState {
    return {
        flags: initFlags(anim, type),
        locks: initLocks(anim, type),
        lockOpen: anyLocked(anim, type),
        flagDefs: type.metaFields,
        bones: type.bones,
        hasLockBones: type.hasLockBones,
        hasController: hasController(),
    };
}

export const EMOTE_SETTINGS_TEMPLATE = `
    <div>
        <div class="nrc-x-sec-h">Emote settings</div>
        <div class="desc" v-if="hasController">These apply to every animation of the emote. Locked bones apply only to this animation, while its controller state plays.</div>
        <div class="nrc-x-switches">
            <label class="nrc-x-switch" v-for="f in flagDefs" :key="f.key">
                <span class="txt"><div class="lbl">{{ f.label }}</div><div class="desc">{{ f.description }}</div></span>
                <span class="nrc-x-toggle"><input type="checkbox" v-model="flags[f.key]"><span class="sl"></span></span>
            </label>
        </div>
        <div class="nrc-x-locks" v-if="hasLockBones">
            <label class="nrc-x-switch" style="cursor:pointer">
                <span class="txt"><div class="lbl">Lock vanilla bones</div></span>
                <span class="nrc-x-toggle"><input type="checkbox" v-model="lockOpen"><span class="sl"></span></span>
            </label>
            <div class="nrc-x-chips" v-if="lockOpen">
                <span class="nrc-x-chip" v-for="b in bones" :key="b" :class="{on: locks[b]}" @click="locks[b] = !locks[b]">{{ b }}</span>
            </div>
        </div>
    </div>
`;

export function applyEmoteSettings(anim: any, type: CosmeticType, state: EmoteSettingsValues) {
    if (!anim) return;
    const flagTargets = hasController() ? (Animation.all as any[]) : [anim];
    for (const target of flagTargets) writeFlags(target, type, state.flags);
    writeLocks(anim, type, state.lockOpen ? state.locks : {});
}
