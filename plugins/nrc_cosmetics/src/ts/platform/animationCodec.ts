import { CosmeticType } from '../cosmetics/types';
import { buildAnimationJson } from '../serialization/animation';
import { currentEmoteId } from './emoteIdentity';
import { log } from '../core/log';

export function createAnimationCodec(type: CosmeticType): any {
    return new AnimationCodec('nrc_' + type.id + '_animation', {
        multiple_per_file: true,

        compileFile(animations: any[] = (Animation.all || []) as any[]) {
            log('compileFile: ' + animations.length + ' animation(s)');
            return buildAnimationJson(type, animations, currentEmoteId(type));
        },

        exportFile(path: string, save_as?: boolean) {
            const all = (Animation.all || []) as any[];
            const forFile = path ? all.filter((a) => a.path === path) : all;
            const animations = forFile.length ? forFile : all;

            log('exportFile: path=' + path + ' save_as=' + !!save_as + ' animations=' + animations.length);
            if (!animations.length) {
                Blockbench.showQuickMessage('Nothing to save, the project has no animations', 2000);
                return;
            }

            const content = JSON.stringify((this as any).compileFile(animations), null, 2);

            const remember = (written?: string) => {
                if (!written) return;
                for (const anim of animations) {
                    anim.path = written;
                    anim.saved = true;
                }
                log('exportFile: wrote ' + written);
            };

            if (path && !save_as && Blockbench.writeFile) {
                Blockbench.writeFile(path, { content }, remember);
                return;
            }

            Blockbench.export(
                {
                    resource_id: 'animation',
                    type: 'JSON Animation',
                    extensions: ['json'],
                    name: currentEmoteId(type) + '.animation',
                    startpath: path,
                    content,
                },
                remember
            );
        },
    });
}
