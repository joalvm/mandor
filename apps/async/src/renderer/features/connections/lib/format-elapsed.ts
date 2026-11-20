const SECOND = 1000;
const MINUTE = 60;
const HOUR = 60 * MINUTE;

function twoDigits(value: number): string {
    return String(value).padStart(2, '0');
}

/**
 * A stretch of time the way a clock of a call says it: minutes and seconds, `00:42`, and the
 * hours in front only once there is one, `1:02:03`.
 */
export function formatElapsed(milliseconds: number): string {
    const total = Math.floor(Math.max(0, milliseconds) / SECOND);
    const hours = Math.floor(total / HOUR);
    const minutes = Math.floor((total % HOUR) / MINUTE);
    const clock = `${twoDigits(minutes)}:${twoDigits(total % MINUTE)}`;

    return hours === 0 ? clock : `${String(hours)}:${clock}`;
}
