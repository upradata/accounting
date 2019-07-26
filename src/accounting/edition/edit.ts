import { EditOption, Editter } from './editter';
import { EditTextFormatting } from './edit-text-formatting';
import { highlightMagenta } from '../util/color';
import { ObjectOf } from '../util/types';

export interface EditArgs {
    title: string;
}

export abstract class Edit {
    protected textFormatting = new EditTextFormatting({ lineWidth: 80 });
    protected consoleFormatting = new EditTextFormatting({ lineWidth: process.stdout.columns || 80 });
    protected editorOption: EditOption;
    protected textTable: Array<string | number>[];
    protected consoleTable: Array<string | number>[];
    protected json: ObjectOf<any>;

    constructor(private args: EditArgs) { }

    protected init() {
        this.editorOption = { pdf: '', csv: '', text: '', console: '', json: '' };

        this.editorOption.text += this.textFormatting.title(this.args.title, { isBig: true });
        this.editorOption.console += this.consoleFormatting.title(this.args.title, { color: highlightMagenta, isBig: true });

        this.consoleTable = [];
        this.textTable = [];
        this.json = {};
    }

    protected end() {
        this.editorOption.text += this.textFormatting.table({ data: this.textTable });
        this.editorOption.console += this.consoleFormatting.table({ data: this.consoleTable });
        this.editorOption.json = JSON.stringify(this.json);
    }

    edit(editter: Editter): Promise<void[]> {
        this.init();
        this.doEdit();
        this.end();

        return editter.edit(this.editorOption);

    }

    abstract doEdit(): void;

}
