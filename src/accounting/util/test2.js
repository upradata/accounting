/* const p = new Promise((resolve, reject) => {
    setTimeout(() => {
        const r = Math.random() < 0.5;
        r ? resolve(r) : reject(r);
    }, 1000)
});



p.then(r => console.log(r)).catch(console.log);

console.log('caca');

async function f() {
    try {
        const r = await p;
        console.log(r);
    } catch (r) {
        console.log(r);
    }
}

setTimeout(() => {
    p.then(r => console.log(r)).catch(console.log);
}, 3000);

f();
 */

/*
const f = (keyLeft, keyRight) => {
    if (keyLeft === keyRight) return 0;
    const [k1, k2] = [keyLeft, keyRight].sort();
    return k1 === keyLeft ? -1 : 1;
}

console.log(f(1, 2));
console.log(f(2, 1));
console.log(f('1', '2'));
console.log(f('2', '1'));
console.log(f('a', 'b'));
console.log(f('A', 'a'));
console.log(f('b', 'a')); */

const wait = ms => new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve('Ok');
    }, ms)
});

async function g() {
    await wait(2000);
    return 'caca';
}

async function g2() {
    await wait(2000);
    console.log('caca2');
}

async function f() {
    await wait(1000);
    console.log(await g());
    await wait(1000);
    await g2();
    await wait(2000);
    console.log('pipi');
}

f();
console.log('POPO');
