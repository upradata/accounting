// import { TableConfig } from '@upradata/node-util';
import { Key, PartialRecursive, assignRecursive, TT$ } from '@upradata/util';

export type EditDataCell = string | number;

export type EditDataRow = EditDataCell[];
export type EditDataJson = Record<Key, any[]>;

export type HorizontalAlignment = 'left' | 'right' | 'center';
export type VerticalAlignment = 'top' | 'bottom' | 'center';
export type Span = {
    alignment?: { vertical?: VerticalAlignment; horizontal?: HorizontalAlignment; };
    row: number;
    col: number;
    rowSpan?: number;
    colSpan?: number;
};


export interface EditTableStyle {
    alignment?: HorizontalAlignment;
    width?: number;
    bgColor?: string;
    color?: string;
    span?: Span;
}

export interface EditDataCellStyle {
    alignment?: HorizontalAlignment;
    style?: 'normal' | 'accent' | 'warning';
    type?: 'text' | 'number';
    bgColor?: string;
    color?: string;
    span?: Span;
}



export type EditDataStyledCell = { value: EditDataCell; style?: EditDataCellStyle; };
export type EditDataCellFormat = (data: EditDataCell, columnIndex: number, nbColumns: number) => EditDataStyledCell;

export const updateEditDataStyledCell = (oldV: EditDataStyledCell, newV: PartialRecursive<EditDataStyledCell>): EditDataStyledCell => assignRecursive(oldV, newV);


export interface AddEditData {
    string: EditDataRow;
    json: { key: Key; value: any; };
    format?: EditDataCellFormat;
}


export type EditDataTableRow = string[];

export type EditData = {
    rows: { row: EditDataCell[]; format: EditDataCellFormat; }[];
    json: EditDataJson;
    headers: EditDataTableRow[];
    tableFormat?: (columnIndex: number, nbColumns: number) => EditTableStyle;
};


export type EditterOption = Omit<EditData, 'tableFormat'> & {
    title: string;
    // headers: EditDataTableRow[];
    // tableRows: { row: EditDataCell[]; format: EditDataCellFormat; }[];
    // json: string;
    // data: EditData;
    tableFormat: { columns: EditTableStyle[]; };
    // PartialRecursive<TableConfig>;
};



export type EditLogger = (option: EditterOption) => TT$<void>;

export class EditterFormats {
    pdf = 'pdf';
    html = 'html';
    csv = 'csv';
    console = 'console';
    json = 'json';
}

export type EditterLoggers = Partial<Record<keyof EditterFormats, EditLogger>>;
