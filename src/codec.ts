import { CHARSET, MRK_DIGITS, MRK_LENGTH, chunk, digitsToUnits, isDigits, unitsToDigits } from "./utils.js";

/** Message mode */
export const Mode = {
    /** Text: every character is one unit (index in `CHARSET`) */
    Alphanumeric: 1,
    /** Digits: every two digits are one unit */
    Numeric: 2,
} as const;
export type Mode = (typeof Mode)[keyof typeof Mode];

/**
 * Tweak for ciphertext correction (+/- 1).
 * See section 10 in [this](https://mk.bs0dd.net/mk85c/AZIMUT.pdf) manual (Russian language).
 *
 * `[position, shift]`: `position` is the 1-based number of the first damaged unit,
 * `shift` is `< 0` if digits were lost (|shift| zeros are inserted) and `> 0` if digits were duplicated
 * (`shift` digits are removed).
 */
export type Tweak = readonly [position: number, shift: number];


export class MessageCodec {
    constructor(public readonly groupN: number = 5) {
        if (!Number.isInteger(groupN) || groupN < 1)
            throw new Error("groupN must be a positive integer");
    }

    encodeText(text: string): Uint8Array {
        const chars = Array.from(text.toUpperCase());
        const units = new Uint8Array(this.paddedLength(chars.length)); // 0 == ' '
        chars.forEach((ch, i) => (units[i] = Math.max(CHARSET.indexOf(ch), 0)));
        return units;
    }

    decodeText(units: ArrayLike<number>): string {
        return Array.from(units, (u) => CHARSET[u]).join("");
    }

    encodeNumber(digits: string): Uint8Array {
        if (!isDigits(digits))
            throw new Error("Numeric message must contain only digits");
        const padded = digits.padEnd(this.paddedLength(digits.length), "0");
        return digitsToUnits(padded.length % 2 === 0 ? padded : padded + "0");
    }

    decodeNumber(units: ArrayLike<number>): string {
        const digits = unitsToDigits(units);
        return digits.replace(/0+$/, "") || digits.slice(0, 1);
    }


    paddedLength(length: number): number {
        const total = Math.ceil((MRK_DIGITS + length * 2) / this.groupN) * this.groupN;
        return Math.ceil((total - MRK_DIGITS) / 2);
    }

    frame(mrk: Uint8Array, cipher: Uint8Array): string {
        if (mrk.length !== MRK_LENGTH)
            throw new Error(`Wrong markant length. Expected ${MRK_LENGTH}, got ${mrk.length}`);
        return chunk(unitsToDigits(mrk) + unitsToDigits(cipher), this.groupN).join(" ");
    }

    unframe(wire: string, tweak: Tweak = [0, 0]): { mrk: Uint8Array; cipher: Uint8Array } {
        let digits = wire.replace(/\s+/g, "");
        if (!isDigits(digits))
            throw new Error("Ciphertext must contain only digits and spaces");

        const [position, shift] = tweak;
        if (shift !== 0) {
            const index = this.tweakIndex(position) * 2 + MRK_DIGITS;
            if (shift < 0)
                digits = digits.slice(0, index) + "0".repeat(-shift) + digits.slice(index);
            else digits = digits.slice(0, index) + digits.slice(index + shift);
        }
        if (digits.length % 2 !== 0) digits = digits.slice(0, -1);
        if (digits.length < MRK_DIGITS)
            throw new Error(`Ciphertext is too short: markant needs ${MRK_DIGITS} digits`);

        return {
            mrk: digitsToUnits(digits.slice(0, MRK_DIGITS)),
            cipher: digitsToUnits(digits.slice(MRK_DIGITS)),
        }
    }

    stripInserted(plain: Uint8Array, tweak: Tweak = [0, 0]): Uint8Array {
        const [position, shift] = tweak;
        if (shift >= 0) return plain;

        const index = this.tweakIndex(position);
        const garbage = Math.ceil(-shift / 2);
        const res = new Uint8Array(Math.max(plain.length - garbage, index));
        res.set(plain.subarray(0, index));
        res.set(plain.subarray(index + garbage), index);
        return res;
    }

    private tweakIndex(position: number): number {
        if (!Number.isInteger(position) || position < 1)
            throw new Error("Tweak position must be an integer >= 1");
        return position - 1;
    }
}