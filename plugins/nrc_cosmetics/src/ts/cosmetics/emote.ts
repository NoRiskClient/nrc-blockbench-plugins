import playerRig from '../assets/playerRig.json';
import steveSkin from '../assets/steveSkin';
import { propCubes } from '../platform/playerModel';
import { CosmeticType } from './types';

export const PLAYER_BONES = [
    'bipedRig',
    'bipedHead',
    'bipedBody',
    'bipedRightArm',
    'bipedLeftArm',
    'bipedRightLeg',
    'bipedLeftLeg',
];

export const EMOTE: CosmeticType = {
    id: 'emote',
    formatId: 'nrc_emote',
    formatName: 'NoRisk Client Emote',
    formatDescription: 'Author NoRisk Client emotes against the player rig',
    icon: 'directions_run',
    noriskTypes: ['EMOTES'],
    assetNamespace: 'noriskclient-cosmetics',
    defaultName: 'new_emote',

    bones: PLAYER_BONES,
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
    hasAnimation: true,
    hasTemplatePicker: true,
    hasBareAnimations: true,
    assetFolder: 'emotes',
    exportsAnimation: true,
    createsDefaultAnimation: true,
    exportsModelDefault: () => typeof Cube !== 'undefined' && !!Cube.all && propCubes().length > 0,

    rig: playerRig,
    defaultSkin: steveSkin,
};
