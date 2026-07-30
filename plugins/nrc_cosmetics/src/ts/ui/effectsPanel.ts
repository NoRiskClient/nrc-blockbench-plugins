import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { nodePath } from '../core/node';
import { mcId } from '../core/util';
import {
    effectStatus, particleEffectId, registerStagedPath, soundEffectId, stageEffectPath,
} from '../platform/effectFiles';
import {
    effectsAnimator, findEffectKeyframe, firstDataPoint, selectedEffectKeyframes,
} from '../platform/effectKeyframes';
import { forgetParticleTexture, particleTextureOf, setParticleTexture } from '../platform/particleTexture';
import { fs } from '../core/node';

interface EffectRow {
    uuid: string;
    channel: string;
    time: number;
    label: string;
    effect: string;
    locator: string;
    status: string;
    file: string;
    textured: boolean;
}

const CHANNEL_ICONS: { [channel: string]: string } = {
    sound: 'volume_up',
    particle: 'flare',
};

const NEW_LOCATOR = '__new__';

function emoteId(type: CosmeticType): string {
    return mcId(Project && Project.name) || type.defaultName;
}

function locatorNames(): string[] {
    if (typeof Locator === 'undefined' || !Locator.all) return [];
    return (Locator.all as any[]).map((l) => l.name).filter(Boolean);
}

function buildRows(): EffectRow[] {
    return selectedEffectKeyframes().map((keyframe) => {
        const point = firstDataPoint(keyframe);
        const file = point.file || '';
        return {
            uuid: keyframe.uuid,
            channel: keyframe.channel,
            time: keyframe.time,
            label: file ? nodePath.basename(file) : (point.effect || '(empty)'),
            effect: point.effect || '',
            locator: point.locator || '',
            status: effectStatus(point),
            file,
            textured: keyframe.channel === 'particle' && !!particleTextureOf(file),
        };
    });
}

function readText(path: string): string {
    try {
        return fs.readFileSync(path, 'utf8');
    } catch (e) {
        return '';
    }
}

function addEffect(type: CosmeticType, channel: string, done: () => void) {
    const animation = Animation.selected;
    if (!animation) {
        Blockbench.showQuickMessage('Select an animation first', 1600);
        return;
    }

    const sound = channel === 'sound';
    Blockbench.import({
        resource_id: 'nrc_effect_' + channel,
        extensions: sound ? ['ogg'] : ['json'],
        type: sound ? 'Audio File' : 'Particle Effect',
    }, function (files: any[]) {
        const picked = files && files[0];
        if (!picked || !picked.path) {
            Blockbench.showQuickMessage('That needs the desktop app', 2000);
            return;
        }

        const staged = stageEffectPath(emoteId(type), picked.path);
        if (!staged) {
            Blockbench.showQuickMessage('Could not stage that file', 2400);
            return;
        }

        const effect = sound
            ? soundEffectId(type.assetNamespace, emoteId(type), nodePath.basename(staged))
            : particleEffectId(type.assetNamespace, readText(staged));
        if (!effect) {
            Blockbench.showQuickMessage('That file has no particle identifier', 2400);
            return;
        }

        const animator = effectsAnimator(animation, true);
        if (!animator) return;

        Undo.initEdit({ animations: [animation] });
        animator.createKeyframe({ effect, file: staged }, Timeline.time, channel, false, false);
        Undo.finishEdit('Add ' + channel + ' effect');

        registerStagedPath(channel, staged);
        done();
        Blockbench.showQuickMessage(effect, 2200);
    });
}

export function installEffectsPanel(registry: Registry, type: CosmeticType) {
    const state: any = {
        rows: [] as EffectRow[],
        locators: [] as string[],
        icons: CHANNEL_ICONS,

        refresh() {
            state.rows = buildRows();
            state.locators = locatorNames();
        },
        addSound() {
            addEffect(type, 'sound', state.refresh);
        },
        addParticle() {
            addEffect(type, 'particle', state.refresh);
        },
        seek(row: EffectRow) {
            const keyframe = findEffectKeyframe(row.uuid);
            if (!keyframe) return;
            Timeline.setTime(row.time);
            for (const other of (Timeline.selected || []).slice()) other.selected = false;
            if (Timeline.selected && Timeline.selected.empty) Timeline.selected.empty();
            keyframe.select();
        },
        createLocator(row: EffectRow) {
            const parent = Group.first_selected || (Group.all || [])[0];
            if (!parent) {
                Blockbench.showQuickMessage('Select a bone first', 1800);
                return;
            }
            const name = 'locator_' + ((Locator.all || []).length + 1);
            Undo.initEdit({ outliner: true, elements: [] });
            const locator: any = new Locator({ name, position: parent.origin.slice() }).addTo(parent).init();
            Undo.finishEdit('Add effect locator');
            state.setLocator(row, locator.name);
            Blockbench.showQuickMessage('Added ' + locator.name + ' on ' + parent.name, 2200);
        },
        setLocator(row: EffectRow, value: string) {
            if (value === NEW_LOCATOR) {
                state.createLocator(row);
                return;
            }
            const keyframe = findEffectKeyframe(row.uuid);
            const point = keyframe && firstDataPoint(keyframe);
            if (!point) return;
            Undo.initEdit({ keyframes: [keyframe] });
            point.locator = value;
            Undo.finishEdit('Change effect locator');
            state.refresh();
        },
        remove(row: EffectRow) {
            const keyframe = findEffectKeyframe(row.uuid);
            if (!keyframe) return;
            Undo.initEdit({ animations: [Animation.selected] });
            keyframe.remove();
            Undo.finishEdit('Remove effect');
            state.refresh();
        },
        pickTexture(row: EffectRow) {
            if (!row.file) return;
            Blockbench.import({
                resource_id: 'nrc_particle_texture',
                extensions: ['png'],
                type: 'Particle Texture',
            }, function (files: any[]) {
                const png = files && files[0];
                if (!png || !png.path) {
                    Blockbench.showQuickMessage('That needs the desktop app', 2000);
                    return;
                }
                if (setParticleTexture(row.file, png.path)) {
                    state.refresh();
                    Blockbench.showQuickMessage('Texture attached', 1800);
                } else {
                    Blockbench.showQuickMessage('Could not attach that texture', 2400);
                }
            });
        },
        timeLabel(row: EffectRow): string {
            return row.time.toFixed(2) + 's';
        },
    };

    registry.css(`
        .nrc-fx { display: flex; flex-direction: column; gap: 4px; padding: 4px; }
        .nrc-fx-bar { display: flex; gap: 4px; }
        .nrc-fx-bar button { flex: 1; }
        .nrc-fx-empty { color: var(--color-subtle_text); font-size: 11px; padding: 6px 2px; }
        .nrc-fx-row { display: flex; align-items: center; gap: 5px; padding: 2px 3px; border-radius: 3px; cursor: pointer; }
        .nrc-fx-row:hover { background: var(--color-selected); }
        .nrc-fx-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .nrc-fx-dot.ok { background: var(--color-accent); }
        .nrc-fx-dot.missing { background: var(--color-subtle_text); }
        .nrc-fx-dot.unresolved { background: #d94a4a; }
        .nrc-fx-time { font-size: 10px; color: var(--color-subtle_text); min-width: 38px; }
        .nrc-fx-name { flex: 1; overflow: hidden; }
        .nrc-fx-name > div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nrc-fx-id { font-size: 9px; color: var(--color-subtle_text); }
        .nrc-fx-loc { max-width: 96px; }
        .nrc-fx-tex.off { color: #d94a4a; }
    `);

    registry.panel('nrc_effects_' + type.id, {
        name: 'Emote Effects',
        icon: 'graphic_eq',
        growable: true,
        resizable: true,
        condition: { modes: ['animate'], formats: [type.formatId] },
        default_position: {
            slot: 'right_bar',
            height: 180,
            sidebar_index: 4,
            float_position: [0, 0],
            float_size: [320, 220],
        },
        component: {
            data: () => state,
            template: `
                <div class="nrc-fx">
                    <div class="nrc-fx-bar">
                        <button type="button" @click="addSound()">+ Sound</button>
                        <button type="button" @click="addParticle()">+ Particle</button>
                    </div>
                    <div v-if="!rows.length" class="nrc-fx-empty">
                        No sounds or particles yet. Move the playhead, then add one.
                    </div>
                    <div v-for="row in rows" :key="row.uuid" class="nrc-fx-row" @click="seek(row)">
                        <div class="nrc-fx-dot" :class="row.status" :title="row.status"></div>
                        <div class="nrc-fx-time">{{ timeLabel(row) }}</div>
                        <i class="material-icons icon">{{ icons[row.channel] }}</i>
                        <div class="nrc-fx-name">
                            <div>{{ row.label }}</div>
                            <div class="nrc-fx-id">{{ row.effect }}</div>
                        </div>
                        <select v-if="row.channel === 'particle'" class="nrc-fx-loc" :value="row.locator"
                            @click.stop @change="setLocator(row, $event.target.value)">
                            <option value="">no locator</option>
                            <option v-for="l in locators" :key="l" :value="l">{{ l }}</option>
                            <option value="${NEW_LOCATOR}">+ new locator on selected bone</option>
                        </select>
                        <i v-if="row.channel === 'particle'" class="material-icons icon nrc-fx-tex"
                            :class="{off: !row.textured}"
                            :title="row.textured ? 'Texture attached, click to replace' : 'No texture, showing placeholder. Click to attach a PNG'"
                            @click.stop="pickTexture(row)">{{ row.textured ? 'image' : 'broken_image' }}</i>
                        <i class="material-icons icon" @click.stop="remove(row)">clear</i>
                    </div>
                </div>
            `,
        },
    });

    const onProject = () => {
        forgetParticleTexture();
        state.refresh();
    };
    for (const event of ['select_animation', 'update_keyframe_selection', 'finished_edit', 'select_mode']) {
        registry.event(event, state.refresh);
    }
    registry.event('load_project', onProject);
    registry.event('select_project', onProject);
    state.refresh();
}
