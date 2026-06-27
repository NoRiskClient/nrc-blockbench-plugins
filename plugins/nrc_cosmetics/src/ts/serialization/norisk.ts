import { CosmeticType } from '../cosmetics/types';

export interface NoriskMeta { name: string; creator: string; price: number; rarity: string; path: string; }

export function buildNoriskJson(type: CosmeticType, meta: NoriskMeta): object {
    return {
        id: guid(),
        name: meta.name,
        creator: meta.creator,
        price: meta.price,
        type: type.noriskType,
        dateAdded: new Date().toISOString().slice(0, 10),
        path: meta.path,
        rarity: meta.rarity,
        isExclusive: false,
        defaultSettings: {
            scale: 1.0,
            previewScale: 1.0,
            offset: { x: 0, y: 0, z: 0 },
            previewOffset: { x: 0, y: 0, z: 0 },
            renderMode: 'ORIGINAL',
        },
        layers: [],
        features: [],
        compatibleCosmetics: [],
    };
}
