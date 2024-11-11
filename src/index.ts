import { charset, checksum, fromString2, fromString, mrkToStr, prepare_ctext, stream, type DecryptOptions, type EncryptOptions, reverseStr, randomBytes } from "./utils";

/**
 * @hideconstructor
 */
export class Key {
    /**
     * Long-term key (DKL/ДКЛ) generation
     * @returns {Uint8Array}
     */
    static generate(): Uint8Array {
        let key = randomBytes(50),
            cs = checksum(key);

        let result = new Uint8Array(key.length+cs.length)
        result.set(key)
        result.set(cs, key.length)

        return result
    }

    /**
     * Serialize key to string
     * @param key long-term key
     * @returns {string}
     */
    static toString(key: Uint8Array): string {
        if(key.length != 60) throw new Error(`Wrong key length. Expected 60, got ${key.length}`);

        let s = ""

        for(let i = 0; i < 50; i++) {
            s += key[i].toString().padStart(2, "0")
        }
        for(let i = 50; i < 60; i++) {
            s += key[i].toString()
        }
    
        return s.match(/.{1,5}/g)?.join(" ") as string
    }

    /**
     * Parse long-term key to string
     * @param str serialized key
     * @returns {Uint8Array}
     */
    static fromString(str: string): Uint8Array {
        let temp = str.replaceAll(' ', '')
        if(temp.length != 110) throw new Error(`Wrong key length. Expected 110, got ${temp.length}`);

        let key = fromString(temp.slice(0, 100))
        let cs_in = fromString2(temp.slice(100, 110))
        if(cs_in.toString() != checksum(key).toString()) console.warn("CRC error");

        let result = new Uint8Array(key.length+cs_in.length)
        result.set(key)
        result.set(cs_in, key.length)

        return result
    }
}

/**
 * Cipher class
 */
export class Cipher {
    key: Uint8Array
    groupN: number

    constructor(key: Uint8Array | string, groupN: number = 5) {
        if(typeof key == "string") {
            key = Key.fromString(key)
        }
        this.key = key
        this.groupN = groupN
    }

    /**
     * Decrypt text
     * @param ctextWithMrk ciphertext
     * @param opts Decryption options
     * @returns {string}
     */
    decrypt(ctextWithMrk: string, opts: DecryptOptions = {}): string {
        //opts.tweak = opts.tweak || [0,0]
        opts.mode = opts.mode || 1
        let [mrk, ctext] = prepare_ctext(ctextWithMrk)

        let sessionKey = stream(mrk, this.key, Math.ceil(ctext.length / 10)).slice(0,  ctext.length),
            ptext = '',
            output_raw = new Uint8Array(ctext.length);
        
        for(let i = 0; i < ctext.length; i++) {
            output_raw[i] = (10 + Math.floor(sessionKey[i] / 10) - Math.floor(ctext[i] / 10)) % 10 * 10
            output_raw[i] += (10 + sessionKey[i] % 10 - ctext[i] % 10) % 10
            ptext += charset[output_raw[i]]
        }

        /*let index = opts.tweak[0] - 1
        if(opts.tweak[1] < 0)  {
            ptext = ptext.slice(0, index) + ptext.slice(index + Math.ceil(-opts.tweak[1] / 2))
        }*/
        if(opts.mode == 1) {
            return ptext
        } else {
            return reverseStr(parseInt(reverseStr(Array.from(output_raw).map(i => i.toString().padStart(2, "0")).join(""))).toString())
        }
    }

    /**
     * Encrypt text
     * @param ptext plaintext
     * @param opts Encryption options
     * @returns {string}
     */
    encrypt(ptext: string, opts: EncryptOptions = {}): string {
        opts.mrk = opts.mrk || randomBytes(5)
        opts.mode = opts.mode || 1
        const ctextLenWoMrk = (Math.ceil((10 + ptext.length * 2) / this.groupN) * this.groupN) - 10;
        const sessionKey = stream(opts.mrk, this.key, Math.ceil(ctextLenWoMrk / 10)).slice(0, ctextLenWoMrk);
        const ctextRawLen = Math.ceil(ctextLenWoMrk / 2);
        
        let ctext = '';

        const ptextExtended = ptext.toUpperCase().padEnd(ctextRawLen, ' ');
        const pTextRaw = fromString(ptext.padEnd(ctextRawLen, '0'))

        for (let i = 0; i < (opts.mode == 1 ? ctextRawLen : pTextRaw.length); i++) {
            let temp = opts.mode == 1 ? charset.indexOf(ptextExtended[i]) : pTextRaw[i];
            if (temp === -1) {
                temp = 0;
            }

            const highDigit = (10 + Math.floor(sessionKey[i] / 10) - Math.floor(temp / 10)) % 10;
            const lowDigit = (10 + sessionKey[i] % 10 - temp % 10) % 10;

            ctext += `${highDigit}${lowDigit}`;
        }

        const regex = new RegExp(`.{1,${this.groupN}}`, 'g');
        return ((mrkToStr(opts.mrk) + ctext).match(regex) as RegExpMatchArray).join(' ')
    }
}