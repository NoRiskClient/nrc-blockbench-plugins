import { log } from '../core/log';
import { mcId } from '../core/util';

let fs: any;
try { fs = require('fs'); } catch (e) { /* not in electron */ }

// Remembers the last export folder for convenient re-exports during a session.
let lastDir: string | undefined;

export interface OutFile { suffix: string; content: string; }

export const sanitize = mcId;

// Writes all files into one chosen folder. Falls back to chained save dialogs.
export function writeFiles(base: string, files: OutFile[]) {
    if (fs && Blockbench.pickDirectory) {
        const dir = Blockbench.pickDirectory({
            title: 'Export NRC Cosmetic',
            startpath: lastDir,
            resource_id: 'nrc_cosmetic_export',
        });
        if (!dir) {
            log('export cancelled (no directory)');
            return;
        }
        lastDir = dir;
        for (const f of files) {
            const full = dir + '/' + base + f.suffix;
            fs.writeFileSync(full, f.content);
            log('wrote ' + full);
        }
        Blockbench.showQuickMessage('Exported ' + files.length + ' file(s)', 1800);
        return;
    }

    // Fallback: one save dialog per file.
    let i = 0;
    const next = () => {
        if (i >= files.length) return;
        const f = files[i++];
        Blockbench.export({
            resource_id: 'nrc_cosmetic_export',
            type: 'JSON',
            extensions: ['json'],
            name: base + f.suffix,
            content: f.content,
        }, next);
    };
    next();
}
