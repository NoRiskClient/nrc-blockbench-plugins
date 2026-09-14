import { evalMolang } from '@noriskclient/nrc-skin-renderer';
import { ClientQueries, parseClient } from './clientEval';
import { DemoAxis, DemoBone, DemoChannel, MolangDemo } from './catalog';

const FPS = 60;
const PARTICLE_LIFETIME = 2;

export const COMPARE_ANIM_TIME = 40;

const STEVE: Record<DemoBone, string> = {
    head: 'bipedHead',
    body: 'bipedBody',
    right_arm: 'bipedRightArm',
    left_arm: 'bipedLeftArm',
    right_leg: 'bipedRightLeg',
    left_leg: 'bipedLeftLeg',
};

const PARTICLE_RANDOMS: Array<[number, number, number, number]> = [
    [0.12, 0.53, 0.81, 0.34],
    [0.47, 0.91, 0.22, 0.68],
    [0.76, 0.08, 0.59, 0.95],
    [0.95, 0.37, 0.44, 0.11],
    [0.31, 0.72, 0.05, 0.52],
];

interface Pose {
    bone: DemoBone;
    axis: DemoAxis;
    value: number;
}

interface Simulation {
    queries: ClientQueries;
    pose: Pose[];
    input: number;
    label: string;
}

export interface DemoSamples {
    seconds: number;
    lines: number[][];
    input: number[] | null;
    inputLabel: string;
    animationJson: any | null;
}

export interface CompareRow {
    expression: string;
    game: number;
    preview: number;
}

const NONE: Simulation = { queries: {}, pose: [], input: 0, label: '' };

function simulate(sim: MolangDemo['sim'], t: number): Simulation {
    const active = t % 4 < 2 ? 1 : 0;
    if (sim === 'walk') {
        const swing = active * Math.sin(t * Math.PI * 3) * 30;
        return {
            queries: { is_moving: active },
            pose: [{ bone: 'right_leg', axis: 'x', value: swing }, { bone: 'left_leg', axis: 'x', value: -swing }],
            input: active,
            label: 'query.is_moving',
        };
    }
    if (sim === 'sneak') {
        return {
            queries: { is_sneaking: active },
            pose: [{ bone: 'body', axis: 'x', value: active * 28 }],
            input: active,
            label: 'query.is_sneaking',
        };
    }
    if (sim && sim.startsWith('pose:')) {
        const part = sim.slice('pose:'.length) as DemoBone;
        const value = Math.sin(t * Math.PI / 2) * 35;
        return {
            queries: { [`${part}_x_rot`]: value },
            pose: [{ bone: part, axis: 'x', value }],
            input: value,
            label: `query.${part}_x_rot`,
        };
    }
    return NONE;
}

function finite(value: number): number {
    return Number.isFinite(value) ? value : 0;
}

class BakedBones {
    private bones: any = {};

    add(bone: DemoBone, channel: DemoChannel, axis: DemoAxis, time: string, value: number) {
        const name = STEVE[bone];
        const channels = this.bones[name] || (this.bones[name] = {});
        const frames = channels[channel] || (channels[channel] = {});
        const vec = frames[time] || (frames[time] = [0, 0, 0]);
        vec['xyz'.indexOf(axis)] += value;
    }

    toAnimationJson(seconds: number): any | null {
        if (!Object.keys(this.bones).length) return null;
        return {
            format_version: '1.8.0',
            animations: { demo: { loop: true, animation_length: seconds, bones: this.bones } },
        };
    }
}

export function sampleKeyframeDemo(demo: MolangDemo, expression: string): DemoSamples {
    const seconds = demo.seconds || 4;
    const node = parseClient(expression);
    const frames = Math.round(seconds * FPS);
    const values: number[] = [];
    const input: number[] = [];
    const baked = new BakedBones();
    let inputLabel = '';

    for (let i = 0; i <= frames; i++) {
        const t = i / FPS;
        const time = t.toFixed(4);
        const sim = simulate(demo.sim, t);
        const value = finite(node({
            ...sim.queries,
            anim_time: demo.loop ? t % demo.loop : t,
            life_time: t,
        }));
        values.push(value);
        if (sim.label) {
            input.push(sim.input);
            inputLabel = sim.label;
        }
        for (const p of sim.pose) baked.add(p.bone, 'rotation', p.axis, time, p.value);
        if (demo.bone) baked.add(demo.bone, demo.channel || 'rotation', demo.axis || 'x', time, value);
    }

    return {
        seconds,
        lines: [values],
        input: inputLabel ? input : null,
        inputLabel,
        animationJson: baked.toAnimationJson(seconds),
    };
}

export function sampleParticleDemo(expression: string): DemoSamples {
    const frames = Math.round(PARTICLE_LIFETIME * FPS);
    const lines = PARTICLE_RANDOMS.map((random) => {
        const line: number[] = [];
        for (let i = 0; i <= frames; i++) {
            const age = i / FPS;
            line.push(finite(evalMolang(expression, {
                particleAge: age,
                particleLifetime: PARTICLE_LIFETIME,
                particleRandom: random,
                emitterAge: age,
                emitterLifetime: PARTICLE_LIFETIME,
                emitterRandom: PARTICLE_RANDOMS[0],
                variables: new Map([
                    ['particle_age', age],
                    ['particle_lifetime', PARTICLE_LIFETIME],
                    ['emitter_age', age],
                    ['emitter_lifetime', PARTICLE_LIFETIME],
                ]),
            })));
        }
        return line;
    });
    return { seconds: PARTICLE_LIFETIME, lines, input: null, inputLabel: '', animationJson: null };
}

export function compareInKeyframe(expressions: string[]): CompareRow[] {
    const queries = { anim_time: COMPARE_ANIM_TIME, life_time: COMPARE_ANIM_TIME };
    return expressions.map((expression) => ({
        expression,
        game: finite(parseClient(expression)(queries)),
        preview: finite(evalMolang(expression, { animTime: COMPARE_ANIM_TIME, variables: new Map() })),
    }));
}
