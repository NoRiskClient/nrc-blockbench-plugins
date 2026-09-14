import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { MOLANG_CATALOG, MolangEntry, Support } from '../molang/catalog';
import { COMPARE_ANIM_TIME, CompareRow, compareInKeyframe, sampleKeyframeDemo, sampleParticleDemo } from '../molang/demo';
import { GRAPH_H, GRAPH_W, Graph, buildGraph, formatNumber, playheadX } from '../molang/graph';
import { isCosmeticFormat } from '../platform/format';
import { addLivePreview, clearLivePreviews, removeLivePreview } from '../platform/templates/livePreview';

type Filter = 'all' | 'animation' | 'particle' | 'math' | 'syntax';

const FILTERS: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'animation', label: 'Animation' },
    { id: 'particle', label: 'Particles' },
    { id: 'math', label: 'Math' },
    { id: 'syntax', label: 'Syntax' },
];

const STAGE_SIZE = 200;
const REBAKE_DELAY = 250;
const STAGE_FPS = 60;
const STAGE_CAMERA_DISTANCE = 56;

const ENTRIES = MOLANG_CATALOG
    .filter((entry) => entry.support.client !== 'no')
    .sort((a, b) => (b.usage || 0) - (a.usage || 0) || a.name.localeCompare(b.name));

function matchesFilter(entry: MolangEntry, filter: Filter): boolean {
    switch (filter) {
        case 'all': return true;
        case 'math': return entry.kind === 'function';
        case 'syntax': return entry.kind === 'syntax';
        case 'particle': return entry.kind !== 'function' && entry.kind !== 'syntax' && entry.contexts.includes('particle');
        case 'animation': return entry.kind !== 'function' && entry.kind !== 'syntax'
            && (entry.contexts.includes('emote') || entry.contexts.includes('cosmetic'));
    }
}

function matchesSearch(entry: MolangEntry, needle: string): boolean {
    if (!needle) return true;
    const haystack = [entry.name, ...entry.aliases, entry.summary, entry.caveat || '', ...(entry.usedIn || [])]
        .join(' ').toLowerCase();
    return needle.toLowerCase().split(/\s+/).every((part) => haystack.includes(part));
}

function copy(text: string) {
    const clipbench = (window as any).Clipbench;
    if (clipbench && typeof clipbench.setText === 'function') clipbench.setText(text);
    else if (navigator.clipboard) navigator.clipboard.writeText(text);
    Blockbench.showQuickMessage('Copied ' + text, 1200);
}

function shortCount(count: number): string {
    return count >= 1000 ? (count / 1000).toFixed(1) + 'k' : String(count);
}

function supportLabel(support: Support): string {
    return support === 'yes' ? 'works' : support === 'partial' ? 'partly' : 'reads 0';
}

export function ensureMolangGuideCss(registry: Registry) {
    registry.css(`
        .nrc-mg { display: flex; gap: 12px; height: 560px; }
        .nrc-mg-side { width: 230px; flex: none; display: flex; flex-direction: column; gap: 6px; min-height: 0; }
        .nrc-mg-side input { width: 100%; box-sizing: border-box; }
        .nrc-mg-chips { display: flex; flex-wrap: wrap; gap: 4px; }
        .nrc-mg-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 1px; }
        .nrc-mg-item { display: flex; align-items: center; gap: 6px; padding: 3px 7px; border-radius: 4px; cursor: pointer; }
        .nrc-mg-item:hover { background: var(--color-button); }
        .nrc-mg-item.on { background: var(--color-selected); }
        .nrc-mg-item .nm { flex: 1; font-family: var(--font-code, monospace); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nrc-mg-item .use { font-size: 10px; color: var(--color-subtle_text); }
        .nrc-mg-item .demo { font-size: 13px; color: var(--color-accent); }
        .nrc-mg-empty { color: var(--color-subtle_text); font-size: 12px; padding: 8px 4px; }
        .nrc-mg-main { flex: 1; min-width: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 9px; padding-right: 4px; }
        .nrc-mg-title { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .nrc-mg-title code { font-size: 17px; font-weight: 600; cursor: pointer; }
        .nrc-mg-title code:hover { text-decoration: underline; }
        .nrc-mg-title .also { font-size: 11px; color: var(--color-subtle_text); font-family: var(--font-code, monospace); }
        .nrc-mg-summary { margin: 0; font-size: 13px; }
        .nrc-mg-facts { display: flex; flex-wrap: wrap; gap: 5px; }
        .nrc-mg-fact { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: var(--color-button); color: var(--color-subtle_text); }
        .nrc-mg-fact b { color: var(--color-text); font-weight: 600; }
        .nrc-mg-demo { display: flex; gap: 10px; align-items: stretch; }
        .nrc-mg-stage { flex: none; background: var(--color-dark); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .nrc-mg-stage canvas { width: ${STAGE_SIZE}px; height: ${STAGE_SIZE}px; }
        .nrc-mg-graph { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; background: var(--color-dark); border-radius: 6px; padding: 6px 8px; }
        .nrc-mg-graph svg { width: 100%; flex: 1; min-height: 110px; overflow: visible; }
        .nrc-mg-graph .axis { display: flex; justify-content: space-between; font-size: 10px; color: var(--color-subtle_text); }
        .nrc-mg-graph .readout { font-family: var(--font-code, monospace); font-size: 11px; min-height: 14px; }
        .nrc-mg-caption { font-size: 12px; }
        .nrc-mg-expr { display: flex; gap: 6px; align-items: center; }
        .nrc-mg-expr input { flex: 1; font-family: var(--font-code, monospace); font-size: 12px; padding: 5px 8px; }
        .nrc-mg-expr .material-icons { cursor: pointer; font-size: 18px; color: var(--color-subtle_text); }
        .nrc-mg-expr .material-icons:hover { color: var(--color-text); }
        .nrc-mg-hint { font-size: 11px; color: var(--color-subtle_text); }
        .nrc-mg-table { border-collapse: collapse; font-size: 12px; width: 100%; }
        .nrc-mg-table th { text-align: left; font-weight: 600; color: var(--color-subtle_text); padding: 3px 6px; font-size: 11px; }
        .nrc-mg-table td { padding: 4px 6px; border-top: 1px solid var(--color-border); }
        .nrc-mg-table td.code { font-family: var(--font-code, monospace); }
        .nrc-mg-table tr.bad td { background: rgba(220, 80, 80, 0.14); }
        .nrc-mg-example { font-family: var(--font-code, monospace); font-size: 12px; background: var(--color-dark); padding: 5px 8px; border-radius: 4px; cursor: pointer; }
        .nrc-mg-caveat { font-size: 12px; color: #d9a14a; display: flex; gap: 6px; }
        .nrc-mg-caveat .material-icons { font-size: 16px; }
        .nrc-mg-meta { font-size: 11px; color: var(--color-subtle_text); }
        .nrc-mg-meta b { color: var(--color-text); font-weight: 600; }
    `);
}

function openMolangGuide() {
    const first = ENTRIES[0];
    const state = {
        search: '',
        filter: 'all' as Filter,
        filters: FILTERS,
        selected: first.name,
        expression: (first.demo && first.demo.expression) || '',
        graph: null as Graph | null,
        rows: [] as CompareRow[],
        hasStage: false,
        seconds: 0,
        compareAt: COMPARE_ANIM_TIME,
    };
    const runtime = {
        open: true,
        timer: 0,
        startedAt: 0,
        seconds: 1,
        values: [] as number[],
        baked: '',
    };

    const close = () => {
        runtime.open = false;
        clearTimeout(runtime.timer);
        clearLivePreviews();
    };

    new Dialog('nrc_molang_guide', {
        id: 'nrc_molang_guide',
        title: 'Molang Guide',
        width: 900,
        buttons: ['dialog.close'],
        onConfirm: close,
        onCancel: close,
        component: {
            data() { return state; },
            computed: {
                entries(this: any): MolangEntry[] {
                    return ENTRIES.filter((entry) => matchesFilter(entry, this.filter) && matchesSearch(entry, this.search));
                },
                entry(this: any): MolangEntry | undefined {
                    return ENTRIES.find((entry) => entry.name === this.selected);
                },
                demoExpression(this: any): string {
                    const demo = this.entry && this.entry.demo;
                    return (demo && demo.expression) || '';
                },
                edited(this: any): boolean {
                    return this.demoExpression !== '' && this.expression !== this.demoExpression;
                },
            },
            watch: {
                expression(this: any, value: string) {
                    if (value === runtime.baked) return;
                    clearTimeout(runtime.timer);
                    runtime.timer = setTimeout(() => this.rebuild(), REBAKE_DELAY);
                },
            },
            methods: {
                shortCount,
                supportLabel,
                formatNumber,
                copy(text: string) { copy(text); },
                select(this: any, name: string) {
                    if (!ENTRIES.some((e) => e.name === name)) return;
                    this.selected = name;
                    clearTimeout(runtime.timer);
                    runtime.baked = this.demoExpression;
                    this.expression = runtime.baked;
                    this.$nextTick(() => this.rebuild());
                },
                reset(this: any) {
                    this.expression = this.demoExpression;
                },
                rebuild(this: any) {
                    const canvas = this.$refs.stage;
                    if (canvas) removeLivePreview(canvas);
                    runtime.baked = this.expression;
                    runtime.values = [];
                    this.graph = null;
                    this.rows = [];
                    this.hasStage = false;

                    const demo = this.entry && this.entry.demo;
                    if (!demo) return;
                    if (demo.compare) {
                        this.rows = compareInKeyframe(demo.compare);
                        return;
                    }

                    const samples = demo.particle
                        ? sampleParticleDemo(this.expression)
                        : sampleKeyframeDemo(demo, this.expression);
                    this.graph = buildGraph(samples);
                    runtime.seconds = samples.seconds;
                    this.seconds = samples.seconds;
                    runtime.values = samples.lines[0];
                    runtime.startedAt = performance.now() / 1000;
                    if (samples.animationJson && canvas) {
                        this.hasStage = true;
                        addLivePreview(canvas, samples.animationJson, { fps: STAGE_FPS, cameraDistance: STAGE_CAMERA_DISTANCE });
                    }
                },
                tick(this: any) {
                    if (!runtime.open) return;
                    requestAnimationFrame(() => this.tick());
                    const line = this.$refs.playhead;
                    if (!line || !runtime.values.length) return;
                    const t = (performance.now() / 1000 - runtime.startedAt) % runtime.seconds;
                    const x = playheadX(t, runtime.seconds).toFixed(1);
                    line.setAttribute('x1', x);
                    line.setAttribute('x2', x);
                    const readout = this.$refs.readout;
                    if (!readout) return;
                    const index = Math.round((t / runtime.seconds) * (runtime.values.length - 1));
                    const particle = this.entry && this.entry.demo && this.entry.demo.particle;
                    readout.textContent = (particle ? 'age' : 't') + ' = ' + t.toFixed(2) + ' s  →  '
                        + formatNumber(runtime.values[index]) + (particle ? '  (first particle)' : '');
                },
            },
            mounted(this: any) {
                this.$nextTick(() => {
                    this.rebuild();
                    this.tick();
                });
            },
            template: `
                <div class="nrc-mg">
                    <div class="nrc-mg-side">
                        <input type="text" class="dark_bordered" v-model="search" placeholder="Search…" @keydown.enter.stop>
                        <div class="nrc-mg-chips">
                            <span v-for="f in filters" :key="f.id" class="nrc-x-chip" :class="{ on: filter === f.id }"
                                @click="filter = f.id">{{ f.label }}</span>
                        </div>
                        <div class="nrc-mg-list">
                            <div v-if="!entries.length" class="nrc-mg-empty">Nothing matches.</div>
                            <div v-for="e in entries" :key="e.name" class="nrc-mg-item" :class="{ on: e.name === selected }"
                                :title="e.summary" @click="select(e.name)">
                                <span class="nm">{{ e.name }}</span>
                                <i v-if="e.demo" class="material-icons demo" title="Has a live example">play_circle</i>
                                <span v-if="e.usage" class="use" :title="e.usage + ' uses in shipped cosmetics and emotes'">{{ shortCount(e.usage) }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="nrc-mg-main" v-if="entry">
                        <div class="nrc-mg-title">
                            <code title="Copy" @click="copy(entry.name)">{{ entry.name }}</code>
                            <span v-if="entry.aliases.length" class="also">also {{ entry.aliases.join(', ') }}</span>
                        </div>
                        <p class="nrc-mg-summary">{{ entry.summary }}</p>
                        <div class="nrc-mg-facts">
                            <span v-if="entry.contexts.length" class="nrc-mg-fact">Works in <b>{{ entry.contexts.join(', ') }}</b></span>
                            <span v-if="entry.returns" class="nrc-mg-fact">Returns <b>{{ entry.returns }}</b></span>
                            <span v-if="entry.updates" class="nrc-mg-fact">Updates <b>{{ entry.updates }}</b></span>
                        </div>

                        <div class="nrc-mg-demo" v-show="graph">
                            <div class="nrc-mg-stage" v-show="hasStage">
                                <canvas ref="stage" width="${STAGE_SIZE}" height="${STAGE_SIZE}"></canvas>
                            </div>
                            <div class="nrc-mg-graph" v-if="graph">
                                <div class="axis">
                                    <span>{{ graph.max }}</span>
                                    <span v-if="graph.inputLabel">- - - {{ graph.inputLabel }} (simulated)</span>
                                    <span v-else-if="graph.lines.length > 1">one line per particle</span>
                                </div>
                                <svg viewBox="0 0 ${GRAPH_W} ${GRAPH_H}" preserveAspectRatio="none">
                                    <line v-if="graph.zero !== null" x1="0" x2="${GRAPH_W}" :y1="graph.zero" :y2="graph.zero"
                                        stroke="currentColor" stroke-opacity="0.25" stroke-width="1" vector-effect="non-scaling-stroke"/>
                                    <path v-if="graph.input" :d="graph.input" fill="none" stroke="#d9a14a" stroke-width="1.5"
                                        stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>
                                    <path v-for="(d, i) in graph.lines" :key="i" :d="d" fill="none" style="stroke: var(--color-accent)"
                                        :stroke-opacity="graph.lines.length > 1 ? 0.75 : 1" stroke-width="2" vector-effect="non-scaling-stroke"/>
                                    <line ref="playhead" x1="0" x2="0" y1="0" y2="${GRAPH_H}" stroke="currentColor" stroke-opacity="0.6"
                                        stroke-width="1" vector-effect="non-scaling-stroke"/>
                                </svg>
                                <div class="axis"><span>{{ graph.min }}</span><span>{{ seconds }} s</span></div>
                                <div class="readout" ref="readout"></div>
                            </div>
                        </div>

                        <div v-if="entry.demo" class="nrc-mg-caption">{{ entry.demo.caption }}</div>

                        <div v-if="demoExpression" class="nrc-mg-expr">
                            <input type="text" class="dark_bordered" v-model="expression" spellcheck="false" @keydown.enter.stop>
                            <i v-if="edited" class="material-icons" title="Back to the example" @click="reset()">restart_alt</i>
                            <i class="material-icons" title="Copy" @click="copy(expression)">content_copy</i>
                        </div>
                        <div v-if="demoExpression" class="nrc-mg-hint">Edit the expression — Steve and the graph follow, evaluated exactly like the game does.</div>

                        <table v-if="rows.length" class="nrc-mg-table">
                            <tr><th>Written in a keyframe (anim_time = {{ compareAt }} s)</th><th>Game</th><th>Preview</th></tr>
                            <tr v-for="r in rows" :key="r.expression" :class="{ bad: formatNumber(r.game) !== formatNumber(r.preview) }">
                                <td class="code">{{ r.expression }}</td>
                                <td>{{ formatNumber(r.game) }}</td>
                                <td>{{ formatNumber(r.preview) }}</td>
                            </tr>
                        </table>

                        <div v-if="!demoExpression && entry.example" class="nrc-mg-example" title="Copy" @click="copy(entry.example)">{{ entry.example }}</div>

                        <div v-if="entry.caveat" class="nrc-mg-caveat"><i class="material-icons">warning</i><span>{{ entry.caveat }}</span></div>

                        <div v-if="entry.usedIn && entry.usedIn.length" class="nrc-mg-meta">Used in <b>{{ entry.usedIn.join(', ') }}</b></div>
                        <div class="nrc-mg-meta">
                            Web preview <b>{{ supportLabel(entry.support.web) }}</b> ·
                            Blockbench timeline <b>{{ supportLabel(entry.support.blockbench) }}</b> ·
                            {{ entry.source }}
                        </div>
                    </div>
                </div>
            `,
        },
    } as any).show();
}

export function createMolangGuideAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_molang_guide_' + type.id, {
        name: 'Molang Guide',
        description: 'What every Molang query and function does in game, with live examples',
        icon: 'functions',
        category: 'tools',
        condition: () => isCosmeticFormat(type),
        click() { openMolangGuide(); },
    });
}
