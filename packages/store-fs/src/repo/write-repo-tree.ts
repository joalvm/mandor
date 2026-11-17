import { mkdir } from 'node:fs/promises';

import { createRepo, type Repo } from '@mandor/schema';

import { atomicWrite } from '../disk/atomic-write.js';
import { documentOf } from '../disk/document-of.js';
import { writeDocument } from '../disk/write-document.js';
import {
    mandorDir,
    gitattributesFile,
    gitignoreFile,
    repoFile,
    workspacesDir,
} from './repo-path.js';

/** Secrets and session state live here. Committing them would publish them. */
const GITIGNORE = '.mandor/\n';

/** Without this, a file touched on the other platform comes back as a whole-file diff. */
const GITATTRIBUTES = '* text=auto eol=lf\n';

/** Lays out an empty repo. Both git files are written now, before the repo can have a commit. */
export async function writeRepoTree(root: string, name: string): Promise<Repo> {
    const repo = createRepo({ name });

    await mkdir(workspacesDir(root), { recursive: true });
    await mkdir(mandorDir(root), { recursive: true });

    await writeDocument(repoFile(root), documentOf(repo), {});
    await atomicWrite(gitignoreFile(root), GITIGNORE);
    await atomicWrite(gitattributesFile(root), GITATTRIBUTES);

    return repo;
}
