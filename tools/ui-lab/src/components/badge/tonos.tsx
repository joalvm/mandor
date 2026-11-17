import { Badge } from '@mandor/ui';

/** Los seis tonos, todos tinte sobre superficie: la pastilla nombra, no decora. */
export function TonosDemo() {
    return (
        <>
            <Badge>neutral</Badge>
            <Badge tone="accent">accent</Badge>
            <Badge tone="success">success</Badge>
            <Badge tone="warning">warning</Badge>
            <Badge tone="error">error</Badge>
            <Badge tone="info">info</Badge>
        </>
    );
}
