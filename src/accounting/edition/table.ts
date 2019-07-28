import { PartialRecursive } from '../util/types';
import { TableUserConfig, ColumnConfig, table } from 'table';
import makeConfig from 'table/dist/makeConfig';
import stringWidth from 'string-width';
import { assignDefaultOption, assignRecursive } from '../../../linked-modules/@mt/browser-util/assign';


export type TableItem = string | number;
export type TableRow = TableItem[];
export type TableRows = TableRow[];


export type TableColumns = { [ index: number ]: ColumnConfig };

export type TableConfig = TableUserConfig & { singleLine: boolean };


export interface MaxRowWidth {
    width: number;
    indexToShrink?: number; // to do, make a list (1st cell, then 2nd cell if table size still too big, then 3rd....). Not only one index
}

export interface ColumnsMaxWidth {
    cell: number;
    row: MaxRowWidth;
}


export interface TableStringOption {
    maxWidth?: Partial<ColumnsMaxWidth>;

    tableConfig?: PartialRecursive<TableConfig>;
}





export class TableString {
    userConfig: PartialRecursive<TableConfig>;
    tableConfig: TableConfig;
    maxWidth: Partial<ColumnsMaxWidth>;


    constructor(option: TableStringOption = {}) {

        this.userConfig = assignDefaultOption({
            columnDefault: { truncate: 200 }
        }, option.tableConfig);

        this.maxWidth = option.maxWidth || { cell: 80 };
    }

    get(data: TableRows) {
        // we compute it to get tableConfig.columns value computed to have paddingLeft, paddingRight
        // needed in this.getColumnsWidth
        this.tableConfig = makeConfig(data, this.userConfig) as TableConfig;


        const config = assignRecursive(
            { columns: this.getColumnsWidth(data) },
            this.userConfig
        ) as TableConfig;

        return table(data, config);
    }

    getCellsRowWidth(row: TableRow) {
        return row.map(cell =>
            Math.max(...(cell + '').split('\n').map(line => stringWidth(line)))
        );
    }

    getColumnsWidth(table: TableRows): { [ index: number ]: ColumnConfig } {
        const { cell: maxCellWidth, row: rowWidth } = this.maxWidth;

        const firstRow = table[ 0 ];

        if (!firstRow) {
            throw new Error('Dataset must have at least one row.');
        }

        const columnsWidth: number[] = Array(firstRow.length).fill(0);

        for (const row of table) {
            const cellsRowWidth = this.getCellsRowWidth(row);

            for (const [ i, cellWidth ] of Object.entries(cellsRowWidth)) {
                if (cellWidth > columnsWidth[ i ])
                    columnsWidth[ i ] = cellWidth;
            }

        }

        if (maxCellWidth)
            return columnsWidth.map(w => ({ width: Math.min(w, maxCellWidth) }));

        if (rowWidth)
            this.resizeColumnsWidth(columnsWidth);

        return columnsWidth.map(w => ({ width: w }));
    }

    private maxValue(array: number[]) {
        return array.reduce((max, w) => Math.max(max, w), 0);
    }

    private resizeColumnsWidth(columnsWidth: number[]) {
        // tslint:disable-next-line: prefer-const
        const { width, indexToShrink } = this.maxWidth.row;

        const nbCol = columnsWidth.length;
        // const { paddingLeft, paddingRight } = this.config.columns[ 0 ];
        const paddingLeft = this.maxValue(Object.values(this.tableConfig.columns).map(c => c.paddingLeft));
        const paddingRight = this.maxValue(Object.values(this.tableConfig.columns).map(c => c.paddingRight));

        const totalPaddingCells = nbCol * (paddingLeft + paddingRight) + (nbCol + 1); // we assume all rows have same padding (we could )

        const lineWidth = width - totalPaddingCells;
        let index = indexToShrink;

        const totalWidth = columnsWidth.reduce((sum, w) => sum + w, 0); // row width (whitout padding and vertical bar => just text)

        if (totalWidth > lineWidth) {
            if (!index) {
                // cell that is the widest
                index = columnsWidth.findIndex(cellW => this.maxValue(columnsWidth) === cellW);
            }

            const shrinkWidth = columnsWidth[ index ] - (totalWidth - lineWidth);

            if (shrinkWidth < 4) { // 4 is min width => todo: make an option
                // so we will shrink the next bigger cell
                const maxShrinkWidth = columnsWidth[ index ] - 4;

                columnsWidth[ index ] = maxShrinkWidth;
                return this.resizeColumnsWidth(columnsWidth);
                // tslint:disable-next-line: no-else-after-return
            } else
                columnsWidth[ index ] = shrinkWidth;
        }

        return columnsWidth;
    }
}




/* const tableBorder = {
    topBody: `─`,
    topJoin: `┬`,
    topLeft: `┌`,
    topRight: `┐`,

    bottomBody: `─`,
    bottomJoin: `┴`,
    bottomLeft: `└`,
    bottomRight: `┘`,

    bodyLeft: `│`,
    bodyRight: `│`,
    bodyJoin: `│`,

    joinBody: `─`,
    joinLeft: `├`,
    joinRight: `┤`,
    joinJoin: `┼`
}; */

/* const tableColumns = {
    0: {
        alignment: 'left',
        width: 10
    },
    1: {
        alignment: 'center',
        // width: 10
    },
    2: {
        alignment: 'right',
        width: 10,
        truncate: 100
    }
}; */

/* export interface TableConfig {
    border: JoinStruct;
    columns: ObjectOf<{ alignment: 'left' | 'center' | 'right', with: number; truncate: number }>;
    singleLine: boolean;
} */
