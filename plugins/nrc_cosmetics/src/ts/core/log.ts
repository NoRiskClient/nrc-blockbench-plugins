// Dev logger. Writes to a file on disk so it can be inspected outside Blockbench.
// Flip DEV to false for release builds to make it a no-op.
const DEV = true;

let fs: any;
try { if (DEV) fs = require('fs'); } catch (e) { /* not in electron */ }

const LOG_PATH = 'C:/Coding/noriskclient/nrc-blockbench-plugins/plugins/nrc_cosmetics/nrc_debug.log';

export function logReset() {
    if (!DEV) return;
    try { fs && fs.writeFileSync(LOG_PATH, ''); } catch (e) { /* ignore */ }
}

export function log(msg: string) {
    if (!DEV) return;
    console.log('[NRC]', msg);
    try { fs && fs.appendFileSync(LOG_PATH, msg + '\n'); } catch (e) { /* ignore */ }
}
