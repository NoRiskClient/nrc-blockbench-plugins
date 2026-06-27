// One selectable template in the New-Emote card grid.
export interface Template {
    id: string;
    name: string;
    kind: 'blank' | 'emote';
    animationJson?: any;       // parsed <name>.animation.json
    geoJson?: any;             // parsed <name>.geo.json (props), if any
    previewDataUri?: string;   // <name>.png as data URI, if any
    hasProps: boolean;
}
