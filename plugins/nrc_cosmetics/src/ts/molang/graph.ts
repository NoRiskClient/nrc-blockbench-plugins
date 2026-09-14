import { DemoSamples } from './demo';

export const GRAPH_W = 320;
export const GRAPH_H = 120;
const PAD = 8;

export interface Graph {
    lines: string[];
    input: string;
    inputLabel: string;
    zero: number | null;
    min: string;
    max: string;
}

export function formatNumber(value: number): string {
    if (Math.abs(value) >= 1000) return value.toFixed(0);
    return String(Math.round(value * 100) / 100);
}

function range(lines: number[][]): [number, number] {
    let min = Infinity;
    let max = -Infinity;
    for (const line of lines) for (const v of line) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    if (!Number.isFinite(min)) return [-1, 1];
    if (max - min < 1e-6) return [min - 1, max + 1];
    return [min, max];
}

function toPath(values: number[], min: number, max: number): string {
    const span = max - min;
    const last = Math.max(values.length - 1, 1);
    return values.map((v, i) => {
        const x = (i / last) * GRAPH_W;
        const y = PAD + ((max - v) / span) * (GRAPH_H - PAD * 2);
        return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
}

export function buildGraph(samples: DemoSamples): Graph {
    const [min, max] = range(samples.lines);
    const zero = min < 0 && max > 0 ? PAD + (max / (max - min)) * (GRAPH_H - PAD * 2) : null;
    let input = '';
    if (samples.input) {
        const [inMin, inMax] = range([samples.input]);
        input = toPath(samples.input, inMin, inMax);
    }
    return {
        lines: samples.lines.map((line) => toPath(line, min, max)),
        input,
        inputLabel: samples.inputLabel,
        zero,
        min: formatNumber(min),
        max: formatNumber(max),
    };
}

export function playheadX(t: number, seconds: number): number {
    return (t / seconds) * GRAPH_W;
}
