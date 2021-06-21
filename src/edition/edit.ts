import { PartialRecursive, deepCopy } from '@upradata/util';
import { TableRow } from '@upradata/node-util';
import { Editter } from './editter';
import { AddEditData, EditData, EditDataCellStyle } from './edit.types';


export interface EditOptions {
    title?: string;
    jsonIndent?: number;
}


export interface EditExtraOptions {
    short?: boolean;
}




export abstract class Edit<ExtraOption = {}> {
    private data: EditData = { string: [], json: {}, headers: [], style: [] };

    constructor(private options: EditOptions) { }

    protected init(option: EditExtraOptions & Partial<ExtraOption>) {
        this.doInit(option);
    }

    addData(data: AddEditData) {
        this.data.string.push(data.string);

        const { key, value } = data.json;
        const k = key as string;

        const { json } = this.data;

        json[ k ] = [ ...json[ k ], value ];
    }


    addHeaders(headers: TableRow | TableRow[]) {
        const isHeaderRows = (v: any): v is TableRow[] => Array.isArray(v?.[ 0 ]);

        this.data.headers = (isHeaderRows(headers) ? headers : [ headers ]).map(row => row.map(cell => `${cell}`));
    }

    setTableConfig(tableConfig: EditData[ 'style' ]) {
        this.data.style = tableConfig;
    }

    protected end() {
        const { title, jsonIndent = 0 } = this.options;
        const tableConfig = this.tableConfig();


        const rows = this.data.string.map(row => row.map((cell, i) => `${cell.format(cell.value, i, row.length)}`));

        const tableRows = [ ...headerRows, ...rows ];

        return {
            title,
            tableRows,
            json: JSON.stringify(this.data.json, null, jsonIndent),
            data: deepCopy(this.data),
            tableConfig
        };
    }

    edit(editter: Editter, option: EditExtraOptions & Partial<ExtraOption> = {}): Promise<void[]> {
        this.init(option);
        this.doEdit(option);
        const editOptions = this.end();

        return editter.edit(editOptions);

    }

    protected doInit(_option: EditExtraOptions): void { }
    protected abstract doEdit(option: EditExtraOptions): void;

}
