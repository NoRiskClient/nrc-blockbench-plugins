import { CompanionFile } from '../effectFiles';

export interface Template {
    id: string;
    name: string;
    kind: 'blank' | 'emote';
    animationJson?: any;
    geoJson?: any;
    previewDataUri?: string;
    effectFiles: CompanionFile[];
    badges: string[];
}
