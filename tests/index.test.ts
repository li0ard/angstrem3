import { expect, test, describe } from "bun:test";
import { Cipher, Key } from "../src";

let keyStr = "84534 45986 35465 64750 69746 75562 96281 96471 16889 77629 94879 96394 73073 45415 29900 39356 54944 10712 85757 23266 32131 18232"
let keyArr = Uint8Array.from([ 84, 53, 44, 59, 86, 35, 46, 56, 47, 50, 69, 74, 67, 55, 62, 96, 28, 19, 64, 71, 16, 88, 97, 76, 29, 94, 87, 99, 63, 94, 73, 7, 34, 54, 15, 29, 90, 3, 93, 56, 54, 94, 41, 7, 12, 85, 75, 72, 32, 66, 3, 2, 1, 3, 1, 1, 8, 2, 3, 2 ])

describe("Keys", () => {
    test("toString", () => {
        expect(Key.toString(keyArr)).toBe(keyStr)
    })

    test("fromString", () => {
        expect(Key.fromString(keyStr).toString()).toBe(keyArr.toString())
    })
})

describe("Cipher", () => {
    let c = new Cipher(keyArr)
    test("Encrypt", () => {
        let mrk = Uint8Array.from([ 38, 4, 18, 89, 31 ]);
        let mrk2 = Uint8Array.from([ 44, 99, 43, 94, 23 ])

        // Numeric mode
        expect(c.encrypt("0102030405", {
            mode: 2,
            mrk: mrk2
        })).toBe("44994 39423 00355 18566")

        // Alphanumeric mode
        expect(c.encrypt("ТЕСТ", {
            mrk: mrk
        })).toBe("38041 88931 77869 54905")
    })
    test("Decrypt", () => {
        // Numeric mode
        expect(c.decrypt("11051 66762 64268", { mode: 2 })).toBe("123")
        
        // Alphanumeric mode
        expect(c.decrypt("7023 8033 0910 4080 7758 5613 5857 0310 7195 3198 8814 6627 9934 3228 8412 3330").trim()).toBe("WAKE UP, ВАСЯ / КГБ HAS YOU")
    })

    test("Decrypt (+/- 1 tweak)", () => {
        // -1 tweak
        expect(c.decrypt("87809 90512 93160 35334 13 10843 34233 22345 40949", {
            tweak: [7, -3]
        })).toBe("ШИФРАТ ANCRIPT ")

        // +1 tweak
        expect(c.decrypt("87809 90512 93160 3530 35334 13316 10843 34233 22345 40949", {
            tweak: [5, 4]
        })).toBe("ШИФРАТОР ANCRIPT ")
    })
})