import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { isCosmeticFormat } from '../platform/format';
import { initFlags, initLocks, anyLocked, writeMeta } from '../domain/meta';
import { buildAnimationJson } from '../serialization/animation';
import { buildGeoJson } from '../serialization/geometry';
import { buildNoriskJson } from '../serialization/norisk';
import { writeFiles, sanitize, OutFile } from '../io/exportFiles';
import { addLivePreview, clearLivePreviews } from '../platform/templates/livePreview';
import { mcId } from '../core/util';
import { log, logReset } from '../core/log';

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

// Official NRC rarity colors (RarityColors.kt baseColor).
const RARITY_COLORS: { [r: string]: string } = {
    COMMON: '#757575',
    UNCOMMON: '#1c7c35',
    RARE: '#185695',
    EPIC: '#7b25a4',
    LEGENDARY: '#a46823',
};

export function ensureExportCss(registry: Registry) {
    registry.css(`
        .nrc-x { display: flex; flex-direction: column; gap: 12px; padding: 2px; }
        .nrc-x-head { display: flex; align-items: center; gap: 8px; }
        .nrc-x-head .material-icons { font-size: 22px; color: var(--color-accent); }
        .nrc-x-head h2 { margin: 0; font-size: 15px; flex: 1; }
        .nrc-x-base { font-family: monospace; color: var(--color-subtle_text); font-size: 11px; }

        .nrc-x-preview { display: flex; justify-content: center; background: var(--color-dark); border-radius: 6px; padding: 4px; }
        .nrc-x-preview canvas { width: 140px; height: 140px; }

        .nrc-x-name input { width: 100%; box-sizing: border-box; font-size: 13px; padding: 5px 8px; }
        .nrc-x-files { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
        .nrc-x-files .chip { font-family: monospace; font-size: 10px; background: var(--color-button); border-radius: 10px; padding: 2px 8px; color: var(--color-subtle_text); }

        .nrc-x-sec-h { font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--color-subtle_text); margin-bottom: 5px; }

        .nrc-x-cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .nrc-x-card { position: relative; border: 1.5px solid var(--color-border); border-radius: 6px; padding: 8px; cursor: pointer; text-align: center; transition: border-color .1s, background .1s; }
        .nrc-x-card:hover { background: var(--color-button); }
        .nrc-x-card.on { border-color: var(--color-accent); background: var(--color-selected); }
        .nrc-x-card .material-icons { font-size: 22px; }
        .nrc-x-card .t { font-size: 12px; font-weight: 600; margin-top: 2px; }
        .nrc-x-card .f { font-family: monospace; font-size: 9px; color: var(--color-subtle_text); word-break: break-all; }
        .nrc-x-card .tick { position: absolute; top: 4px; right: 5px; font-size: 14px; color: var(--color-accent); display: none; }
        .nrc-x-card.on .tick { display: block; }

        .nrc-x-switches { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
        .nrc-x-switch { display: flex; align-items: center; gap: 8px; }
        .nrc-x-switch .txt { flex: 1; }
        .nrc-x-switch .lbl { font-size: 12px; }
        .nrc-x-switch .desc { font-size: 10px; color: var(--color-subtle_text); }
        .nrc-x-toggle { position: relative; width: 32px; height: 17px; flex: none; cursor: pointer; }
        .nrc-x-toggle input { display: none; }
        .nrc-x-toggle .sl { position: absolute; inset: 0; background: var(--color-button); border-radius: 9px; transition: background .12s; }
        .nrc-x-toggle .sl::before { content: ''; position: absolute; width: 13px; height: 13px; left: 2px; top: 2px; background: var(--color-text); border-radius: 50%; transition: transform .12s; }
        .nrc-x-toggle input:checked + .sl { background: var(--color-accent); }
        .nrc-x-toggle input:checked + .sl::before { transform: translateX(15px); }

        .nrc-x-locks { margin-top: 8px; }
        .nrc-x-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
        .nrc-x-chip { font-size: 11px; padding: 3px 9px; border-radius: 12px; border: 1px solid var(--color-border); cursor: pointer; user-select: none; color: var(--color-subtle_text); }
        .nrc-x-chip:hover { background: var(--color-button); }
        .nrc-x-chip.on { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-light); }

        .nrc-x-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .nrc-x-row > label { width: 64px; color: var(--color-subtle_text); font-size: 12px; }
        .nrc-x-row input { flex: 1; padding: 4px 7px; }
        .nrc-x-pills { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
        .nrc-x-pill { font-size: 11px; font-weight: 600; padding: 3px 11px; border-radius: 12px; border: 1.5px solid; cursor: pointer; user-select: none; }

        .nrc-x-foot { font-size: 12px; color: var(--color-subtle_text); text-align: center; padding-top: 2px; }
        .nrc-x-foot b { color: var(--color-text); }
    `);
}

export function createExportAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_export_' + type.id, {
        name: 'Export NRC ' + type.formatName,
        description: 'Export the animation, model and cosmetic metadata',
        icon: 'archive',
        category: 'file',
        condition: () => isCosmeticFormat(type) && Animation.all.length > 0,
        click() {
            const metaAnim: any = Animation.selected || Animation.all[0];

            const state = {
                name: (Project.name || (metaAnim && metaAnim.name) || type.defaultName),
                exportAnimation: type.exportsAnimation,
                exportNorisk: true,
                exportModel: type.exportsModelDefault(),
                flags: initFlags(metaAnim, type),
                locks: initLocks(metaAnim, type),
                lockOpen: anyLocked(metaAnim, type),
                creator: settings.credit?.value || '',
                price: 0,
                rarity: 'COMMON',
                flagDefs: type.metaFields,
                bones: type.bones,
                hasLockBones: type.hasLockBones,
                rarities: RARITIES,
                colors: RARITY_COLORS,
                icon: type.icon,
                typeName: type.formatName,
            };

            new Dialog('nrc_export_' + type.id, {
                id: 'nrc_export_' + type.id,
                title: 'Export NRC ' + type.formatName,
                width: 540,
                onCancel() { clearLivePreviews(); },
                component: {
                    data() { return state; },
                    computed: {
                        base(this: any) { return mcId(this.name) || type.defaultName; },
                        outFiles(this: any) {
                            const f: string[] = [];
                            if (this.exportAnimation) f.push(this.base + '.animation.json');
                            if (this.exportModel) f.push(this.base + '.geo.json');
                            if (this.exportNorisk) f.push(this.base + '.norisk.json');
                            return f;
                        },
                    },
                    mounted(this: any) {
                        this.$nextTick(() => {
                            const cv = this.$refs.preview;
                            if (cv) { try { addLivePreview(cv, buildAnimationJson(type)); } catch (e) { /* ignore */ } }
                        });
                    },
                    template: `
                        <div class="nrc-x">
                            <div class="nrc-x-head">
                                <i class="material-icons">{{ icon }}</i>
                                <h2>Export {{ typeName }}</h2>
                                <span class="nrc-x-base">{{ base }}</span>
                            </div>

                            <div class="nrc-x-preview"><canvas ref="preview" width="132" height="132"></canvas></div>

                            <div class="nrc-x-name">
                                <input type="text" v-model="name" placeholder="Name">
                                <div class="nrc-x-files">
                                    <span class="chip" v-for="f in outFiles" :key="f">{{ f }}</span>
                                </div>
                            </div>

                            <div>
                                <div class="nrc-x-sec-h">What to export</div>
                                <div class="nrc-x-cards">
                                    <div class="nrc-x-card" :class="{on: exportAnimation}" @click="exportAnimation = !exportAnimation">
                                        <i class="material-icons tick">check_circle</i>
                                        <i class="material-icons">movie</i>
                                        <div class="t">Animation</div><div class="f">.animation.json</div>
                                    </div>
                                    <div class="nrc-x-card" :class="{on: exportModel}" @click="exportModel = !exportModel">
                                        <i class="material-icons tick">check_circle</i>
                                        <i class="material-icons">view_in_ar</i>
                                        <div class="t">Model</div><div class="f">.geo.json</div>
                                    </div>
                                    <div class="nrc-x-card" :class="{on: exportNorisk}" @click="exportNorisk = !exportNorisk">
                                        <i class="material-icons tick">check_circle</i>
                                        <i class="material-icons">sell</i>
                                        <div class="t">Metadata</div><div class="f">.norisk.json</div>
                                    </div>
                                </div>
                            </div>

                            <div v-if="exportAnimation">
                                <div class="nrc-x-sec-h">Emote settings</div>
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

                            <div v-if="exportNorisk">
                                <div class="nrc-x-sec-h">Cosmetic metadata</div>
                                <div class="nrc-x-row"><label>Creator</label><input type="text" v-model="creator"></div>
                                <div class="nrc-x-row"><label>Price</label><input type="number" min="0" v-model.number="price"></div>
                                <div class="nrc-x-row"><label>Rarity</label>
                                    <div class="nrc-x-pills">
                                        <span class="nrc-x-pill" v-for="r in rarities" :key="r"
                                            @click="rarity = r"
                                            :style="rarity === r ? {background: colors[r], borderColor: colors[r], color: '#fff'} : {borderColor: colors[r], color: colors[r]}">{{ r }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="nrc-x-foot" v-if="outFiles.length">Exports <b>{{ outFiles.length }}</b> file(s) into one folder</div>
                            <div class="nrc-x-foot" v-else>Nothing selected</div>
                        </div>
                    `,
                },
                onConfirm() {
                    clearLivePreviews();
                    logReset();
                    const base = sanitize(state.name) || type.defaultName;
                    const files: OutFile[] = [];

                    if (state.exportAnimation && metaAnim) {
                        const locks = state.lockOpen ? state.locks : {};
                        writeMeta(metaAnim, type, state.flags, locks);
                    }
                    if (state.exportAnimation) {
                        files.push({ suffix: '.animation.json', content: JSON.stringify(buildAnimationJson(type), null, 2) });
                    }
                    if (state.exportModel) {
                        files.push({ suffix: '.geo.json', content: buildGeoJson() });
                    }
                    if (state.exportNorisk) {
                        files.push({
                            suffix: '.norisk.json',
                            content: JSON.stringify(buildNoriskJson(type, {
                                name: state.name,
                                creator: state.creator,
                                price: Number(state.price) || 0,
                                rarity: state.rarity,
                                path: base,
                            }), null, 2),
                        });
                    }

                    log('export base=' + base + ' files=' + files.map((f) => f.suffix).join(','));
                    if (!files.length) {
                        Blockbench.showQuickMessage('Nothing selected to export', 1800);
                        return;
                    }
                    writeFiles(base, files);
                },
            }).show();
        },
    });
}
