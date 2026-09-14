import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { isCosmeticFormat } from '../platform/format';
import { emoteSettingsState, applyEmoteSettings, EMOTE_SETTINGS_TEMPLATE } from './emoteSettingsPanel';
import { buildAnimationJson } from '../serialization/animation';
import { buildGeoJson } from '../serialization/geometry';
import { buildNoriskJson } from '../serialization/norisk';
import { writeFiles, sanitize, OutFile } from '../io/exportFiles';
import { collectEffectFiles, listEffectFiles } from '../platform/effectFiles';
import { countEffectKeyframes } from '../platform/effectKeyframes';
import { dataUriToBytes } from '../core/node';
import { sourceMeta } from '../platform/sourceMeta';
import { strandedCubes } from '../platform/playerModel';
import { addLivePreview, clearLivePreviews, PreviewParticle } from '../platform/templates/livePreview';
import { particleTextureOf } from '../platform/particleTexture';
import { fs, toBase64 } from '../core/node';
import { mcId } from '../core/util';
import { log, logReset } from '../core/log';

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

const RARITY_COLORS: { [r: string]: string } = {
    COMMON: '#757575',
    UNCOMMON: '#1c7c35',
    RARE: '#185695',
    EPIC: '#7b25a4',
    LEGENDARY: '#a46823',
};

function reportStrandedCubes(): boolean {
    const stranded = strandedCubes();
    if (!stranded.length) return false;
    Blockbench.showMessageBox({
        title: 'Cubes outside a bone',
        icon: 'warning',
        message: stranded.length + ' cube(s) sit directly in a biped group: '
            + stranded.map((c: any) => c.parent.name + '/' + c.name).join(', ')
            + '.\n\nThe client renders the children of a biped bone, never its own cubes, so these '
            + 'would be invisible in game. Move them into one of the armor* groups, or into a group '
            + 'of their own to inherit the limb rotation. Untick Export on a cube to skip this check.',
        buttons: ['OK'],
    });
    return true;
}

function propTexture(): Uint8Array | null {
    const uri = propTextureDataUri();
    if (!uri) return null;
    try {
        return dataUriToBytes(uri);
    } catch (e) {
        log('export: could not read project texture: ' + e);
        return null;
    }
}

function propTextureDataUri(): string | undefined {
    const texture: any = (Texture.getDefault && Texture.getDefault()) || (Texture.all || [])[0];
    if (!texture || !texture.getDataURL) return undefined;
    try {
        return texture.getDataURL();
    } catch (e) {
        return undefined;
    }
}

function propGeoJson(): any {
    try {
        const parsed = JSON.parse(buildGeoJson());
        const geo = (parsed['minecraft:geometry'] || [])[0];
        if (!geo) return undefined;
        geo.bones = (geo.bones || []).map((b: any) =>
            typeof b.name === 'string' && b.name.toLowerCase().startsWith('biped')
                ? { ...b, cubes: undefined }
                : b
        );
        const useful = geo.bones.some((b: any) =>
            (b.cubes && b.cubes.length) || (b.locators && Object.keys(b.locators).length)
        );
        return useful ? parsed : undefined;
    } catch (e) {
        return undefined;
    }
}

function previewParticles(): PreviewParticle[] {
    if (!fs) return [];
    const out: PreviewParticle[] = [];
    const seen: Record<string, boolean> = {};
    for (const ref of listEffectFiles(['particle'])) {
        if (!ref.path.endsWith('.particle.json') || seen[ref.path]) continue;
        seen[ref.path] = true;
        const texturePath = particleTextureOf(ref.path);
        if (!texturePath) continue;
        try {
            const json = JSON.parse(fs.readFileSync(ref.path, 'utf8'));
            const textureDataUri = 'data:image/png;base64,' + toBase64(fs.readFileSync(texturePath));
            out.push({ json, textureDataUri });
        } catch (e) {
            log('export preview: particle skipped ' + ref.path + ': ' + e);
        }
    }
    return out;
}

function selectedChannels(state: any): string[] {
    const channels: string[] = [];
    if (state.exportParticles) channels.push('particle');
    if (state.exportSounds) channels.push('sound');
    return channels;
}

export function createExportAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_export_' + type.id, {
        name: 'Export ' + type.formatName,
        description: 'Export the animation, model and cosmetic metadata',
        icon: 'archive',
        category: 'file',
        condition: () => isCosmeticFormat(type) && (!type.hasAnimation || Animation.all.length > 0),
        click() {
            if (reportStrandedCubes()) return;

            const metaAnim: any = Animation.selected || Animation.all[0];
            const texture = propTexture();
            const particleCount = countEffectKeyframes('particle');
            const soundCount = countEffectKeyframes('sound');

            const source = sourceMeta();
            const previous = (source && source.norisk) || null;

            const state = {
                name: (previous && previous.name) || (Project.name || (metaAnim && metaAnim.name) || type.defaultName),
                exportAnimation: type.exportsAnimation && Animation.all.length > 0,
                exportNorisk: !!previous,
                exportModel: type.exportsModelDefault(),
                exportTexture: !!texture,
                exportParticles: particleCount > 0,
                exportSounds: soundCount > 0,
                hasTexture: !!texture,
                particleCount,
                soundCount,
                ...emoteSettingsState(metaAnim, type),
                creator: (previous && previous.creator) || settings.credit?.value || '',
                price: (previous && previous.price) || 0,
                rarity: (previous && previous.rarity) || 'COMMON',
                cosmeticType: (previous && previous.type) || type.noriskTypes[0],
                cosmeticTypes: type.noriskTypes,
                rarities: RARITIES,
                colors: RARITY_COLORS,
                icon: type.icon,
                typeName: type.formatName,
            };

            new Dialog('nrc_export_' + type.id, {
                id: 'nrc_export_' + type.id,
                title: 'Export ' + type.formatName,
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
                            if (this.exportTexture && this.hasTexture) f.push(this.base + '.png');
                            if (this.exportNorisk) f.push(this.base + '.norisk.json');
                            for (const ref of listEffectFiles(selectedChannels(this))) f.push(ref.name);
                            return f;
                        },
                    },
                    mounted(this: any) {
                        this.$nextTick(() => {
                            const cv = this.$refs.preview;
                            if (cv) {
                                try {
                                    addLivePreview(cv, buildAnimationJson(type), { propGeo: propGeoJson(), propTexUri: propTextureDataUri(), particles: previewParticles() });
                                } catch (e) { /* ignore */ }
                            }
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
                                    <div class="nrc-x-card" :class="{on: exportTexture && hasTexture, off: !hasTexture}"
                                        @click="hasTexture && (exportTexture = !exportTexture)">
                                        <i class="material-icons tick">check_circle</i>
                                        <i class="material-icons">image</i>
                                        <div class="t">Texture</div><div class="f">.png</div>
                                    </div>
                                    <div class="nrc-x-card" :class="{on: exportParticles && particleCount, off: !particleCount}"
                                        @click="particleCount && (exportParticles = !exportParticles)">
                                        <i class="material-icons tick">check_circle</i>
                                        <i class="material-icons">flare</i>
                                        <div class="t">Particles</div><div class="f">{{ particleCount }} effect(s)</div>
                                    </div>
                                    <div class="nrc-x-card" :class="{on: exportSounds && soundCount, off: !soundCount}"
                                        @click="soundCount && (exportSounds = !exportSounds)">
                                        <i class="material-icons tick">check_circle</i>
                                        <i class="material-icons">volume_up</i>
                                        <div class="t">Sounds</div><div class="f">{{ soundCount }} effect(s)</div>
                                    </div>
                                    <div class="nrc-x-card" :class="{on: exportNorisk}" @click="exportNorisk = !exportNorisk">
                                        <i class="material-icons tick">check_circle</i>
                                        <i class="material-icons">sell</i>
                                        <div class="t">Metadata</div><div class="f">.norisk.json</div>
                                    </div>
                                </div>
                            </div>

                            <div v-if="exportAnimation">${EMOTE_SETTINGS_TEMPLATE}</div>

                            <div v-if="exportNorisk">
                                <div class="nrc-x-sec-h">Cosmetic metadata</div>
                                <div class="nrc-x-row"><label>Creator</label><input type="text" v-model="creator"></div>
                                <div class="nrc-x-row"><label>Price</label><input type="number" min="0" v-model.number="price"></div>
                                <div class="nrc-x-row" v-if="cosmeticTypes.length > 1"><label>Category</label>
                                    <select v-model="cosmeticType">
                                        <option v-for="t in cosmeticTypes" :key="t" :value="t">{{ t }}</option>
                                    </select>
                                </div>

                                <div class="nrc-x-row"><label>Rarity</label>
                                    <div class="nrc-x-pills">
                                        <span class="nrc-x-pill" v-for="r in rarities" :key="r"
                                            @click="rarity = r"
                                            :style="rarity === r ? {background: colors[r], borderColor: colors[r], color: '#fff'} : {borderColor: colors[r], color: colors[r]}">{{ r }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="nrc-x-foot" v-if="outFiles.length">Exports <b>{{ outFiles.length }}</b> file(s) into <b>{{ base }}/</b></div>
                            <div class="nrc-x-foot" v-else>Nothing selected</div>
                        </div>
                    `,
                },
                onConfirm() {
                    clearLivePreviews();
                    logReset();
                    const base = sanitize(state.name) || type.defaultName;
                    const files: OutFile[] = [];

                    if (state.exportAnimation) applyEmoteSettings(metaAnim, type, state);
                    if (state.exportAnimation) {
                        files.push({ suffix: '.animation.json', content: JSON.stringify(buildAnimationJson(type, undefined, base), null, 2) });
                    }
                    if (state.exportModel) {
                        files.push({ suffix: '.geo.json', content: buildGeoJson() });
                    }
                    if (state.exportTexture && texture) {
                        files.push({ suffix: '.png', content: texture });
                    }
                    for (const effect of collectEffectFiles(selectedChannels(state))) {
                        files.push(effect);
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
                                type: state.cosmeticType,
                            }, previous), null, 2),
                        });
                    }
                    if (source && source.mcmeta && state.exportTexture) {
                        files.push({ suffix: '.png.mcmeta', content: source.mcmeta });
                    }

                    log('export base=' + base + ' files=' + files.map((f) => f.name || f.suffix).join(','));
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
