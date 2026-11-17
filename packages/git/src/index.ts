// The only barrel in the package. It states the public API and nothing else: inside the
// package every module imports the file that defines the symbol.

export { GitError } from './git/git-error.js';
export { type NetworkAccess } from './git/network-access.js';
export { remoteReachable } from './git/remote-reachable.js';

export { abortMerge } from './repo/abort-merge.js';
export { aheadBehind } from './repo/ahead-behind.js';
export { cloneRepo } from './repo/clone-repo.js';
export { commitAll } from './repo/commit-all.js';
export { commitMessage, type RepoChange } from './repo/commit-message.js';
export { commitPaths } from './repo/commit-paths.js';
export { concludeMerge } from './repo/conclude-merge.js';
export { fastForward } from './repo/fast-forward.js';
export { fetchRemote } from './repo/fetch-remote.js';
export { hasCommits } from './repo/has-commits.js';
export { initRepo } from './repo/init-repo.js';
export { restorePrivate, setPrivateAside, untrackPrivate } from './repo/keep-private.js';
export { lastChange } from './repo/last-change.js';
export { mergeRemote } from './repo/merge-remote.js';
export { nameFirstBranch } from './repo/name-first-branch.js';
export { pushBranch } from './repo/push-branch.js';
export { restoreFile } from './repo/restore-file.js';
export { stageTexts } from './repo/stage-texts.js';
export { status } from './repo/status.js';
