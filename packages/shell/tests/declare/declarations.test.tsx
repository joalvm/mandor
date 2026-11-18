import { act, cleanup, render, renderHook } from '@testing-library/react';
import { createContext, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { createDeclarations } from '../../src/declare/declarations.js';
import { useDeclared, useDeclaredList } from '../../src/declare/useDeclared.js';
import { useDeclaration } from '../../src/declare/useDeclaration.js';
import { useDeclaredPart } from '../../src/declare/useDeclaredPart.js';

afterEach(() => {
    cleanup();
});

type Logic = { id: string; order: number };

const PIECES = createDeclarations<Logic, 'body'>();

describe('a registry of declarations', () => {
    it('joins what an id decides with the parts it shows', () => {
        const registry = createDeclarations<Logic, 'body'>();

        registry.declarePart('a', 'body', 'cuerpo');
        registry.declare({ id: 'a', order: 1 });

        expect(registry.get('a')).toEqual({ body: 'cuerpo', id: 'a', order: 1 });
    });

    it('undoes only its own declaration when a later one took the id', () => {
        const registry = createDeclarations<Logic, 'body'>();
        const first = registry.declare({ id: 'a', order: 1 });

        registry.declare({ id: 'a', order: 2 });
        first();

        expect(registry.get('a')?.order).toBe(2);
    });

    it('drops a part only while it is still the one it declared', () => {
        const registry = createDeclarations<Logic, 'body'>();

        registry.declare({ id: 'a', order: 1 });

        const first = registry.declarePart('a', 'body', 'uno');

        registry.declarePart('a', 'body', 'dos');
        first();

        expect(registry.get('a')?.body).toBe('dos');
    });

    /** A redraw undeclares and declares again in one commit: the list must not reshuffle. */
    it('keeps the place an id first took when it comes again', () => {
        const registry = createDeclarations<Logic, 'body'>();
        const stopA = registry.declare({ id: 'a', order: 1 });

        registry.declare({ id: 'b', order: 2 });
        stopA();
        registry.declare({ id: 'a', order: 1 });

        expect(registry.list().map((each) => each.id)).toEqual(['a', 'b']);
    });

    it('tells whoever listens, and stops telling once they leave', () => {
        const registry = createDeclarations<Logic, 'body'>();
        let told = 0;
        const stop = registry.subscribe(() => {
            told += 1;
        });

        registry.declare({ id: 'a', order: 1 });
        stop();
        registry.declare({ id: 'b', order: 2 });

        expect(told).toBe(1);
    });
});

const Owner = createContext<string | null>(null);

describe('the hooks that read and write a registry', () => {
    it('follow one id and the whole list as they move', () => {
        const registry = createDeclarations<Logic, 'body'>();
        const one = renderHook(() => useDeclared(registry, 'a'));
        const all = renderHook(() => useDeclaredList(registry));

        expect(one.result.current).toBeUndefined();

        act(() => {
            registry.declare({ id: 'a', order: 1 });
        });

        expect(one.result.current?.order).toBe(1);
        expect(all.result.current).toHaveLength(1);
    });

    it('answer nothing for no id at all', () => {
        const registry = createDeclarations<Logic, 'body'>();
        const { result } = renderHook(() => useDeclared(registry, undefined));

        expect(result.current).toBeUndefined();
    });

    it('hand a part to the owner around it, and take it back on leaving', () => {
        const registry = createDeclarations<Logic, 'body'>();

        function Body({ children }: PropsWithChildren) {
            useDeclaredPart(
                { declarations: registry, misplaced: 'outside', owner: Owner, part: 'body' },
                children,
            );

            return null;
        }

        registry.declare({ id: 'a', order: 1 });

        const view = render(
            <Owner value="a">
                <Body>cuerpo</Body>
            </Owner>,
        );

        expect(registry.get('a')?.body).toBe('cuerpo');

        view.unmount();

        expect(registry.get('a')?.body).toBeUndefined();
    });

    it('refuse a part written outside its owner, with the words it was given', () => {
        const registry = createDeclarations<Logic, 'body'>();

        expect(() => {
            renderHook(() => {
                useDeclaredPart(
                    { declarations: registry, misplaced: 'outside', owner: Owner, part: 'body' },
                    null,
                );
            });
        }).toThrow('outside');
    });
});

describe('useDeclaration', () => {
    function Piece({ order, children }: PropsWithChildren<{ order: number }>) {
        useDeclaration(PIECES, { id: 'piece', order }, 'body', children);

        return null;
    }

    it('declares the logic and its one part while mounted, and hears a prop that changes', () => {
        const view = render(<Piece order={1}>uno</Piece>);

        expect(PIECES.get('piece')).toEqual({ body: 'uno', id: 'piece', order: 1 });

        view.rerender(<Piece order={2}>dos</Piece>);

        expect(PIECES.get('piece')).toEqual({ body: 'dos', id: 'piece', order: 2 });

        view.unmount();

        expect(PIECES.get('piece')).toBeUndefined();
    });
});
