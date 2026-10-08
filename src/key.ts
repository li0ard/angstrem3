import { keystream } from "./index.js";
import { KEY_LENGTH, KEY_UNITS, MRK_LENGTH, chunk, digitsToUnits, isDigits, randomUnits, unitsToDigits } from "./utils.js";

const CHECKSUM_MASK = [1, 0, 7, 5, 3, 2, 9, 8, 4, 6];
const CHECKSUM_MRK = Uint8Array.from([0x4a, 0x38, 0x0e, 0x21, 0x09]);

const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
    const res = new Uint8Array(a.length + b.length);
    res.set(a, 0);
    res.set(b, a.length);
    return res;
}

/** Key utils class */
export class Key {
    /** Generate new long-term key */
    static generate(): Uint8Array {
        const key = randomUnits(KEY_UNITS);
        return concat(key, Key.checksum(key));
    }

    /**
     * Key checksum: 10 single digits
     * @param key Long-term key (only the first 50 units are used)
     */
    static checksum(key: Uint8Array): Uint8Array {
        const raw = keystream(key, CHECKSUM_MRK, MRK_LENGTH);
        const cs = new Uint8Array(10);
        for (let i = 0; i < MRK_LENGTH; i++) {
            cs[i * 2] = (10 + Math.floor(raw[i] / 10) - CHECKSUM_MASK[i * 2]) % 10;
            cs[i * 2 + 1] = (10 + (raw[i] % 10) - CHECKSUM_MASK[i * 2 + 1]) % 10;
        }
        return cs;
    }

    /** Check that the checksum part of the key is consistent with its body */
    static verify(key: Uint8Array): boolean {
        if (key.length !== KEY_LENGTH) return false;
        const expected = Key.checksum(key.subarray(0, KEY_UNITS));
        return expected.every((d, i) => d === key[KEY_UNITS + i]);
    }

    /** Serialize key to string */
    static toString(key: Uint8Array): string {
        if (key.length !== KEY_LENGTH)
            throw new Error(`Wrong key length. Expected ${KEY_LENGTH}, got ${key.length}`);
        const body = unitsToDigits(key.subarray(0, KEY_UNITS));
        const checksum = Array.from(key.subarray(KEY_UNITS)).join("");
        return chunk(body + checksum, 5).join(" ");
    }

    /** Parse long-term key from string */
    static fromString(str: string): Uint8Array {
        const digits = str.replace(/\s+/g, "");
        if (digits.length !== 110)
            throw new Error(`Wrong key length. Expected 110, got ${digits.length}`);
        if (!isDigits(digits))
            throw new Error("Key must contain only decimal digits");

        const key = concat(digitsToUnits(digits.slice(0, 100)), Uint8Array.from(digits.slice(100), Number));
        if (!Key.verify(key))
            console.warn("[Key.fromString] Key has incorrect checksum");

        return key;
    }
}