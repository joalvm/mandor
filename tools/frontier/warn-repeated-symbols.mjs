/**
 * Runs next to `depcruise`, and never fails: what it finds is a question for whoever reads the
 * output, not a broken rule. The frontier that is an error lives in the cruiser config and in
 * the guard of `tools/tests/package-frontier.test.mjs`.
 */

import { sourceFiles } from '../design/source-files.mjs';

import { repeatedNames, repeatedNotice } from './repeated-symbols.mjs';

const notice = repeatedNotice(repeatedNames(await sourceFiles()));

if (notice !== null) {
    console.warn(notice);
}
