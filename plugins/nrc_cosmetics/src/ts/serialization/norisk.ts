import { CosmeticType } from '../cosmetics/types';

export interface NoriskMeta {
    name: string;
    creator: string;
    price: number;
    rarity: string;
    path: string;
    type?: string;
    isExclusive?: boolean;
}

const DEFAULT_SETTINGS = {
    scale: 1.0,
    previewScale: 1.0,
    offset: { x: 0, y: 0, z: 0 },
    previewOffset: { x: 0, y: 0, z: 0 },
    renderMode: 'ORIGINAL',
};

function supportedBones(): string[] {
    const groups = (typeof Group !== 'undefined' && (Group as any).all) || [];
    const hasContent = (g: any): boolean =>
        (g.children || []).some((c: any) => (c instanceof Cube) || hasContent(c));
    return groups
        .filter((g: any) => typeof g.name === 'string' && g.name.startsWith('armor') && hasContent(g))
        .map((g: any) => g.name);
}

export function buildNoriskJson(type: CosmeticType, meta: NoriskMeta, base?: any): object {
    const previous = (base && typeof base === 'object') ? base : {};
    const bones = previous.supportedBones || supportedBones();
    return Object.assign({}, previous, {
        id: previous.id || guid(),
        name: meta.name,
        creator: meta.creator,
        price: meta.price,
        type: meta.type || previous.type || type.noriskTypes[0],
        dateAdded: previous.dateAdded || new Date().toISOString().slice(0, 10),
        path: meta.path,
        rarity: meta.rarity,
        isExclusive: meta.isExclusive ?? previous.isExclusive ?? false,
        defaultSettings: Object.assign({}, DEFAULT_SETTINGS, previous.defaultSettings),
        layers: previous.layers || [],
        features: previous.features || [],
        compatibleCosmetics: previous.compatibleCosmetics || [],
        supportedBones: bones,
    });
}
