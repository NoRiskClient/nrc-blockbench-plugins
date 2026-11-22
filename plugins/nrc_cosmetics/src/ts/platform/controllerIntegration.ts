import { Registry } from '../core/registry';
import { EMOTE } from '../cosmetics/emote';
import { CosmeticType } from '../cosmetics/types';
import { currentType, isCosmeticFormat } from './format';
import { PREVIEW_STOP_VARIABLE, STOP_STATE, findState } from '../domain/controller';

const BLEND = 0.15;
const QUIRK_TIMER = 'v.quirk_at = q.life_time + math.random(4, 8);';

interface ControllerPreset {
    name: string;
    initial_state: string;
    states: { [name: string]: any };
}

const EMOTE_PRESETS: ControllerPreset[] = [
    {
        name: 'NRC Emote: Intro & Stop',
        initial_state: 'start',
        states: {
            start: { animations: ['start'], transitions: [{ idle: 'q.all_animations_finished' }], blend_transition: BLEND },
            idle: { animations: ['idle'], blend_transition: BLEND },
            [STOP_STATE]: { animations: [STOP_STATE] },
        },
    },
    {
        name: 'NRC Emote: Walking',
        initial_state: 'idle',
        states: {
            idle: { animations: ['idle'], transitions: [{ walk: 'q.is_moving' }], blend_transition: BLEND },
            walk: { animations: ['walk'], transitions: [{ idle: '!q.is_moving' }], blend_transition: BLEND },
        },
    },
    {
        name: 'NRC Emote: Random Quirk',
        initial_state: 'idle',
        states: {
            idle: { animations: ['idle'], on_entry: QUIRK_TIMER, transitions: [{ quirk: 'q.life_time > v.quirk_at' }], blend_transition: BLEND },
            quirk: { animations: ['quirk'], transitions: [{ idle: 'q.all_animations_finished' }], blend_transition: BLEND },
        },
    },
];

const COSMETIC_PRESETS: ControllerPreset[] = [
    {
        name: 'NRC Cosmetic: Walking',
        initial_state: 'idle',
        states: {
            idle: { animations: ['idle'], transitions: [{ walking: 'q.is_moving' }], blend_transition: BLEND },
            walking: { animations: ['walking'], transitions: [{ idle: '!q.is_moving' }], blend_transition: BLEND },
        },
    },
    {
        name: 'NRC Cosmetic: Random Quirk',
        initial_state: 'idle',
        states: {
            idle: { animations: ['idle'], on_entry: QUIRK_TIMER, transitions: [{ quirk: 'q.life_time > v.quirk_at' }], blend_transition: BLEND },
            quirk: { animations: ['quirk'], transitions: [{ idle: 'q.all_animations_finished' }], blend_transition: BLEND },
        },
    },
];

const ALL_PRESETS = [...EMOTE_PRESETS, ...COSMETIC_PRESETS];

function presetsFor(type: CosmeticType | null): ControllerPreset[] {
    if (!type || !type.hasAnimation) return [];
    return type.id === EMOTE.id ? EMOTE_PRESETS : COSMETIC_PRESETS;
}

function removeOurPresets() {
    const presets: any[] = AnimationController.presets;
    for (let i = presets.length - 1; i >= 0; i--) {
        if (ALL_PRESETS.includes(presets[i])) presets.splice(i, 1);
    }
}

function syncPresets() {
    removeOurPresets();
    AnimationController.presets.push(...presetsFor(currentType()));
}

function saveAnimationFile() {
    const path = ((Animation.all || []) as any[]).find((a) => a.path)?.path || '';
    Format.animation_codec.exportFile(path);
    for (const controller of AnimationController.all as any[]) controller.saved = true;
}

function renameController(controller: any) {
    Blockbench.textPrompt('generic.name', controller.name, (name: string) => {
        if (!name || name === controller.name) return;
        Undo.initEdit({ animation_controllers: [controller] });
        controller.name = name;
        controller.createUniqueName();
        Undo.finishEdit('Rename animation controller');
    });
}

function previewStopJump(controller: any): boolean {
    if (!isCosmeticFormat(EMOTE) || BarItems.animation_controller_preview_mode?.value !== 'play') return false;
    const stop = findState(controller, STOP_STATE);
    const stopping = !!Animator.MolangParser.parse(PREVIEW_STOP_VARIABLE);
    if (!stopping) controller.nrcStopJumped = false;
    if (!stop || !stopping || controller.nrcStopJumped) return false;
    controller.nrcStopJumped = true;
    if (controller.selected_state !== stop) stop.select();
    Animator.preview();
    return true;
}

export function installControllerIntegration(registry: Registry) {
    registry.monkeypatch(AnimationController.prototype, 'updatePreview', (original: any) => function (this: any, ...args: any[]) {
        if (previewStopJump(this)) return;
        return original.apply(this, args);
    });
    registry.monkeypatch(AnimationController.prototype, 'save', (original: any) => function (this: any, ...args: any[]) {
        if (!isCosmeticFormat()) return original.apply(this, args);
        saveAnimationFile();
    });
    registry.monkeypatch(AnimationController.prototype, 'propertiesDialog', (original: any) => function (this: any, ...args: any[]) {
        if (!isCosmeticFormat()) return original.apply(this, args);
        renameController(this);
        return this;
    });

    for (const event of ['load_project', 'select_project', 'unselect_project', 'select_mode']) registry.event(event, syncPresets);
    registry.track(removeOurPresets);
    syncPresets();
}
