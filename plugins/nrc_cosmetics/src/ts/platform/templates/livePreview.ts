import * as THREE from 'three';
import { STEVE_GEO, buildBoneTree, parseGeo, parseEmoteFile, EmotePlayer, applyEmoteToRig } from '@noriskclient/nrc-skin-renderer';
import steveSkin from '../../assets/steveSkin';
import { log } from '../../core/log';

// Live animated card previews using the official @noriskclient/nrc-skin-renderer so the pose
// math (negateX, rotation order, molang, locked bones) matches in-game 1:1. One shared THREE
// renderer blits each emote's posed rig into per-card 2D canvases.

const SIZE = 132;
const FPS = 24;
const NEGATE_X = true; // bedrock<->blockbench X convention used by the renderer lib

interface Item {
    ctx: any;
    scene: any;
    tree: any;
    propTree: any;
    player: any;
    time: number;
}

let renderer: any = null;
let camera: any = null;
let skinMaterial: any = null;
let raf = 0;
let last = 0;
let items: Item[] = [];

// The lib's UVs assume flipY=false; matching that here is what makes the skin map correctly.
function makeMaterial(dataUri: string): any {
    const img = new Image();
    const tex = new THREE.Texture(img);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.flipY = false;
    (tex as any).colorSpace = (THREE as any).SRGBColorSpace;
    img.onload = () => { tex.needsUpdate = true; };
    img.src = dataUri;
    return new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, alphaTest: 0.01, roughness: 1, metalness: 0 });
}

function ensureMaterial(): any {
    if (!skinMaterial) skinMaterial = makeMaterial(steveSkin);
    return skinMaterial;
}

function ensureRenderer() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    camera.position.set(0, 20, 44);
    camera.lookAt(0, 16, 0);
}

function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / FPS) return;
    last = now;
    if (!renderer || !camera) return;
    const t = now / 1000;
    for (const item of items) {
        if (!item.ctx || !item.ctx.canvas || !item.ctx.canvas.isConnected) continue;
        try {
            item.player.update(t);
            applyEmoteToRig(item.player, item.tree, { negateX: NEGATE_X, propTree: item.propTree || undefined });
            renderer.render(item.scene, camera);
            item.ctx.clearRect(0, 0, SIZE, SIZE);
            item.ctx.drawImage(renderer.domElement, 0, 0, SIZE, SIZE);
        } catch (e) { /* skip frame */ }
    }
}

export function addLivePreview(canvas: any, animationJson: any, propGeo?: any, propTexUri?: string) {
    try {
        ensureRenderer();
        const tree = buildBoneTree(STEVE_GEO, ensureMaterial(), { negateX: NEGATE_X, armorOnly: false });
        tree.root.rotation.y = Math.PI; // face the camera

        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 1.4));
        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(20, 40, 30);
        scene.add(dir);
        scene.add(tree.root);

        let propTree: any = null;
        if (propGeo && propTexUri) {
            propTree = buildBoneTree(parseGeo(propGeo), makeMaterial(propTexUri), { negateX: NEGATE_X, armorOnly: false });
            propTree.root.rotation.y = Math.PI;
            scene.add(propTree.root);
        }

        const file = parseEmoteFile(animationJson);
        if (!file.emotes.length) return;
        const player = new EmotePlayer();
        player.play(file.emotes[0], performance.now() / 1000, { loop: true });

        items.push({ ctx: canvas.getContext('2d'), scene, tree, propTree, player, time: 0 });
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    } catch (e) {
        log('live preview add failed: ' + e);
    }
}

// Frees the GPU resources of one preview scene (geometries, materials, textures).
function disposeScene(root: any) {
    root.traverse((o: any) => {
        if (o.geometry && o.geometry.dispose) o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        for (const m of mats) {
            if (m.map && m.map.dispose) m.map.dispose();
            if (m.dispose) m.dispose();
        }
    });
}

export function clearLivePreviews() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    for (const item of items) { try { disposeScene(item.scene); } catch (e) { /* ignore */ } }
    items = [];
    skinMaterial = null;
    if (renderer && renderer.dispose) { try { renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); } catch (e) { /* ignore */ } }
    renderer = null;
    camera = null;
}
