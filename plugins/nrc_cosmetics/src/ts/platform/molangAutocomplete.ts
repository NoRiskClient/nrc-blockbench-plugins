import { Registry } from '../core/registry';
import { MOLANG_CATALOG } from '../molang/catalog';

function nrcQueryIds(): string[] {
    const ids = new Set<string>();
    for (const entry of MOLANG_CATALOG) {
        if (entry.kind !== 'query' || entry.support.client === 'no') continue;
        for (const name of [entry.name, ...entry.aliases]) {
            if (name.startsWith('query.')) ids.add(name.slice('query.'.length));
        }
    }
    return [...ids];
}

export function installMolangAutocomplete(registry: Registry) {
    const autocomplete = (window as any).MolangAutocomplete;
    const context = autocomplete?.DefaultContext;
    if (!context || typeof context.getNamespace !== 'function') return;

    const namespace = context.getNamespace('query', false);
    if (!namespace) return;

    for (const id of nrcQueryIds()) {
        if (namespace.hasQuery(id)) continue;
        namespace.addQuery({ id, priority: 10 });
        registry.track(() => namespace.removeQuery(id));
    }
}
