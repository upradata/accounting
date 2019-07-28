node ods-to-xlsx.js -i ../data/comptabilite.ods 
node ods-to-xlsx.js --input ../data/comptabilite.ods --output outdir

node xlsx-to-csv.js -i comptabilite.xlsx -n Depenses
node xlsx-to-csv.js --input comptabilite.xlsx --sheet-name Depenses --output example.csv --output-dir out

node ods-to-csv.js -i ../data/comptabilite.ods -n Depenses
node ods-to-csv.js --input ../data/comptabilite.ods --sheet-name Depenses
node ods-to-csv.js --input ../data/comptabilite.ods --sheet-name Depenses --output example.csv --output-dir out
