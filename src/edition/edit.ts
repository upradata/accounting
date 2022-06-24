// import { deepCopy } from '@upradata/util';
import { TableRow } from '@upradata/node-util';
import { Editter } from './editter';
import { AddEditData, EditData, EditterOption } from './edit.types';


export interface EditOptions {
    title?: string;
    // jsonIndent?: number;
}


export interface EditExtraOptions {
    short?: boolean;
}




export abstract class Edit<ExtraOption = {}> {
    private data: EditData = { rows: [], json: {}, headers: [], tableFormat: undefined };

    constructor(private options: EditOptions) { }

    protected init(option: EditExtraOptions & Partial<ExtraOption>) {
        this.doInit(option);
    }

    addData(data: AddEditData) {
        const { string: row, format } = data;

        this.data.rows.push({ row, format });

        const { key, value } = data.json;
        const k = key as string;

        const { json } = this.data;

        json[ k ] = json[ k ] ? [ ...json[ k ], value ] : [ value ];
    }


    addHeaders(headers: TableRow | TableRow[]) {
        const isHeaderRows = (v: any): v is TableRow[] => Array.isArray(v?.[ 0 ]);
        this.data.headers = (isHeaderRows(headers) ? headers : [ headers ]).map(row => row.map(cell => `${cell}`));
    }

    setTableFormat(format: EditData[ 'tableFormat' ]) {
        this.data.tableFormat = format;
    }

    protected end(): EditterOption {
        const { title,/*  jsonIndent = 0 */ } = this.options;

        const columnsFormat = this.data.headers.at(-1).map((_, i) => this.data.tableFormat(i, this.data.headers.length));
        // const cells = row.map((cell, i) => format(cell, i, row.length).value);
        //  const rows = this.data.string.map(row => row.map((cell, i) => `${cell.format(cell.value, i, row.length)}`));

        // const tableRows = [ ...headerRows, ...rows ];

        return {
            title,
            ...this.data,
            tableFormat: { columns: columnsFormat }
            // headers: this.data.headers,
            // tableRows: this.data.string,
            // json: JSON.stringify(this.data.json, null, jsonIndent),
            // data: deepCopy(this.data),
        };
    }

    edit(editter: Editter, option: EditExtraOptions & Partial<ExtraOption> = {}): Promise<void> {
        this.init(option);
        this.doEdit(option);
        const editterOptions = this.end();

        return editter.edit(editterOptions);

    }

    protected doInit(_option: EditExtraOptions): void { }
    protected abstract doEdit(option: EditExtraOptions): void;

}
