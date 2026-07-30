import { fs, nodePath, tempDir, toBuffer } from '../core/node';
import { log } from '../core/log';

const PLACEHOLDER_NAME = 'missing_particle.png';
const PLACEHOLDER_SIZE = 128;
const PLACEHOLDER_TILE = 8;

let placeholderPath: string | null | undefined;
const textureCache: { [particleFile: string]: string | null } = {};

export interface ParticleMeta {
    identifier: string;
    texture: string;
}

export function readParticleMeta(particleJson: string): ParticleMeta | null {
    try {
        const description = JSON.parse(particleJson).particle_effect.description;
        return {
            identifier: description.identifier || '',
            texture: (description.basic_render_parameters || {}).texture || '',
        };
    } catch (e) {
        return null;
    }
}

function readMetaOf(particleFile: string): ParticleMeta | null {
    if (!fs) return null;
    try {
        return readParticleMeta(fs.readFileSync(particleFile, 'utf8'));
    } catch (e) {
        return null;
    }
}

function drawPlaceholder(): string | null {
    const canvas = document.createElement('canvas');
    canvas.width = PLACEHOLDER_SIZE;
    canvas.height = PLACEHOLDER_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    for (let y = 0; y < PLACEHOLDER_SIZE; y += PLACEHOLDER_TILE) {
        for (let x = 0; x < PLACEHOLDER_SIZE; x += PLACEHOLDER_TILE) {
            const odd = ((x / PLACEHOLDER_TILE) + (y / PLACEHOLDER_TILE)) % 2 === 1;
            ctx.fillStyle = odd ? '#000000' : '#f800f8';
            ctx.fillRect(x, y, PLACEHOLDER_TILE, PLACEHOLDER_TILE);
        }
    }
    return canvas.toDataURL('image/png');
}

function placeholderTexture(): string | null {
    if (placeholderPath !== undefined) return placeholderPath;
    placeholderPath = null;

    const dir = tempDir('nrc_effects', '_missing');
    if (!dir || !fs) return placeholderPath;

    const target = nodePath.join(dir, PLACEHOLDER_NAME);
    try {
        if (!fs.existsSync(target)) {
            const dataUri = drawPlaceholder();
            if (!dataUri) return placeholderPath;
            const base64 = dataUri.slice(dataUri.indexOf(',') + 1);
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            fs.writeFileSync(target, toBuffer(bytes));
        }
        placeholderPath = target;
    } catch (e) {
        log('particle placeholder failed: ' + e);
    }
    return placeholderPath;
}

function findSibling(particleFile: string, texture: string): string | null {
    if (!fs || !nodePath) return null;

    const name = String(texture || '').replace(/\.png$/i, '').split('/').pop();
    if (!name) return null;

    const dir = nodePath.dirname(particleFile);
    const candidates = [nodePath.join(dir, 'particle', name + '.png'), nodePath.join(dir, name + '.png')];
    return candidates.find(exists) || null;
}

function exists(path: string): boolean {
    try {
        return !!fs && fs.existsSync(path);
    } catch (e) {
        return false;
    }
}

export function particleTextureOf(particleFile: string): string | null {
    if (!particleFile) return null;
    if (particleFile in textureCache) return textureCache[particleFile];

    const meta = readMetaOf(particleFile);
    const found = meta ? findSibling(particleFile, meta.texture) : null;
    textureCache[particleFile] = found;
    return found;
}

export function forgetParticleTexture(particleFile?: string) {
    if (particleFile) delete textureCache[particleFile];
    else for (const key in textureCache) delete textureCache[key];
}

function applyTexture(particleFile: string, texture: string) {
    const effect = Animator.particle_effects && Animator.particle_effects[particleFile];
    if (!effect || !effect.config) {
        log('applyTexture: no config for ' + particleFile
            + ' (known: ' + Object.keys(Animator.particle_effects || {}).length + ')');
        return;
    }

    effect.config.preview_texture = texture;
    for (const uuid in effect.emitters || {}) {
        const emitter = effect.emitters[uuid];
        if (emitter && emitter.updateConfig) emitter.updateConfig();
    }
    log('applyTexture: ' + nodePath.basename(texture) + ' on ' + nodePath.basename(particleFile)
        + ' emitters=' + Object.keys(effect.emitters || {}).length);
}

export function resolveParticleTexture(particleFile: string, particleJson: string) {
    const meta = readParticleMeta(particleJson);
    if (!meta || !meta.texture) {
        log('resolveParticleTexture: no texture declared in ' + particleFile);
        return;
    }

    forgetParticleTexture(particleFile);
    const sibling = particleTextureOf(particleFile);
    if (sibling) {
        applyTexture(particleFile, sibling);
        return;
    }

    const placeholder = placeholderTexture();
    if (placeholder) applyTexture(particleFile, placeholder);
    log('particle texture missing for ' + nodePath.basename(particleFile)
        + ' (' + meta.texture + '), showing placeholder');
}

export function setParticleTexture(particleFile: string, pngPath: string): boolean {
    if (!fs || !nodePath) return false;

    let json: any;
    try {
        json = JSON.parse(fs.readFileSync(particleFile, 'utf8'));
    } catch (e) {
        log('setParticleTexture: could not read ' + particleFile + ': ' + e);
        return false;
    }

    const name = nodePath.basename(pngPath).replace(/\.png$/i, '');
    const target = nodePath.join(nodePath.dirname(particleFile), name + '.png');

    try {
        if (nodePath.resolve(pngPath) !== nodePath.resolve(target)) {
            fs.writeFileSync(target, fs.readFileSync(pngPath));
        }
        json.particle_effect.description.basic_render_parameters.texture = name;

        const updated = JSON.stringify(json, null, 2);
        fs.writeFileSync(particleFile, updated);
        forgetParticleTexture(particleFile);
        Animator.loadParticleEmitter(particleFile, updated);
        return true;
    } catch (e) {
        log('setParticleTexture: could not attach ' + pngPath + ': ' + e);
        return false;
    }
}
