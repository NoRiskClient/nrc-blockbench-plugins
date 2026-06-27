import { Registry } from '../core/registry';
import { easingEnabled } from '../platform/format';
import { BASES, combineName, splitName, iconSvg, isArgsEasing, argLabel, argDefault, parseArg } from '../platform/easing/functions';

const BAR_IDS = ['nrc_easing_bar', 'nrc_easing_type_bar', 'nrc_easing_arg_bar'];

function removeBars() {
    for (const id of BAR_IDS) {
        const el = document.getElementById(id);
        if (el && el.parentElement) el.parentElement.removeChild(el);
    }
}

function panelContainer(): any {
    const panel = document.getElementById('panel_keyframe');
    if (!panel) return null;
    return panel.querySelector('.panel_vue_wrapper') || panel;
}

function isFirstInChannel(kf: any): boolean {
    const list = kf.animator && kf.animator[kf.channel];
    if (!Array.isArray(list)) return false;
    const sorted = list.slice().sort((a: any, b: any) => a.time - b.time);
    return sorted.indexOf(kf) === 0;
}

function applyEasing(name: string) {
    Undo.initEdit({ keyframes: Timeline.selected });
    for (const kf of Timeline.selected as any[]) {
        kf.easing = name === 'linear' ? undefined : name;
        kf.easingArgs = undefined;
        kf.interpolation = 'linear';
    }
    Undo.finishEdit('Set keyframe easing');
    rebuild();
    if (typeof Animator !== 'undefined' && Animator.preview) Animator.preview();
}

function applyArg(value: string) {
    Undo.initEdit({ keyframes: Timeline.selected });
    for (const kf of Timeline.selected as any[]) {
        if (kf.easing) kf.easingArgs = [parseArg(kf.easing, value)];
    }
    Undo.finishEdit('Set keyframe easing argument');
    if (typeof Animator !== 'undefined' && Animator.preview) Animator.preview();
}

function iconButton(name: string, selected: boolean, title: string, onClick: () => void): any {
    const div = document.createElement('div');
    div.className = 'nrc_easing_icon' + (selected ? ' selected' : '');
    div.title = title;
    div.innerHTML = iconSvg(name, selected);
    div.onclick = onClick;
    return div;
}

function makeBar(id: string, label: string): any {
    const bar = document.createElement('div');
    bar.id = id;
    bar.className = 'nrc_easing_row';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    bar.appendChild(lbl);
    return bar;
}

function rebuild() {
    removeBars();
    if (!easingEnabled()) return;

    const sel = Timeline.selected as any[];
    if (!sel || !sel.length) return;
    if (!sel.every((kf) => kf.animator instanceof BoneAnimator && !isFirstInChannel(kf))) return;

    const container = panelContainer();
    if (!container) return;

    const cur = splitName(sel[0].easing || 'linear');
    const curName = sel[0].easing || 'linear';

    // Easing type bar
    const bar = makeBar('nrc_easing_bar', 'Easing');
    for (const base of BASES) {
        const repName = combineName(base, cur.dir);
        bar.appendChild(iconButton(repName, base === cur.base, base, () => applyEasing(combineName(base, cur.dir))));
    }
    container.appendChild(bar);

    // Direction bar (only for curves with a direction)
    if (cur.base !== 'linear' && cur.base !== 'step') {
        const tbar = makeBar('nrc_easing_type_bar', 'Type');
        for (const dir of ['in', 'out', 'inout']) {
            tbar.appendChild(iconButton(combineName(cur.base, dir), dir === cur.dir, dir, () => applyEasing(combineName(cur.base, dir))));
        }
        container.appendChild(tbar);
    }

    // Argument input (back / elastic / bounce / step)
    if (isArgsEasing(curName) && sel.every((kf) => isArgsEasing(kf.easing))) {
        const abar = makeBar('nrc_easing_arg_bar', argLabel(curName));
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'dark_bordered code';
        input.value = String(Array.isArray(sel[0].easingArgs) && sel[0].easingArgs.length ? sel[0].easingArgs[0] : argDefault(curName));
        input.oninput = () => applyArg(input.value);
        abar.appendChild(input);
        container.appendChild(abar);
    }
}

function onRenderFrame() {
    if (!easingEnabled()) return;
    const kfs = (typeof Timeline !== 'undefined' && Timeline.keyframes) ? Timeline.keyframes : [];
    for (const kf of kfs as any[]) {
        if (kf.interpolation && kf.interpolation !== 'linear' && kf.easing) {
            kf.easing = undefined;
            kf.easingArgs = undefined;
        }
        // Visual marker on the timeline: eased / bezier keyframes get tinted.
        const el = document.getElementById(kf.uuid);
        if (el && el.classList) {
            el.classList.toggle('nrc_kf_eased', !!kf.easing);
            el.classList.toggle('nrc_kf_bezier', kf.interpolation === 'bezier');
        }
    }
}

export function installEasingPanel(registry: Registry) {
    registry.css(`
        .nrc_easing_row { display: flex; align-items: center; flex-wrap: wrap; gap: 1px; padding: 2px 8px; }
        .nrc_easing_row > label { font-weight: bolder; min-width: 47px; }
        .nrc_easing_row input { flex: 1; margin-left: 6px; }
        .nrc_easing_icon { width: 26px; height: 26px; padding: 2px; cursor: pointer; border-radius: 3px; display: flex; align-items: center; justify-content: center; }
        .nrc_easing_icon:hover { background: var(--color-button); }
        .nrc_easing_icon.selected { background: var(--color-selected); }
        .nrc_kf_eased { outline: 1.5px solid var(--color-accent); outline-offset: 1px; }
        .nrc_kf_bezier { outline: 1.5px solid #7b25a4; outline-offset: 1px; }
    `);
    registry.event('update_keyframe_selection', rebuild);
    registry.event('render_frame', onRenderFrame);
    registry.track(removeBars);
}
