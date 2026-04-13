import { Angstrem3Core } from './core.js';
import { MessageCodec, type CipherMode } from './codec.js';
import { Key } from './key.js';
import { randomBytes } from './utils.js';

/** Cipher options */
export interface CipherOptions {
    /** Encryption mode */
    mode?: CipherMode;
    /** Tweak options: [byte_position (1-based), number_of_digits] */
    tweak?: [number, number];
    /** Markant */
    mrk?: Uint8Array;
}

/** Angstrem3 algorithm */
export class Angstrem3 {
    private readonly core: Angstrem3Core;
    private readonly codec: MessageCodec;

    /**
     * Angstrem3 algorithm
     * @param key Long-term key
     * @param groupSize Length of ciphertext group
     */
    constructor(key: Uint8Array | string, public readonly groupSize: number = 5) {
        if(typeof key == "string") key = Key.fromString(key);

        this.core = new Angstrem3Core(key);
        this.codec = new MessageCodec(groupSize);
    }

    /** Encrypt data */
    encrypt(data: string, opts: CipherOptions = {}): string {
        const mode = opts.mode || 'alphanumeric';
        const mrk = opts.mrk || randomBytes(5);

        const cleanData = mode === 'numeric' ? data.replace(/\D/g, '') : data;
        const baseLen = mode === 'numeric' ? Math.ceil(cleanData.length / 2) : cleanData.length;

        const targetBytes = this.codec.calculateCipherLength(baseLen);

        const plainBuf = this.codec.encode(cleanData, mode, targetBytes);
        const cipherBuf = this.core.encrypt(plainBuf, mrk);
        return this.codec.format(this.codec.prependMrk(cipherBuf, mrk));
    }

    /** Decrypt data */
    decrypt(data: string, opts: CipherOptions = {}): string {
        const mode = opts.mode || 'alphanumeric';
        const tweak: [number, number] = opts.tweak || [0, 0];

        let rawDigits = data.replaceAll(' ', '');
        if (tweak[1] !== 0) {
            const idx = (tweak[0] - 1) * 2 + 10;
            if (tweak[1] < 0) rawDigits = rawDigits.slice(0, idx) + '0'.repeat(-tweak[1]) + rawDigits.slice(idx);
            else rawDigits = rawDigits.slice(0, idx) + rawDigits.slice(idx + tweak[1]);
            
            if (rawDigits.length % 2 !== 0) rawDigits = rawDigits.slice(0, -1);
        }

        const fullBuf = this.codec.parse(rawDigits);
        const { mrk, payload } = this.codec.extractMrk(fullBuf);

        const plainBuf = this.core.decrypt(payload, mrk);

        let result = this.codec.decode(plainBuf, mode);
        if (tweak[1] < 0) {
            const charIdx = tweak[0] - 1;
            const charsToRemove = Math.ceil(-tweak[1] / 2);
            result = result.slice(0, charIdx) + result.slice(charIdx + charsToRemove);
        }

        return result;
    }

    /** Compute simple MAC (for numbers only) */
    mac(text: string): string {
        const chunks = text.match(/.{1,10}/g)?.map(c => c.padEnd(10, '0')) || [];
        let block = '0000000000';

        for (const chunk of chunks) {
            block = this.decrypt(`${chunk}${block}`, { mode: 'numeric' });
            block = block.padEnd(10, '0').slice(0, 10);
        }

        return block;
    }
}

export { Key } from "./key.js";