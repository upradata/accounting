import { PartialRecursive } from '@upradata/util';
import { TableConfig } from '@upradata/node-util';
import { EditDataTableRow } from './edit.types';


const pdfConfig = {
    content: [
        { text: 'TITLE', style: 'subheader' },
        'normal text',
        {
            style: 'tableExample',
            table: {
                widths: [ 100, '*', 200, '*' ],
                body: [
                    [ 'width=100', 'star-sized', 'width=200', 'star-sized' ],
                    [ 'fixed-width cells have exactly the specified width',
                        { text: 'nothing interesting here', italics: true, color: 'gray' },
                        { text: 'nothing interesting here', italics: true, color: 'gray' },
                        { text: 'nothing interesting here', italics: true, color: 'gray' } ]
                ]
            }
        }
    ],
    styles: {
        header: {
            fontSize: 18,
            bold: true,
            margin: [ 0, 0, 0, 10 ]
        },
        subheader: {
            fontSize: 16,
            bold: true,
            margin: [ 0, 10, 0, 5 ]
        },
        tableExample: {
            margin: [ 0, 5, 0, 15 ]
        },
        tableHeader: {
            bold: true,
            fontSize: 13,
            color: 'black'
        }
    },
};


const pdfTableConfig = (tableRows: EditDataTableRow[], tableConfig: PartialRecursive<TableConfig>) => {

    return {
        style: 'table-style',
        table: {
            widths: [ 100, '*', 200, '*' ],
            body: tableRows.map(row => row.map((cell, i) => ({ text: cell, aligment: tableConfig.columns[ i ].alignment })))
        }
    };
};
