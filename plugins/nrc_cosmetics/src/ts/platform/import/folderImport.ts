import { fs, nodePath, hasFilesystem, toBase64 } from '../../core/node';
import { CompanionFile } from '../effectFiles';
import { isCompanionFile } from '../effectKeyframes';

export interface CosmeticFolder {
    dir: string;
    base: string;
    norisk: any | null;
    geo: any;
    animation: any | null;
    textureDataUri: string | null;
    mcmeta: string | null;
    companions: CompanionFile[];
}

function collectCompanions(dir: string, entries: string[]): CompanionFile[] {
    const out: CompanionFile[] = [];
    const take = (from: string, name: string) => {
        try {
            out.push({ name, bytes: new Uint8Array(fs.readFileSync(nodePath.join(from, name))) });
} catch (e) { /* ignore */ }
    };

    for (const name of entries) {
        if (isCompanionFile(name)) take(dir, name);
    }

    const particleDir = nodePath.join(dir, 'particle');
    if (fs.existsSync(particleDir)) {
        let textures: string[] = [];
        try { textures = fs.readdirSync(particleDir); } catch (e) { textures = []; }
        for (const name of textures) {
            if (name.toLowerCase().endsWith('.png')) take(particleDir, name);
        }
    }
    return out;
}

export type FolderError =
    | { kind: 'no-filesystem' }
    | { kind: 'not-a-cosmetic'; dir: string }
    | { kind: 'texture-only'; base: string; type: string }
    | { kind: 'no-texture'; base: string }
    | { kind: 'unreadable'; file: string; reason: string };

function readJson(file: string): any {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function readCosmeticFolder(dir: string): CosmeticFolder | FolderError {
    if (!hasFilesystem()) return { kind: 'no-filesystem' };

    let entries: string[];
    try {
        entries = fs.readdirSync(dir);
    } catch (e: any) {
        return { kind: 'unreadable', file: dir, reason: String(e && e.message || e) };
    }

    const marker = ['.norisk.json', '.geo.json', '.animation.json']
        .map((suffix) => ({ suffix, file: entries.find((f) => f.endsWith(suffix)) }))
        .find((m) => !!m.file);
    if (!marker || !marker.file) return { kind: 'not-a-cosmetic', dir };

    const base = marker.file.slice(0, -marker.suffix.length);
    const at = (suffix: string) => nodePath.join(dir, base + suffix);

    let norisk: any = null;
    if (fs.existsSync(at('.norisk.json'))) {
        try {
            norisk = readJson(at('.norisk.json'));
        } catch (e: any) {
            return { kind: 'unreadable', file: base + '.norisk.json', reason: String(e && e.message || e) };
        }
    }

    if (!fs.existsSync(at('.geo.json'))) {
        return { kind: 'texture-only', base, type: String((norisk && norisk.type) || 'texture') };
    }
    if (!fs.existsSync(at('.png'))) return { kind: 'no-texture', base };

    let geo: any;
    let animation: any = null;
    try {
        geo = readJson(at('.geo.json'));
        if (fs.existsSync(at('.animation.json'))) animation = readJson(at('.animation.json'));
    } catch (e: any) {
        return { kind: 'unreadable', file: base, reason: String(e && e.message || e) };
    }

    return {
        dir,
        base,
        norisk,
        geo,
        animation,
        textureDataUri: 'data:image/png;base64,' + toBase64(fs.readFileSync(at('.png'))),
        mcmeta: fs.existsSync(at('.png.mcmeta')) ? fs.readFileSync(at('.png.mcmeta'), 'utf8') : null,
        companions: collectCompanions(dir, entries),
    };
}

export function describeError(error: FolderError): string {
    switch (error.kind) {
        case 'no-filesystem':
            return 'Importing a folder needs the desktop app.';
        case 'not-a-cosmetic':
            return 'No .norisk.json in that folder, so it is not a cosmetic.';
        case 'texture-only':
            return `"${error.base}" is a ${error.type} and has no geometry. Capes and overlays are `
                + 'plain textures, there is nothing to open here.';
        case 'no-texture':
            return `"${error.base}" has no .png next to it.`;
        case 'unreadable':
            return `Could not read ${error.file}: ${error.reason}`;
    }
}
