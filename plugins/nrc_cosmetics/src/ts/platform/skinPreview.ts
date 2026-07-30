import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { currentType, isCosmeticFormat } from './format';
import { applyArmModel, currentArmModel, isRigCube, refreshTemplate, resolveRigCubes, rigCubes, rigResolved, setArmModel } from './playerModel';
import { SKIN_UV, buildLayer, removeLayer, secondLayerEnabled, setSecondLayerEnabled } from './skinLayers';

const MAX_MATERIALS = 8;

let skinMode = false;
let customSkin: string | null = null;
const materials: { [uri: string]: any } = {};
const materialOrder: string[] = [];
const skinHeights: { [uri: string]: number } = {};

function skinUri(): string | undefined {
    if (customSkin) return customSkin;
    const t = currentType();
    return t ? t.defaultSkin : undefined;
}

function materialFor(uri: string): any {
    if (materials[uri]) return materials[uri];

    const img = new Image();
    const tex = new THREE.Texture(img);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    img.onload = function () {
        tex.needsUpdate = true;
        skinHeights[uri] = img.height || 64;
        if (skinMode) applySkin();
    };
    img.src = uri;

    const mat = new THREE.MeshLambertMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
    });
    materials[uri] = mat;
    materialOrder.push(uri);

    while (materialOrder.length > MAX_MATERIALS) {
        const stale = materialOrder.shift() as string;
        const dead = materials[stale];
        delete materials[stale];
        if (dead) {
            if (dead.map && dead.map.dispose) dead.map.dispose();
            if (dead.dispose) dead.dispose();
        }
    }
    return mat;
}

function rescaleToSkinUv(cube: any) {
    const geometry = cube.mesh && cube.mesh.geometry;
    const uv = geometry && geometry.attributes && geometry.attributes.uv;
    if (!uv) return;

    const sx = (Project.texture_width || SKIN_UV) / SKIN_UV;
    const sy = (Project.texture_height || SKIN_UV) / SKIN_UV;
    if (sx === 1 && sy === 1) return;

    for (let i = 0; i < uv.count; i++) {
        uv.array[i * 2] *= sx;
        uv.array[i * 2 + 1] = 1 - (1 - uv.array[i * 2 + 1]) * sy;
    }
    uv.needsUpdate = true;
}

function applyToCube(cube: any) {
    const uri = skinUri();
    if (!uri || !cube.mesh) return;
    const material = materialFor(uri);
    cube.mesh.material = material;
    buildLayer(cube, material, skinHeights[uri] || SKIN_UV);
}

function applySkin() {
    resolveRigCubes();
    for (const cube of rigCubes()) {
        if (cube.preview_controller) cube.preview_controller.updateUV(cube);
        applyToCube(cube);
    }
}

function restoreCubes() {
    for (const cube of rigCubes()) {
        removeLayer(cube);
        if (!cube.preview_controller) continue;
        cube.preview_controller.updateFaces(cube);
        cube.preview_controller.updateUV(cube);
    }
}

function isSkinMode(): boolean {
    return skinMode;
}

export function setSkinMode(on: boolean) {
    skinMode = on;
    refreshTemplate();
    resolveRigCubes();
    applyArmModel();
    if (on) applySkin();
    else restoreCubes();
}

export function setCustomSkin(uri: string | null) {
    customSkin = uri;
    if (skinMode) applySkin();
    else setSkinMode(true);
}

export function makeToggleSkinAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_toggle_skin_' + type.id, {
        name: 'Toggle Skin Preview',
        description: 'Render a reference player skin on the rig instead of the marker colors',
        icon: 'accessibility_new',
        category: 'view',
        condition: () => isCosmeticFormat(type),
        click() {
            setSkinMode(!isSkinMode());
            Blockbench.showQuickMessage('Skin preview ' + (isSkinMode() ? 'on' : 'off'), 1200);
        },
    });
}

export function makeToggleLayerAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_toggle_skin_layer_' + type.id, {
        name: 'Toggle Skin Second Layer',
        description: 'Show the hat, jacket, sleeve and pants overlay of the reference skin',
        icon: 'layers',
        category: 'view',
        condition: () => isCosmeticFormat(type),
        click() {
            setSecondLayerEnabled(!secondLayerEnabled());
            if (skinMode) applySkin();
            Blockbench.showQuickMessage('Second layer ' + (secondLayerEnabled() ? 'on' : 'off'), 1200);
        },
    });
}

export function makeToggleArmModelAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_toggle_arm_model_' + type.id, {
        name: 'Toggle Slim Arms',
        description: 'Switch the reference rig between the classic and slim player model',
        icon: 'straighten',
        category: 'view',
        condition: () => isCosmeticFormat(type),
        click() {
            setArmModel(currentArmModel() === 'slim' ? 'classic' : 'slim');
            if (skinMode) applySkin();
            Blockbench.showQuickMessage(currentArmModel() === 'slim' ? 'Slim arms' : 'Classic arms', 1200);
        },
    });
}

export function installSkinPreview(registry: Registry) {
    const controller = (Cube as any).preview_controller;
    if (controller && controller.on) {
        const target = (element: any): boolean => {
            if (!skinMode || !isCosmeticFormat() || !element) return false;
            if (!rigResolved()) resolveRigCubes();
            return isRigCube(element);
        };

        const rebuild = controller.on('update_faces setup update_geometry', function (data: any) {
            const element = data && data.element;
            if (target(element)) applyToCube(element);
        });
        const rescale = controller.on('update_uv', function (data: any) {
            const element = data && data.element;
            if (!target(element)) return;
            rescaleToSkinUv(element);
            applyToCube(element);
        });
        registry.track(() => {
            if (rebuild && rebuild.delete) rebuild.delete();
            if (rescale && rescale.delete) rescale.delete();
        });
    }

    const onProject = () => {
        refreshTemplate();
        resolveRigCubes();
        if (skinMode && isCosmeticFormat()) applySkin();
    };
    registry.event('load_project', onProject);
    registry.event('select_project', onProject);
}
