import { isRecord, textOf } from '@mandor/interop-core';
import type { z } from 'zod';

import type { BrunoEnvironment, BrunoVariable } from './bruno-tree.js';
import type { environmentSchema, variableSchema } from './opencollection-schema.js';

function isSelected(variant: unknown): boolean {
    return isRecord(variant) && variant['selected'] === true;
}

/**
 * The text of a value: a text is itself, a typed value is its `data`, and a list of variants is
 * the one marked as selected, or the first.
 */
export function valueTextOf(value: unknown): string {
    if (Array.isArray(value)) {
        const variant: unknown = value.find(isSelected) ?? value[0];

        return isRecord(variant) ? valueTextOf(variant['value']) : '';
    }

    return isRecord(value) ? textOf(value['data']) : textOf(value);
}

type Variable = z.output<typeof variableSchema>;

function isNamed(variable: Variable): variable is Variable & { name: string } {
    return typeof variable.name === 'string' && variable.name !== '';
}

/** The variables a list holds; one with no name has nothing to be called by and is left out. */
export function variablesFrom(variables: readonly Variable[] | null | undefined): BrunoVariable[] {
    return (variables ?? []).filter(isNamed).map((variable) => ({
        name: variable.name,
        value: valueTextOf(variable.value),
        disabled: variable.disabled === true,
        secret: variable.secret === true,
    }));
}

/** An environment as the tree keeps it; `fallback` names one that came with no name of its own. */
export function environmentFrom(
    environment: z.output<typeof environmentSchema>,
    fallback: string,
): BrunoEnvironment {
    return {
        name: environment.name ?? fallback,
        variables: variablesFrom(environment.variables),
    };
}
