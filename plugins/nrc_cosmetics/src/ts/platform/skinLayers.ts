import { rigBoneName } from './playerModel';

const LAYER_TAG = 'nrc_skin_layer';

export const SKIN_UV = 64;

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

let enabled = true;

export function secondLayerEnabled(): boolean {
    return enabled;
}

export function setSecondLayerEnabled(on: boolean) {
    enabled = on;
}

export function removeLayer(cube: any) {
    const mesh = cube.mesh;
    if (!mesh || !mesh.children) return;

    for (const layer of mesh.children.filter((c: any) => c[LAYER_TAG])) {
        mesh.remove(layer);
        if (layer.geometry && layer.geometry.dispose) layer.geometry.dispose();
    }
}

function inflateOutwards(geometry: any, inflate: number) {
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
            position.array[at] = value >= centre[axis] ? value + inflate : value - inflate;
        }
    }
    position.needsUpdate = true;
}

function shiftUv(geometry: any, du: number, dv: number) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
        uv.array[i * 2] += du / SKIN_UV;
        uv.array[i * 2 + 1] -= dv / SKIN_UV;
    }
    uv.needsUpdate = true;
}

export function buildLayer(cube: any, material: any, skinHeight: number) {
    removeLayer(cube);
    if (!enabled || !material) return;

    const def = LAYERS[rigBoneName(cube)];
    if (!def) return;
    if (def.needsTallSkin && skinHeight < SKIN_UV) return;

    const source = cube.mesh && cube.mesh.geometry;
    if (!source || !source.attributes || !source.attributes.uv) return;

    const geometry = source.clone();
    inflateOutwards(geometry, def.inflate);
    shiftUv(geometry, def.du, def.dv);

    const layer: any = new THREE.Mesh(geometry, material);
    layer[LAYER_TAG] = true;
    layer.no_export = true;
    layer.renderOrder = 1;
    cube.mesh.add(layer);
}
