import * as THREE from 'three';
import { STEVE_GEO, buildBoneTree, parseGeo, parseEmoteFile, EmotePlayer, applyEmoteToRig, parseParticle, ParticleSystem } from '@noriskclient/nrc-skin-renderer';
import steveSkin from '../../assets/steveSkin';
import { log } from '../../core/log';

const SIZE = 132;
const DEFAULT_FPS = 24;
const DEFAULT_CAMERA_DISTANCE = 44;
const NEGATE_X = true; // bedrock<->blockbench X convention used by the renderer lib
const BLOCK_TO_PX = 16;

interface Item {
    ctx: any;
    scene: any;
    tree: any;
    propTree: any;
    player: any;
    time: number;
    particles: any;
    size: number;
    fps: number;
    camera: any;
}

export interface PreviewParticle {
    json: any;
    textureDataUri: string;
}

let renderer: any = null;
let camera: any = null;
let skinMaterial: any = null;
let raf = 0;
let renderedSize = SIZE;
let last = 0;
let items: Item[] = [];

function makeTexture(dataUri: string): any {
    const img = new Image();
    const tex = new THREE.Texture(img);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;
    tex.flipY = false;
    (tex as any).colorSpace = (THREE as any).SRGBColorSpace;
    img.onload = () => { tex.needsUpdate = true; };
    img.src = dataUri;
    return tex;
}

function makeMaterial(dataUri: string): any {
    return new THREE.MeshStandardMaterial({
        map: makeTexture(dataUri),
        side: THREE.FrontSide,
        transparent: true,
        alphaTest: 0.01,
        roughness: 1,
        metalness: 0,
    });
}

function buildParticleSystem(particles: PreviewParticle[] | undefined): any {
    if (!particles || !particles.length) return null;
    const sys = new ParticleSystem();
    let registered = 0;
    for (const entry of particles) {
        try {
            const effect = parseParticle(entry.json);
            if (!effect.identifier) continue;
            sys.register(effect.identifier, { effect, texture: makeTexture(entry.textureDataUri) });
            registered++;
        } catch (e) {
            log('live preview: particle skipped: ' + e);
        }
    }
    return registered ? sys : null;
}

function particleListener(sys: any, tree: any, propTree: any): any {
    return {
        onParticleKeyframe: (_id: string, _time: number, kf: any) => {
            if (!sys.hasEffect(kf.effectId)) return;
            const anchor = anchorFor(kf.locator, tree, propTree);
            if (kf.locator && !anchor) return;
            const target = anchor || tree.root;
            sys.spawn(kf.effectId, {
                positionProvider: () => target.getWorldPosition(new THREE.Vector3()),
                forceLifetime: 'once',
                unitScale: BLOCK_TO_PX,
            });
        },
    };
}

function anchorFor(name: string, tree: any, propTree: any): any {
    if (!name) return null;
    return tree.bones.get(name)
        || (propTree && propTree.bones.get(name))
        || tree.locators.get(name)
        || (propTree && propTree.locators.get(name))
        || null;
}

function ensureMaterial(): any {
    if (!skinMaterial) skinMaterial = makeMaterial(steveSkin);
    return skinMaterial;
}

function makeCamera(distance: number): any {
    const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    cam.position.set(0, 20, distance);
    cam.lookAt(0, 16, 0);
    return cam;
}

function ensureRenderer() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE);
    renderedSize = SIZE;
    camera = makeCamera(DEFAULT_CAMERA_DISTANCE);
}

function maxFps(): number {
    let fps = DEFAULT_FPS;
    for (const item of items) if (item.fps > fps) fps = item.fps;
    return fps;
}

function loop(now: number) {
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / maxFps()) return;
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (!renderer || !camera) return;
    const t = now / 1000;
    for (const item of items) {
        if (!item.ctx || !item.ctx.canvas || !item.ctx.canvas.isConnected) continue;
        try {
            item.player.update(t);
            applyEmoteToRig(item.player, item.tree, { negateX: NEGATE_X, propTree: item.propTree || undefined });
            if (item.particles) item.particles.tick(t, dt);
            if (renderedSize !== item.size) {
                renderer.setSize(item.size, item.size);
                renderedSize = item.size;
            }
            renderer.render(item.scene, item.camera);
            item.ctx.clearRect(0, 0, item.size, item.size);
            item.ctx.drawImage(renderer.domElement, 0, 0, item.size, item.size);
        } catch (e) { /* skip frame */ }
    }
}

export interface LivePreviewOptions {
    propGeo?: any;
    propTexUri?: string;
    particles?: PreviewParticle[];
    fps?: number;
    cameraDistance?: number;
}

export function addLivePreview(canvas: any, animationJson: any, options: LivePreviewOptions = {}) {
    const { propGeo, propTexUri, particles, fps, cameraDistance } = options;
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

        const sys = buildParticleSystem(particles);
        if (sys) scene.add(sys.root);

        const player = new EmotePlayer(sys ? { keyframeListener: particleListener(sys, tree, propTree) } : undefined);
        player.play(file.emotes[0], performance.now() / 1000, { loop: true });

        items.push({ ctx: canvas.getContext('2d'), scene, tree, propTree, player, time: 0, particles: sys, size: canvas.width || SIZE, fps: fps || DEFAULT_FPS,
            camera: cameraDistance ? makeCamera(cameraDistance) : camera });
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    } catch (e) {
        log('live preview add failed: ' + e);
    }
}

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

function disposeItem(item: Item) {
    try {
        if (item.particles) {
            item.scene.remove(item.particles.root);
            item.particles.dispose();
        }
    } catch (e) { }
    try { disposeScene(item.scene); } catch (e) { }
    item.ctx.clearRect(0, 0, item.size, item.size);
}

export function removeLivePreview(canvas: any) {
    for (const item of items) if (item.ctx.canvas === canvas) disposeItem(item);
    items = items.filter((item) => item.ctx.canvas !== canvas);
}

export function clearLivePreviews() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    for (const item of items) disposeItem(item);
    items = [];
    skinMaterial = null;
    if (renderer && renderer.dispose) { try { renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss(); } catch (e) { /* ignore */ } }
    renderer = null;
    camera = null;
}
