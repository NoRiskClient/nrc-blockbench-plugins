import { OutFile } from '../io/exportFiles';
import { fs, nodePath, tempDir, toBuffer } from '../core/node';
import { log } from '../core/log';

export interface CompanionFile {
    name: string;
    bytes: Uint8Array;
}

const CHANNEL_SUFFIX: { [channel: string]: string } = {
    particle: '.particle.json',
    sound: '.ogg',
};

const SUFFIX_PATTERN = /\.particle\.json$|\.ogg$/i;

export function isCompanionFile(name: string): boolean {
    return SUFFIX_PATTERN.test(name);
}

function effectKey(effect: string): string {
    const tail = String(effect || '').split(':').pop() || '';
    return (tail.split('/').pop() || '').toLowerCase();
}

function baseName(name: string): string {
    return name.replace(SUFFIX_PATTERN, '').toLowerCase();
}

function effectKeyframes(): any[] {
    const out: any[] = [];
    for (const animation of (Animation.all || []) as any[]) {
        const animator = animation.animators && animation.animators.effects;
        if (!animator) continue;
        for (const channel of Object.keys(CHANNEL_SUFFIX)) {
            for (const keyframe of (animator[channel] || []) as any[]) out.push(keyframe);
        }
    }
    return out;
}

export function linkEffectFiles(scope: string, files: CompanionFile[]) {
    if (!files.length) return;

    const dir = tempDir('nrc_effects', scope || 'shared');
    if (!dir) {
        log('effect files: no writable temp dir, skipping');
        return;
    }

    const byKey: { [key: string]: string } = {};
    for (const file of files) {
        const key = baseName(file.name);
        if (!key) continue;
        const full = nodePath.join(dir, file.name);
        try {
            fs.writeFileSync(full, toBuffer(file.bytes));
            byKey[key] = full;
        } catch (e) {
            log('effect files: could not write ' + file.name + ': ' + e);
        }
    }

    let linked = 0;
    for (const keyframe of effectKeyframes()) {
        for (const point of (keyframe.data_points || []) as any[]) {
            if (point.file) continue;
            const key = effectKey(point.effect);
            if (!key || !byKey[key]) continue;
            point.extend({ file: byKey[key] });
            linked++;
        }
    }
    log('effect files: wrote ' + Object.keys(byKey).length + ', linked ' + linked + ' keyframe(s)');
}

export function collectEffectFiles(): OutFile[] {
    if (!fs || !nodePath) return [];

    const seen = new Set<string>();
    const out: OutFile[] = [];

    for (const keyframe of effectKeyframes()) {
        const suffix = CHANNEL_SUFFIX[keyframe.channel];
        for (const point of (keyframe.data_points || []) as any[]) {
            const full = point.file;
            if (!full || seen.has(full)) continue;
            seen.add(full);

            let name = nodePath.basename(full);
            if (suffix && !isCompanionFile(name)) name = baseName(name) + suffix;

            try {
                out.push({ name, content: fs.readFileSync(full) });
            } catch (e) {
                log('effect files: could not read ' + full + ': ' + e);
            }
        }
    }
    return out;
}
