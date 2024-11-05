export const fromString = (hexString: string): Uint8Array => {
    let temp = Uint8Array.from((hexString.match(/.{1,2}/g) as RegExpMatchArray).map((byte) => parseInt(byte, 16)))

    for(let i of [...Array(temp.length).keys()]) {
        temp[i] = (Math.floor(temp[i] / 16) * 10) + temp[i] % 16
    }

    return temp
}

export const fromString2 = (str: string) => {
    let temp = new Uint8Array(str.length)

    for(let i of [...Array(temp.length).keys()]) {
        temp[i] = parseInt(str[i])
    }

    return temp
}

export const charset = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[Ъ]…ЁЮАБЦДЕФГХИЙКЛМНОПЯРСТУЖВЬЫЗШЭЩЧ█    '

const sbox = [
    0x06, 0x0E, 0x28, 0x42, 0x56, 0x08, 0x52, 0x55, 0x4D, 0x44,
    0x43, 0x02, 0x1A, 0x17, 0x35, 0x33, 0x61, 0x46, 0x30, 0x39,
    0x3A, 0x25, 0x18, 0x0B, 0x00, 0x4A, 0x10, 0x51, 0x5F, 0x34,
    0x21, 0x2D, 0x2B, 0x5A, 0x57, 0x3E, 0x3F, 0x11, 0x49, 0x63,
    0x09, 0x26, 0x23, 0x07, 0x4E, 0x32, 0x22, 0x2E, 0x48, 0x03,
    0x01, 0x0D, 0x13, 0x0F, 0x3B, 0x59, 0x41, 0x62, 0x2C, 0x36,
    0x40, 0x1F, 0x5B, 0x0C, 0x47, 0x53, 0x3C, 0x20, 0x60, 0x4C,
    0x14, 0x50, 0x1B, 0x04, 0x5E, 0x24, 0x3D, 0x5D, 0x27, 0x0A,
    0x5C, 0x31, 0x2A, 0x58, 0x37, 0x2F, 0x12, 0x4F, 0x1E, 0x29,
    0x05, 0x38, 0x1C, 0x45, 0x16, 0x19, 0x1D, 0x54, 0x15, 0x4B
];

let eround = 0;

export const getRandomInt = (min: number, max: number): number => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const elementary_round = (data: Uint8Array, key: Uint8Array, offset: number): Uint8Array => {
    let R0 = (sbox[eround] + key[offset]) % 100
    let R2 = data[offset % 10]
    eround = (100 + eround + R0 - R2) % 100
    data[offset % 10] = R0

    return data
}

export const full_round = (data: Uint8Array, key: Uint8Array): Uint8Array => {
    for (let i of [...Array(50).keys()]) {
        data = elementary_round(data, key, i)
    }

    return data
}

export const sum_digsb = (bu: Uint8Array): number => {
    let retv = 0
    for (let i of [...Array(bu.length).keys()]) {
        retv += bu[i]
    }

    return retv
}

export const arcop = (into: Uint8Array, from_list: Uint8Array, ipos: number): Uint8Array => {
    for (let i of [...Array(from_list.length).keys()]) {
        into[i + ipos] = from_list[i]
    }

    return into
}

export const stream = (mrk: Uint8Array, key: Uint8Array, blocks_n: number): Uint8Array => {
    let buffer = new Uint8Array(10).fill(0)
    buffer = arcop(buffer, mrk, 0)
    buffer = arcop(buffer, mrk, 5)

    eround = sum_digsb(buffer) % 100

    let temp = new Uint8Array(60).fill(0)

    for (let i of [...Array(6).keys()]) {
        buffer = full_round(buffer, key)
        temp = arcop(temp, buffer, i * 10)
    }

    let new_key = new Uint8Array(50).fill(0)

    for (let i of [...Array(50).keys()]) {
        new_key[i] = (key[i] + temp[i]) % 100
    }

    let temp2 = new Uint8Array((blocks_n * 10)).fill(0)

    for (let i of [...Array(blocks_n).keys()]) {
        buffer = full_round(buffer, new_key)
        temp2 = arcop(temp2, buffer, i * 10)
    }

    return temp2
}

export const checksum = (key: Uint8Array): Uint8Array => {
    let cs_mask = [1, 0, 7, 5, 3, 2, 9, 8, 4, 6],
        mrk = Uint8Array.from([0x4A, 0x38, 0x0E, 0x21, 0x09]);

    let cs_raw = stream(mrk, key, 1)
    let cs = new Uint8Array(10).fill(0)

    for (let i of [...Array(5).keys()]) {
        cs[i * 2] = (10 + Math.floor(cs_raw[i] / 10) - cs_mask[i * 2]) % 10
        cs[i * 2 + 1] = (10 + cs_raw[i] % 10 - cs_mask[i * 2 + 1]) % 10
    }

    return cs
}


export const prepare_ctext = (str: string, tweak: number[] = [0,0]) => {
    let temp = str.replaceAll(" ", "")

    let index = (tweak[0] - 1) * 2 + 10

    if (tweak[1] < 0) {
        temp = temp.slice(0, index).padEnd((-tweak[1]), "0") + temp.slice(index)
    }
    if (tweak[1] > 0) {
        temp =  temp.slice(0, index) + temp.slice(index + tweak[1])
    }

    if(temp.length % 2 != 0) {
        temp.slice(0, temp.length-1)
    }

    let mrk = fromString(temp.slice(0,10))
    let ctext = fromString(temp.slice(10))

    return [mrk, ctext]
}


export function mrkToStr(mrk: Uint8Array): string {
    if (mrk.length !== 5) {
        throw new Error(`Wrong raw mrk length! Got ${mrk.length}, must be 5.`);
    }

    let outString = '';

    for (let i = 0; i < 5; i++) {
        outString += String(mrk[i]).padStart(2, '0');
    }

    return outString;
}

export const wrapText = (text: string, groupN: number): string => {
    const regex = new RegExp(`.{1,${groupN}}`, 'g');
    return text.match(regex)?.join(' ') || '';
}