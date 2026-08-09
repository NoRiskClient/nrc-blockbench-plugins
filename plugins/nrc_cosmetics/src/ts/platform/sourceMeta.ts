export interface SourceMeta {
    norisk: any;
    mcmeta: string | null;
    dir: string;
}

const byProject = new WeakMap<object, SourceMeta>();

export function setSourceMeta(meta: SourceMeta) {
    if (typeof Project !== 'undefined' && Project) byProject.set(Project, meta);
}

export function sourceMeta(): SourceMeta | null {
    if (typeof Project === 'undefined' || !Project) return null;
    return byProject.get(Project) || null;
}
