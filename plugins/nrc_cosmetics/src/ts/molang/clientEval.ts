export type ClientQueries = { [name: string]: number | undefined };

type Node = (q: ClientQueries) => number;

const QUERIES = new Set(['anim_time', 'life_time', 'is_moving', 'is_sneaking']);
for (const part of ['head', 'body', 'right_arm', 'left_arm', 'right_leg', 'left_leg']) {
    for (const axis of ['x', 'y', 'z']) QUERIES.add(`${part}_${axis}_rot`);
}

const DEG = Math.PI / 180;

function rint(v: number): number {
    const f = Math.floor(v);
    const d = v - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
}

function mathFunc1(name: string, v: number): number {
    switch (name) {
        case 'sin': return Math.sin(v * DEG);
        case 'cos': return Math.cos(v * DEG);
        case 'abs': return Math.abs(v);
        case 'floor': return Math.floor(v);
        case 'ceil': return Math.ceil(v);
        case 'round': return rint(v);
        case 'sqrt': return Math.sqrt(v);
        case 'exp': return Math.exp(v);
        case 'ln': return Math.log(v);
        default: return 0;
    }
}

function mathFunc2(name: string, a: number, b: number): number {
    switch (name) {
        case 'pow': return Math.pow(a, b);
        case 'mod': return b !== 0 ? a % b : 0;
        case 'min': return Math.min(a, b);
        case 'max': return Math.max(a, b);
        default: return 0;
    }
}

const constant = (value: number): Node => () => value;

class Parser {
    private pos = 0;

    constructor(private input: string) {}

    parseExpression(): Node {
        return this.parseAddSub();
    }

    private parseAddSub(): Node {
        let left = this.parseMulDiv();
        while (this.pos < this.input.length) {
            this.skipWhitespace();
            if (this.pos >= this.input.length) break;
            const op = this.input[this.pos];
            if (op !== '+' && op !== '-') break;
            this.pos++;
            const l = left;
            const r = this.parseMulDiv();
            left = op === '+' ? (q) => l(q) + r(q) : (q) => l(q) - r(q);
        }
        return left;
    }

    private parseMulDiv(): Node {
        let left = this.parseUnary();
        while (this.pos < this.input.length) {
            this.skipWhitespace();
            if (this.pos >= this.input.length) break;
            const op = this.input[this.pos];
            if (op !== '*' && op !== '/') break;
            this.pos++;
            const l = left;
            const r = this.parseUnary();
            left = op === '*'
                ? (q) => l(q) * r(q)
                : (q) => { const d = r(q); return d !== 0 ? l(q) / d : 0; };
        }
        return left;
    }

    private parseUnary(): Node {
        this.skipWhitespace();
        if (this.pos < this.input.length && this.input[this.pos] === '-') {
            this.pos++;
            const inner = this.parseUnary();
            return (q) => -inner(q);
        }
        return this.parsePrimary();
    }

    private parsePrimary(): Node {
        this.skipWhitespace();
        if (this.pos >= this.input.length) return constant(0);
        const c = this.input[this.pos];
        if (c === '(') {
            this.pos++;
            const expr = this.parseExpression();
            this.skipWhitespace();
            if (this.pos < this.input.length && this.input[this.pos] === ')') this.pos++;
            return expr;
        }
        if (/[0-9.]/.test(c)) return this.parseNumber();
        if (/[A-Za-z]/.test(c)) return this.parseIdentifier();
        return constant(0);
    }

    private parseNumber(): Node {
        const start = this.pos;
        while (this.pos < this.input.length && /[0-9.]/.test(this.input[this.pos])) this.pos++;
        const value = Number(this.input.substring(start, this.pos));
        return constant(Number.isFinite(value) ? value : 0);
    }

    private parseIdentifier(): Node {
        const start = this.pos;
        while (this.pos < this.input.length && /[A-Za-z0-9_.]/.test(this.input[this.pos])) this.pos++;
        const ident = this.input.substring(start, this.pos);

        this.skipWhitespace();
        if (this.pos < this.input.length && this.input[this.pos] === '(') {
            this.pos++;
            const args: Node[] = [this.parseExpression()];
            this.skipWhitespace();
            while (this.pos < this.input.length && this.input[this.pos] === ',') {
                this.pos++;
                args.push(this.parseExpression());
                this.skipWhitespace();
            }
            if (this.pos < this.input.length && this.input[this.pos] === ')') this.pos++;

            const lower = ident.toLowerCase();
            if (!lower.startsWith('math.')) return args[0];
            const fn = lower.slice('math.'.length);
            if (fn === 'random') {
                const lo = args[0];
                const hi = args[1];
                return (q) => {
                    const a = lo ? lo(q) : 0;
                    const b = hi ? hi(q) : 1;
                    return a + Math.random() * (b - a);
                };
            }
            if (args.length >= 3 && fn === 'clamp') {
                const [v, lo, hi] = args;
                return (q) => Math.min(Math.max(v(q), lo(q)), hi(q));
            }
            if (args.length >= 2 && ['pow', 'mod', 'min', 'max'].includes(fn)) {
                const [a, b] = args;
                return (q) => mathFunc2(fn, a(q), b(q));
            }
            const arg = args[0];
            return (q) => mathFunc1(fn, arg(q));
        }

        if (ident.startsWith('query.')) {
            const name = ident.slice('query.'.length);
            if (name === 'time') return (q) => q.life_time ?? 0;
            if (!QUERIES.has(name)) return constant(0);
            return (q) => q[name] ?? 0;
        }
        return constant(0);
    }

    private skipWhitespace() {
        while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) this.pos++;
    }
}

export function parseClient(expression: string): Node {
    return new Parser(expression.trim()).parseExpression();
}

export function evalClient(expression: string, queries: ClientQueries = {}): number {
    return parseClient(expression)(queries);
}
