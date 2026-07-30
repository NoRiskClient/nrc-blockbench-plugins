import { OutFile } from '../io/exportFiles';
import { fs, nodePath, tempDir, toBuffer } from '../core/node';
import { particleTextureOf, readParticleMeta } from './particleTexture';
import {
    CHANNEL_SUFFIX, allEffectKeyframes, isCompanionFile, withoutSuffix,
} from './effectKeyframes';
import { log } from '../core/log';

export interface CompanionFile {
    name: string;
    bytes: Uint8Array;
}

export function soundEffectId(namespace: string, emoteId: string, fileName: string): string {
    return namespace + ':emotes/' + emoteId + '/' + withoutSuffix(fileName);
}

export function particleEffectId(namespace: string, particleJson: string): string | null {
    const meta = readParticleMeta(particleJson);
    if (!meta || !meta.identifier) return null;
    const short = meta.identifier.split(':').pop();
    return short ? namespace + ':' + short : null;
}

export function effectStatus(point: any): 'ok' | 'missing' | 'unresolved' {
    if (!point || !point.effect) return 'unresolved';
    if (!point.file) return 'missing';
    try {
        return fs && fs.existsSync(point.file) ? 'ok' : 'missing';
    } catch (e) {
        return 'missing';
    }
}

export function stageEffectFile(scope: string, name: string, bytes: Uint8Array): string | null {
    const dir = tempDir('nrc_effects', scope || 'shared');
    if (!dir || !fs) return null;

    const full = nodePath.join(dir, name);
    try {
        fs.writeFileSync(full, toBuffer(bytes));
        return full;
    } catch (e) {
        log('effect files: could not stage ' + name + ': ' + e);
        return null;
    }
}

export function stageEffectPath(scope: string, sourcePath: string): string | null {
    if (!fs || !nodePath) return null;
    try {
        return stageEffectFile(scope, nodePath.basename(sourcePath), new Uint8Array(fs.readFileSync(sourcePath)));
    } catch (e) {
        log('effect files: could not read ' + sourcePath + ': ' + e);
        return null;
    }
}

let audioContext: any = null;

function sharedAudioContext(): any {
    if (typeof AudioContext === 'undefined') return null;
    if (!audioContext) audioContext = new AudioContext();
    return audioContext;
}

async function visualizeFromBytes(key: string, bytes: Uint8Array) {
    const context = sharedAudioContext();
    if (!context || !Timeline || !Timeline.waveforms) return;
    if (Timeline.waveforms[key] && Timeline.waveforms[key].duration) return;

    try {
        const owned = new Uint8Array(bytes.length);
        owned.set(bytes);
        const buffer = await context.decodeAudioData(owned.buffer);
        const channel = buffer.getChannelData(0);

        const count = Math.ceil(buffer.duration * (Timeline.waveform_sample_rate || 60));
        const samples: number[] = new Array(count).fill(0);
        for (let i = 0; i < channel.length; i++) {
            samples[Math.floor((i / channel.length) * count)] += Math.abs(channel[i]);
        }

        let peak = 0;
        for (const sample of samples) if (sample > peak) peak = sample;
        if (!peak) peak = 1;

        Timeline.waveforms[key] = { samples: samples.map((v) => v / peak), duration: buffer.duration };
        if (Timeline.vue && Timeline.vue.$forceUpdate) Timeline.vue.$forceUpdate();
    } catch (e) {
        log('effect files: could not build waveform for ' + key + ': ' + e);
    }
}

export function registerStagedEffect(channel: string, full: string, bytes: Uint8Array) {
    if (channel === 'sound') {
        visualizeFromBytes(full, bytes);
        return;
    }
    Animator.loadParticleEmitter(full, new TextDecoder().decode(bytes));
}

export function registerStagedPath(channel: string, full: string) {
    if (!fs) return;
    try {
        registerStagedEffect(channel, full, new Uint8Array(fs.readFileSync(full)));
    } catch (e) {
        log('effect files: could not register ' + full + ': ' + e);
    }
}

function effectKey(effect: string): string {
    const tail = String(effect || '').split(':').pop() || '';
    return (tail.split('/').pop() || '').toLowerCase();
}

export function linkEffectFiles(scope: string, files: CompanionFile[]) {
    if (!files.length) return;

    const staged: { [key: string]: { path: string; bytes: Uint8Array } } = {};
    for (const file of files) {
        const key = withoutSuffix(file.name);
        if (!key) continue;
        const path = stageEffectFile(scope, file.name, file.bytes);
        if (path) staged[key] = { path, bytes: file.bytes };
    }

    let linked = 0;
    for (const keyframe of allEffectKeyframes()) {
        for (const point of (keyframe.data_points || []) as any[]) {
            if (point.file) continue;
            const entry = staged[effectKey(point.effect)];
            if (!entry) continue;

            point.extend({ file: entry.path });
            registerStagedEffect(keyframe.channel, entry.path, entry.bytes);
            linked++;
        }
    }
    log('effect files: staged ' + Object.keys(staged).length + ', linked ' + linked + ' keyframe(s)');
}

export interface EffectFileRef {
    name: string;
    path: string;
}

export function listEffectFiles(channels?: string[]): EffectFileRef[] {
    if (!fs || !nodePath) return [];

    const seen = new Set<string>();
    const refs: EffectFileRef[] = [];
    const add = (path: string, name: string) => {
        if (seen.has(path)) return;
        seen.add(path);
        refs.push({ path, name });
    };

    for (const keyframe of allEffectKeyframes()) {
        if (channels && channels.indexOf(keyframe.channel) === -1) continue;
        const suffix = CHANNEL_SUFFIX[keyframe.channel];

        for (const point of (keyframe.data_points || []) as any[]) {
            const full = point.file;
            if (!full) continue;

            let name = nodePath.basename(full);
            if (suffix && !isCompanionFile(name)) name = withoutSuffix(name) + suffix;
            add(full, name);

            if (keyframe.channel !== 'particle') continue;
            const texture = particleTextureOf(full);
            if (texture) add(texture, nodePath.basename(texture));
        }
    }
    return refs;
}

export function collectEffectFiles(channels?: string[]): OutFile[] {
    const out: OutFile[] = [];
    for (const ref of listEffectFiles(channels)) {
        try {
            out.push({ name: ref.name, content: fs.readFileSync(ref.path) });
        } catch (e) {
            log('effect files: could not read ' + ref.path + ': ' + e);
        }
    }
    return out;
}
