/** Cipher charset (Tweaked KOI-8) */
export const CHARSET = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[Ъ]…ЁЮАБЦДЕФГХИЙКЛМНОПЯРСТУЖВЬЫЗШЭЩЧ█    ';

/** S-BOX */
export const SBOX = [
    0x06, 0x0E, 0x28, 0x42, 0x56, 0x08, 0x52, 0x55, 0x4D, 0x44,
    0x43, 0x02, 0x1A, 0x17, 0x35, 0x33, 0x61, 0x46, 0x30, 0x39,
    0x3A, 0x25, 0x18, 0x0B, 0x00, 0x4A, 0x10, 0x51, 0x5F, 0x34,
    0x21, 0x2D, 0x2B, 0x5A, 0x57, 0x3E, 0x3F, 0x11, 0x49, 0x63,
    0x09, 0x26, 0x23, 0x07, 0x4E, 0x32, 0x22, 0x2E, 0x48, 0x03,
    0x01, 0x0D, 0x13, 0x0F, 0x3B, 0x59, 0x41, 0x62, 0x2C, 0x36,
    0x40, 0x1F, 0x5B, 0x0C, 0x47, 0x53, 0x3C, 0x20, 0x60, 0x4C,
    0x14, 0x50, 0x1B, 0x04, 0x5E, 0x24, 0x3D, 0x5D, 0x27, 0x0A,
    0x5C, 0x31, 0x2A, 0x58, 0x37, 0x2F, 0x12, 0x4F, 0x1E, 0x29,
    0x05, 0x38, 0x1C, 0x45, 0x16, 0x19, 0x1D, 0x54, 0x15, 0x4B
];

export const KEY_UNITS = 50;
/** Full key length: 50 units + 10 single-digit checksum values */
export const KEY_LENGTH = 60;
/** Markant (MRK / IV) length in units */
export const MRK_LENGTH = 5;
/** Markant length in digits */
export const MRK_DIGITS = MRK_LENGTH * 2;
 
/** Split string into pieces of `size` characters (the last one may be shorter) */
export const chunk = (str: string, size: number): string[] => {
    const parts: string[] = [];
    for (let i = 0; i < str.length; i += size) parts.push(str.slice(i, i + size));
    return parts;
}
 
export const isDigits = (str: string): boolean => /^\d*$/.test(str);
 
/** `[1, 2, 35]` -> `"010235"` */
export const unitsToDigits = (units: ArrayLike<number>): string =>
    Array.from(units, (u) => u.toString().padStart(2, "0")).join("");
 
export const digitsToUnits = (digits: string): Uint8Array => {
    if (!isDigits(digits))
        throw new Error("Expected a string of decimal digits");
    if (digits.length % 2 !== 0)
        throw new Error("Expected an even number of digits");
    return Uint8Array.from({ length: digits.length / 2 }, (_, i) => Number(digits.slice(i * 2, i * 2 + 2)));
}

const getRandomInt = (min: number, max: number): number => {
    min = Math.ceil(min);
    return Math.floor(Math.random() * (Math.floor(max) - min + 1)) + min;
}
export const randomUnits = (length: number): Uint8Array => Uint8Array.from({length: length}, () => getRandomInt(0, 98));