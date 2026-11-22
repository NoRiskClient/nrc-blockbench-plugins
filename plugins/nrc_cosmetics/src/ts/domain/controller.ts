export const STOP_STATE = 'stop';
export const STOP_TIMEOUT_SECONDS = 10;
export const PREVIEW_STOP_VARIABLE = 'variable.preview_stop';
export const PREVIEW_STOP_LINE = `${PREVIEW_STOP_VARIABLE} = toggle('Preview stop')`;

const QUERY_PREFIX = /^(?:q|query)\./i;
const QUERY_USE = /\b(?:q|query)\.([a-z0-9_]+)/gi;
const ASSIGNMENT = /^\s*([a-z0-9_.]+)\s*=/gim;

export function queryName(name: string): string {
    return name.replace(QUERY_PREFIX, '').toLowerCase();
}

function collect(pattern: RegExp, texts: string[]): Set<string> {
    const found = new Set<string>();
    for (const text of texts) {
        text.replace(pattern, (_, name: string) => {
            found.add(name.toLowerCase());
            return '';
        });
    }
    return found;
}

export function controllerScripts(controller: any): string[] {
    const scripts: string[] = [];
    for (const state of controller.states as any[]) {
        scripts.push(state.on_entry || '', state.on_exit || '', ...state.transitions.map((t: any) => t.condition || ''));
    }
    return scripts;
}

export function usedQueries(controllers: any[]): Set<string> {
    return collect(QUERY_USE, controllers.reduce((all: string[], c: any) => all.concat(controllerScripts(c)), [] as string[]));
}

export function assignedNames(text: string): Set<string> {
    return collect(ASSIGNMENT, [text]);
}

export function findState(controller: any, name: string): any | undefined {
    return (controller.states as any[]).find((s) => s.name === name);
}
