import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { currentType, isCosmeticFormat } from './format';

export type ArmModel = 'classic' | 'slim';

const ARM_WIDTHS: { [model: string]: number } = { classic: 4, slim: 3 };
const ARM_ANCHORS: { [bone: string]: string } = { bipedRightArm: 'min', bipedLeftArm: 'max' };

let templateNames: { [uuid: string]: string } = {};
let boneNames = new Set<string>();
let resolved = new Set<string>();
let armModel: ArmModel = 'classic';
let protectRig = true;

function templateElements(): any[] {
    const t = currentType();
    return t ? ((t.rig as any).elements || []) : [];
}

export function refreshTemplate() {
    templateNames = {};
    boneNames = new Set<string>();
    for (const e of templateElements()) {
        if (!e.name) continue;
        boneNames.add(e.name);
        if (e.uuid) templateNames[e.uuid] = e.name;
    }
}

export function resolveRigCubes() {
    const all = (Cube.all || []) as any[];
    let match = all.filter((c) => templateNames[c.uuid]);
    if (!match.length) {
        match = all.filter((c) => c.parent && boneNames.has(c.parent.name) && c.name === c.parent.name);
    }
    resolved = new Set(match.map((c) => c.uuid));
}

export function rigResolved(): boolean {
    return resolved.size > 0;
}

export function isRigCube(cube: any): boolean {
    return !!cube && resolved.has(cube.uuid);
}

export function rigCubes(): any[] {
    return ((Cube.all || []) as any[]).filter((c) => resolved.has(c.uuid));
}

export function rigBoneName(cube: any): string {
    return templateNames[cube.uuid] || (boneNames.has(cube.name) ? cube.name : '');
}

export function currentArmModel(): ArmModel {
    return armModel;
}

export function applyArmModel() {
    const width = ARM_WIDTHS[armModel];
    for (const cube of rigCubes()) {
        const anchor = ARM_ANCHORS[rigBoneName(cube)];
        if (!anchor) continue;

        if (anchor === 'min') cube.to[0] = cube.from[0] + width;
        else cube.from[0] = cube.to[0] - width;

        if (!cube.preview_controller) continue;
        cube.preview_controller.updateGeometry(cube);
        cube.preview_controller.updateUV(cube);
    }
}

export function setArmModel(model: ArmModel) {
    if (armModel === model) return;
    armModel = model;
    applyArmModel();
}

function rigProtected(): boolean {
    return protectRig;
}

function setRigLocked(locked: boolean) {
    for (const cube of rigCubes()) {
        if (locked && cube.selected) cube.unselect();
        cube.locked = locked;
    }
    updateSelection();
}

function syncRigLock() {
    const shaping = typeof Modes !== 'undefined' && (!!Modes.edit || !!Modes.paint);
    setRigLocked(protectRig && shaping);
}

function setRigProtected(on: boolean) {
    protectRig = on;
    syncRigLock();
}

export function initRig() {
    refreshTemplate();
    resolveRigCubes();
    applyArmModel();
    syncRigLock();
}

export function installPlayerModel(registry: Registry) {
    const onMode = () => {
        if (!isCosmeticFormat()) return;
        refreshTemplate();
        resolveRigCubes();
        syncRigLock();
    };
    registry.event('select_mode', onMode);
    registry.event('unselect_mode', onMode);
    registry.event('load_project', onMode);
    registry.event('select_project', onMode);
}

export function makeToggleRigLockAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_toggle_rig_lock_' + type.id, {
        name: 'Protect Player Rig',
        description: 'Keep the reference player cubes from being edited while modelling',
        icon: 'lock',
        category: 'edit',
        condition: () => isCosmeticFormat(type),
        click() {
            setRigProtected(!rigProtected());
            Blockbench.showQuickMessage('Player rig ' + (rigProtected() ? 'protected' : 'editable'), 1400);
        },
    });
}
