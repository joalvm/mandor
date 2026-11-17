import type { Empty, Result } from '../result/result.js';

import type { DocCreateRequest } from './doc-create.js';
import type { DocDeleteRequest } from './doc-delete.js';
import type { DocListRequest, ListedDoc } from './doc-list.js';
import type { DocReadRequest } from './doc-read.js';
import type { DocRenameRequest } from './doc-rename.js';
import type { DocRevertRequest } from './doc-revert.js';
import type { DocWriteRequest } from './doc-write.js';

/** Everything a renderer may do to the markdown of a workspace, and nothing else. */
export type DocBridge = {
    /** One more file, empty, under the title given. The answer is the file name main drew. */
    create: (input: DocCreateRequest) => Promise<Result<string>>;
    /** The file leaves the workspace. A name that names nothing is refused. */
    delete: (input: DocDeleteRequest) => Promise<Result<Empty>>;
    list: (input: DocListRequest) => Promise<Result<ListedDoc[]>>;
    read: (input: DocReadRequest) => Promise<Result<string>>;
    /** The doc takes the title given. The file keeps its name and nothing else moves. */
    rename: (input: DocRenameRequest) => Promise<Result<Empty>>;
    write: (input: DocWriteRequest) => Promise<Result<Empty>>;
    revert: (input: DocRevertRequest) => Promise<Result<string>>;
};
