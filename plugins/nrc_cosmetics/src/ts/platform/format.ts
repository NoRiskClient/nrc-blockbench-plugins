import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';

const formatsById: { [id: string]: any } = {};
const typesById: { [id: string]: CosmeticType } = {};

// Shared ModelFormat flags; per-type overrides are merged on top.
function baseFormatOptions(type: CosmeticType): any {
    return {
        id: type.formatId,
        name: type.formatName,
        description: type.formatDescription,
        icon: type.icon,
        category: 'minecraft',
        rotate_cubes: true,
        box_uv: true,
        optional_box_uv: true,
        single_texture: true,
        bone_rig: true,
        centered_grid: true,
        locators: true,
        animation_mode: true,
        animation_files: false,
        display_mode: false,
        codec: Codecs.project,
    };
}

export function registerFormat(registry: Registry, type: CosmeticType): any {
    const fmt = registry.format(Object.assign(baseFormatOptions(type), type.formatOverrides || {}));
    formatsById[type.formatId] = fmt;
    typesById[type.formatId] = type;
    registry.track(() => { delete formatsById[type.formatId]; delete typesById[type.formatId]; });
    return fmt;
}

export function getFormat(type: CosmeticType): any {
    return formatsById[type.formatId];
}

export function currentType(): CosmeticType | null {
    if (typeof Format === 'undefined' || !Format) return null;
    return typesById[Format.id] || null;
}

export function isCosmeticFormat(type?: CosmeticType): boolean {
    const t = currentType();
    return type ? t === type : !!t;
}

export function easingEnabled(): boolean {
    const t = currentType();
    return !!t && !!t.hasKeyframeEasing;
}
