import { Registry } from '../core/registry';

export function ensureDialogCss(registry: Registry) {
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
        .nrc-x-card.off { opacity: .4; cursor: default; }
        .nrc-x-card.off:hover { background: none; }

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
