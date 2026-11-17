/** Whether what is typed is a whole count worth keeping: digits only, and no less than the floor. */
export function isWholeCount(raw: string, min: number): boolean {
    return /^\d+$/u.test(raw) && Number(raw) >= min;
}
