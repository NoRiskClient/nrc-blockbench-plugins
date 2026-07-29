import { log } from '../../core/log';

const FACE_KEYS = ['north', 'east', 'south', 'west', 'up', 'down'];

function negateXY(values: number[]) {
    values.forEach((v: number, axis: number) => {
        if (axis !== 2) values[axis] = -v;
    });
}

function applyCubeUv(cube: any, raw: any) {
    if (Array.isArray(raw)) {
        cube.box_uv = true;
        cube.uv_offset = [raw[0], raw[1]];
        return;
    }
    if (!raw) return;

    cube.box_uv = false;
    for (const key of FACE_KEYS) {
        const face = cube.faces[key];
        if (!face) continue;

        const source = raw[key];
        if (!source || !source.uv) {
            face.texture = null;
            face.uv = [0, 0, 0, 0];
            face.rotation = 0;
            continue;
        }

        face.extend({
            material_name: source.material_instance,
            uv: [source.uv[0], source.uv[1]],
            rotation: source.uv_rotation,
        });

        if (source.uv_size) {
            face.uv_size = [source.uv_size[0], source.uv_size[1]];
        } else {
            cube.autouv = 1;
            cube.mapAutoUV();
        }

        if (key === 'up' || key === 'down') {
            face.uv = [face.uv[2], face.uv[3], face.uv[0], face.uv[1]];
        }
    }
}

function buildCube(c: any, group: any, bone: any): any {
    const cube: any = new Cube({
        name: c.name || group.name,
        autouv: 0,
        color: group.color,
        rotation: c.rotation,
        origin: c.pivot,
    });

    negateXY(cube.rotation);
    cube.origin[0] = -cube.origin[0];

    const size = c.size || [0, 0, 0];
    if (c.origin) {
        cube.from[0] = -(c.origin[0] + size[0]);
        cube.from[1] = c.origin[1];
        cube.from[2] = c.origin[2];
        cube.to[0] = size[0] + cube.from[0];
        cube.to[1] = size[1] + cube.from[1];
        cube.to[2] = size[2] + cube.from[2];
    }

    applyCubeUv(cube, c.uv);

    const inflate = c.inflate !== undefined ? c.inflate : (bone ? bone.inflate : undefined);
    if (typeof inflate === 'number') cube.inflate = inflate;
    cube.mirror_uv = c.mirror === undefined ? group.mirror_uv === true : c.mirror === true;

    return cube.addTo(group).init();
}

function buildLocators(b: any, group: any) {
    if (!b.locators || typeof Locator === 'undefined') return;

    for (const key of Object.keys(b.locators)) {
        const raw = b.locators[key];
        const coords = (Array.isArray(raw) ? raw : raw && raw.offset) || [0, 0, 0];
        const rotation = Array.isArray(raw) ? undefined : raw && raw.rotation;

        const position = [-coords[0], coords[1], coords[2]];
        const turn = Array.isArray(rotation) ? [-rotation[0], -rotation[1], rotation[2]] : undefined;

        new Locator({
            name: key,
            position,
            rotation: turn,
            ignore_inherited_scale: Array.isArray(raw) ? undefined : raw && raw.ignore_inherited_scale,
        }).addTo(group).init();
    }
}

function buildGroup(b: any): any {
    const group: any = new Group({
        name: b.name,
        origin: b.pivot || [0, 0, 0],
        rotation: b.rotation || [0, 0, 0],
    }).init();

    if (b.pivot) group.origin[0] = -group.origin[0];
    negateXY(group.rotation);
    group.mirror_uv = b.mirror === true;
    return group;
}

export function importGeometry(geoJson: any, textureDataUri?: string) {
    try {
        const geos = geoJson['minecraft:geometry'] || [];
        Undo.initEdit({ outliner: true, elements: [], textures: [] });

        const description = (geos[0] && geos[0].description) || {};
        if (description.texture_width) Project.texture_width = description.texture_width;
        if (description.texture_height) Project.texture_height = description.texture_height;
        log('geometry uv resolution ' + Project.texture_width + 'x' + Project.texture_height);

        let tex: any = null;
        if (textureDataUri) {
            tex = new Texture({ name: 'prop' }).fromDataURL(textureDataUri).add(false);
        }

        const knownGroups: { [n: string]: any } = {};
        for (const g of (Group.all || []) as any[]) {
            if (g.name && !knownGroups[g.name]) knownGroups[g.name] = g;
        }

        const propCubes: any[] = [];
        for (const geo of geos) {
            const bones = geo.bones || [];
            const created = new Set<string>();

            for (const b of bones) {
                if (knownGroups[b.name]) continue;
                knownGroups[b.name] = buildGroup(b);
                created.add(b.name);
            }

            for (const b of bones) {
                if (!b.parent || !created.has(b.name)) continue;
                const child = knownGroups[b.name];
                const parent = knownGroups[b.parent];
                if (child && parent) child.addTo(parent);
            }

            for (const b of bones) {
                if (!created.has(b.name)) continue;
                const group = knownGroups[b.name];
                for (const c of b.cubes || []) propCubes.push(buildCube(c, group, b));
                buildLocators(b, group);
            }
        }

        if (tex) {
            for (const cube of propCubes) {
                if (!cube.faces) continue;
                for (const key in cube.faces) {
                    if (cube.faces[key].texture === null) continue;
                    cube.faces[key].texture = tex.uuid;
                }
            }
            if (Canvas.updateAllUVs) Canvas.updateAllUVs();
        }

        Undo.finishEdit('Import prop geometry');
        Canvas.updateAll();
    } catch (e) {
        log('geometry import failed: ' + e);
    }
}
