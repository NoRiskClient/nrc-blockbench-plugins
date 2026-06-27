import packageJson from '../package.json';
import { Registry } from './core/registry';
import { registerCosmeticType } from './feature';
import { installEasing } from './platform/easing';
import { EMOTE } from './cosmetics/emote';

const { version, blockbenchConfig } = packageJson;

(function () {
    const registry = new Registry();

    BBPlugin.register('nrc_cosmetics', Object.assign(
        {},
        blockbenchConfig as typeof blockbenchConfig & { variant: 'both' },
        {
            name: blockbenchConfig.title,
            version,
            await_loading: true,
            onload() {
                registerCosmeticType(EMOTE, registry);
                // Future: registerCosmeticType(ACCESSORY, registry); etc.
                installEasing(registry);
                console.log('Loaded NoRisk Client Cosmetics plugin');
            },
            onunload() {
                registry.disposeAll();
            },
        }
    ));
})();
