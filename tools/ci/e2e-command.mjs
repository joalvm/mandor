/**
 * The command of the container when `ci:e2e` is given the specs to run. The whole suite of both
 * apps takes minutes and loads a Docker engine that other projects share, so one spec being
 * iterated on can ask for itself alone. Each filter is a Playwright one (part of a path); an app
 * with no spec that matches passes, since the filters name a spec of one app and not of both.
 *
 * @param {string[]} filters
 * @returns {string[]}
 */
export function targetedE2eCommand(filters) {
    const run = (app) => `xvfb-run -a npm run e2e -w apps/${app} -- --pass-with-no-tests "$@"`;

    // The filters travel as arguments of the shell, never inside its text: `sh` is `$0` of the script.
    return ['sh', '-c', `npm run build && ${run('async')} && ${run('sync')}`, 'sh', ...filters];
}
