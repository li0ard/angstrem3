import { MessageCodec, Mode, type Tweak } from "./codec.js";
import { Key } from "./key.js";
import { KEY_LENGTH, KEY_UNITS, MRK_LENGTH, SBOX, chunk, digitsToUnits, isDigits, randomUnits, unitsToDigits } from "./utils.js";

export { Key, Mode, type Tweak };

/** Encryption options */
export interface EncryptOptions {
    /** Markant (MRK/IV), 5 units. Random if omitted */
    mrk?: Uint8Array;
    /** Encryption mode (1 - Alphanumeric, 2 - Numeric) */
    mode?: Mode;
}

/** Decryption options */
export interface DecryptOptions {
    /** Tweak for ciphertext correction (+/- 1) */
    tweak?: Tweak;
    /** Decryption mode (1 - Alphanumeric, 2 - Numeric) */
    mode?: Mode;
}

const BLOCK_SIZE = 10;
const KEY_SCHEDULE_ROUNDS = 6;

/**
 * Keystream generator. Pure: all state (the former global `eround`) is local.
 * The stream is deterministic, so a shorter request is a prefix of a longer one.
 *
 * @param key Long-term key (first 50 units are used)
 * @param mrk Markant (5 units)
 * @param length Number of keystream units
 */
export const keystream = (key: Uint8Array, mrk: Uint8Array, length: number): Uint8Array => {
    if (mrk.length !== MRK_LENGTH)
        throw new Error(`Wrong markant length. Expected ${MRK_LENGTH}, got ${mrk.length}`);
    if (key.length < KEY_UNITS)
        throw new Error(`Wrong key length. Expected at least ${KEY_UNITS}, got ${key.length}`);

    const state = new Uint8Array(BLOCK_SIZE);
    state.set(mrk, 0);
    state.set(mrk, MRK_LENGTH);
    let pos = state.reduce((acc, n) => acc + n, 0) % 100;

    const round = (roundKey: Uint8Array): void => {
        for (let i = 0; i < KEY_UNITS; i++) {
            const slot = i % BLOCK_SIZE;
            const next = (SBOX[pos] + roundKey[i]) % 100;
            pos = (100 + pos + next - state[slot]) % 100;
            state[slot] = next;
        }
    }

    const schedule = new Uint8Array(KEY_SCHEDULE_ROUNDS * BLOCK_SIZE);
    for (let r = 0; r < KEY_SCHEDULE_ROUNDS; r++) {
        round(key);
        schedule.set(state, r * BLOCK_SIZE);
    }
    const messageKey = new Uint8Array(KEY_UNITS);
    for (let i = 0; i < KEY_UNITS; i++) messageKey[i] = (key[i] + schedule[i]) % 100;

    const blocks = Math.ceil(length / BLOCK_SIZE);
    const out = new Uint8Array(blocks * BLOCK_SIZE);
    for (let b = 0; b < blocks; b++) {
        round(messageKey);
        out.set(state, b * BLOCK_SIZE);
    }
    return out.slice(0, length);
}

const subtractDigitwise = (k: number, x: number): number =>
    ((10 + Math.floor(k / 10) - Math.floor(x / 10)) % 10) * 10 + ((10 + (k % 10) - (x % 10)) % 10);

/** "Angstrem-3" cipher */
export class Angstrem3 {
    private readonly key: Uint8Array;
    private readonly codec: MessageCodec;

    /**
     * @param key Long-term key (bytes or string form)
     * @param groupN Length of ciphertext group
     */
    constructor(key: Uint8Array | string, groupN: number = 5) {
        if (typeof key === "string")
            key = Key.fromString(key);
        if (key.length !== KEY_LENGTH)
            throw new Error(`Wrong key length. Expected ${KEY_LENGTH}, got ${key.length}`);
        this.key = Uint8Array.from(key);
        this.codec = new MessageCodec(groupN);
    }

    private crypt(mrk: Uint8Array, input: Uint8Array): Uint8Array {
        const ks = keystream(this.key, mrk, input.length);
        return Uint8Array.from(input, (x, i) => subtractDigitwise(ks[i], x));
    }

    /**
     * Encryption operation
     * @param data Plaintext (text, or digits in numeric mode)
     * @param opts Encryption options
     */
    encrypt(data: string, { mrk = randomUnits(MRK_LENGTH), mode = Mode.Alphanumeric }: EncryptOptions = {}): string {
        const plain = mode === Mode.Numeric
            ? this.codec.encodeNumber(data)
            : this.codec.encodeText(data);
        return this.codec.frame(mrk, this.crypt(mrk, plain));
    }

    /**
     * Decryption operation
     * @param data Encrypted data
     * @param opts Decryption options
     */
    decrypt(data: string, { tweak = [0, 0], mode = Mode.Alphanumeric }: DecryptOptions = {}): string {
        const { mrk, cipher } = this.codec.unframe(data, tweak);
        const plain = this.codec.stripInserted(this.crypt(mrk, cipher), tweak);
        return mode === Mode.Numeric
            ? this.codec.decodeNumber(plain)
            : this.codec.decodeText(plain);
    }

    /**
     * Calculate MAC
     * @param digits Input digits
     */
    mac(digits: string): string {
        if (digits.length === 0 || !isDigits(digits))
            throw new Error("MAC input must be a non-empty string of digits");

        let block: Uint8Array = new Uint8Array(MRK_LENGTH);
        for (const part of chunk(digits, 10))
            block = this.crypt(digitsToUnits(part.padEnd(10, "0")), block);
        return unitsToDigits(block);
    }
}