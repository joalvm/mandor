import type { ChainLevelValues } from './chain-values.js';
import type { VariableScope } from './variable-scope.js';

/** The values each level provides, before the engine orders them by precedence. */
export type ScopeValues = {
    /** Values a script set at runtime. The level exists and stays empty until scripts land. */
    script?: Readonly<Record<string, string>>;
    /** The collection and folders above the item, the closest first, as `chainValues` gives them. */
    chain?: readonly ChainLevelValues[];
    /** Values of the active environment. */
    environment?: Readonly<Record<string, string>>;
    /** Values of the globals of the origin: an environment that is always active. */
    globals?: Readonly<Record<string, string>>;
    /** Names of the globals declared secret, kept on this machine like an environment's. */
    globalsSecret?: readonly string[];
    /** Dynamic values, computed by the caller once per resolution. */
    dynamic?: Readonly<Record<string, string>>;
    /**
     * Names of the active environment declared secret. Only that level can carry them: it is
     * the one whose values come from variables the user declares one by one.
     */
    secret?: readonly string[];
};

/**
 * Where each place of the chain ranks against the active environment. A folder is the
 * exception of a group of requests, so it overrides the environment, or it would except
 * nothing; a collection holds the base values of the API, which the environment overrides.
 */
const CHAIN_SLOT: Record<ChainLevelValues['level'], 'above' | 'below'> = {
    folder: 'above',
    collection: 'below',
};

/**
 * Builds the scope in the only order the spec allows, strongest first: script, the deepest
 * folder up to the first-level one, the active environment, the collection, the globals of the origin,
 * the dynamic values. It is the order of Bruno and Insomnia, and of Postman where it has the
 * levels, so a format's variables come in and out without translation. This function is the
 * only place that knows the order. The fixed levels always exist; one without values stays
 * empty, and a chain level exists only when the item has it.
 */
export function composeScope(values: ScopeValues = {}): VariableScope {
    const chain = values.chain ?? [];

    return [
        { name: 'script', values: values.script ?? {}, secret: [] },
        ...chainLevels(chain, 'above'),
        { name: 'environment', values: values.environment ?? {}, secret: values.secret ?? [] },
        ...chainLevels(chain, 'below'),
        { name: 'globals', values: values.globals ?? {}, secret: values.globalsSecret ?? [] },
        { name: 'dynamic', values: values.dynamic ?? {}, secret: [] },
    ];
}

function chainLevels(chain: readonly ChainLevelValues[], slot: 'above' | 'below'): VariableScope {
    return chain
        .filter((link) => CHAIN_SLOT[link.level] === slot)
        .map((link) => ({ name: link.level, label: link.name, values: link.values, secret: [] }));
}
