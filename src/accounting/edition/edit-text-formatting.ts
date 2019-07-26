import { colors } from '../util/color';
import { tableConfig, TableConfig } from './table-config';
import { table, ColumnConfig } from 'table';
import { StyleTemplate } from '../../../linked-modules/@mt/node-util';
import { PartialRecursive } from '../util/types';


export interface TitleOption {
    color?: StyleTemplate;
    isBig?: boolean;
}


export class EditLoggerOption {
    lineWidth: number = 80;
    tableConfig: PartialRecursive<TableConfig> = tableConfig();
}

type TableItem = string | number;

export interface TableOption {
    data: TableItem[][] | TableItem[];
    header?: TableItem[];
}

export class EditTextFormatting {

    private option: EditLoggerOption;


    constructor(option?: Partial<EditLoggerOption>) {
        this.option = Object.assign(new EditLoggerOption(), option);
    }

    title(title: string, option: TitleOption): string {
        const { color = colors.none.$, isBig = false } = option;
        const { lineWidth } = this.option;

        let s = '';

        if (isBig)
            s += color`${' '.repeat(lineWidth)}` + '\n';

        s += color`${this.alignCenter(title.toUpperCase(), lineWidth)}` + '\n';

        if (isBig)
            s += color`${' '.repeat(lineWidth)}` + '\n';

        return s;
    }

    private getColumns(row: TableItem[]): { [ index: number ]: Partial<ColumnConfig> } {
        const columns = {};

        for (let i = 0; i < row.length; ++i) {
            const length = (row[ i ] + '').length;

            columns[ i ] = {
                alignment: 'left',
                width: Math.max(Math.min(length, 100), 10)
            };
        }

        return columns;
    }

    public table({ data, header }: TableOption): string {
        const d: TableItem[][] = header ? [ header ] : [];

        if (Array.isArray(data[ 0 ]))
            d.push(...data as any);
        else
            d.push([ data as any ]);

        return table(d, Object.assign({ columns: this.getColumns(d[ Math.floor(d.length / 2) ]) }, this.option.tableConfig) as TableConfig);
    }


    private alignCenter(s: string, size: number): string {
        /*  if (size > s.length)
             return s; */
        const trim = s.trim();
        const whitespaceWidth = size - trim.length;

        if (whitespaceWidth <= 0)
            return s;

        const beginL = Math.floor(whitespaceWidth / 2) - 1; // -1 je ne sais pas pk :)
        const endL = whitespaceWidth - beginL;


        return ' '.repeat(beginL) + trim + ' '.repeat(endL);
    }
}
