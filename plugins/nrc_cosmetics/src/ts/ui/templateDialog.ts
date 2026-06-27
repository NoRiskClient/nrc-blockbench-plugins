import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { Template } from '../platform/templates/model';
import { loadTemplates } from '../platform/templates/source';
import { addLivePreview, clearLivePreviews } from '../platform/templates/livePreview';
import { loadRig } from '../platform/rig';
import { importAnimation } from '../platform/import/animationImport';
import { importGeometry } from '../platform/import/geometryImport';
import { log } from '../core/log';

const BLANK: Template = { id: 'blank', name: 'Blank Emote', kind: 'blank', hasProps: false };

let dialog: any = null;
const state: any = {
    type: null as CosmeticType | null,
    loading: true,
    error: '',
    search: '',
    templates: [BLANK] as Template[],
};

function applyTemplate(type: CosmeticType, t: Template) {
    try {
        if (t.kind === 'blank') {
            loadRig(type);
        } else {
            loadRig(type, true);
            if (t.hasProps && t.geoJson) importGeometry(t.geoJson, t.previewDataUri);
            importAnimation(type, t.animationJson);
            if (typeof Project !== 'undefined' && Project) Project.name = t.name;
            Canvas.updateAll();
        }
        Blockbench.showQuickMessage('Loaded: ' + t.name, 1600);
    } catch (e: any) {
        log('applyTemplate ERROR: ' + (e && e.stack ? e.stack : String(e)));
    }
}

async function fetchInto(force: boolean) {
    state.loading = true;
    state.error = '';
    clearLivePreviews();
    const res = await loadTemplates(force);
    state.templates = [BLANK].concat(res.templates);
    state.error = res.error || '';
    state.loading = false;
}

export function ensureTemplateCss(registry: Registry) {
    registry.css(`
        .nrc-tpl { display: flex; flex-direction: column; gap: 8px; min-height: 320px; }
        .nrc-tpl-head { display: flex; gap: 6px; align-items: center; }
        .nrc-tpl-head input { flex: 1; }
        .nrc-tpl-status { color: var(--color-subtle_text); padding: 8px 2px; }
        .nrc-tpl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; max-height: 62vh; overflow-y: auto; }
        .nrc-tpl-card { position: relative; border: 1px solid var(--color-border); border-radius: 5px; padding: 6px; cursor: pointer; text-align: center; background: var(--color-back); }
        .nrc-tpl-card:hover { border-color: var(--color-accent); background: var(--color-button); }
        .nrc-tpl-thumb { width: 100%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; background: var(--color-dark); border-radius: 4px; overflow: hidden; }
        .nrc-tpl-thumb canvas { width: 100%; height: 100%; }
        .nrc-tpl-noimg { font-size: 30px; color: var(--color-subtle_text); }
        .nrc-tpl-name { margin-top: 4px; font-size: 11px; word-break: break-word; }
        .nrc-tpl-badge { position: absolute; top: 4px; right: 4px; font-size: 9px; background: var(--color-accent); color: var(--color-light); border-radius: 3px; padding: 0 3px; }
    `);
}

export function openTemplateDialog(type: CosmeticType) {
    state.type = type;
    state.search = '';
    state.templates = [BLANK];
    state.loading = true;
    state.error = '';

    dialog = new Dialog('nrc_template_picker', {
        id: 'nrc_template_picker',
        title: 'New ' + type.formatName,
        width: 660,
        buttons: ['dialog.cancel'],
        onCancel() { clearLivePreviews(); },
        component: {
            data() { return state; },
            computed: {
                filtered(this: any) {
                    const q = (this.search || '').toLowerCase();
                    return this.templates.filter((t: Template) => t.kind === 'blank' || t.name.toLowerCase().includes(q));
                },
            },
            methods: {
                pick(this: any, t: Template) {
                    clearLivePreviews();
                    if (dialog) dialog.hide();
                    applyTemplate(state.type, t);
                },
                refresh() { fetchInto(true); },
                bindCanvases(this: any) {
                    const root = this.$el;
                    if (!root || !state.type) return;
                    const list = root.querySelectorAll('canvas[data-tpl]:not([data-bound])');
                    list.forEach((cv: any) => {
                        const id = cv.getAttribute('data-tpl');
                        const t = state.templates.find((x: Template) => x.id === id);
                        if (!t || !t.animationJson) return;
                        cv.setAttribute('data-bound', '1');
                        addLivePreview(cv, t.animationJson, t.geoJson, t.previewDataUri);
                    });
                },
            },
            mounted(this: any) { this.$nextTick(() => this.bindCanvases()); },
            updated(this: any) { this.$nextTick(() => this.bindCanvases()); },
            template: `
                <div class="nrc-tpl">
                    <div class="nrc-tpl-head">
                        <input type="text" v-model="search" placeholder="Search templates…">
                        <button @click="refresh" :disabled="loading" title="Re-download latest">↻</button>
                    </div>
                    <div v-if="loading" class="nrc-tpl-status">Loading templates…</div>
                    <div v-else-if="error" class="nrc-tpl-status">{{ error }} — only Blank available.</div>
                    <div class="nrc-tpl-grid">
                        <div v-for="t in filtered" :key="t.id" class="nrc-tpl-card" @click="pick(t)">
                            <div class="nrc-tpl-thumb">
                                <canvas v-if="t.kind === 'emote'" class="nrc-tpl-cv" :data-tpl="t.id" width="132" height="132"></canvas>
                                <div v-else class="nrc-tpl-noimg">+</div>
                            </div>
                            <div class="nrc-tpl-name">{{ t.name }}</div>
                            <div v-if="t.hasProps" class="nrc-tpl-badge">props</div>
                        </div>
                    </div>
                </div>
            `,
        },
    });
    dialog.show();
    fetchInto(false);
}
