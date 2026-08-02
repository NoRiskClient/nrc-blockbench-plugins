const DEV = false;

let fs: any;
try { if (DEV) fs = require('fs'); } catch (e) { /* not in electron */ }

const LOG_PATH = 'C:/Coding/noriskclient/nrc-blockbench-plugins/plugins/nrc_cosmetics/nrc_debug.log';

export function logReset() {
    if (!DEV) return;
    try { fs && fs.writeFileSync(LOG_PATH, ''); } catch (e) { /* ignore */ }
}

export function log(msg: string) {
    console.log('[NRC]', msg);
    if (!DEV) return;
    try { fs && fs.appendFileSync(LOG_PATH, msg + '\n'); } catch (e) { /* ignore */ }
}
