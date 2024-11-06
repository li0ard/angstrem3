import { charset, checksum, fromString2, fromString, getRandomInt, mrkToStr, prepare_ctext, stream } from "./utils";

/**
 * @hideconstructor
 */
export class Key {
    /**
     * Long-term key (DKL/ДКЛ) generation
     * @returns {Uint8Array}
     */
    static generate(): Uint8Array {
        let key = Uint8Array.from({length: 50}, () => getRandomInt(0, 98)),
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

    constructor(key: Uint8Array | string) {
        if(typeof key == "string") {
            key = Key.fromString(key)
        }
        this.key = key
    }

    /**
     * Decrypt text
     * @param ctext ciphertext
     * @param tweak optional
     * @returns {string}
     */
    decrypt(ctext: string, tweak: number[] = [0,0]): string {
        let [mrk, ctext2] = prepare_ctext(ctext)

        let s = stream(mrk, this.key, Math.ceil(ctext2.length / 10)),
            ptext = '',
            output_raw = new Uint8Array(ctext2.length);
        
        for(let i = 0; i < ctext2.length; i++) {
            output_raw[i] = (10 + Math.floor(s[i] / 10) - Math.floor(ctext2[i] / 10)) % 10 * 10
            output_raw[i] += (10 + s[i] % 10 - ctext2[i] % 10) % 10
            ptext += charset[output_raw[i]]
        }

        let index = tweak[0] - 1
        if(tweak[1] < 0)  {
            ptext = ptext.slice(0, index) + ptext.slice(index + Math.ceil(-tweak[1] / 2))
        }
        return ptext
    }

    /**
     * Encrypt text
     * @param ptext plaintext
     * @param mrk MRK/МРК (IV). Optional
     * @param groupN Group length. Optional
     * @returns {string}
     */
    encrypt(ptext: string, mrk: Uint8Array = Uint8Array.from({length: 5}, () => getRandomInt(0, 98)), groupN: number = 5): string {
        const ctextLenWoMrk = (Math.ceil((10 + ptext.length * 2) / groupN) * groupN) - 10;
        const s = stream(mrk, this.key, Math.ceil(ctextLenWoMrk / 10));
        const ctextRawLen = Math.ceil(ctextLenWoMrk / 2);
        
        let ctext = '';

        const ptextExtended = ptext.toUpperCase().padEnd(ctextRawLen, ' ');

        for (let i = 0; i < ctextRawLen; i++) {
            let temp = charset.indexOf(ptextExtended[i]);
            if (temp === -1) {
                temp = 0;
            }

            const highDigit = (10 + Math.floor(s[i] / 10) - Math.floor(temp / 10)) % 10;
            const lowDigit = (10 + s[i] % 10 - temp % 10) % 10;

            ctext += `${highDigit}${lowDigit}`;
        }

        const regex = new RegExp(`.{1,${groupN}}`, 'g');
        return ((mrkToStr(mrk) + ctext).match(regex) as RegExpMatchArray).join(' ')
    }
}