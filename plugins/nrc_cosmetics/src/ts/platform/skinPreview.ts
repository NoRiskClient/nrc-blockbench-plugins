import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { currentType, isCosmeticFormat } from './format';

// Render-only skin preview: swaps each cube's THREE material between Blockbench's marker
// color and a skin material built from the current cosmetic type's reference skin. Never
// creates a Blockbench Texture, so nothing appears in the Textures panel.

let skinMode = false;
let playerBones = new Set<string>();
const materials: { [uri: string]: any } = {};

// True if the cube belongs to one of the player rig bones (not an imported prop).
function isPlayerCube(cube: any): boolean {
    let p = cube.parent;
    while (p && p.name) {
        if (playerBones.has(p.name)) return true;
        p = p.parent;
    }
    return false;
}

function materialFor(uri: string): any {
    if (materials[uri]) return materials[uri];
    const img = new Image();
    const tex = new THREE.Texture(img);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    img.onload = function () {
        tex.needsUpdate = true;
        if (skinMode) applySkin();
    };
    img.src = uri;
    materials[uri] = new THREE.MeshLambertMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
    });
    return materials[uri];
}

function currentSkin(): string | undefined {
    const t = currentType();
    return t ? t.defaultSkin : undefined;
}

function applySkin() {
    const uri = currentSkin();
    if (!uri) return;
    const mat = materialFor(uri);
    for (const cube of Cube.all as any[]) {
        if (cube.mesh && isPlayerCube(cube)) cube.mesh.material = mat;
    }
}

function restoreMarkers() {
    for (const cube of Cube.all as any[]) {
        if (isPlayerCube(cube) && cube.preview_controller) cube.preview_controller.updateFaces(cube);
    }
}

export function reapplyIfActive() {
    if (skinMode) applySkin();
}

export function isSkinMode(): boolean {
    return skinMode;
}

export function setSkinMode(on: boolean) {
    skinMode = on;
    const t = currentType();
    playerBones = new Set<string>(t ? t.bones : []);
    if (on) applySkin();
    else restoreMarkers();
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
        },
    });
}
