import { Angstrem3Core } from "./core.js";
import { concatBytes, randomBytes } from "./utils.js";

/** Key utils class */
export class Key {
    private static readonly CS_MASK = [1, 0, 7, 5, 3, 2, 9, 8, 4, 6];
    private static readonly CHECKSUM_MRK = Uint8Array.from([0x4A, 0x38, 0x0E, 0x21, 0x09]);

    /** Generate new long-term key */
    static generate(): Uint8Array {
        const key = randomBytes(50);
        
        return concatBytes(key, this.computeChecksum(key));
    }

    /** Serialize key to string */
    static toString(key: Uint8Array): string {
        if (key.length !== 60) throw new Error(`Wrong key length. Expected 60, got ${key.length}`);
        
        let s = "";
        for (let i = 0; i < 50; i++) s += key[i].toString().padStart(2, "0");
        for (let i = 50; i < 60; i++) s += key[i].toString();

        return s.match(/.{1,5}/g)!.join(" ");
    }

    /** Parse long-term key from string */
    static fromString(str: string): Uint8Array {
        const temp = str.replaceAll(' ', '');
        if (temp.length !== 110) throw new Error(`Wrong key length. Expected 110, got ${temp.length}`);

        const key = this.parseKeyPart(temp.slice(0, 100));
        const csIn = this.parseChecksumPart(temp.slice(100, 110));
        if(!this.arraysEqual(csIn, this.computeChecksum(key))) console.warn("[Key.fromString] Key has incorrect checksum");

        return concatBytes(key, csIn);
    }

    private static computeChecksum(key: Uint8Array): Uint8Array {
        const csRaw = Angstrem3Core.generateKeystream(this.CHECKSUM_MRK, key, 1).slice(0, 5);
        const cs = new Uint8Array(10);

        for (let i = 0; i < 5; i++) {
            cs[i * 2] = (10 + Math.floor(csRaw[i] / 10) - this.CS_MASK[i * 2]) % 10;
            cs[i * 2 + 1] = (10 + csRaw[i] % 10 - this.CS_MASK[i * 2 + 1]) % 10;
        }
        return cs;
    }

    private static parseKeyPart(str: string): Uint8Array {
        const hexPairs = str.match(/.{1,2}/g) || [];
        return Uint8Array.from(hexPairs.map(pair => {
            const hexVal = parseInt(pair, 16);
            return (Math.floor(hexVal / 16) * 10) + (hexVal % 16);
        }));
    }

    private static parseChecksumPart(str: string): Uint8Array {
        return Uint8Array.from([...str].map(c => parseInt(c, 10)));
    }

    private static arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return true;
    }
}