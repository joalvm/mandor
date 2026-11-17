import type {
    InteropHttpOperation,
    InteropParameter,
    InteropResponseExample,
} from './interop-document.js';
import { irEqual } from './ir-equal.js';
import { equalDiff, keyed, sameSet } from './ir-diff-keyed.js';

/**
 * What a request/response operation says beyond a message, field by field. The parameters
 * answer by the place and the name they travel, the responses by the status, the type and the
 * name they are shown under: three documents can show a `200` under one name each, and two of
 * those saying the same thing are still the same answer.
 */
export function httpDiff(
    path: string,
    left: InteropHttpOperation | undefined,
    right: InteropHttpOperation | undefined,
): string[] {
    if (left === undefined || right === undefined) {
        return left === right ? [] : [path];
    }

    const differences: string[] = [];

    for (const field of ['method', 'path', 'summary', 'description'] as const) {
        if (left[field] !== right[field]) {
            differences.push(`${path}.${field}`);
        }
    }

    if (!sameSet(left.tags, right.tags)) {
        differences.push(`${path}.tags`);
    }

    differences.push(
        ...keyed(
            `${path}.parameters`,
            left.parameters.map(namedParameter),
            right.parameters.map(namedParameter),
            equalDiff,
        ),
    );

    if (!irEqual(left.requestBody, right.requestBody)) {
        differences.push(`${path}.requestBody`);
    }

    differences.push(
        ...keyed(
            `${path}.responses`,
            left.responses.map(namedResponse),
            right.responses.map(namedResponse),
            equalDiff,
        ),
    );

    if (!irEqual(left.security, right.security)) {
        differences.push(`${path}.security`);
    }

    return differences;
}

/** A parameter keyed by the place and the name it travels under. */
function namedParameter(parameter: InteropParameter): InteropParameter {
    return { ...parameter, name: `${parameter.in}:${parameter.name}` };
}

/** A response keyed by the status, the type and the name it is shown under. */
function namedResponse(response: InteropResponseExample): InteropResponseExample {
    return { ...response, name: `${response.status}:${response.contentType}:${response.name}` };
}
