import { IMPORT_PROGRESS_EVERY } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { readDropped } from '../../src/import/lib/read-dropped.js';

function fileEntry(name: string, text: string) {
    return {
        name,
        isFile: true,
        isDirectory: false,
        file: (resolve: (file: File) => void) => {
            resolve(new File([text], name));
        },
    };
}

/** A folder whose reader hands the children over `batch` at a time, as the browser does. */
function folderEntry(name: string, children: unknown[], batch = 100) {
    return {
        name,
        isFile: false,
        isDirectory: true,
        createReader: () => {
            const rest = [...children];

            return {
                readEntries: (resolve: (entries: unknown[]) => void) => {
                    resolve(rest.splice(0, batch));
                },
            };
        },
    };
}

function itemOf(entry: unknown) {
    return { webkitGetAsEntry: () => entry };
}

/** The paths a drop was read as. */
async function pathsOf(items: unknown[]): Promise<string[] | undefined> {
    const read = await readDropped({ files: [], items: items.map(itemOf) });

    return read?.map((file) => file.path);
}

describe('readDropped', () => {
    it('reads a dropped file by its own name', async () => {
        const read = await readDropped({
            files: [],
            items: [itemOf(fileEntry('pasarela.yaml', 'asyncapi: 3.0.0'))],
        });

        expect(read).toEqual([{ path: 'pasarela.yaml', text: 'asyncapi: 3.0.0' }]);
    });

    it('reads a dropped folder from inside, sorted and without what is never imported', async () => {
        const folder = folderEntry(
            'Tienda',
            [
                fileEntry('b.yml', 'b'),
                folderEntry('node_modules', [fileEntry('x.js', 'x')]),
                folderEntry('Pedidos', [fileEntry('Crear.yml', 'c'), fileEntry('Borrar.yml', 'd')]),
                folderEntry('.git', [fileEntry('HEAD', 'ref')]),
                fileEntry('a.yml', 'a'),
            ],
            2,
        );

        // Sorted as main sorts a picked folder: by locale, not by code point.
        await expect(pathsOf([folder])).resolves.toEqual([
            'a.yml',
            'b.yml',
            'Pedidos/Borrar.yml',
            'Pedidos/Crear.yml',
        ]);
    });

    it('reads everything that was dropped together, a folder and a file', async () => {
        const dropped = [
            folderEntry('Tienda', [fileEntry('a.yml', 'a')]),
            fileEntry('suelto.json', '{}'),
        ];

        await expect(pathsOf(dropped)).resolves.toEqual(['a.yml', 'suelto.json']);
    });

    it('leaves out what the browser gives no entry for, like dragged text', async () => {
        await expect(pathsOf([null, fileEntry('a.json', '{}')])).resolves.toEqual(['a.json']);
    });

    it('leaves out an entry that is neither a file nor a folder', async () => {
        const odd = { name: 'enlace', isFile: false, isDirectory: false };
        const folder = folderEntry('Tienda', [odd, fileEntry('a.yml', 'a')]);

        await expect(pathsOf([folder])).resolves.toEqual(['a.yml']);
    });

    it('reads the files it lists where the browser gives no entries', async () => {
        const file = new File(['{"a":1}'], 'a.json');

        await expect(readDropped({ files: [file], items: [] })).resolves.toEqual([
            { path: 'a.json', text: '{"a":1}' },
        ]);
    });
});

describe('a big drop', () => {
    it('is read whole, and says every so many files how it goes', async () => {
        const seen: number[] = [];
        const count = IMPORT_PROGRESS_EVERY * 2 + 1;
        const files = Array.from(
            { length: count },
            (_, index) => new File(['x'], `${String(index)}.json`),
        );
        const read = await readDropped(
            { files, items: [] },
            { signal: new AbortController().signal, onRead: (done) => seen.push(done) },
        );

        expect(read).toHaveLength(count);
        expect(seen).toEqual([IMPORT_PROGRESS_EVERY, IMPORT_PROGRESS_EVERY * 2]);
    });

    /** A disk dropped by mistake: stopped, it is not walked to its end. */
    it('stops walking and answers nothing the moment the person stops it', async () => {
        const stop = new AbortController();
        const asked: string[] = [];
        const counted = (name: string) => ({
            ...fileEntry(name, name),
            file: (resolve: (file: File) => void) => {
                asked.push(name);
                stop.abort();
                resolve(new File([name], name));
            },
        });
        const folder = folderEntry('Disco', ['a', 'b', 'c'].map(counted));
        const read = await readDropped(
            { files: [], items: [itemOf(folder)] },
            { signal: stop.signal, onRead: () => undefined },
        );

        expect(read).toBeNull();
        expect(asked).toEqual(['a']);
    });

    it('reads no file once stopped', async () => {
        const stop = new AbortController();

        stop.abort();

        await expect(
            readDropped(
                { files: [new File(['x'], 'a.json')], items: [] },
                { signal: stop.signal, onRead: () => undefined },
            ),
        ).resolves.toBeNull();
    });
});
