/**
 * Utilities for handling India Standard Time (IST - UTC+5:30)
 */

const IST_OFFSET = 330 * 60 * 1000; // 5.5 hours in milliseconds

/**
 * Returns the current date/time adjusted to IST
 */
export const getISTDate = (date: Date = new Date()): Date => {
    return new Date(date.getTime() + IST_OFFSET);
};

/**
 * Returns a UTC Date object representing 00:00:00.000 IST for a given date
 * @param dateInput Date object or YYYY-MM-DD string
 */
export const getISTStartOfDay = (dateInput?: Date | string): Date => {
    let date: Date;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        // For YYYY-MM-DD strings, we want to treat them as local IST dates
        const [year, month, day] = dateInput.split('-').map(Number);
        // Create date in UTC to avoid local timezone interference, then adjust
        date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        // This is 00:00:00 UTC on that day. To make it 00:00:00 IST, we subtract the offset.
        return new Date(date.getTime() - IST_OFFSET);
    } else {
        date = dateInput ? new Date(dateInput) : new Date();
        const istTime = date.getTime() + IST_OFFSET;
        const istDate = new Date(istTime);
        istDate.setUTCHours(0, 0, 0, 0);
        return new Date(istDate.getTime() - IST_OFFSET);
    }
};

/**
 * Returns a UTC Date object representing 23:59:59.999 IST for a given date
 * @param dateInput Date object or YYYY-MM-DD string
 */
export const getISTEndOfDay = (dateInput?: Date | string): Date => {
    let date: Date;
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        const [year, month, day] = dateInput.split('-').map(Number);
        date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        return new Date(date.getTime() - IST_OFFSET);
    } else {
        date = dateInput ? new Date(dateInput) : new Date();
        const istTime = date.getTime() + IST_OFFSET;
        const istDate = new Date(istTime);
        istDate.setUTCHours(23, 59, 59, 999);
        return new Date(istDate.getTime() - IST_OFFSET);
    }
};

/**
 * Compares if two dates fall on the same calendar day in IST
 */
export const isSameDayIST = (d1: Date, d2: Date = new Date()): boolean => {
    const ist1 = new Date(d1.getTime() + IST_OFFSET);
    const ist2 = new Date(d2.getTime() + IST_OFFSET);

    return (
        ist1.getUTCFullYear() === ist2.getUTCFullYear() &&
        ist1.getUTCMonth() === ist2.getUTCMonth() &&
        ist1.getUTCDate() === ist2.getUTCDate()
    );
};

/**
 * Formats a date to IH-IN locale string (IST)
 */
export const formatIST = (date: Date = new Date()): string => {
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};
