import { describe, expect, it } from 'vitest';

import { NO_DECISION } from '../../src/choice/settle-conflict.js';
import { mergeRows } from '../../src/list/merge-rows.js';
import { conflictOf } from '../../src/value/merge-conflict.js';
import { mergeValues } from '../../src/value/merge-values.js';

type Header = { key: string; value: string; enabled: boolean };

function header(key: string, value: string, enabled = true): Header {
    return { key, value, enabled };
}

const FIRST = header('Accept', 'a');
const SECOND = header('Accept', 'b');
const ID = header('X-Id', '1');
const BASE = [FIRST, SECOND, ID];

function merged(base: Header[], ours: Header[], theirs: Header[]): ReturnType<typeof mergeValues> {
    return mergeValues({ headers: base }, { headers: ours }, { headers: theirs });
}

describe('merging the rows of a list that repeats its keys', () => {
    it('tells the second Accept from the first and joins the edits of both sides', () => {
        const result = merged(
            BASE,
            [FIRST, header('Accept', 'b2'), ID],
            [FIRST, SECOND, header('X-Id', '2')],
        );

        expect(result.conflicts).toEqual([]);
        expect(result.value).toEqual({
            headers: [FIRST, header('Accept', 'b2'), header('X-Id', '2')],
        });
    });

    it('joins one side turning a row off with the other changing its value', () => {
        const result = merged(
            BASE,
            [header('Accept', 'a', false), SECOND, ID],
            [header('Accept', 'a2'), SECOND, ID],
        );

        expect(result.conflicts).toEqual([]);
        expect(result.value).toEqual({ headers: [header('Accept', 'a2', false), SECOND, ID] });
    });

    it('asks with the whole row of each side when both changed the same field', () => {
        const result = merged(
            BASE,
            [FIRST, header('Accept', 'mine'), ID],
            [FIRST, header('Accept', 'theirs'), ID],
        );

        expect(result.value).toEqual({ headers: [FIRST, header('Accept', 'mine'), ID] });
        expect(result.conflicts).toEqual([
            {
                id: 'headers/Accept#1',
                path: ['headers', 'Accept#1'],
                shape: 'row',
                base: { value: SECOND },
                ours: { value: header('Accept', 'mine') },
                theirs: { value: header('Accept', 'theirs') },
            },
        ]);
    });

    it('lets a row go when only one side deleted it', () => {
        const result = merged(BASE, [FIRST, ID], BASE);

        expect(result).toEqual({ value: { headers: [FIRST, ID] }, conflicts: [] });
    });

    it('asks about a row deleted on one side and changed on the other', () => {
        const changed = header('Accept', 'b2');
        const mine = merged(BASE, [FIRST, ID], [FIRST, changed, ID]);
        const theirs = merged(BASE, [FIRST, changed, ID], [FIRST, ID]);

        expect(mine.value).toEqual({ headers: [FIRST, ID] });
        expect(mine.conflicts[0]).toMatchObject({
            id: 'headers/Accept#1',
            shape: 'row',
            ours: null,
        });
        expect(theirs.value).toEqual({ headers: [FIRST, changed, ID] });
        expect(theirs.conflicts[0]).toMatchObject({ theirs: null });
    });

    it('keeps the order of ours and puts the rows theirs added after their neighbour', () => {
        const result = merged(
            BASE,
            [...BASE, header('Mine', '1')],
            [header('First', '0'), FIRST, header('Theirs', '1'), SECOND, ID],
        );

        expect(result.conflicts).toEqual([]);
        expect(result.value).toEqual({
            headers: [
                header('First', '0'),
                FIRST,
                header('Theirs', '1'),
                SECOND,
                ID,
                header('Mine', '1'),
            ],
        });
    });

    it('does not ask when both sides added the same row', () => {
        const added = [...BASE, header('New', '1')];

        expect(merged(BASE, added, added).conflicts).toEqual([]);
    });

    it('asks about two different rows added under the same key', () => {
        const result = merged(
            BASE,
            [...BASE, header('New', 'mine')],
            [...BASE, header('New', 'theirs')],
        );

        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0]).toMatchObject({ id: 'headers/New#0', base: null });
    });

    it('does not ask when both sides reorder rows that have distinct keys', () => {
        const accept = header('Accept', 'a');
        const host = header('Host', 'h');
        const id = header('X-Id', '1');
        const result = merged([accept, host, id], [id, accept, host], [host, accept, id]);

        expect(result.conflicts).toEqual([]);
        expect(result.value).toEqual({ headers: [id, accept, host] });
    });
});

describe('the rows as the merge of a list hands them over', () => {
    it('turns every question a row raises into one question about the row', () => {
        const rows = {
            field: 'id',
            base: [],
            ours: [{ id: 'a', x: 1 }],
            theirs: [{ id: 'a', x: 2 }],
        };
        const context = { ...rows, path: ['list'], decide: NO_DECISION };
        const asked = mergeRows(rows, context, (input) => ({
            value: input.theirs,
            conflicts: [conflictOf('value', { ...input, path: [...input.path, 'x'] })],
        }));

        expect(asked.value).toEqual([{ id: 'a', x: 1 }]);
        expect(asked.conflicts).toHaveLength(1);
        expect(asked.conflicts[0]).toMatchObject({ id: 'list/a#0', shape: 'row' });
    });

    it('answers the question about a row with the side the user picked', () => {
        const rows = {
            field: 'id',
            base: [],
            ours: [{ id: 'a', x: 1 }],
            theirs: [{ id: 'a', x: 2 }],
        };
        const context = { ...rows, path: ['list'], decide: () => ({ pick: 'theirs' as const }) };
        const picked = mergeRows(rows, context, (input) => ({
            value: input.theirs,
            conflicts: [conflictOf('value', input)],
        }));

        expect(picked).toEqual({ value: [{ id: 'a', x: 2 }], conflicts: [] });
    });
});
