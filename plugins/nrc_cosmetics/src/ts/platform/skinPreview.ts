import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { currentType, isCosmeticFormat } from './format';

const MAX_MATERIALS = 8;
const LAYER_TAG = 'nrc_skin_layer';
const SKIN_UV = 64;

interface LayerDef {
    du: number;
    dv: number;
    inflate: number;
    needsTallSkin: boolean;
}

const LAYERS: { [bone: string]: LayerDef } = {
    bipedHead: { du: 32, dv: 0, inflate: 0.5, needsTallSkin: false },
    bipedBody: { du: 0, dv: 16, inflate: 0.25, needsTallSkin: true },
    bipedRightArm: { du: 0, dv: 16, inflate: 0.25, needsTallSkin: true },
    bipedLeftArm: { du: 16, dv: 0, inflate: 0.25, needsTallSkin: true },
    bipedRightLeg: { du: 0, dv: 16, inflate: 0.25, needsTallSkin: true },
    bipedLeftLeg: { du: -16, dv: 0, inflate: 0.25, needsTallSkin: true },
};

let skinMode = false;
let secondLayer = true;
let vanillaUuids = new Set<string>();
let vanillaNames = new Set<string>();
let resolved = new Set<string>();
let layerByUuid: { [uuid: string]: LayerDef } = {};
let customSkin: string | null = null;
const materials: { [uri: string]: any } = {};
const materialOrder: string[] = [];
const skinHeights: { [uri: string]: number } = {};

function rigElements(): any[] {
    const t = currentType();
    return t ? ((t.rig as any).elements || []) : [];
}

function refreshRigIds() {
    const els = rigElements();
    vanillaUuids = new Set(els.map((e: any) => e.uuid).filter(Boolean));
    vanillaNames = new Set(els.map((e: any) => e.name).filter(Boolean));
    layerByUuid = {};
    for (const e of els) {
        const def = LAYERS[e.name];
        if (e.uuid && def) layerByUuid[e.uuid] = def;
    }
}

function resolveVanilla() {
    const all = (Cube.all || []) as any[];
    let match = all.filter((c) => vanillaUuids.has(c.uuid));
    if (!match.length) {
        match = all.filter((c) => c.parent && vanillaNames.has(c.parent.name) && c.name === c.parent.name);
    }
    resolved = new Set(match.map((c) => c.uuid));
}

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

function layerDef(cube: any): LayerDef | null {
    return layerByUuid[cube.uuid] || LAYERS[cube.name] || null;
}

function removeLayer(cube: any) {
    const mesh = cube.mesh;
    if (!mesh || !mesh.children) return;
    const existing = mesh.children.filter((c: any) => c[LAYER_TAG]);
    for (const layer of existing) {
        mesh.remove(layer);
        if (layer.geometry && layer.geometry.dispose) layer.geometry.dispose();
    }
}

function buildLayer(cube: any) {
    removeLayer(cube);
    if (!secondLayer) return;

    const def = layerDef(cube);
    if (!def) return;

    const uri = skinUri();
    if (!uri) return;
    if (def.needsTallSkin && (skinHeights[uri] || 64) < 64) return;

    const source = cube.mesh && cube.mesh.geometry;
    if (!source || !source.attributes || !source.attributes.uv) return;

    const geometry = source.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const centre = [
        (box.min.x + box.max.x) / 2,
        (box.min.y + box.max.y) / 2,
        (box.min.z + box.max.z) / 2,
    ];

    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
        for (let axis = 0; axis < 3; axis++) {
            const at = i * 3 + axis;
            const value = position.array[at];
            position.array[at] = value >= centre[axis] ? value + def.inflate : value - def.inflate;
        }
    }
    position.needsUpdate = true;

    const uv = geometry.attributes.uv;
    const du = def.du / SKIN_UV;
    const dv = def.dv / SKIN_UV;
    for (let i = 0; i < uv.count; i++) {
        uv.array[i * 2] += du;
        uv.array[i * 2 + 1] -= dv;
    }
    uv.needsUpdate = true;

    const layer: any = new THREE.Mesh(geometry, materialFor(uri));
    layer[LAYER_TAG] = true;
    layer.no_export = true;
    layer.renderOrder = 1;
    cube.mesh.add(layer);
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
    cube.mesh.material = materialFor(uri);
    buildLayer(cube);
}

function applySkin() {
    resolveVanilla();
    for (const cube of (Cube.all || []) as any[]) {
        if (!resolved.has(cube.uuid)) continue;
        if (cube.preview_controller) cube.preview_controller.updateUV(cube);
        applyToCube(cube);
    }
}

function restoreCubes() {
    for (const cube of (Cube.all || []) as any[]) {
        if (!resolved.has(cube.uuid)) continue;
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
    refreshRigIds();
    resolveVanilla();
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
            secondLayer = !secondLayer;
            if (skinMode) applySkin();
            Blockbench.showQuickMessage('Second layer ' + (secondLayer ? 'on' : 'off'), 1200);
        },
    });
}

export function installSkinPreview(registry: Registry) {
    const controller = (Cube as any).preview_controller;
    if (controller && controller.on) {
        const target = (element: any): boolean => {
            if (!skinMode || !isCosmeticFormat() || !element) return false;
            if (!resolved.size) resolveVanilla();
            return resolved.has(element.uuid);
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
        refreshRigIds();
        resolveVanilla();
        if (skinMode && isCosmeticFormat()) applySkin();
    };
    registry.event('load_project', onProject);
    registry.event('select_project', onProject);
}
