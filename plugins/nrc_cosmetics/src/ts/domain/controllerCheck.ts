import { CosmeticType } from '../cosmetics/types';
import { EMOTE } from '../cosmetics/emote';
import { MOLANG_CATALOG } from '../molang/catalog';
import { STOP_STATE, STOP_TIMEOUT_SECONDS, findState, queryName, usedQueries } from './controller';

function knownQueries(): Set<string> {
    const known = new Set<string>();
    for (const entry of MOLANG_CATALOG) {
        if (entry.kind !== 'query' || entry.support.client === 'no') continue;
        for (const name of [entry.name, ...entry.aliases]) known.add(queryName(name));
    }
    return known;
}

export function controllerProblems(type: CosmeticType): string[] {
    const controllers = (AnimationController.all || []) as any[];
    if (!controllers.length) return [];
    const problems: string[] = [];
    const controller = controllers[0];
    const states = controller.states as any[];
    const animations = (Animation.all || []) as any[];

    if (controllers.length > 1) {
        problems.push(`Only "${controller.name}" runs in game, the other ${controllers.length - 1} controller(s) are ignored.`);
    }

    for (const state of states) {
        if (state.animations.length > 1) {
            problems.push(`State "${state.name}" plays only its first animation in game.`);
        }
        if (state.animations.some((a: any) => String(a.blend_value ?? '').trim())) {
            problems.push(`State "${state.name}": the value next to an animation is ignored in game, the animation always plays fully.`);
        }
        if (state.sounds.length || state.particles.length) {
            problems.push(`State "${state.name}": sounds and particles on a controller state do not play in game, put them on the animation.`);
        }
    }

    const known = knownQueries();
    const unknown = [...usedQueries([controller])].filter((name) => !known.has(name));
    if (unknown.length) {
        problems.push(`These queries do not exist in game and read 0: ${unknown.map((name) => 'q.' + name).join(', ')}.`);
    }

    const stop = findState(controller, STOP_STATE);
    const stopAnimation = stop && animations.find((a) => stop.animations.some((e: any) => e.animation === a.uuid));
    if (type.id === EMOTE.id && stopAnimation?.loop === 'loop' && !stop.transitions.length) {
        problems.push(`"${STOP_STATE}" plays a looping animation and has no transitions, so the emote only ends after ${STOP_TIMEOUT_SECONDS}s. Set it to play once.`);
    }

    const played = new Set<string>();
    for (const state of states) for (const a of state.animations) played.add(a.animation);
    const unused = animations.filter((a) => !played.has(a.uuid)).map((a) => `"${a.name}"`);
    if (unused.length) {
        problems.push(`No controller state plays ${unused.join(', ')}, so they never show in game.`);
    }

    return problems;
}
