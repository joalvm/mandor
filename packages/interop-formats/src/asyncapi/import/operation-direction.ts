import type { OperationInterface } from '@asyncapi/parser';
import type { InteropDirection } from '@mandor/interop-core';

/**
 * The document speaks from the application it describes; the collection speaks from Mandor. What the
 * described application sends is what Mandor receives, and the other way round. The parser hands
 * out the action with its own vocabulary per format version — `publish`/`subscribe` in 2.x,
 * `send`/`receive` in 3.x — so the two vocabularies land in one table and nothing reads a raw key.
 */
const AS_THE_APPLICATION_SEES_IT: Record<string, InteropDirection | undefined> = {
    publish: 'incoming',
    send: 'incoming',
    subscribe: 'outgoing',
    receive: 'outgoing',
};

export function operationDirection(operation: OperationInterface): InteropDirection {
    const action = operation.action();
    const direction = AS_THE_APPLICATION_SEES_IT[action];

    if (direction === undefined) {
        throw new Error(
            `the parser handed out the action "${action}" and nobody knows which way it flows`,
        );
    }

    return direction;
}
