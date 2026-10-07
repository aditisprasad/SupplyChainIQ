export function normalizeExcelDateToMonth(value: unknown, date1904 = false): string | null {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
    }

    if (typeof value === "string") {
        if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
        const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (isoDate && Number(isoDate[2]) >= 1 && Number(isoDate[2]) <= 12) {
            const parsed = new Date(`${value}T00:00:00Z`);
            if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) {
                return value.slice(0, 7);
            }
        }
    }

    const serial = typeof value === "number"
        ? value
        : typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())
            ? Number(value.trim())
            : Number.NaN;
    const minimumSerial = date1904 ? 0 : 1;
    if (!Number.isFinite(serial) || serial < minimumSerial || serial >= 2_958_466) return null;

    const wholeDays = Math.floor(serial);
    const epoch = date1904
        ? Date.UTC(1904, 0, 1)
        : Date.UTC(1899, 11, wholeDays < 60 ? 31 : 30);
    const date = new Date(epoch + wholeDays * 86_400_000);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function normalizeDateToIso(value: unknown, fieldName: string): string {
    if (value instanceof Date) {
        if (!Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
        throw new Error(`${fieldName} is not a valid date.`);
    }

    if (typeof value === "string") {
        const isoValue = value.trim();
        const match = /^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.exec(isoValue);
        if (match) {
            const datePart = match[1];
            const parsedDate = new Date(`${datePart}T00:00:00.000Z`);
            const parsedValue = new Date(isoValue);
            if (
                !Number.isNaN(parsedDate.getTime()) &&
                parsedDate.toISOString().slice(0, 10) === datePart &&
                !Number.isNaN(parsedValue.getTime())
            ) {
                return datePart;
            }
        }
    }

    throw new Error(`${fieldName} must be a valid date in YYYY-MM-DD format.`);
}