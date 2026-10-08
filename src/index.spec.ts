import { expect, test, describe } from "bun:test";
import { Angstrem3, Mode } from ".";

const keyStr = "84534 45986 35465 64750 69746 75562 96281 96471 16889 77629 94879 96394 73073 45415 29900 39356 54944 10712 85757 23266 32131 18232";
const c = new Angstrem3(keyStr);

describe("Cipher", () => {
    test("Encrypt", () => {
        const mrk = Uint8Array.from([ 38, 4, 18, 89, 31 ]);
        const mrk2 = Uint8Array.from([ 44, 99, 43, 94, 23 ]);

        // Numeric mode
        expect(c.encrypt("0102030405", {
            mode: Mode.Numeric,
            mrk: mrk2
        })).toBe("44994 39423 00355 18566");

        // Alphanumeric mode
        expect(c.encrypt("ТЕСТ", {
            mrk: mrk
        })).toBe("38041 88931 77869 54905");
    });
    test("Decrypt", () => {
        // Numeric mode
        expect(c.decrypt("11051 66762 64268", { mode: Mode.Numeric })).toBe("123");
        
        // Alphanumeric mode
        expect(c.decrypt("7023 8033 0910 4080 7758 5613 5857 0310 7195 3198 8814 6627 9934 3228 8412 3330")).toBe("WAKE UP, ВАСЯ / КГБ HAS YOU");
    });

    test("Decrypt (+/- 1 tweak)", () => {
        // -1 tweak, Part of the ciphertext is lost
        expect(c.decrypt("87809 90512 93160 35334 13 10843 34233 22345 40949", {
            tweak: [7, -3]
        })).toBe("ШИФРАТ ANCRIPT ");

        // +1 tweak, Duplication of ciphertext digits
        expect(c.decrypt("87809 90512 93160 3530 35334 13316 10843 34233 22345 40949", {
            tweak: [5, 4]
        })).toBe("ШИФРАТОР ANCRIPT ");
    });

    test("Simple MAC", () => expect(c.mac("12345678902222222222")).toBe("1988480621"));
});