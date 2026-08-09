import playerRig from '../assets/playerRig.json';
import steveSkin from '../assets/steveSkin';
import { propCubes } from '../platform/playerModel';
import { CosmeticType } from './types';
import { PLAYER_BONES } from './emote';

export const COSMETIC_CATEGORIES = [
    'ACCESSORIES',
    'AURA',
    'BACK',
    'BANDANA',
    'CAPE',
    'FACE',
    'HAT',
    'OVERLAY',
    'PET',
    'SHIELD',
    'SHOES',
    'SUIT',
    'WINGS',
];

export const COSMETIC: CosmeticType = {
    id: 'cosmetic',
    formatId: 'nrc_cosmetic',
    formatName: 'NoRisk Client Cosmetic',
    formatDescription: 'Author NoRisk Client cosmetics against the player rig',
    icon: 'checkroom',
    noriskTypes: COSMETIC_CATEGORIES,
    assetNamespace: 'noriskclient-cosmetics',
    assetFolder: 'cosmetics',
    defaultName: 'new_cosmetic',

    bones: PLAYER_BONES,
    metaFields: [],
    hasLockBones: false,
    hasSkinPreview: true,
    hasKeyframeEasing: false,
    hasAnimation: true,
    hasTemplatePicker: false,
    hasBareAnimations: false,
    exportsAnimation: true,
    createsDefaultAnimation: true,
    defaultAnimation: { name: 'nrc.idle', loop: 'loop' },
    exportsModelDefault: () => typeof Cube !== 'undefined' && !!Cube.all && propCubes().length > 0,

    rig: playerRig,
    defaultSkin: steveSkin,
};
