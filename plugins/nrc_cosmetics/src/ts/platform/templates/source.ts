import { unzipSync } from 'fflate';
import { Template } from './model';
import { log } from '../../core/log';

const REPO = 'NoRiskClient/nrc-designer-docs';
const ASSET = 'nrc-cosmetics.zip';
const RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`;
const ASSET_URL = `https://github.com/${REPO}/releases/latest/download/${ASSET}`;

// Require each builtin independently with a STATIC require (so webpack externals apply) —
// Blockbench's plugin require may reject some builtins, and a single combined try would
// leave later vars undefined. Disk cache is best-effort.
let fs: any, os: any, path: any, Buf: any;
try { fs = require('fs'); } catch (e) { /* none */ }
try { os = require('os'); } catch (e) { /* none */ }
try { path = require('path'); } catch (e) { /* none */ }
try { const b = require('buffer'); Buf = b && b.Buffer; } catch (e) { /* none */ }

function toBase64(bytes: Uint8Array): string {
    if (Buf) return Buf.from(bytes).toString('base64');
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
}

function cacheDir(): string | null {
    if (!fs || !os || !path) return null;
    try { const d = path.join(os.tmpdir(), 'nrc_templates'); fs.mkdirSync(d, { recursive: true }); return d; } catch (e) { return null; }
}

async function latestTag(): Promise<string | null> {
    try {
        const r = await fetch(RELEASE_API);
        if (!r.ok) return null;
        const j = await r.json();
        return j.tag_name || null;
    } catch (e) { return null; }
}

// Returns the zip bytes, using the on-disk cache when the release tag is unchanged.
async function getZipBytes(force: boolean): Promise<Uint8Array | null> {
    const dir = cacheDir();
    const zipPath = dir ? path.join(dir, ASSET) : null;
    const tagPath = dir ? path.join(dir, 'tag.txt') : null;
    const remoteTag = await latestTag();

    if (dir && !force) {
        try {
            if (fs.existsSync(zipPath)) {
                const cachedTag = fs.existsSync(tagPath) ? fs.readFileSync(tagPath, 'utf8') : null;
                if (!remoteTag || cachedTag === remoteTag) return new Uint8Array(fs.readFileSync(zipPath));
            }
        } catch (e) { /* ignore, fall through to download */ }
    }

    try {
        const r = await fetch(ASSET_URL);
        if (!r.ok) throw new Error('http ' + r.status);
        const bytes = new Uint8Array(await r.arrayBuffer());
        if (dir) {
            try { fs.writeFileSync(zipPath, Buf ? Buf.from(bytes) : bytes); if (remoteTag) fs.writeFileSync(tagPath, remoteTag); } catch (e) { /* ignore */ }
        }
        return bytes;
    } catch (e) {
        log('template download failed: ' + e);
        if (dir) { try { if (fs.existsSync(zipPath)) return new Uint8Array(fs.readFileSync(zipPath)); } catch (e2) { /* ignore */ } }
        return null;
    }
}

// Downloads + extracts the latest nrc-cosmetics.zip and returns the emote templates.
export async function loadTemplates(force = false): Promise<{ templates: Template[]; error?: string }> {
    const bytes = await getZipBytes(force);
    if (!bytes) return { templates: [], error: 'Download failed and no cache available' };

    let files: { [name: string]: Uint8Array };
    try { files = unzipSync(bytes); } catch (e) { return { templates: [], error: 'Could not unzip templates' }; }

    const dec = new TextDecoder();
    const has = (p: string) => files[p] !== undefined;
    const templates: Template[] = [];

    for (const p of Object.keys(files)) {
        if (!/\/emotes\/.*\.animation\.json$/.test(p)) continue;

        const slash = p.lastIndexOf('/');
        const dir = p.slice(0, slash + 1);
        const base = p.slice(slash + 1).replace(/\.animation\.json$/, '');

        let animationJson: any;
        try { animationJson = JSON.parse(dec.decode(files[p])); } catch (e) { continue; }

        const geoP = dir + base + '.geo.json';
        const pngP = dir + base + '.png';
        let geoJson: any;
        if (has(geoP)) { try { geoJson = JSON.parse(dec.decode(files[geoP])); } catch (e) { /* ignore */ } }
        let previewDataUri: string | undefined;
        if (has(pngP)) { try { previewDataUri = 'data:image/png;base64,' + toBase64(files[pngP]); } catch (e) { /* ignore */ } }

        templates.push({ id: p, name: base, kind: 'emote', animationJson, geoJson, previewDataUri, hasProps: !!geoJson });
    }

    templates.sort((a, b) => a.name.localeCompare(b.name));
    return { templates };
}
