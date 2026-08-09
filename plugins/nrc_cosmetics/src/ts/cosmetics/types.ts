export interface MetaField {
    key: string;
    jsonKey: string;
    label: string;
    description: string;
    default: boolean;
}

export interface CosmeticType {
    id: string;                 // 'emote'
    formatId: string;           // 'nrc_emote'
    formatName: string;         // 'NoRisk Client Emote'
    formatDescription: string;
    icon: string;               // material icon name
    noriskTypes: string[];      // allowed '.norisk.json' type values; a single entry needs no UI
    assetNamespace: string;
    defaultName: string;        // default project / animation / file name (mc-id safe)

    bones: string[];            // rig bone names
    metaFields: MetaField[];    // boolean flags written into the animation JSON
    hasLockBones: boolean;      // expose per-bone lockVanillaBones
    hasSkinPreview: boolean;    // render-only reference skin toggle
    hasKeyframeEasing: boolean; // keyframe easing selector + export
    hasAnimation: boolean;      // format carries animations at all
    hasTemplatePicker: boolean; // File > New opens the template picker instead of a blank rig
    hasBareAnimations: boolean; // ships as a lone <name>.animation.json too, not only as a folder
    assetFolder: string;        // path segment in effect ids, e.g. 'emotes'
    exportsAnimation: boolean;  // produce <name>.animation.json
    createsDefaultAnimation: boolean; // add an empty animation when loading the rig
    defaultAnimation?: { name: string; loop: 'once' | 'hold' | 'loop' }; // its name and loop mode
    exportsModelDefault: () => boolean; // pre-check the model export box

    rig: object;                // bbmodel template JSON
    defaultSkin?: string;       // reference skin data URI
    formatOverrides?: object;   // extra ModelFormat flags merged over the shared base
}
