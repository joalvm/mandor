import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { knownText, rememberText } from '../../src/repo/known-texts.js';
import { rememberDisk } from '../../src/repo/remember-disk.js';
import { tempRepo } from './support/temp-repo.js';

const repo = tempRepo();

describe('taking the disk as what the window believes', () => {
    it('remembers the text of a file', async () => {
        await repo.write('a.yaml', 'one\n');

        await rememberDisk(repo.root(), ['a.yaml']);

        expect(knownText(repo.root(), 'a.yaml')).toBe('one\n');
    });

    it('remembers every file of a folder', async () => {
        await mkdir(join(repo.root(), 'dir', 'deep'), { recursive: true });
        await repo.write('dir/a.yaml', 'a\n');
        await repo.write('dir/deep/b.yaml', 'b\n');

        await rememberDisk(repo.root(), ['dir']);

        expect(knownText(repo.root(), 'dir/a.yaml')).toBe('a\n');
        expect(knownText(repo.root(), 'dir/deep/b.yaml')).toBe('b\n');
    });

    it('remembers a path that is not there as gone, with what was under it', async () => {
        rememberText(repo.root(), 'dir/a.yaml', 'a\n');
        rememberText(repo.root(), 'dir', 'x\n');

        await rm(join(repo.root(), 'dir'), { recursive: true, force: true });
        await rememberDisk(repo.root(), ['dir']);

        expect(knownText(repo.root(), 'dir')).toBeNull();
        expect(knownText(repo.root(), 'dir/a.yaml')).toBeNull();
    });
});
