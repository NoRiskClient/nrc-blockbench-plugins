import { CosmeticType } from '../cosmetics/types';
import { Registry } from '../core/registry';
import { isCosmeticFormat } from '../platform/format';
import { setCustomSkin } from '../platform/skinPreview';
import { ArmModel, setArmModel } from '../platform/playerModel';
import { fs } from '../core/node';
import { log } from '../core/log';

const PROFILE_API = 'https://api.mojang.com/users/profiles/minecraft/';
const SESSION_API = 'https://sessionserver.mojang.com/session/minecraft/profile/';
const FALLBACK_API = 'https://mc-heads.net/skin/';

async function toDataUri(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) throw new Error('http ' + res.status);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return 'data:image/png;base64,' + btoa(binary);
}

interface FetchedSkin {
    uri: string;
    arms: ArmModel | null;
}

async function mojangSkin(name: string): Promise<{ url: string; arms: ArmModel }> {
    const profile = await fetch(PROFILE_API + encodeURIComponent(name));
    if (!profile.ok) throw new Error('unknown player');
    const id = (await profile.json()).id;

    const session = await fetch(SESSION_API + id);
    if (!session.ok) throw new Error('http ' + session.status);
    const properties = (await session.json()).properties || [];
    if (!properties.length) throw new Error('no profile properties');

    const raw = atob(properties[0].value);
    const codes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) codes[i] = raw.charCodeAt(i);
    const textures = JSON.parse(new TextDecoder().decode(codes)).textures || {};

    const skin = textures.SKIN;
    if (!skin || !skin.url) throw new Error('player has no custom skin');
    const model = skin.metadata && skin.metadata.model;
    return { url: skin.url, arms: model === 'slim' ? 'slim' : 'classic' };
}

async function fetchSkin(name: string): Promise<FetchedSkin> {
    try {
        const found = await mojangSkin(name);
        return { uri: await toDataUri(found.url), arms: found.arms };
    } catch (e) {
        log('mojang skin lookup failed, falling back: ' + e);
        return { uri: await toDataUri(FALLBACK_API + encodeURIComponent(name)), arms: null };
    }
}

function fileToDataUri(content: string): string {
    if (content.indexOf('data:') === 0) return content;
    return 'data:image/png;base64,' + fs.readFileSync(content).toString('base64');
}

export function createSkinAction(registry: Registry, type: CosmeticType): any {
    return registry.action('nrc_set_skin_' + type.id, {
        name: 'Set Preview Skin',
        description: 'Load the reference skin from a Minecraft account or a PNG file',
        icon: 'person',
        category: 'view',
        condition: () => isCosmeticFormat(type),
        click() {
            openSkinDialog(type);
        },
    });
}

export function openSkinDialog(type: CosmeticType) {
    new Dialog('nrc_skin_' + type.id, {
        title: 'Preview Skin',
        width: 460,
        form: {
            source: {
                label: 'Source',
                type: 'inline_select',
                default: 'username',
                options: {
                    username: 'Minecraft name',
                    file: 'PNG file',
                    reset: 'Default skin',
                },
            },
            username: {
                label: 'Player name',
                type: 'text',
                value: '',
                placeholder: 'Notch',
                condition: (form: any) => form.source === 'username',
            },
            file: {
                label: 'Skin file',
                type: 'file',
                extensions: ['png'],
                readtype: 'image',
                filetype: 'PNG',
                return_as: 'file',
                condition: (form: any) => form.source === 'file',
            },
        },
        onConfirm(result: any) {
            if (result.source === 'reset') {
                setCustomSkin(null);
                Blockbench.showQuickMessage('Preview skin reset', 1600);
                return;
            }

            if (result.source === 'file') {
                const file = result.file;
                if (!file || !file.content) {
                    Blockbench.showQuickMessage('Please pick a PNG file', 1600);
                    return;
                }
                try {
                    setCustomSkin(fileToDataUri(file.content));
                    Blockbench.showQuickMessage('Preview skin loaded', 1600);
                } catch (e) {
                    log('skin file read failed: ' + e);
                    Blockbench.showQuickMessage('Could not read that file', 2400);
                }
                return;
            }

            const name = (result.username || '').trim();
            if (!name) {
                Blockbench.showQuickMessage('Please enter a player name', 1600);
                return;
            }
            Blockbench.showQuickMessage('Loading skin for ' + name, 1600);
            fetchSkin(name).then(
                (found) => {
                    if (found.arms) setArmModel(found.arms);
                    setCustomSkin(found.uri);
                    Blockbench.showQuickMessage('Preview skin set to ' + name + (found.arms === 'slim' ? ' (slim)' : ''), 1600);
                },
                (e) => {
                    log('skin fetch failed: ' + e);
                    Blockbench.showQuickMessage('Could not load a skin for ' + name, 2400);
                },
            );
        },
    }).show();
}
