import { useMessages } from '@mandor/i18n';
import type { RecordStatus } from '@mandor/ipc';
import { IconButton } from '@mandor/ui';

type RecordButtonProps = { onToggle: () => void; recording: RecordStatus };

/**
 * The recording of the connection, at the head of the activity it writes to a file: an icon,
 * lit while it records, whose tooltip says how much the file holds.
 */
export function RecordButton({ onToggle, recording }: RecordButtonProps) {
    const messages = useMessages('connections');

    return (
        <IconButton
            active={recording.active}
            icon="record"
            label={
                recording.active
                    ? `${messages('recording')} · ${String(recording.entries)}`
                    : messages('record')
            }
            onClick={onToggle}
            size="md"
        />
    );
}
