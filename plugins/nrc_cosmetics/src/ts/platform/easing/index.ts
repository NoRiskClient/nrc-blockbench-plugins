import { Registry } from '../../core/registry';
import { installEasingPatches } from './keyframePatches';
import { installEasingPanel } from '../../ui/easingPanel';

// Keyframe easing: prototype patches (preview + export) and the keyframe-panel selector UI.
export function installEasing(registry: Registry) {
    installEasingPatches(registry);
    installEasingPanel(registry);
}
