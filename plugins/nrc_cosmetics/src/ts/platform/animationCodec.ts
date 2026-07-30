import { buildAnimationJson } from '../serialization/animation';
import { currentEmoteId } from './emoteIdentity';
import { currentType } from './format';
import { log } from '../core/log';

export const nrcAnimationCodec = new AnimationCodec('nrc_emote_animation', {
    multiple_per_file: true,

    compileFile(animations: any[] = Animation.all as any[]) {
        log('compileFile: ' + (animations ? animations.length : 0) + ' animation(s)');
        const type = currentType();
        if (!type) return { format_version: '1.8.0', animations: {} };
        return buildAnimationJson(type, animations, currentEmoteId(type));
    },

    exportFile(path: string, save_as?: boolean) {
        const all = (Animation.all || []) as any[];
        const forFile = path ? all.filter((a) => a.path === path) : all;
        const animations = forFile.length ? forFile : all;

        log('exportFile: path=' + path + ' save_as=' + !!save_as + ' animations=' + animations.length);
        const content = JSON.stringify((this as any).compileFile(animations), null, 2);
        const name = (animations[0] && animations[0].name) || 'emote';

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
                name: name + '.animation',
                startpath: path,
                content,
            },
            remember
        );
    },
});
