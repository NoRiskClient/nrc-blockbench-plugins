import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { hasFilesystem } from '../core/node';
import { loadRig } from '../platform/rig';
import { importGeometry } from '../platform/import/geometryImport';
import { importAnimation } from '../platform/import/animationImport';
import { readCosmeticFolder, describeError, CosmeticFolder } from '../platform/import/folderImport';
import { linkEffectFiles } from '../platform/effectFiles';
import { linkVanillaSounds } from '../platform/vanillaSounds';
import { setSourceMeta } from '../platform/sourceMeta';
import { log } from '../core/log';

let lastDir: string | undefined;

function fail(message: string) {
    Blockbench.showMessageBox({ title: 'Import Cosmetic', icon: 'error', message, buttons: ['OK'] });
}

function build(type: CosmeticType, folder: CosmeticFolder) {
    loadRig(type, true);

    importGeometry(folder.geo, folder.textureDataUri || undefined);
    if (folder.animation) importAnimation(type, folder.animation);

    if (folder.companions.length) linkEffectFiles(folder.base, folder.companions);
    linkVanillaSounds();
    setSourceMeta({ norisk: folder.norisk, mcmeta: folder.mcmeta, dir: folder.dir });
    Project.name = (folder.norisk && folder.norisk.name) || folder.base;

    Canvas.updateAll();
    Blockbench.showQuickMessage(`Imported ${folder.base}`, 1600);
}

export function createImportAnimationAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_import_animation_' + type.id, {
        name: 'Import ' + type.formatName + ' Animation',
        description: 'Open a lone .animation.json on the rig, without a model or texture',
        icon: 'movie_filter',
        category: 'file',
        condition: () => type.hasBareAnimations && type.hasAnimation,
        click() {
            Blockbench.import({
                resource_id: 'nrc_animation_import',
                extensions: ['json'],
                type: type.formatName + ' Animation',
                readtype: 'text',
            }, (files: any[]) => {
                const picked = files && files[0];
                if (!picked) return;

                let json: any;
                try {
                    json = JSON.parse(picked.content);
                } catch (e: any) {
                    return fail('That file is not valid JSON: ' + (e && e.message || e));
                }
                if (!json || !json.animations) {
                    return fail('No "animations" in that file, so it is not an animation.');
                }

                loadRig(type, true);
                importAnimation(type, json);
                Project.name = String(picked.name || type.defaultName).replace(/\.animation\.json$/i, '');
                Canvas.updateAll();
                Blockbench.showQuickMessage('Imported ' + Project.name, 1600);
            });
        },
    });
}

export function createImportAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_import_' + type.id, {
        name: 'Import ' + type.formatName,
        description: 'Open a cosmetic folder with its model, texture, animation and metadata',
        icon: 'folder_open',
        category: 'file',
        condition: () => hasFilesystem() && !!Blockbench.pickDirectory,
        click() {
            const dir = Blockbench.pickDirectory({
                title: 'Import ' + type.formatName,
                startpath: lastDir,
                resource_id: 'nrc_cosmetic_import',
            });
            if (!dir) return;
            lastDir = dir;

            const result = readCosmeticFolder(dir);
            if ('kind' in result) {
                log('import rejected: ' + result.kind);
                return fail(describeError(result));
            }
            build(type, result);
        },
    });
}
