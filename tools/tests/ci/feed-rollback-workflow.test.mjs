import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const workflow = parse(await readFile(join(ROOT, '.github/workflows/feed-rollback.yml'), 'utf8'));
const { rollback } = workflow.jobs;
const runs = rollback.steps.map((step) => step.run).join('\n');

describe('the rollback of a feed', () => {
    it('starts only from its button, for one app and one of its releases', () => {
        expect(Object.keys(workflow.on)).toEqual(['workflow_dispatch']);
        expect(workflow.on.workflow_dispatch.inputs.app.options).toEqual(['request', 'realtime']);
        expect(workflow.on.workflow_dispatch.inputs.tag.required).toBe(true);
        expect(runs).toContain('^$APP-v[0-9]+');
        expect(runs).toContain('--json isDraft');
    });

    it('waits for a person to approve it, as a release does', () => {
        expect(rollback.environment).toBe('release');
        expect(workflow.permissions).toEqual({ contents: 'read' });
        expect(rollback.permissions).toEqual({ contents: 'write' });
    });

    it('offers again the update files of that release, and touches nothing else', () => {
        expect(rollback.env.FEED).toBe('${{ inputs.app }}-feed');
        expect(runs).toContain('gh release download "$TAG" --dir feed');
        expect(runs).toContain('gh release upload "$FEED" feed/*.yml --clobber');
        expect(runs).not.toMatch(/gh release (create|delete|edit)/u);
    });

    it('waits for a release of the same app, which writes the same feed', () => {
        expect(workflow.concurrency).toEqual({
            group: 'release-${{ inputs.app }}',
            'cancel-in-progress': false,
        });
    });
});
