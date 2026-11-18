/**
 * A component handed to another component through a prop leaves the tree of the file and the
 * tree of the screen saying different things: the child hangs from whoever built it, not from
 * where it is drawn, and finding what fills a region means opening a second file and following
 * a name. The container turns into a neck, too — every new hole is a new prop — and two apps
 * that share the frame share its shape forever.
 *
 * `children` is the exception and the whole answer: a container that receives the hole is still
 * read where it is written. Where the hole has to be filled by code this file cannot import,
 * the answer is a registry, not a prop.
 *
 * And `children` is declared once, by React. `PropsWithChildren` is what a container wears, so
 * the hole reads the same in every file that has one; writing it out by hand is a chance to write
 * it differently. A `children` narrowed to something React cannot say — one element, to be cloned
 * — is a real constraint and stays, because the wrapper cannot express it.
 *
 * The same goes for a glyph a caller may or may not pass. A component draws the glyph that is
 * part of what it is — the chevron of a dropdown, the check of a menu line — and nothing else;
 * a list whose lines each decide leaves its names starting in a different column.
 */

/** Types that only a component can satisfy, whatever the prop that carries them is called. */
const COMPONENT_TYPES = new Set([
    'ComponentType',
    'ElementType',
    'FC',
    'FunctionComponent',
    'JSX.Element',
    'JSXElementConstructor',
    'ReactElement',
    'ReactNode',
    'ReactPortal',
]);

/** Names of props that carry a glyph the caller chooses, which the component should own. */
const ICON_PROPS = /^(?:.*[a-z])?[Ii]con$/u;

function isPropsAlias(node) {
    return node.id.type === 'Identifier' && node.id.name.endsWith('Props');
}

function propertyName(member) {
    if (member.key.type === 'Identifier') {
        return member.key.name;
    }

    return member.key.type === 'Literal' ? String(member.key.value) : '';
}

/**
 * Every object literal the alias is made of, so an intersection is read like a single one and
 * what a wrapper like `PropsWithChildren` holds is read like what it wraps.
 */
function typeLiterals(node, found) {
    if (node.type === 'TSTypeLiteral') {
        found.push(node);
    }

    if (node.type === 'TSIntersectionType' || node.type === 'TSUnionType') {
        for (const part of node.types) {
            typeLiterals(part, found);
        }
    }

    if (node.type === 'TSTypeReference') {
        const args = node.typeArguments ?? node.typeParameters;

        for (const part of args?.params ?? []) {
            typeLiterals(part, found);
        }
    }

    return found;
}

/** `ReactNode`, `React.ReactNode` and `JSX.Element` all written out the way they appear. */
function referencedName(node) {
    if (node.type === 'Identifier') {
        return node.name;
    }

    return node.type === 'TSQualifiedName' ? `${referencedName(node.left)}.${node.right.name}` : '';
}

/** The name of the component type a reference resolves to, qualified or not. */
function componentTypeOf(node) {
    const name = referencedName(node.typeName);
    const last = name.slice(name.lastIndexOf('.') + 1);

    return COMPONENT_TYPES.has(name) || COMPONENT_TYPES.has(last) ? name : undefined;
}

/** `ReactNode`, alone or widened with the nothing it already contains. */
function isPlainNode(node) {
    if (node.type === 'TSUnionType') {
        return node.types.every(isPlainNode);
    }

    if (node.type === 'TSUndefinedKeyword' || node.type === 'TSNullKeyword') {
        return true;
    }

    return node.type === 'TSTypeReference' && componentTypeOf(node)?.endsWith('ReactNode') === true;
}

/** What a walk descends into: the children of a node, never back up its `parent` link. */
function branchesOf(node) {
    return Object.entries(node)
        .filter(([key]) => key !== 'parent')
        .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
        .filter((value) => typeof value?.type === 'string');
}

/** The first component type anywhere under an annotation, including inside a callback. */
function componentTypeIn(node) {
    if (typeof node?.type !== 'string') {
        return undefined;
    }

    if (node.type === 'TSTypeReference' && componentTypeOf(node) !== undefined) {
        return componentTypeOf(node);
    }

    return branchesOf(node)
        .map((branch) => componentTypeIn(branch))
        .find((name) => name !== undefined);
}

/** @type {import('eslint').Rule.RuleModule} */
export const noComponentProp = {
    meta: {
        type: 'problem',
        docs: { description: 'A component is written where it is drawn, never passed as a prop.' },
        schema: [],
        messages: {
            componentProp:
                '`{{prop}}` carries a `{{type}}`. Write the tree where it is drawn: `children`, ' +
                'or a registry when the caller cannot be imported.',
            childrenProp:
                '`children` typed by hand is what `PropsWithChildren` already declares. Wrap the ' +
                'props in it, so every container of the app opens the same hole.',
            iconProp:
                '`{{prop}}` lets the caller choose a glyph. A component draws the glyph that is ' +
                'part of what it is, and takes none it can be asked to leave out.',
        },
    },
    create(context) {
        function checkChildren(member) {
            const annotation = member.typeAnnotation?.typeAnnotation;

            if (annotation !== undefined && isPlainNode(annotation)) {
                context.report({ node: member, messageId: 'childrenProp' });
            }
        }

        function checkMember(member) {
            const prop = propertyName(member);

            if (member.type !== 'TSPropertySignature') {
                return;
            }

            if (prop === 'children') {
                checkChildren(member);

                return;
            }

            const type = componentTypeIn(member.typeAnnotation);

            if (type !== undefined) {
                context.report({ node: member, messageId: 'componentProp', data: { prop, type } });

                return;
            }

            if (member.optional === true && ICON_PROPS.test(prop)) {
                context.report({ node: member, messageId: 'iconProp', data: { prop } });
            }
        }

        return {
            TSTypeAliasDeclaration(node) {
                if (!isPropsAlias(node)) {
                    return;
                }

                for (const literal of typeLiterals(node.typeAnnotation, [])) {
                    literal.members.forEach(checkMember);
                }
            },
        };
    },
};
