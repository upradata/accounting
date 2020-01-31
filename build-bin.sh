#!/usr/bin/env bash
mkdir -p .bin

for f in $(find dist -name '*.command.js'); do
    ln -sf $(realpath $f) .bin/accounting-$(basename "$f" .command.js)
    chmod +x $f
done

chmod +x -R .bin

## One command to remember how to use it :)

COMMAND_FILE=.bin/accounting-edit-fec

echo "#!/usr/bin/env bash" >$COMMAND_FILE
echo "# Example accounting-program --exercise-start 01022019 --data-directory . -F --edit --edit-short --edit-type console --edit-type csv --output-dir Output" >>$COMMAND_FILE
echo "# Do not forget to run unix2dos Output/801265372FEC20200301.txt to import it on Windows in Oxygene" >>$COMMAND_FILE
echo >>$COMMAND_FILE

echo 'accounting-program --exercise-start $1 --data-directory $2 --fec-only-non-imported --edit --edit-short --edit-type console --edit-type csv --output-dir $3' >>$COMMAND_FILE
