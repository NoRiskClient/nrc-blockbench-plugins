import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { isCosmeticFormat } from '../platform/format';
import { isRigCube } from '../platform/playerModel';

const FACES = ['north', 'south', 'east', 'west', 'up', 'down'];

interface PaintedPixel {
    x: number;
    y: number;
    width: number;
    height: number;
}

function outlinableCubes(): any[] {
    return (Cube.all as any[]).filter((c) => c.selected && !isRigCube(c));
}

function defaultTexture(): any {
    return (Texture.getDefault && Texture.getDefault()) || (Texture.all || [])[0] || null;
}

function fail(message: string) {
    Blockbench.showMessageBox({ title: 'Create Outline', icon: 'error', message, buttons: ['OK'] });
}

/**
 * Paint [color] onto a fully transparent pixel and report where it landed. Searched from the bottom
 * right, away from where a texture layout usually grows.
 */
function paintOutlinePixel(texture: any, color: string): PaintedPixel | null {
    let painted: PaintedPixel | null = null;
    texture.edit((canvas: any) => {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        if (!ctx || !width || !height) return;

        const data = ctx.getImageData(0, 0, width, height).data;
        for (let y = height - 1; y >= 0 && !painted; y--) {
            for (let x = width - 1; x >= 0; x--) {
                if (data[(y * width + x) * 4 + 3] === 0) {
                    painted = { x, y, width, height };
                    break;
                }
            }
        }
        if (!painted) return;
        ctx.fillStyle = color;
        ctx.fillRect(painted.x, painted.y, 1, 1);
    }, { no_undo: true });
    return painted;
}

/** Sample the middle of the pixel so neighbouring texels cannot bleed in. */
function faceUv(texture: any, pixel: PaintedPixel): any {
    const perX = Project.texture_width / pixel.width;
    const perY = Project.texture_height / pixel.height;
    const uv = [
        (pixel.x + 0.25) * perX,
        (pixel.y + 0.25) * perY,
        (pixel.x + 0.75) * perX,
        (pixel.y + 0.75) * perY,
    ];
    const faces: any = {};
    // Each face gets its own array; Blockbench keeps the reference it is handed.
    for (const face of FACES) faces[face] = { uv: uv.slice(), texture: texture.uuid };
    return faces;
}

/**
 * An outline is a hull turned inside out: `from` takes the larger corner, `to` the smaller. Backface
 * culling then drops the near side and leaves the far one, which is what reads as a rim.
 */
function buildOutline(cube: any, thickness: number, texture: any, pixel: PaintedPixel): any {
    return new Cube({
        name: cube.name + '_outline',
        autouv: 0,
        box_uv: false,
        rotation: cube.rotation.slice(),
        origin: cube.origin.slice(),
        from: [
            cube.to[0] + thickness,
            cube.to[1] + thickness,
            cube.to[2] + thickness,
        ],
        to: [
            cube.from[0] - thickness,
            cube.from[1] - thickness,
            cube.from[2] - thickness,
        ],
        faces: faceUv(texture, pixel),
    } as any).addTo(cube.parent).init();
}

function createOutline(thickness: number, color: string) {
    const cubes = outlinableCubes();
    if (!cubes.length) return fail('Select at least one cube of your own.');

    const texture = defaultTexture();
    if (!texture) return fail('This project has no texture to put the outline colour in.');

    Undo.initEdit({ outliner: true, elements: [], textures: [texture], bitmap: true } as any);

    const pixel = paintOutlinePixel(texture, color);
    if (!pixel) {
        Undo.cancelEdit();
        return fail(
            'No free pixel left in the texture. The outline colour needs one fully transparent pixel, '
            + 'so clear one or enlarge the texture and try again.'
        );
    }

    const created = cubes.map((cube) => buildOutline(cube, thickness, texture, pixel));

    Undo.finishEdit('Create outline', {
        outliner: true,
        elements: created,
        textures: [texture],
        bitmap: true,
    } as any);
    Canvas.updateAll();
    Blockbench.showQuickMessage(`Outline for ${created.length} cube(s)`, 1600);
}

export function createOutlineAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_create_outline_' + type.id, {
        name: 'Create Outline',
        description: 'Wrap the selected cubes in an inside-out hull that renders as a coloured rim',
        icon: 'crop_square',
        category: 'tools',
        condition: () => isCosmeticFormat(type) && outlinableCubes().length > 0,
        click() {
            new Dialog('nrc_outline_settings', {
                title: 'Create Outline',
                form: {
                    thickness: { label: 'Thickness', type: 'number', value: 0.25, min: 0.01, step: 0.05 },
                    color: { label: 'Colour', type: 'color', value: '#000000' },
                },
                onConfirm(result: any) {
                    createOutline(Number(result.thickness), String(result.color));
                },
            } as any).show();
        },
    });
}
