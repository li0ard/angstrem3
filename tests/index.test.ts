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
        expect(c.encrypt("ТЕСТ", mrk)).toBe("38041 88931 77869 54905")
    })
    test("Decrypt", () => {
        expect(c.decrypt("15855 40841 99886 93238").trim()).toBe("ТЕСТ")
    })
})