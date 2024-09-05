#!/usr/bin/env bash
mkdir -p .bin

# for f in $(find dist -name '*.command.js'); do
#   ln -sf $(realpath $f) .bin/accounting-$(basename "$f" .command.js)
#   chmod +x $f
# done

PROGRAM=$(realpath dist/program.command.js)
PROGRAM_NAME=mt-accounting

ln -sf $PROGRAM .bin/$PROGRAM_NAME
chmod +x $PROGRAM
chmod +x -R .bin

## One command to remember how to use it :)

COMMAND_FILE=.bin/$PROGRAM_NAME-example

echo "#!/usr/bin/env bash" >$COMMAND_FILE
echo "# Example $PROGRAM_NAME --exercise-start 01022019 --data-directory . -F --edit --edit-short --edit-type console --edit-type csv --output-dir Output" >>$COMMAND_FILE
echo "# Do not forget to run unix2dos Output/801265372FEC20200301.txt to import it on Windows in Oxygene" >>$COMMAND_FILE
echo >>$COMMAND_FILE

echo "$PROGRAM_NAME --exercise-start 01022023 --data-directory data --fec-only-non-imported --edit --edit-short --editters csv,console --output-dir Output" >>$COMMAND_FILE
