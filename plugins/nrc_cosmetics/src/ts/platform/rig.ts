import { CosmeticType } from '../cosmetics/types';
import { getFormat } from './format';
import { setSkinMode } from './skinPreview';
import { log, logReset } from '../core/log';

// Creates a fresh project and loads the type's rig into it. Template imports pass
// skipDefaultAnimation so they can add the template's own animations instead.
export function loadRig(type: CosmeticType, skipDefaultAnimation = false) {
    logReset();
    log('loadRig ' + type.id);
    try {
        // Always start a fresh project so each New Emote is its own .bbmodel.
        newProject(getFormat(type));
        Codecs.project.parse(JSON.parse(JSON.stringify(type.rig)), '');
        Project.name = type.defaultName;

        if (type.createsDefaultAnimation && !skipDefaultAnimation) {
            new Animation({ name: type.defaultName, loop: 'hold' }).add(false).select();
        }
        Canvas.updateAll();
        if (type.hasSkinPreview) setSkinMode(true);

        log('loadRig done bones=' + (typeof Group !== 'undefined' && Group.all ? Group.all.length : '?'));
    } catch (err: any) {
        log('loadRig ERROR: ' + (err && err.stack ? err.stack : String(err)));
    }
}
