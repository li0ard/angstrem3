import { arraySum, concatBytes, sbox } from "./utils.js";

export type Byte99 = number;
export class Angstrem3Core {
    private readonly key: Uint8Array;

    constructor(key: Uint8Array) {
        if (key.length < 50) throw new Error("Key must be at least 50 bytes");
        this.key = Uint8Array.from(key.slice(0, 50), b => b % 100);
    }

    static generateKeystream(mrk: Uint8Array, key: Uint8Array, blocks: number): Uint8Array {
        if (mrk.length !== 5) throw new Error("MRK must be 5 bytes");
        
        let buffer = concatBytes(mrk, mrk);
        let eround = arraySum(buffer) % 100;
        
        const elementaryRound = (
            data: Uint8Array, 
            k: Uint8Array, 
            offset: number, 
            state: { eround: number }
        ): Uint8Array => {
            const R0 = (sbox[state.eround] + k[offset % 50]) % 100;
            const R2 = data[offset % 10];
            state.eround = (100 + state.eround + R0 - R2) % 100;
            data[offset % 10] = R0;
            return data;
        };

        const fullRound = (data: Uint8Array, k: Uint8Array, state: { eround: number }): Uint8Array => {
            for (let i = 0; i < 50; i++) elementaryRound(data, k, i, state);
            return data;
        };

        const state = { eround };
        let temp = new Uint8Array(60);
        for (let i = 0; i < 6; i++) {
            buffer = fullRound(buffer, key, state);
            temp.set(buffer, i * 10);
        }

        const newKey = Uint8Array.from({ length: 50 }, (_, i) => (key[i] + temp[i]) % 100);
        const output = new Uint8Array(blocks * 10);
        for (let i = 0; i < blocks; i++) {
            buffer = fullRound(buffer, newKey, state);
            output.set(buffer, i * 10);
        }

        return output;
    }

    static encryptByte(keystream: Byte99, plaintext: Byte99): Byte99 {
        const [kH, kL] = [Math.floor(keystream / 10), keystream % 10];
        const [pH, pL] = [Math.floor(plaintext / 10), plaintext % 10];
        return ((10 + kH - pH) % 10) * 10 + (10 + kL - pL) % 10;
    }

    static decryptByte(keystream: Byte99, ciphertext: Byte99): Byte99 {
        const [kH, kL] = [Math.floor(keystream / 10), keystream % 10];
        const [cH, cL] = [Math.floor(ciphertext / 10), ciphertext % 10];
        return ((10 + kH - cH) % 10) * 10 + (10 + kL - cL) % 10;
    }

    encrypt(plaintext: Uint8Array, mrk: Uint8Array): Uint8Array {
        if (mrk.length !== 5) throw new Error("MRK must be 5 bytes");
        const keystream = Angstrem3Core.generateKeystream(mrk, this.key, Math.ceil(plaintext.length / 10));
        return Uint8Array.from({ length: plaintext.length }, (_, i) =>
            Angstrem3Core.encryptByte(keystream[i], plaintext[i])
        );
    }

    decrypt(ciphertext: Uint8Array, mrk: Uint8Array): Uint8Array {
        if (mrk.length !== 5) throw new Error("MRK must be 5 bytes");
        const keystream = Angstrem3Core.generateKeystream(mrk, this.key, Math.ceil(ciphertext.length / 10));
        return Uint8Array.from({ length: ciphertext.length }, (_, i) =>
            Angstrem3Core.decryptByte(keystream[i], ciphertext[i])
        );
    }
}
