/**
 * First the entity, then the role. A folder named after a technical role accepts anything of
 * that role, so adding a field to an entity ends up touching four folders instead of one, and
 * the folder itself becomes the drawer `utils/` used to be under a better name.
 *
 * Only the role names are listed. A folder named after what it holds — `repo`, `fields`,
 * `testing`, `components`, `hooks`, `lib` — passes, because the name already says the subject.
 */

const ROLE_DIRECTORIES = new Set([
    'common',
    'constant',
    'constants',
    'enum',
    'enums',
    'error',
    'errors',
    'factories',
    'factory',
    'helper',
    'helpers',
    'interface',
    'interfaces',
    'misc',
    'model',
    'models',
    'payload',
    'payloads',
    'schema',
    'schemas',
    'shared',
    'stuff',
    'type',
    'types',
    'util',
    'utils',
]);

/** @type {import('eslint').Rule.RuleModule} */
export const noRoleDirectory = {
    meta: {
        type: 'problem',
        docs: { description: 'A folder groups what changes together, not what shares a role.' },
        schema: [],
        messages: {
            role: '"{{name}}/" groups by technical role. Move the file to the folder of the entity it changes with.',
        },
    },
    create(context) {
        const name = roleSegment(context.filename);

        if (name === undefined) {
            return {};
        }

        return {
            Program(node) {
                context.report({ node, messageId: 'role', data: { name } });
            },
        };
    },
};

function roleSegment(filename) {
    const segments = filename.split(/[\\/]/);
    const source = segments.lastIndexOf('src');

    if (source === -1) {
        return undefined;
    }

    return segments.slice(source + 1, -1).find((segment) => ROLE_DIRECTORIES.has(segment));
}
