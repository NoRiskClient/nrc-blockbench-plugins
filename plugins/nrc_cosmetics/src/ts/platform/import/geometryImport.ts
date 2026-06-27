import { log } from '../../core/log';

// Adds prop geometry (Bedrock .geo.json) onto the current rig by building Blockbench
// Groups/Cubes directly, and applies the prop texture so it shows up UV-mapped.
export function importGeometry(geoJson: any, textureDataUri?: string) {
    try {
        const geos = geoJson['minecraft:geometry'] || [];
        Undo.initEdit({ outliner: true, elements: [], textures: [] });

        let tex: any = null;
        if (textureDataUri) {
            tex = new Texture({ name: 'prop' }).fromDataURL(textureDataUri).add(false);
        }

        const propCubes: any[] = [];
        for (const geo of geos) {
            const bones = geo.bones || [];
            const groupByName: { [n: string]: any } = {};

            for (const b of bones) {
                const g = new Group({ name: b.name, origin: b.pivot || [0, 0, 0], rotation: b.rotation || [0, 0, 0] }).init();
                groupByName[b.name] = g;
            }

            for (const b of bones) {
                if (!b.parent) continue;
                const child = groupByName[b.name];
                const parent = groupByName[b.parent] || (Group.all || []).find((x: any) => x.name === b.parent);
                if (child && parent) child.addTo(parent);
            }

            for (const b of bones) {
                const g = groupByName[b.name];
                for (const c of b.cubes || []) {
                    const from = c.origin || [0, 0, 0];
                    const size = c.size || [0, 0, 0];
                    const to = [from[0] + size[0], from[1] + size[1], from[2] + size[2]];
                    const cube: any = new Cube({ name: b.name, from, to }).init();
                    cube.addTo(g);
                    if (c.pivot) cube.origin = c.pivot;
                    if (c.rotation) cube.rotation = c.rotation;
                    if (c.inflate) cube.inflate = c.inflate;
                    if (Array.isArray(c.uv)) { cube.box_uv = true; cube.uv_offset = c.uv; }
                    propCubes.push(cube);
                }
            }
        }

        // Map the prop texture onto the prop cubes.
        if (tex) {
            for (const cube of propCubes) {
                if (!cube.faces) continue;
                for (const key in cube.faces) cube.faces[key].texture = tex.uuid;
            }
            Canvas.updateAllUVs && Canvas.updateAllUVs();
        }

        Undo.finishEdit('Import prop geometry');
        Canvas.updateAll();
    } catch (e) {
        log('geometry import failed: ' + e);
    }
}
