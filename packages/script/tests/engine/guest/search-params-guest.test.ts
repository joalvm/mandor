import { beforeAll, describe, expect, it } from 'vitest';

import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { lineOf, thrownBy } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

async function line(source: string): Promise<string> {
    return await lineOf(wasm, source);
}

async function throws(source: string): Promise<string> {
    return await thrownBy(wasm, source);
}

describe('URLSearchParams of the guest: reading and writing text', () => {
    it('reads a string, with or without the question mark', async () => {
        expect(await line('new URLSearchParams("?a=1&b=2").toString()')).toBe('a=1&b=2');
        expect(await line('new URLSearchParams("a=1&b=2").get("b")')).toBe('2');
    });

    it('is empty with no argument', async () => {
        expect(
            await line(
                'new URLSearchParams().toString() + "|" + new URLSearchParams("").toString()',
            ),
        ).toBe('|');
    });

    it('reads an object by its own keys', async () => {
        expect(await line('new URLSearchParams({ a: 1, b: "x y" }).toString()')).toBe('a=1&b=x+y');
    });

    it('reads pairs, from an array or from an iterable', async () => {
        expect(await line('new URLSearchParams([["a", "1"], ["a", "2"]]).getAll("a").join()')).toBe(
            '1,2',
        );
        expect(await line('new URLSearchParams(new Map([["m", "1"]])).toString()')).toBe('m=1');
    });

    it('throws on a pair that is not of two items', async () => {
        expect(await throws('new URLSearchParams([["a"]])')).toBe(
            'TypeError: Each pair must have exactly two items.',
        );
        expect(await throws('new URLSearchParams(["ab"])')).toBe(
            'TypeError: Each pair must have exactly two items.',
        );
    });

    it('copies another one', async () => {
        expect(
            await line(
                '(() => { const a = new URLSearchParams("x=1"); const b = new URLSearchParams(a); b.append("y", "2"); return a + "|" + b; })()',
            ),
        ).toBe('x=1|x=1&y=2');
    });

    it('keeps empty names and values, skips empty segments, splits on the first equals', async () => {
        expect(await line('new URLSearchParams("&&a&=b&c=d=e&").toString()')).toBe('a=&=b&c=d%3De');
    });

    it('reads a plus as a space and a percent as a byte', async () => {
        expect(await line('new URLSearchParams("a=x+y%20z%2B").get("a")')).toBe('x y z+');
    });

    it('leaves a percent that is no escape as it is', async () => {
        expect(await line('new URLSearchParams("a=%zz%4").get("a")')).toBe('%zz%4');
    });

    it('decodes UTF-8 of every length', async () => {
        expect(await line('new URLSearchParams("a=%C3%A9%E2%82%AC%F0%9F%98%80").get("a")')).toBe(
            'é€😀',
        );
    });

    it.each([
        ['a stray continuation', '%80', '�'],
        ['an overlong two-byte', '%C0%80', '��'],
        ['a truncated three-byte', '%E2%82', '�'],
        ['a bad continuation', '%E2%82A', '�A'],
        ['a surrogate', '%ED%A0%80', '���'],
        ['past the last code point', '%F4%90%80%80', '����'],
        ['a lead that cannot start', '%F5', '�'],
    ])('puts a replacement character for %s', async (_name, escape, expected) => {
        expect(await line(`new URLSearchParams("a=${escape}").get("a")`)).toBe(expected);
    });

    it('encodes the way a form does', async () => {
        const text = await line('new URLSearchParams({ "a b": "é~*-._&=+€😀" }).toString()');

        expect(text).toBe('a+b=%C3%A9%7E*-._%26%3D%2B%E2%82%AC%F0%9F%98%80');
    });

    it('encodes a lone surrogate as the replacement character', async () => {
        expect(await line('new URLSearchParams({ a: "\\ud800", b: "\\udc00" }).toString()')).toBe(
            'a=%EF%BF%BD&b=%EF%BF%BD',
        );
    });
});

describe('URLSearchParams of the guest: asking and changing', () => {
    it('appends, gets the first, gets all, and answers null for what is not there', async () => {
        expect(
            await line(
                '(() => { const p = new URLSearchParams("a=1"); p.append("a", "2"); return [p.get("a"), p.getAll("a").join(), p.get("z"), p.getAll("z").length].join("|"); })()',
            ),
        ).toBe('1|1,2||0');
    });

    it('sets: replaces the first and drops the others, or appends', async () => {
        expect(
            await line(
                '(() => { const p = new URLSearchParams("a=1&b=2&a=3"); p.set("a", "9"); p.set("c", "4"); return p.toString(); })()',
            ),
        ).toBe('a=9&b=2&c=4');
    });

    it('deletes by name, or by name and value', async () => {
        expect(
            await line(
                '(() => { const p = new URLSearchParams("a=1&b=2&a=3"); p.delete("a", "3"); const q = new URLSearchParams("a=1&b=2&a=3"); q.delete("a"); return p + "|" + q; })()',
            ),
        ).toBe('a=1&b=2|b=2');
    });

    it('has by name, or by name and value', async () => {
        expect(
            await line(
                '(() => { const p = new URLSearchParams("a=1"); return [p.has("a"), p.has("a", "1"), p.has("a", "2"), p.has("b")].join(); })()',
            ),
        ).toBe('true,true,false,false');
    });

    it('iterates entries, keys and values, in a for of and by hand', async () => {
        expect(
            await line(
                '(() => { const p = new URLSearchParams("a=1&b=2"); const out = []; for (const [k, v] of p) { out.push(k + v); } return [out.join(), [...p.keys()].join(), [...p.values()].join(), [...p.entries()].length].join("|"); })()',
            ),
        ).toBe('a1,b2|a,b|1,2|2');
    });

    it('has iterators that are iterable and end', async () => {
        expect(
            await line(
                '(() => { const it = new URLSearchParams("a=1").entries(); const first = it.next(); const second = it.next(); return [first.done, first.value.join(), second.done, second.value, it[Symbol.iterator]() === it].join("|"); })()',
            ),
        ).toBe('false|a,1|true||true');
    });

    it('reads names and values as text', async () => {
        expect(await line('new URLSearchParams([[1, 2]]).get("1")')).toBe('2');
    });

    it('turns into text with the plus operator and template strings', async () => {
        expect(await line('"" + new URLSearchParams("a=1")')).toBe('a=1');
    });
});
