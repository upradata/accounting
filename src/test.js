const { Writable, Readable } = require('stream');
const { StringDecoder } = require('string_decoder');

class StringWritable extends Writable {
    constructor(options) {
        super(options);
        this._decoder = new StringDecoder(options && options.defaultEncoding);
        this.data = '';
    }
    _write(chunk, encoding, callback) {
        if (encoding === 'buffer') {
            chunk = this._decoder.write(chunk);
        }
        this.data += chunk;
        callback();
    }
    _final(callback) {
        this.data += this._decoder.end();
        console.log(this.data);
        callback();
    }
}

const euro = [[0xE2, 0x82], [0xAC]].map(Buffer.from);
const w = new StringWritable();

w.write('currency: ');
/* w.write(euro[0]);
w.end(euro[1]);
 */
console.log(w.data); // currency: €


class Counter extends Readable {
    constructor(options) {
        super(options);
        this._index = 0;
        this._max = 10;
    }

    _read() {
        const i = this._index++;
        if (i > this._max)
            this.push(null);
        else {
            const str = String(i);
            const buf = Buffer.from(str, 'ascii');
            this.push(buf);
        }
    }
}


new Counter().pipe(new StringWritable());
