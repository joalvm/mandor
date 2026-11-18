/**
 * Mandor owns one icon source. Renderers consume `@mandor/icons`; they do not draw a local
 * SVG, pull a second visual vocabulary into the product, or reach the provider behind it.
 * The exception is a brand mark of the outside world - a transport logo, say - which lives
 * beside the only app that shows it, in a component named for it.
 */

const PROVIDER = /@vscode\/codicons/;

function isIconsPackage(filename) {
    return /(?:^|[\\/])packages[\\/]icons(?:[\\/]|$)/.test(filename);
}

/** A brand mark, not a house glyph: it carries the identity of the outside world. */
function isBrandMark(filename) {
    const base = filename.split(/[\\/]/).pop() ?? '';

    return base.endsWith('Logo.tsx');
}

function literalOf(node) {
    return typeof node.value === 'string' ? node.value : '';
}

function importValue(node) {
    return typeof node.source?.value === 'string' ? node.source.value : '';
}

/** @type {import('eslint').Rule.RuleModule} */
export const noForeignIconSource = {
    meta: {
        type: 'problem',
        docs: {
            description:
                'All authored glyphs belong to @mandor/icons; the provider stays encapsulated.',
        },
        schema: [],
        messages: {
            lucideImport: 'Import Mandor glyphs from @mandor/icons, never lucide-react.',
            svgElement:
                'Authored <svg> elements belong only to packages/icons, or to a brand-mark component of their own.',
            svgImport: 'SVG sources belong only to packages/icons.',
            codiconsImport:
                'Codicons entra solo por @mandor/icons: el proveedor de geometría no se consume fuera del paquete.',
            iconLiteral:
                'Icon es la última opción: un literal elige componente en import. El nombre solo llega en datos.',
        },
    },
    create(context) {
        const ownsGlyphs = isIconsPackage(context.filename);

        const forbidCodicons = (node, value) => {
            if (!ownsGlyphs && PROVIDER.test(value)) {
                context.report({ node, messageId: 'codiconsImport' });
            }
        };

        /** `<Icon name="...">` with a literal: the registry already has the component to import. */
        const forbidIconLiteral = (node) => {
            if (ownsGlyphs) {
                return;
            }

            const name = node.attributes?.find?.(
                (attribute) => attribute.type === 'JSXAttribute' && attribute.name?.name === 'name',
            );

            if (name?.value?.type === 'Literal' || name?.value?.type === 'JSXText') {
                context.report({ node, messageId: 'iconLiteral' });
            }
        };

        return {
            ImportDeclaration(node) {
                const source = importValue(node);

                if (source === 'lucide-react' || source.startsWith('lucide-react/')) {
                    context.report({ node, messageId: 'lucideImport' });
                }

                if (!ownsGlyphs && source.endsWith('.svg')) {
                    context.report({ node, messageId: 'svgImport' });
                }

                forbidCodicons(node, source);
            },
            ExportAllDeclaration(node) {
                forbidCodicons(node, importValue(node));
            },
            ExportNamedDeclaration(node) {
                forbidCodicons(node, importValue(node));
            },
            ImportExpression(node) {
                forbidCodicons(node, literalOf(node.source));
            },
            CallExpression(node) {
                const callee = node.callee.type === 'Identifier' ? node.callee.name : '';
                const [first] = node.arguments;

                if (callee === 'require' && first?.type === 'Literal') {
                    forbidCodicons(node, literalOf(first));
                }
            },
            JSXOpeningElement(node) {
                if (!ownsGlyphs && !isBrandMark(context.filename)) {
                    if (node.name.type === 'JSXIdentifier' && node.name.name === 'svg') {
                        context.report({ node, messageId: 'svgElement' });
                    }
                }

                if (node.name.type === 'JSXIdentifier' && node.name.name === 'Icon') {
                    forbidIconLiteral(node);
                }
            },
        };
    },
};
