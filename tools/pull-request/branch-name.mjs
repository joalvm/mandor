import { CHANGE_TYPES } from './change-types.mjs';

const BRANCH = new RegExp(`^(${CHANGE_TYPES.join('|')})/[a-z0-9]+(-[a-z0-9]+)*$`);

const DEPENDABOT = /^dependabot\/[a-z0-9_]+\/\S+$/;

/**
 * `main` is the destination, not a change, so it answers to nothing here. A Dependabot branch is
 * named by Dependabot; its titles are the ones `.github/dependabot.yml` asks for.
 */
export function branchNameProblems(branch) {
    if (branch === 'main' || branch === '' || DEPENDABOT.test(branch)) {
        return [];
    }

    if (BRANCH.test(branch)) {
        return [];
    }

    return [
        `Branch "${branch}" is not "type/short-description". ` +
            `Type is one of ${CHANGE_TYPES.join(', ')} and the description is kebab-case.`,
    ];
}
