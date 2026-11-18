import { describe, expect, it } from 'vitest';

import { targetedE2eCommand } from '../../ci/e2e-command.mjs';

describe('the command of a targeted e2e', () => {
    it('builds once, then runs each app with the filters and passes where nothing matches', () => {
        const [shell, flag, script] = targetedE2eCommand(['workload-memory']);

        expect([shell, flag]).toEqual(['sh', '-c']);
        expect(script.startsWith('npm run build && ')).toBe(true);
        expect(script).toContain('npm run e2e -w apps/async -- --pass-with-no-tests "$@"');
        expect(script).toContain('npm run e2e -w apps/sync -- --pass-with-no-tests "$@"');
    });

    /** A filter written into the script would be parsed by the shell; as an argument it is not. */
    it('hands the filters over as arguments, whatever characters they hold', () => {
        const filters = ['workload-memory', 'a b; rm -rf /', '$(id)'];
        const command = targetedE2eCommand(filters);

        expect(command.slice(4)).toEqual(filters);
        expect(command[2]).not.toContain('rm -rf');
        expect(command[3]).toBe('sh');
    });
});
