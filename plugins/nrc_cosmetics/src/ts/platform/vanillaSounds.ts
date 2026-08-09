import { fs, nodePath, os } from '../core/node';
import { log } from '../core/log';
import { allEffectKeyframes } from './effectKeyframes';

interface AssetIndex {
    objects: { [key: string]: { hash: string } };
}

function assetRoots(): string[] {
    const roots: string[] = [];
    const appData = (typeof process !== 'undefined' && process.env && process.env.APPDATA) || null;
    if (appData) roots.push(nodePath.join(appData, '.minecraft', 'assets'));
    if (os) {
        const home = os.homedir();
        roots.push(nodePath.join(home, 'AppData', 'Roaming', '.minecraft', 'assets'));
        roots.push(nodePath.join(home, '.minecraft', 'assets'));
        roots.push(nodePath.join(home, 'Library', 'Application Support', 'minecraft', 'assets'));
    }
    return roots.filter((r, i) => roots.indexOf(r) === i && fs.existsSync(r));
}

function indexFiles(root: string): string[] {
    const dir = nodePath.join(root, 'indexes');
    if (!fs.existsSync(dir)) return [];
    let names: string[] = [];
    try { names = fs.readdirSync(dir); } catch (e) { return []; }
    return names
        .filter((n: string) => n.endsWith('.json'))
        .map((n: string) => nodePath.join(dir, n))
        .sort((a: string, b: string) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function objectPath(root: string, hash: string): string {
    return nodePath.join(root, 'objects', hash.slice(0, 2), hash);
}

function readJson(file: string): any | null {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}

interface Catalogue {
    root: string;
    objects: { [key: string]: { hash: string } };
    sounds: { [event: string]: any };
}

let sources: { root: string; indexFile: string }[] | null = null;
const catalogues: { [indexFile: string]: Catalogue | null } = {};
const resolved: { [event: string]: string[] } = {};

function catalogue(root: string, indexFile: string): Catalogue | null {
    if (indexFile in catalogues) return catalogues[indexFile];

    const index: AssetIndex | null = readJson(indexFile);
    const objects = index && index.objects;
    const soundsEntry = objects && objects['minecraft/sounds.json'];
    const sounds = soundsEntry && readJson(objectPath(root, soundsEntry.hash));

    catalogues[indexFile] = (objects && sounds) ? { root, objects, sounds } : null;
    return catalogues[indexFile];
}

export function forgetVanillaSounds() {
    sources = null;
    for (const key of Object.keys(catalogues)) delete catalogues[key];
    for (const key of Object.keys(resolved)) delete resolved[key];
}

export function resolveVanillaSound(effect: string): string[] {
    if (!fs || !nodePath) return [];
    if (resolved[effect]) return resolved[effect];

    const event = effect.indexOf(':') === -1 ? effect : effect.slice(effect.indexOf(':') + 1);
    if (!sources) {
        sources = [];
        for (const root of assetRoots()) {
            for (const indexFile of indexFiles(root)) sources.push({ root, indexFile });
        }
    }

    for (const source of sources) {
        const parsed = catalogue(source.root, source.indexFile);
        if (!parsed) continue;
        const { root, objects, sounds } = parsed;
        const entry = sounds[event];
        if (!entry || !Array.isArray(entry.sounds)) continue;

        const files: string[] = [];
        for (const sound of entry.sounds) {
            const name = typeof sound === 'string' ? sound : (sound && sound.name);
            if (!name) continue;
            const key = 'minecraft/sounds/' + String(name).split(':').pop() + '.ogg';
            const object = objects[key];
            if (!object) continue;
            const file = objectPath(root, object.hash);
            if (fs.existsSync(file)) files.push(file);
        }
        if (files.length) {
            resolved[effect] = files;
            return files;
        }
    }
    log('vanilla sound not found locally: ' + effect);
    resolved[effect] = [];
    return [];
}

export function isVanillaSoundPath(file: string): boolean {
    if (typeof file !== 'string') return false;
    return file.split('\\').join('/').indexOf('/assets/objects/') !== -1;
}

export function linkVanillaSound(point: any, effect: string): boolean {
    const files = resolveVanillaSound(effect);
    if (!files.length) return false;
    point.extend({ file: files[0] });
    return true;
}

export function linkVanillaSounds(): number {
    let linked = 0;
    for (const keyframe of allEffectKeyframes()) {
        if (keyframe.channel !== 'sound') continue;
        for (const point of (keyframe.data_points || []) as any[]) {
            if (point.file || !point.effect) continue;
            if (linkVanillaSound(point, point.effect)) linked++;
        }
    }
    if (linked) log('linked ' + linked + ' vanilla sound(s)');
    return linked;
}

let current: any = null;

export function playVanillaSound(effect: string): boolean {
    const files = resolveVanillaSound(effect);
    if (!files.length) return false;

    const file = files[Math.floor(Math.random() * files.length)];
    try {
        if (current) current.pause();
        current = new Audio('file:///' + file.replace(/\\/g, '/'));
        current.play();
        return true;
    } catch (e) {
        log('vanilla sound playback failed: ' + e);
        return false;
    }
}
