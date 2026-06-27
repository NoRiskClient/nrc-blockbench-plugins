// Tracks every Blockbench resource the plugin creates so onunload can dispose them all
// generically. Adding a feature never means editing an onunload list again.
export class Registry {
    private disposers: Array<() => void> = [];

    track(dispose: () => void) {
        this.disposers.push(dispose);
    }

    action(id: string, opts: any): any {
        const a = new Action(id, opts);
        this.track(() => a.delete());
        return a;
    }

    property(target: any, type: string, key: string, opts: any): any {
        const p = new Property(target, type, key, opts);
        this.track(() => p.delete());
        return p;
    }

    format(opts: any): any {
        const f = new ModelFormat(opts);
        this.track(() => f.delete());
        return f;
    }

    menu(action: any, path: string) {
        MenuBar.addAction(action, path);
        // The action's own delete() (tracked above) removes it from the menu.
    }

    previewMenu(action: any) {
        if (typeof Preview !== 'undefined' && Preview.prototype && Preview.prototype.menu) {
            Preview.prototype.menu.addAction(action);
        } else {
            MenuBar.addAction(action, 'view');
        }
    }

    css(s: string) {
        const node: any = Blockbench.addCSS(s);
        this.track(() => { if (node && node.delete) node.delete(); });
    }

    event(name: string, cb: any) {
        Blockbench.on(name, cb);
        this.track(() => { if (Blockbench.removeListener) Blockbench.removeListener(name, cb); });
    }

    // Reversibly replaces obj[key]. `make` receives the original to delegate to.
    monkeypatch(obj: any, key: string, make: (orig: any) => any) {
        const orig = obj[key];
        obj[key] = make(orig);
        this.track(() => { obj[key] = orig; });
    }

    disposeAll() {
        this.disposers.reverse().forEach((d) => { try { d(); } catch (e) { /* ignore */ } });
        this.disposers = [];
    }
}
