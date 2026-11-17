import type { ChangedEntity } from '@mandor/schema';

import { nameOfYaml } from '../disk/name-of-yaml.js';
import { titleOfDoc } from '../doc/doc-parts.js';
import { entityOfPath } from './entity-of-path.js';

type Area = ChangedEntity['area'];
type EntityOf<A extends Area> = Extract<ChangedEntity, { area: A }>;

/** Where the visible name of each kind of file is: in its yaml, or in the front matter of a doc. */
const NAME_IN_TEXT: { [A in Area]: (text: string, entity: EntityOf<A>) => string } = {
    repo: (text) => nameOfYaml(text),
    // The file carries no name of its own: it is the one of its kind in the origin.
    globals: () => 'Globals',
    workspace: (text) => nameOfYaml(text),
    collections: (text) => nameOfYaml(text),
    doc: (text, entity) => titleOfDoc(text, entity.name),
    environment: (text) => nameOfYaml(text),
    connection: (text) => nameOfYaml(text),
};

function nameBy<A extends Area>(area: A, entity: EntityOf<A>, text: string): string {
    return NAME_IN_TEXT[area](text, entity);
}

/**
 * The name a person knows a file of the repo by, read from its text: the one it carries, never a
 * piece of its path. `path` is relative to the root with forward slashes, the way git and the
 * watcher name it. A file with no name, or that is no entity, has `''`.
 */
export function nameInText(path: string, text: string): string {
    const entity = entityOfPath(path);

    return entity === null ? '' : nameBy(entity.area, entity, text);
}
