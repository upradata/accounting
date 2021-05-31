import { ObjectOf, PartialRecursive } from '@upradata/util';
import { Terminal, TableConfig, styles } from '@upradata/node-util';
import { EditterOption, Editter } from './editter';


export interface EditArgs {
    title: string;
}


export interface EditOption {
    short?: boolean;
}

export abstract class Edit<ExtraOption = {}> {
    protected textFormatting: Terminal;
    protected consoleFormatting: Terminal;
    protected editorOption: EditterOption;
    protected textTable: Array<string | number>[];
    protected consoleTable: Array<string | number>[];
    protected json: ObjectOf<any>;

    constructor(private args: EditArgs) { }

    protected init(option: EditOption & Partial<ExtraOption>) {
        this.editorOption = { pdf: '', csv: '', text: '', console: '', json: '' };

        this.doInit(option);

        const { title } = this.args;
        const tableConfig = this.tableConfig();

        this.textFormatting = new Terminal({ maxWidth: { row: { width: 200 } }, tableConfig });
        this.consoleFormatting = new Terminal({ maxWidth: { row: { width: process.stdout.columns || 80 } }, tableConfig });

        this.editorOption.text += this.textFormatting.title(title, { isBig: true });
        this.editorOption.console += this.consoleFormatting.title(title, { color: styles.white.bgMagenta.$, isBig: true });

        if (!this.consoleTable)
            this.consoleTable = [];

        if (!this.textTable)
            this.textTable = [];

        if (!this.json)
            this.json = {};
    }

    protected tableConfig(): PartialRecursive<TableConfig> {
        return {};
    }

    protected end() {
        // this.editorOption.text += this.textFormatting.table({ data: this.textTable });
        this.editorOption.console += this.consoleFormatting.table({ data: this.consoleTable });
        this.editorOption.json = JSON.stringify(this.json);
    }

    edit(editter: Editter, option: EditOption & Partial<ExtraOption> = {}): Promise<void[]> {
        this.init(option);
        this.doEdit(option);
        this.end();

        return editter.edit(this.editorOption);

    }

    protected setJson(key: string, data: any) {
        const d = this.json[ key ] || [];
        d.push(data);

        this.json[ key ] = d;
    }

    abstract doInit(option: EditOption): void;
    abstract doEdit(option: EditOption): void;

}
