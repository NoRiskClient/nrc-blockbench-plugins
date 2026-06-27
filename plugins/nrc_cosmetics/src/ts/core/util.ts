// Normalizes a name into a Minecraft-identifier-safe string: lowercase, only [a-z0-9_].
export function mcId(name: string): string {
    return (name || '').toLowerCase().trim().replace(/[\s&-]+/g, '_').replace(/[^a-z0-9_]+/g, '');
}
