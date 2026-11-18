import type { VariableTrace } from '@mandor/vars';

/**
 * The trace of a name some level other than the environment gives — a folder above it, the
 * collection or the workspace below it: the popover reads it there and does not edit it, since
 * it is declared somewhere else. Undefined when nobody declares it or the environment wins.
 */
export function inheritedTrace(trace: VariableTrace | undefined): VariableTrace | undefined {
    if (trace?.winner.level === 'environment') {
        return undefined;
    }

    return trace;
}
