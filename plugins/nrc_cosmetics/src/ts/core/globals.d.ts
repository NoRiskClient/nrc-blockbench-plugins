// Minimal ambient declarations for the Blockbench globals this plugin uses.
// Kept loose on purpose — self-contained so the build does not depend on the exact
// blockbench-types version (which clashes with the DOM `Animation` lib type).

declare const console: { log(...args: any[]): void; warn(...args: any[]): void; error(...args: any[]): void };
declare function require(module: string): any;
declare const Outliner: any;
declare const Group: any;
declare const Cube: any;
declare const Keyframe: any;
declare const Timeline: any;
declare const Animator: any;
declare const BoneAnimator: any;
declare const EffectAnimator: any;
declare const document: any;
declare function fetch(url: string, opts?: any): Promise<any>;
declare function btoa(data: string): string;
declare function requestAnimationFrame(cb: (t: number) => void): number;
declare function cancelAnimationFrame(id: number): void;
declare const performance: { now(): number };
declare class TextDecoder { constructor(label?: string); decode(input?: any): string; }

declare class Texture {
    constructor(data?: any, uuid?: string);
    static all: any[];
    fromDataURL(url: string): this;
    add(undo?: boolean): this;
    remove(undo?: boolean): void;
    export: boolean;
    [key: string]: any;
}

interface BBAnimation {
    name: string;
    loop: 'once' | 'hold' | 'loop';
    saved: boolean;
    select(): BBAnimation;
    add(undo?: boolean): BBAnimation;
    compileBedrockAnimation(): any;
    [key: string]: any;
}
declare const Animation: {
    new (data: { name?: string; loop?: 'once' | 'hold' | 'loop'; length?: number }): BBAnimation;
    all: BBAnimation[];
    selected: BBAnimation | null;
};

declare const Undo: {
    initEdit(aspects: any): any;
    finishEdit(message: string, aspects?: any): any;
};
declare const Canvas: any;
declare function updateSelection(): void;
declare function newProject(format: any): boolean;
declare function guid(): string;

declare const Project: any;
declare const Format: { id: string; [key: string]: any };
declare const settings: { [key: string]: { value: any } };
declare const Codecs: { [key: string]: any };

declare class ModelFormat {
    constructor(options: any);
    id: string;
    delete(): void;
    [key: string]: any;
}
declare class Action {
    constructor(id: string, options: any);
    delete(): void;
    [key: string]: any;
}
declare class Dialog {
    constructor(id: string, options: any);
    show(): this;
    [key: string]: any;
}
declare class Property {
    constructor(target: any, type: string, key: string, options: any);
    delete(): void;
    [key: string]: any;
}
declare const MenuBar: { addAction(action: any, path: string): void };
declare const BarItems: { [id: string]: any };
declare const Preview: any;
declare const THREE: any;
declare class Image { constructor(); src: string; onload: any; }
declare const BBPlugin: { register(id: string, options: any): void };
declare const Blockbench: {
    export(options: any, callback?: (path?: string) => void): void;
    [key: string]: any;
};
