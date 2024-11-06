![](https://mk.bs0dd.net/mk85c/mk85cf.jpg)

## RUS:

Реализация алгоритма "Ангстрем-3" для Электроники МК-85С на TypeScript

### Установка
```bash
npm i @li0ard/angstrem3
```

### Пример
```ts
import { Cipher, Key } from "@li0ard/angstrem3";

const key = Key.fromString("84534 45986 35465 64750 69746 75562 96281 96471 16889 77629 94879 96394 73073 45415 29900 39356 54944 10712 85757 23266 32131 18232");

const c = new Cipher(key)
const enc = c.encrypt("ТЕСТ")
console.log(enc) // => 38041 88931 77869 54905
console.log(c.decrypt(enc)) // => ТЕСТ
```

## ENG:

Implementation of the Angstrem-3 algorithm for Elektronika MK-85C in TypeScript

### Install
```bash
npm i @li0ard/angstrem3
```

### Example
```ts
import { Cipher, Key } from "@li0ard/angstrem3";

const key = Key.fromString("84534 45986 35465 64750 69746 75562 96281 96471 16889 77629 94879 96394 73073 45415 29900 39356 54944 10712 85757 23266 32131 18232");

const c = new Cipher(key)
const enc = c.encrypt("ТЕСТ")
console.log(enc) // => 38041 88931 77869 54905
console.log(c.decrypt(enc)) // => ТЕСТ
```