import { useMessages } from '@mandor/i18n';
import type { Environment, Variable } from '@mandor/schema';
import { DYNAMIC_NAMES, traceVariable, type VariableScope } from '@mandor/vars';
import { Button, Input } from '@mandor/ui';

import { inheritedTrace } from '../../lib/inherited-trace.js';
import { VariableTrace } from './VariableTrace.js';
import { useEffect, useRef, useState } from 'react';

type VariablePopoverBodyProps = {
    environment: Environment | undefined;
    name: string;
    onSeeAll: () => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** What the field resolves against: it says which level gives the value and which it overrides. */
    scope: VariableScope;
};

/**
 * What the popover of one variable says, in place: the value to edit when the environment
 * declares it, the offer to create it right there when nobody does, and the name of the
 * environment the answer will come from. Creating writes the declaration and nothing else —
 * the body reads it back from the environment, turns into the editor on its own and hands the
 * focus to it, since whoever asked for the variable is about to give it a value. The value is
 * written as it is typed, so the fields that name it repaint with every key; nothing waits for
 * Enter.
 */
export function VariablePopoverBody({
    environment,
    name,
    onSeeAll,
    onVariablesChange,
    scope,
}: VariablePopoverBodyProps) {
    const messages = useMessages('environment');
    // What is typed shows at once; the environment reads it back a write later.
    const [draft, setDraft] = useState<string | null>(null);
    const valueRef = useRef<HTMLSpanElement | null>(null);
    // Set by the Create click, spent by the editor the declaration turns into.
    const awaitedRef = useRef(false);

    const variables = environment?.variables ?? [];
    const variable = variables.find((candidate) => candidate.name === name);
    const declared = variable !== undefined;
    const trace = traceVariable(scope, name);
    const inherited = inheritedTrace(trace);

    useEffect(() => {
        if (declared && awaitedRef.current) {
            awaitedRef.current = false;
            valueRef.current?.focus();
        }
    }, [declared]);

    function write(value: string): void {
        // Leaving the field reports its text once more: nothing was typed, nothing is saved.
        if (value === (draft ?? variable?.value)) {
            return;
        }

        setDraft(value);
        onVariablesChange(
            variables.map((candidate) =>
                candidate.name === name ? { ...candidate, value } : candidate,
            ),
        );
    }

    if (DYNAMIC_NAMES.some((dynamic) => dynamic === name)) {
        return (
            <p className="text-sm text-text-secondary" data-part="variable-popover-dynamic">
                {messages('variableDynamic')}
            </p>
        );
    }

    if (inherited !== undefined) {
        return (
            <div className="flex flex-col gap-gap-control" data-part="variable-popover-inherited">
                <Input
                    disabled
                    label={messages('variableValue')}
                    onValueChange={() => undefined}
                    value={inherited.winner.value}
                />
                <VariableTrace environment={environment} trace={inherited} />
                <div className="flex items-center justify-end">
                    <SeeAll messages={messages} onSeeAll={onSeeAll} />
                </div>
            </div>
        );
    }

    if (variable === undefined) {
        return (
            <div className="flex flex-col gap-gap-control" data-part="variable-popover-body">
                <MissingVariable
                    environment={environment}
                    onCreate={() => {
                        awaitedRef.current = true;
                        onVariablesChange([
                            ...variables,
                            { name, value: '', enabled: true, secret: false },
                        ]);
                    }}
                />
                <SeeAll messages={messages} onSeeAll={onSeeAll} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-gap-control" data-part="variable-popover-body">
            <Input
                editableRef={valueRef}
                label={messages('variableValue')}
                onValueChange={write}
                value={draft ?? variable.value}
            />
            <OverriddenLevels environment={environment} trace={trace} />
            <div className="flex items-center justify-between">
                <VariableEnvironment environment={environment} />
                <SeeAll messages={messages} onSeeAll={onSeeAll} />
            </div>
        </div>
    );
}

/** What the environment's own value overrides, when some other level declares the name too. */
function OverriddenLevels({
    environment,
    trace,
}: {
    environment: Environment | undefined;
    trace: ReturnType<typeof traceVariable>;
}) {
    if (trace === undefined || trace.shadowed.length === 0) {
        return null;
    }

    return <VariableTrace environment={environment} trace={trace} />;
}

function MissingVariable({
    environment,
    onCreate,
}: {
    environment: Environment | undefined;
    onCreate: () => void;
}) {
    const messages = useMessages('environment');

    if (environment === undefined) {
        return <p className="text-sm text-text-secondary">{messages('variableNoEnvironment')}</p>;
    }

    return (
        <>
            <p className="text-sm text-text-secondary">
                {messages('variableUndefined', { environment: environment.name })}
            </p>
            <Button onClick={onCreate} variant="secondary">
                {messages('variableCreateIn', { environment: environment.name })}
            </Button>
        </>
    );
}

function VariableEnvironment({ environment }: { environment: Environment | undefined }) {
    if (environment === undefined) {
        return null;
    }

    return (
        <span
            className="flex items-center gap-gap-tight text-xs text-text-secondary"
            data-part="variable-environment"
        >
            <span className="flex size-icon-md items-center justify-center rounded-sm bg-surface-accent-tint text-2xs text-text-accent">
                {environment.name.charAt(0).toUpperCase()}
            </span>
            {environment.name}
        </span>
    );
}

function SeeAll({
    messages,
    onSeeAll,
}: {
    messages: ReturnType<typeof useMessages<'environment'>>;
    onSeeAll: () => void;
}) {
    return (
        <Button
            className="ms-auto shrink-0 border-none bg-transparent px-0 text-xs text-text-accent hover:bg-transparent hover:underline"
            onClick={onSeeAll}
            size="sm"
            variant="ghost"
        >
            {messages('variableSeeAll')}
        </Button>
    );
}
