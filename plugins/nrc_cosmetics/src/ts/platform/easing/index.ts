import { Registry } from '../../core/registry';
import { installEasingPatches } from './keyframePatches';
import { installEasingPanel } from '../../ui/easingPanel';

export function installEasing(registry: Registry) {
    installEasingPatches(registry);
    installEasingPanel(registry);
}
