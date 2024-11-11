![](https://mk.bs0dd.net/mk85c/mk85cf.jpg)

## RUS:

Реализация алгоритма "Ангстрем-3" для Электроники МК-85С на TypeScript

### Функции
- Генерация долговременного ключа (ДКЛ)
- Поддержка буквенного и цифрового режимов

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

Большое спасибо Bs0dd, MaFrance и kaseiiro за материалы по МК-85 и алгоритму

## ENG:

Implementation of the Angstrem-3 algorithm for Elektronika MK-85C in TypeScript

### Features
- New long-term key (DKL) generation
- Support for alphanumeric and numeric modes

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

Thanks to Bs0dd, MaFrance and kaseiiro for materials on MK-85 and algorithm