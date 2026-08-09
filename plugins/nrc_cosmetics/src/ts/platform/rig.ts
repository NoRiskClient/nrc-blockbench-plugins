import { CosmeticType } from '../cosmetics/types';
import { getFormat } from './format';
import { setSkinMode } from './skinPreview';
import { initRig } from './playerModel';
import { log, logReset } from '../core/log';

export function loadRig(type: CosmeticType, skipDefaultAnimation = false) {
    logReset();
    log('loadRig ' + type.id);
    try {
        newProject(getFormat(type));
        Codecs.project.parse(JSON.parse(JSON.stringify(type.rig)), '');
        Project.name = type.defaultName;

        if (type.createsDefaultAnimation && !skipDefaultAnimation) {
            const preset = type.defaultAnimation || { name: type.defaultName, loop: 'hold' };
            new Animation({ name: preset.name, loop: preset.loop }).add(false).select();
        }
        Canvas.updateAll();
        if (type.hasSkinPreview) setSkinMode(true);
        initRig();

        log('loadRig done bones=' + (typeof Group !== 'undefined' && Group.all ? Group.all.length : '?'));
    } catch (err: any) {
        log('loadRig ERROR: ' + (err && err.stack ? err.stack : String(err)));
    }
}
