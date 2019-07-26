function flattenObject(obj, mergeKey = (k1, k2) => k1 + firstLetterUpperCase(k2)) {
    const flatO = {};

    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
            const flatten = flattenObject(v, mergeKey);
            for (const [flattenK, flattenV] of Object.entries(flatten))
                flatO[mergeKey(k, flattenK)] = flattenV;
        } else
            flatO[mergeKey('', k)] = v;
    }

    if (typeof key !== 'undefined')
        return { key: firstLetterUpperCase(key), flatten: flatO };

    return flatO;
}



const firstLetterUpperCase = (s) => s[0].toUpperCase() + s.slice(1);

const o = {
    a: 1,
    b: {
        aa: 11,
        bb: 22,
        cc: {
            aaa: [111],
            bbb: 222,
            ccc: {
                aaaa: 1111,
                bbbb: 2222
            }
        },
        dd: 33
    },
    c: 2
}


console.log(flattenObject(o));
