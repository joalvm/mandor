import type { ReactNode } from 'react';

/** What one declaration holds: what it decides, and the parts it shows as elements. */
export type Declared<Logic, Part extends string> = Logic & Partial<Record<Part, ReactNode>>;

/**
 * A registry the tree writes into: a component declares what it decides, its child parts hand in
 * what they show, and whoever draws reads it back and hears when it moves.
 */
export type Declarations<Logic extends { id: string }, Part extends string> = {
    /** Declares what one id decides and returns its cleanup; a later one under the id wins. */
    declare: (logic: Logic) => () => void;
    /** Declares one drawn part of an id and returns its cleanup, under the same rule. */
    declarePart: (id: string, part: Part, node: ReactNode) => () => void;
    get: (id: string) => Declared<Logic, Part> | undefined;
    /**
     * Every declaration, in the order each id first arrived: a declaration that comes again on a
     * redraw keeps its place. The array is a new one only when something moved.
     */
    list: () => readonly Declared<Logic, Part>[];
    subscribe: (listener: () => void) => () => void;
};

/** One registry of declarations, with the cleanups that undo only what each one declared. */
export function createDeclarations<
    Logic extends { id: string },
    Part extends string,
>(): Declarations<Logic, Part> {
    const logics = new Map<string, Logic>();
    const parts = new Map<string, Partial<Record<Part, ReactNode>>>();
    const specs = new Map<string, Declared<Logic, Part>>();
    const arrivals = new Map<string, number>();
    const listeners = new Set<() => void>();
    let listed: readonly Declared<Logic, Part>[] = [];

    function refresh(id: string): void {
        const logic = logics.get(id);

        if (logic === undefined) {
            specs.delete(id);
        } else {
            specs.set(id, { ...logic, ...parts.get(id) });
        }

        listed = [...specs.values()].toSorted(
            (one, other) => (arrivals.get(one.id) ?? 0) - (arrivals.get(other.id) ?? 0),
        );

        for (const listener of listeners) {
            listener();
        }
    }

    function declare(logic: Logic): () => void {
        if (!arrivals.has(logic.id)) {
            arrivals.set(logic.id, arrivals.size);
        }

        logics.set(logic.id, logic);
        refresh(logic.id);

        return () => {
            if (logics.get(logic.id) === logic) {
                logics.delete(logic.id);
                refresh(logic.id);
            }
        };
    }

    function declarePart(id: string, part: Part, node: ReactNode): () => void {
        parts.set(id, { ...parts.get(id), [part]: node });
        refresh(id);

        return () => {
            const held = parts.get(id);

            if (held?.[part] !== node) {
                return;
            }

            parts.set(id, { ...held, [part]: undefined });
            refresh(id);
        };
    }

    return {
        declare,
        declarePart,
        get: (id) => specs.get(id),
        list: () => listed,
        subscribe: (listener) => {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },
    };
}
