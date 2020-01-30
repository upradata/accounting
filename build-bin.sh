#!/usr/bin/env bash
mkdir -p .bin

for f in $(find dist -name '*.command.js'); do
    ln -sf $(realpath $f) .bin/accounting-$(basename "$f" .command.js)
    chmod +x $f
done

chmod +x -R .bin
