import { TableConfig } from '@upradata/node-util';
import { Key, PartialRecursive } from '@upradata/util';

export type EditDataCell = string | number;

export type EditDataRow = EditDataCell[];
export type EditDataJson = Record<Key, any[]>;


export interface EditDataCellStyle {
    alignment?: 'left' | 'right' | 'center';
    style?: 'normal' | 'accent' | 'warning';
    type?: 'text' | 'number';
    span?: number;
}


export type EditDataStyledCell = { value: EditDataCell; style?: EditDataCellStyle; };
export type EditDataCellFormat = (data: EditDataCell, index?: number, length?: number) => EditDataStyledCell;


export interface AddEditData {
    string: EditDataRow;
    json: { key: Key, value: any; };
    cellFormat?: EditDataCellFormat;
}


export type EditDataTableRow = string[];
export type EditData = {
    string: EditDataRow[];
    json: EditDataJson;
    headers: EditDataTableRow[];
    style: (i: number, length: number) => EditDataCellStyle;
};


export interface EditterOption {
    title: string;
    tableRows: EditDataTableRow[];
    json: string;
    data: EditData;
    tableConfig: PartialRecursive<TableConfig>;
}



export type EditLogger = (option: EditterOption) => Promise<void>;

export class EditterFormats {
    pdf = 'pdf';
    html = 'html';
    csv = 'csv';
    console = 'console';
    json = 'json';
}

export type EditterLoggers = Partial<Record<keyof EditterFormats, EditLogger>>;
