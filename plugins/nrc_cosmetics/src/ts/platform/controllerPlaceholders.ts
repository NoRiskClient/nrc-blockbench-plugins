import { Registry } from '../core/registry';
import { isCosmeticFormat } from './format';
import { PREVIEW_STOP_LINE, PREVIEW_STOP_VARIABLE, STOP_STATE, assignedNames, findState, queryName, usedQueries } from '../domain/controller';
import { MOLANG_CATALOG } from '../molang/catalog';

function placeholderLines(): { query: string; line: string }[] {
    const lines: { query: string; line: string }[] = [];
    for (const entry of MOLANG_CATALOG) {
        if (!entry.placeholder) continue;
        for (const name of [entry.name, ...entry.aliases]) lines.push({ query: queryName(name), line: entry.placeholder });
    }
    return lines;
}

export function syncControllerPlaceholders() {
    if (!isCosmeticFormat()) return;
    const panel = Interface?.Panels?.variable_placeholders?.inside_vue;
    const controllers = (AnimationController.all || []) as any[];
    if (!panel || !controllers.length) return;

    const text: string = panel.text || '';
    const assigned = [...assignedNames(text)].map(queryName);
    const used = usedQueries(controllers);
    const missing = placeholderLines()
        .filter(({ query }) => used.has(query) && !assigned.includes(query))
        .map(({ line }) => line)
        .filter((line, i, all) => all.indexOf(line) === i);
    if (controllers.some((c) => findState(c, STOP_STATE)) && !assigned.includes(PREVIEW_STOP_VARIABLE)) missing.push(PREVIEW_STOP_LINE);
    if (!missing.length) return;
    panel.text = [text.trim(), ...missing].filter(Boolean).join('\n');
}

export function installControllerPlaceholders(registry: Registry) {
    for (const event of ['finish_edit', 'load_project', 'select_project']) registry.event(event, syncControllerPlaceholders);
}
