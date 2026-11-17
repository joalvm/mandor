import { spawnSync } from 'node:child_process';
import { restoreGitSnapshot } from './restore-git-snapshot.mjs';

const metadata = restoreGitSnapshot({ cwd: process.cwd(), directory: '/ci-input' });
const result = spawnSync(process.execPath, ['tools/pull-request/check-pull-request.mjs'], {
    stdio: 'inherit',
    env: {
        ...process.env,
        QA_BASE: 'refs/remotes/qa/base',
        QA_BRANCH: metadata.branch,
        QA_TITLE: metadata.title,
    },
});

console.log(`Docker review context: ${JSON.stringify(metadata)}`);
process.exit(result.status ?? 1);
