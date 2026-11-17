import { optimize } from 'svgo';

const GRID = '0 0 16 16';
const GEOMETRY = new Set(['svg', 'g', 'path']);

function inherited(attribute, ancestors) {
    for (let index = ancestors.length - 1; index >= 0; index--) {
        const value = ancestors[index].attributes[attribute];

        if (value !== undefined) {
            return value;
        }
    }

    return undefined;
}

function checkNode(node, fail) {
    if (!GEOMETRY.has(node.name)) {
        fail(`<${node.name}> is not supported`);
    }

    for (const name of Object.keys(node.attributes)) {
        if (/^on[a-z]+$/i.test(name)) {
            fail(`live attribute ${name}`);
        }

        if (name === 'href' || name === 'xlink:href') {
            fail(`external reference ${name}`);
        }

        if (name === 'style') {
            fail('style attribute');
        }

        if (name === 'transform') {
            fail('transform is not supported');
        }
    }
}

function checkCanvas(node, ancestors, fail) {
    if (node.name === 'svg' && ancestors.length !== 0) {
        fail('nested svg');
    }

    if (ancestors.length === 0 && node.attributes.viewBox !== GRID) {
        fail(`viewBox "${node.attributes.viewBox ?? 'missing'}", expected ${GRID}`);
    }
}

function extractPath(node, ancestors, fail) {
    if (node.attributes.d === undefined) {
        fail('path without d');
    }

    const attributeOf = (name) => node.attributes[name] ?? inherited(name, ancestors);
    const fill = attributeOf('fill');

    if (fill !== undefined && fill !== 'currentColor') {
        fail(`fill "${fill}"`);
    }

    const path = { d: node.attributes.d };
    const fillRule = attributeOf('fill-rule');
    const clipRule = attributeOf('clip-rule');

    if (fillRule !== undefined) {
        path.fillRule = fillRule;
    }

    if (clipRule !== undefined) {
        path.clipRule = clipRule;
    }

    return path;
}

/**
 * An icon of the registry is a promise, not artwork: a 16 canvas, paths with `d`, an inherited
 * fill that can only be `currentColor`, and nothing animated, external or transformed. What
 * breaks the promise fails here, naming what failed, and never reaches the generated component.
 */
export function normalizeIconSvg(xml, label = 'icon') {
    const fail = (message) => {
        throw new Error(`${label}: ${message}`);
    };

    const ancestors = [];
    const paths = [];

    optimize(xml, {
        js2svg: { pretty: false },
        plugins: [
            {
                name: 'mandor-normalize-icon',
                fn: () => ({
                    element: {
                        enter(node) {
                            checkNode(node, fail);
                            checkCanvas(node, ancestors, fail);

                            if (node.name === 'path') {
                                paths.push(extractPath(node, ancestors, fail));
                            }

                            ancestors.push(node);
                        },
                        exit() {
                            ancestors.pop();
                        },
                    },
                }),
            },
        ],
    });

    if (paths.length === 0) {
        fail('no path at all');
    }

    return { paths };
}
