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
let syncing = false;
let cubeCount = -1;

function baseName(name: string): string {
    return (name || '').replace(/[\s_]*\d+$/, '');
}

function templateElements(): any[] {
    const t = currentType();
    return t ? ((t.rig as any).elements || []) : [];
}

export function refreshTemplate() {
    const type = currentType();
    templateNames = {};
    boneNames = new Set<string>(type ? type.bones : []);
    for (const e of templateElements()) {
        if (!e.name) continue;
        boneNames.add(e.name);
        if (e.uuid) templateNames[e.uuid] = e.name;
    }
}

function looksLikeRigCube(cube: any): boolean {
    if (templateNames[cube.uuid]) return true;
    const parent = cube.parent;
    if (!parent || !parent.name) return false;
    const bone = baseName(parent.name);
    return boneNames.has(bone) && baseName(cube.name) === bone;
}

export function resolveRigCubes() {
    if (!boneNames.size) refreshTemplate();
    const all = (Cube.all || []) as any[];
    resolved = new Set(all.filter(looksLikeRigCube).map((c) => c.uuid));
    cubeCount = all.length;
}

function resolveIfStale() {
    if (((Cube.all || []) as any[]).length !== cubeCount) resolveRigCubes();
}

export function propCubes(): any[] {
    resolveIfStale();
    return ((Cube.all || []) as any[]).filter((c) => !resolved.has(c.uuid));
}

function rigRootOf(node: any): any {
    let found: any = null;
    let n = node;
    while (n && typeof n === 'object') {
        if (n.name && boneNames.has(baseName(n.name))) found = n;
        n = n.parent;
    }
    return found;
}

function selectedRig(): any {
    const group = typeof Group !== 'undefined' ? (Group as any).first_selected : null;
    return group ? rigRootOf(group) : null;
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
    const name = baseName(cube.name);
    return templateNames[cube.uuid] || (boneNames.has(name) ? name : '');
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

function syncRigLock() {
    if (syncing) return;

    const shaping = typeof Modes !== 'undefined' && (!!Modes.edit || !!Modes.paint);
    const protect = protectRig && shaping;
    const exempt = protect && Modes.edit ? selectedRig() : null;

    let changed = false;
    for (const cube of rigCubes()) {
        const locked = protect && (!exempt || rigRootOf(cube) !== exempt);
        if (cube.locked === locked) continue;
        if (locked && cube.selected) cube.unselect();
        cube.locked = locked;
        changed = true;
    }
    if (!changed) return;

    if (exempt) {
        syncing = true;
        try { exempt.select(); } finally { syncing = false; }
    }
    updateSelection();
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
    const onSelection = () => {
        if (syncing || !isCosmeticFormat()) return;
        resolveIfStale();
        syncRigLock();
    };
    registry.event('select_mode', onMode);
    registry.event('unselect_mode', onMode);
    registry.event('load_project', onMode);
    registry.event('select_project', onMode);
    registry.event('update_selection', onSelection);
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
