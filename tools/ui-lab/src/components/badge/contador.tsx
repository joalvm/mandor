import { Badge } from '@mandor/ui';

/** El contador en su sitio: pegado a lo que cuenta, con dígitos tabulares que no bailan. */
export function ContadorDemo() {
    return (
        <div className="flex min-w-0 items-center gap-gap-control">
            <span className="truncate text-sm text-text-primary">gateway.prod</span>
            <Badge count tone="accent">
                12
            </Badge>
            <Badge count tone="error">
                1
            </Badge>
        </div>
    );
}
