import { dropOriginState } from '@mandor/shell';
import { loadSchemaChecker } from '@mandor/validate';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { registerInboundSchemas } from '../../../src/renderer/activity/inbound-schema.js';
import {
    inboundVerdictOf,
    judgeable,
    judgeInbound,
} from '../../../src/renderer/activity/inbound-verdict.js';

const SCHEMA = '{"type": "object", "properties": {"id": {"type": "number"}}}';
const WRONG = '{"event": "pedidos", "id": "uno"}';
const RIGHT = '{"event": "pedidos", "id": 1}';

function recordOf(data: string, direction: 'in' | 'out' = 'in', event?: string) {
    return { at: 0, data, direction, ...(event === undefined ? {} : { event }) };
}

describe('judging the frames that arrive', () => {
    const offs: (() => void)[] = [];

    beforeAll(async () => {
        await loadSchemaChecker();
    });

    afterEach(() => {
        offs.splice(0).forEach((off) => {
            off();
        });
        dropOriginState();
    });

    function provide(schema: string | undefined) {
        const schemaForChannel = vi.fn().mockResolvedValue(schema);

        offs.push(registerInboundSchemas({ schemaForChannel }));

        return schemaForChannel;
    }

    it('judges only a frame that came in as a small json object', () => {
        expect(judgeable(recordOf(WRONG))).toBe(true);
        expect(judgeable(recordOf(WRONG, 'out'))).toBe(false);
        expect(judgeable(recordOf('hola'))).toBe(false);
    });

    it('refuses what the schema of its channel refuses', async () => {
        const schemaForChannel = provide(SCHEMA);

        const issues = await judgeInbound({ id: 'a' }, recordOf(WRONG));

        expect(schemaForChannel).toHaveBeenCalledWith('pedidos');
        expect(issues.map((issue) => issue.path)).toEqual(['/id']);
    });

    it('asks for the schema of the event the transport named before the payload', async () => {
        const schemaForChannel = provide(SCHEMA);

        await judgeInbound({ id: 'b' }, recordOf(RIGHT, 'in', 'otro'));

        expect(schemaForChannel).toHaveBeenCalledWith('otro');
    });

    it('finds nothing wrong with a frame that fits', async () => {
        provide(SCHEMA);

        expect(await judgeInbound({ id: 'c' }, recordOf(RIGHT))).toEqual([]);
    });

    /** Silence, never an invented warning: nobody to ask means nothing to refuse. */
    it('judges nothing while no one registered schemas', async () => {
        expect(await judgeInbound({ id: 'd' }, recordOf(WRONG))).toEqual([]);
    });

    it('judges nothing when the channel has no schema or a blank one', async () => {
        provide(undefined);
        expect(await judgeInbound({ id: 'e' }, recordOf(WRONG))).toEqual([]);

        provide('   ');
        expect(await judgeInbound({ id: 'f' }, recordOf(WRONG))).toEqual([]);
    });

    it('judges nothing when no channel can be named', async () => {
        const schemaForChannel = provide(SCHEMA);

        expect(await judgeInbound({ id: 'g' }, recordOf('{"id": "uno"}'))).toEqual([]);
        expect(schemaForChannel).not.toHaveBeenCalled();
    });

    it('judges a frame once and remembers the verdict for who opens it later', async () => {
        const schemaForChannel = provide(SCHEMA);

        expect(inboundVerdictOf({ id: 'h' })).toBeUndefined();

        const first = await judgeInbound({ id: 'h' }, recordOf(WRONG));
        const second = await judgeInbound({ id: 'h' }, recordOf(WRONG));

        expect(second).toBe(first);
        expect(inboundVerdictOf({ id: 'h' })).toBe(first);
        expect(schemaForChannel).toHaveBeenCalledTimes(1);
    });

    it('forgets what it judged when the origin is left', async () => {
        provide(SCHEMA);
        await judgeInbound({ id: 'i' }, recordOf(WRONG));

        dropOriginState();

        expect(inboundVerdictOf({ id: 'i' })).toBeUndefined();
    });

    it('keeps no more than its limit, dropping the oldest verdict first', async () => {
        provide(SCHEMA);

        await judgeInbound({ id: 'first' }, recordOf(WRONG));

        for (let index = 0; index < 512; index += 1) {
            await judgeInbound({ id: `fill-${String(index)}` }, recordOf(RIGHT));
        }

        expect(inboundVerdictOf({ id: 'first' })).toBeUndefined();
        expect(inboundVerdictOf({ id: 'fill-511' })).toEqual([]);
    });
});
