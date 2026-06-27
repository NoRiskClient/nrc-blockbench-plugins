import playerRig from '../assets/playerRig.json';
import steveSkin from '../assets/steveSkin';
import { CosmeticType } from './types';

// Player rig bones the runtime animates (gg.norisk.cosmetics...GeoEmote.PLAYER_BONES).
// bipedRig is the whole-body root, the rest parent under it.
export const PLAYER_BONES = [
    'bipedRig',
    'bipedHead',
    'bipedBody',
    'bipedRightArm',
    'bipedLeftArm',
    'bipedRightLeg',
    'bipedLeftLeg',
];

// The emote cosmetic type. All emote-specific values live here and nowhere else.
export const EMOTE: CosmeticType = {
    id: 'emote',
    formatId: 'nrc_emote',
    formatName: 'NoRisk Client Emote',
    formatDescription: 'Author NoRisk Client emotes against the player rig',
    icon: 'directions_run',
    noriskType: 'EMOTES',
    defaultName: 'new_emote',

    bones: PLAYER_BONES,
    // jsonKey + defaults mirror GeoEmoteParser.getBooleanOrDefault exactly.
    metaFields: [
        { key: 'nrc_disableOnMove', jsonKey: 'disableOnMove', label: 'Disable on move', description: 'Stop the emote when the player moves', default: false },
        { key: 'nrc_disableOnHit', jsonKey: 'disableOnHit', label: 'Disable on hit', description: 'Stop the emote when the player takes damage', default: true },
        { key: 'nrc_firstPerson', jsonKey: 'firstPerson', label: 'First person', description: 'Show the emote in first-person view', default: false },
        { key: 'nrc_stayInFirstPerson', jsonKey: 'stayInFirstPerson', label: 'Stay in first person', description: 'Keep the player in first-person during the emote', default: false },
        { key: 'nrc_immersiveCamera', jsonKey: 'immersiveCamera', label: 'Immersive camera', description: 'Camera follows the head bone in first-person', default: false },
    ],
    hasLockBones: true,
    hasSkinPreview: true,
    hasKeyframeEasing: true,
    exportsAnimation: true,
    createsDefaultAnimation: true,
    exportsModelDefault: () => typeof Cube !== 'undefined' && Cube.all && Cube.all.length !== PLAYER_BONES.length - 1,

    rig: playerRig,
    defaultSkin: steveSkin,
};
