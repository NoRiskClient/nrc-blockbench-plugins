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
    noriskType: string;         // '.norisk.json' type field, e.g. 'EMOTES'
    defaultName: string;        // default project / animation / file name (mc-id safe)

    bones: string[];            // rig bone names
    metaFields: MetaField[];    // boolean flags written into the animation JSON
    hasLockBones: boolean;      // expose per-bone lockVanillaBones
    hasSkinPreview: boolean;    // render-only reference skin toggle
    hasKeyframeEasing: boolean; // keyframe easing selector + export
    exportsAnimation: boolean;  // produce <name>.animation.json
    createsDefaultAnimation: boolean; // add an empty animation when loading the rig
    exportsModelDefault: () => boolean; // pre-check the model export box

    rig: object;                // bbmodel template JSON
    defaultSkin?: string;       // reference skin data URI
    formatOverrides?: object;   // extra ModelFormat flags merged over the shared base
}
