import { useMessages } from '@mandor/i18n';
import type { Environment } from '@mandor/schema';
import type { VariableTrace as Trace } from '@mandor/vars';

import { levelName } from '../../lib/level-name.js';

type VariableTraceProps = {
    environment: Environment | undefined;
    trace: Trace;
};

/**
 * Where the value of a name comes from, by name and never by path: «Defined in Payments ·
 * overrides Prod». A folder's value silently fixes a name the environment also has, and this
 * line is how a person sees it.
 */
export function VariableTrace({ environment, trace }: VariableTraceProps) {
    const messages = useMessages('environment');

    return (
        <p className="flex flex-col text-xs text-text-secondary" data-part="variable-trace">
            <span>
                {messages('definedIn', { level: levelName(trace.winner, environment, messages) })}
            </span>
            <ShadowedLevels environment={environment} trace={trace} />
        </p>
    );
}

/** The levels the winner overrides, or nothing when no other level declares the name. */
function ShadowedLevels({ environment, trace }: VariableTraceProps) {
    const messages = useMessages('environment');

    if (trace.shadowed.length === 0) {
        return null;
    }

    const levels = trace.shadowed.map((level) => levelName(level, environment, messages));

    return <span>{messages('shadows', { levels: levels.join(', ') })}</span>;
}
