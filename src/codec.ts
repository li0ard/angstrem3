import { charset, concatBytes } from "./utils.js";

export type CipherMode = 'alphanumeric' | 'numeric';

export interface CodecOptions {
    groupSize?: number;
}

export class MessageCodec {
    constructor(public readonly groupSize: number = 5) {}

    encode(text: string, mode: CipherMode, targetLength?: number): Uint8Array {
        return mode === 'numeric' 
            ? this.encodeNumeric(text, targetLength)
            : this.encodeAlphanumeric(text, targetLength);
    }

    decode(buffer: Uint8Array, mode: CipherMode, originalLength?: number): string {
        return mode === 'numeric'
            ? this.decodeNumeric(buffer, originalLength)
            : this.decodeAlphanumeric(buffer, originalLength);
    }

    private encodeAlphanumeric(text: string, padTo?: number): Uint8Array {
        const buffer = Uint8Array.from(text.toUpperCase().split('').map(ch => {
            const idx = charset.indexOf(ch);
            return idx === -1 ? 0 : idx;
        }));
        
        if (padTo !== undefined && buffer.length < padTo) {
            const padded = new Uint8Array(padTo);
            padded.set(buffer);
            padded.fill(0, buffer.length);
            return padded;
        }
        return buffer;
    }

    private decodeAlphanumeric(buffer: Uint8Array, trimLength?: number): string {
        const limit = trimLength ?? buffer.length;
        return Array.from(buffer.slice(0, limit))
            .map(b => charset[b % 100])
            .join('')
            .trimEnd();
    }

    private encodeNumeric(text: string, padTo?: number): Uint8Array {
        const digits = text.replace(/\D/g, '');
        const padded = digits.length % 2 === 1 ? digits + '0' : digits;
        
        const buffer = Uint8Array.from(
            (padded.match(/.{1,2}/g) || []).map(pair => parseInt(pair, 10))
        );
        
        if (padTo !== undefined && buffer.length < padTo) {
            const result = new Uint8Array(padTo);
            result.set(buffer);
            result.fill(0, buffer.length);
            return result;
        }
        return buffer;
    }

    private decodeNumeric(buffer: Uint8Array, trimLength?: number): string {
        const limit = trimLength ?? buffer.length;
        const digitPairs = Array.from(buffer.slice(0, limit))
            .map(b => (b % 100).toString().padStart(2, '0'));
        
        let result = digitPairs.join('');
        
        result = result.replace(/0+$/, '') || '0';
        return result;
    }

    prependMrk(payload: Uint8Array, mrk: Uint8Array): Uint8Array {
        if (mrk.length !== 5) throw new Error(`MRK must be 5 bytes`);

        return concatBytes(mrk, payload);
    }

    extractMrk(data: Uint8Array): { mrk: Uint8Array; payload: Uint8Array } {
        if (data.length < 5) throw new Error("Data too short for MRK");
        return { mrk: data.slice(0, 5), payload: data.slice(5) }
    }

    format(buffer: Uint8Array): string {
        const digits = Array.from(buffer)
            .map(b => (b % 100).toString().padStart(2, '0'))
            .join('');
        return digits.match(new RegExp(`.{1,${this.groupSize}}`, 'g'))?.join(' ') || digits;
    }

    parse(formatted: string): Uint8Array {
        const digits = formatted.replaceAll(' ', '');
        const normalized = digits.length % 2 === 1 ? digits.slice(0, -1) : digits;
        return Uint8Array.from(
            (normalized.match(/.{1,2}/g) || []).map(pair => parseInt(pair, 10))
        );
    }

    calculateCipherLength(plaintextLen: number): number {
        const ctextLenWoMrk = (Math.ceil((10 + plaintextLen * 2) / this.groupSize) * this.groupSize) - 10;
        return Math.ceil(ctextLenWoMrk / 2);
    }
}

