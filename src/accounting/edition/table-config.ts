import { PartialRecursive } from '../util/types';
import { TableUserConfig } from 'table';
import { TableConfig } from './table-config';


const tableBorder = {
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
};

const tableColumns = {
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
};

/* export interface TableConfig {
    border: JoinStruct;
    columns: ObjectOf<{ alignment: 'left' | 'center' | 'right', with: number; truncate: number }>;
    singleLine: boolean;
} */


export type TableConfig = TableUserConfig & { singleLine: boolean };

export const tableConfig = (option: PartialRecursive<TableConfig> = {}) => {
    return {
        columnDefault: {
            // width: 10,
            truncate: 100
        },
        ...option
    };

    /* const oo = {
        border: option.border, // Object.assign(tableBorder, option.border),
        columns: option.columns,// Object.assign(tableColumns, option.columns),
        //  drawHorizontalLine: (index: number, size: number) => {
        //     return index === 0 || index === 1 || index === size - 1 || index === size;
        // },
        singleLine: option.singleLine || true,
        columnDefault: {
            // width: 10,
            truncate: 100
        }
    }; */

};
