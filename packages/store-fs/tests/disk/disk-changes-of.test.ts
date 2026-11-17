import { describe, expect, it } from 'vitest';

import { diskChangesOf } from '../../src/disk/disk-changes-of.js';

const ON_DISK = ['workspaces/api.yaml', 'workspaces/nuevo.yaml', 'workspaces/otro.yaml'];

function exists(path: string): boolean {
    return ON_DISK.includes(path);
}

describe('reading a batch of watcher events', () => {
    it('reports a write as a change', () => {
        expect(diskChangesOf([{ path: 'workspaces/api.yaml', renamed: false }], exists)).toEqual([
            { kind: 'changed', path: 'workspaces/api.yaml' },
        ]);
    });

    /** A rename fires one event per name, and neither of them says it was a rename. */
    it('pairs the name that went with the name that came', () => {
        const batch = [
            { path: 'workspaces/viejo.yaml', renamed: true },
            { path: 'workspaces/nuevo.yaml', renamed: true },
        ];

        expect(diskChangesOf(batch, exists)).toEqual([
            { kind: 'moved', from: 'workspaces/viejo.yaml', to: 'workspaces/nuevo.yaml' },
        ]);
    });

    it('reports a name that went alone as a removal', () => {
        expect(diskChangesOf([{ path: 'workspaces/viejo.yaml', renamed: true }], exists)).toEqual([
            { kind: 'removed', path: 'workspaces/viejo.yaml' },
        ]);
    });

    it('reports a name that arrived alone as a change', () => {
        expect(diskChangesOf([{ path: 'workspaces/nuevo.yaml', renamed: true }], exists)).toEqual([
            { kind: 'changed', path: 'workspaces/nuevo.yaml' },
        ]);
    });

    /** Two names gone and one arrived pair three ways, and a wrong guess renames the wrong tab. */
    it('refuses to pair when more than one name went', () => {
        const batch = [
            { path: 'workspaces/viejo.yaml', renamed: true },
            { path: 'workspaces/antiguo.yaml', renamed: true },
            { path: 'workspaces/nuevo.yaml', renamed: true },
        ];

        expect(diskChangesOf(batch, exists)).toEqual([
            { kind: 'removed', path: 'workspaces/viejo.yaml' },
            { kind: 'removed', path: 'workspaces/antiguo.yaml' },
            { kind: 'changed', path: 'workspaces/nuevo.yaml' },
        ]);
    });

    it('refuses to pair when more than one name arrived', () => {
        const batch = [
            { path: 'workspaces/viejo.yaml', renamed: true },
            { path: 'workspaces/nuevo.yaml', renamed: true },
            { path: 'workspaces/otro.yaml', renamed: true },
        ];

        expect(diskChangesOf(batch, exists)).toEqual([
            { kind: 'removed', path: 'workspaces/viejo.yaml' },
            { kind: 'changed', path: 'workspaces/nuevo.yaml' },
            { kind: 'changed', path: 'workspaces/otro.yaml' },
        ]);
    });

    it('keeps the writes of the batch beside the move it found', () => {
        const batch = [
            { path: 'workspaces/api.yaml', renamed: false },
            { path: 'workspaces/viejo.yaml', renamed: true },
            { path: 'workspaces/nuevo.yaml', renamed: true },
        ];

        expect(diskChangesOf(batch, exists)).toEqual([
            { kind: 'moved', from: 'workspaces/viejo.yaml', to: 'workspaces/nuevo.yaml' },
            { kind: 'changed', path: 'workspaces/api.yaml' },
        ]);
    });
});
