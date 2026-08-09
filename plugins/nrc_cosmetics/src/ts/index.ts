import packageJson from '../package.json';
import { Registry } from './core/registry';
import { registerCosmeticType } from './feature';
import { installAnimationPatches, removeAnimationPatches } from './platform/animationPatches';
import { installEasing } from './platform/easing';
import { EMOTE } from './cosmetics/emote';
import { COSMETIC } from './cosmetics/cosmetic';
import { ensureDialogCss } from './ui/dialogStyles';
import { ensureTemplateCss } from './ui/templateDialog';
import { installSkinPreview } from './platform/skinPreview';
import { installPlayerModel } from './platform/playerModel';

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
                ensureTemplateCss(registry);
                ensureDialogCss(registry);
                installPlayerModel(registry);
                installSkinPreview(registry);

                registerCosmeticType(EMOTE, registry);
                registerCosmeticType(COSMETIC, registry);
                installEasing(registry);
                installAnimationPatches();
                console.log('Loaded NoRisk Client Cosmetics plugin');
            },
            onunload() {
                removeAnimationPatches();
                registry.disposeAll();
            },
        }
    ));
})();
