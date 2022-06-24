import { Terminal, styles } from '@upradata/node-util';
import { EditLogger } from '../edit.types';

export const consoleEditter: EditLogger = data => {
    const { title, headers, rows: tableRows, tableFormat } = data;

    const tableConfig = tableFormat;

    const { isTTY } = process.stdout;
    const consoleColumns = process.stdout.columns || 80;

    const consoleFormatting = new Terminal({ maxWidth: { row: { width: isTTY ? consoleColumns : 200 } }, tableConfig });

    consoleFormatting.logTitle(title, { style: styles.white.bgMagenta.transform, isBig: true });

    const rows = [
        ...headers,
        ...tableRows.map(({ row, format }) => row.map((data, i) => `${format(data, i, row.length).value}`))
    ];

    consoleFormatting.logTable({ data: rows }, tableConfig);
};
