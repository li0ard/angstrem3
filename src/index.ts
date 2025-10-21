import { charset, checksum, fromString2, fromString, mrkToStr, prepare_ctext, type DecryptOptions, type EncryptOptions, reverseStr, randomBytes, stream, concatBytes } from "./utils";

/**
 * Key utils class
 * @hideconstructor
 */
export class Key {
    /**
     * Generate new long-term key
     * @returns {Uint8Array}
     */
    static generate(): Uint8Array {
        const key = randomBytes(50);
        return concatBytes(key, checksum(key));
    }

    /**
     * Serialize key to string
     * @param key long-term key
     * @returns {string}
     */
    static toString(key: Uint8Array): string {
        if(key.length != 60) throw new Error(`Wrong key length. Expected 60, got ${key.length}`);
        let s = "";
        for(let i = 0; i < 50; i++) s += key[i].toString().padStart(2, "0");
        for(let i = 50; i < 60; i++) s += key[i].toString();
    
        return s.match(/.{1,5}/g)!.join(" ");
    }

    /**
     * Parse long-term key from string
     * @param str Serialized key
     * @returns {Uint8Array}
     */
    static fromString(str: string): Uint8Array {
        const temp = str.replaceAll(' ', '');
        if(temp.length != 110) throw new Error(`Wrong key length. Expected 110, got ${temp.length}`);

        const key = fromString(temp.slice(0, 100));
        const cs_in = fromString2(temp.slice(100, 110));
        if(cs_in.toString() != checksum(key).toString()) console.warn("[Key.fromString] Key has incorrect checksum");

        return concatBytes(key, cs_in);
    }
}

/**
 * Cipher class
 */
export class Cipher {
    key: Uint8Array;
    eround: number = 0;

    /**
     * Initializing cipher
     * @param key Long-term key
     * @param groupN Length of ciphertext group
     */
    constructor(key: Uint8Array | string, public groupN: number = 5) {
        if(typeof key == "string") key = Key.fromString(key);
        this.key = key;
    }

    /**
     * Decryption operation
     * @param data Encrypted data
     * @param opts Decryption options
     */
    public decrypt(data: string, opts: DecryptOptions = {}): string {
        opts.tweak ||= [0,0];
        opts.mode ||= 1;
        const [mrk, ctext] = prepare_ctext(data, opts.tweak);

        const keystream = stream(mrk, this.key, Math.ceil(ctext.length / 10)), output_raw = new Uint8Array(ctext.length);
        let ptext = '';
        
        for(let i = 0; i < ctext.length; i++) {
            output_raw[i] = (10 + Math.floor(keystream[i] / 10) - Math.floor(ctext[i] / 10)) % 10 * 10;
            output_raw[i] += (10 + keystream[i] % 10 - ctext[i] % 10) % 10;
            ptext += charset[output_raw[i]];
        }

        let index = opts.tweak[0] - 1;
        if(opts.tweak[1] < 0) ptext = ptext.slice(0, index) + ptext.slice(index + Math.ceil(-opts.tweak[1] / 2));
        if(opts.mode == 1) return ptext;
        return reverseStr(parseInt(reverseStr(Array.from(output_raw).map(i => i.toString().padStart(2, "0")).join(""))).toString());
    }

    /**
     * Encryption operation
     * @param data Plaintext
     * @param opts Encryption options
     */
    public encrypt(data: string, opts: EncryptOptions = {}): string {
        opts.mrk ||= randomBytes(5);
        opts.mode ||= 1;
        const ctextLenWoMrk = (Math.ceil((10 + data.length * 2) / this.groupN) * this.groupN) - 10;
        const keystream = stream(opts.mrk, this.key, Math.ceil(ctextLenWoMrk / 10));
        const ctextRawLen = Math.ceil(ctextLenWoMrk / 2);
        
        let ctext = '';

        const ptextExtended = data.toUpperCase().padEnd(ctextRawLen, ' ');
        const pTextRaw = fromString(data.padEnd(ctextRawLen, '0'));

        for (let i = 0; i < (opts.mode == 1 ? ctextRawLen : pTextRaw.length); i++) {
            let temp = opts.mode == 1 ? charset.indexOf(ptextExtended[i]) : pTextRaw[i];
            if (temp === -1) temp = 0;

            const highDigit = (10 + Math.floor(keystream[i] / 10) - Math.floor(temp / 10)) % 10;
            const lowDigit = (10 + keystream[i] % 10 - temp % 10) % 10;

            ctext += `${highDigit}${lowDigit}`;
        }

        return ((mrkToStr(opts.mrk) + ctext).match(new RegExp(`.{1,${this.groupN}}`, 'g')) as RegExpMatchArray).join(' ');
    }

    /**
     * Calculate MAC
     * @param text Input text
     */
    public mac(text: string): string {
        const splitted = text.match(/.{1,10}/g)?.map(i => i.padEnd(10, "0"))!;
        let block = "0000000000";
        for(let i of splitted) block = this.decrypt(`${i}${block}`, {mode: 2});
        return block;
    }
}