import { log } from '../core/log';
import { mcId } from '../core/util';
import { fs } from '../core/node';

let lastDir: string | undefined;

export interface OutFile {
    content: string | Uint8Array;
    suffix?: string;
    name?: string;
}

export const sanitize = mcId;

function fileName(base: string, file: OutFile): string {
    return file.name || base + (file.suffix || '');
}

export function writeFiles(base: string, files: OutFile[]) {
    if (fs && Blockbench.pickDirectory) {
        const parent = Blockbench.pickDirectory({
            title: 'Export NRC Cosmetic',
            startpath: lastDir,
            resource_id: 'nrc_cosmetic_export',
        });
        if (!parent) {
            log('export cancelled (no directory)');
            return;
        }
        lastDir = parent;

        const dir = parent + '/' + base;
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (e) {
            log('export: could not create ' + dir + ': ' + e);
            Blockbench.showQuickMessage('Could not create the emote folder', 2400);
            return;
        }

        for (const f of files) {
            const full = dir + '/' + fileName(base, f);
            fs.writeFileSync(full, f.content);
            log('wrote ' + full);
        }
        Blockbench.showQuickMessage('Exported ' + files.length + ' file(s) to ' + base + '/', 2200);
        return;
    }

    let i = 0;
    const next = () => {
        if (i >= files.length) return;
        const f = files[i++];
        if (typeof f.content !== 'string') {
            log('skipping binary file ' + fileName(base, f) + ', needs the desktop app');
            next();
            return;
        }
        Blockbench.export({
            resource_id: 'nrc_cosmetic_export',
            type: 'JSON',
            extensions: ['json'],
            name: fileName(base, f),
            content: f.content,
        }, next);
    };
    next();
}
