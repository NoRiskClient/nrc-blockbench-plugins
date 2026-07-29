function optional(load: () => any): any {
    try {
        return load();
    } catch (e) {
        return null;
    }
}

export const fs: any = optional(() => require('fs'));
export const os: any = optional(() => require('os'));
export const nodePath: any = optional(() => require('path'));

const bufferModule: any = optional(() => require('buffer'));
export const Buf: any = bufferModule && bufferModule.Buffer;

export function hasFilesystem(): boolean {
    return !!(fs && os && nodePath);
}

export function tempDir(...segments: string[]): string | null {
    if (!hasFilesystem()) return null;
    try {
        const dir = nodePath.join(os.tmpdir(), ...segments);
        fs.mkdirSync(dir, { recursive: true });
        return dir;
    } catch (e) {
        return null;
    }
}

export function toBase64(bytes: Uint8Array): string {
    if (Buf) return Buf.from(bytes).toString('base64');
    let out = '';
    for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
    return btoa(out);
}

export function toBuffer(bytes: Uint8Array): any {
    return Buf ? Buf.from(bytes) : bytes;
}
