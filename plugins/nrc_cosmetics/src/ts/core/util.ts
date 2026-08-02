export function mcIdDraft(name: string): string {
    return (name || '').toLowerCase().replace(/[\s&-]+/g, '_').replace(/[^a-z0-9_]+/g, '');
}

export function mcId(name: string): string {
    return mcIdDraft(name).replace(/^_+|_+$/g, '');
}

export function animationId(name: string): string {
    return (name || '').split('.').map(mcId).filter(Boolean).join('.');
}
