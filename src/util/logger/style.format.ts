import { map, ObjectOf, ensureArray, TT, Key } from '@upradata/util';
import { styles as terminalStyles, TerminalStyles } from '@upradata/node-util';
import { Format } from 'logform';
import { LEVEL } from 'triple-beam';
import { Info, DEFAULT_INFO_PROPS } from './types';


export type StyleTransform = (s: string, prop?: Key, info?: Info) => string;
export type Style = StyleTransform | string;
export type StyleOption = TT<Style>;
export type Styles = ObjectOf<StyleOption>;


interface StylerTransformOptions {
    props?: string[];
}


interface StylerOptions<LevelNames extends Key> extends StylerTransformOptions {
    styles?: Record<LevelNames, StyleOption>;
}


const HAS_SPACE = /\s+/;

export class Styler<LevelNames extends Key> implements Format {
    styles: ObjectOf<StyleTransform[]> = {};
    props: string[];


    constructor(options: StylerOptions<LevelNames> = {}) {
        this.addStyles(options.styles);
        this.props = options.props || [ 'message', 'level' ];
    }


    /* styles can be :
    * - a string like "bold red". It will be split in [ "bold", "red" ]
    * - an array of strings [ "bold", "red" ]
    * - a transform a StyleTransform function or an array of it => (s: string, prop?: Key, info?: Info) => string
    * - of course, @uprdata/node-util styles.red.transform, ... can be used as they are StyleTransform
    */
    static getStyleTransform(styles: TT<Style>) {

        const stylesProcessed = ensureArray(styles).flatMap((style: Style) => {
            if (typeof style === 'function')
                return style;

            const stringStyles = HAS_SPACE.test(style) ? style.split(HAS_SPACE) : [ style ];

            const predefinedTerminalStyles = stringStyles.map(styleName => {
                const style = terminalStyles[ styleName ] as TerminalStyles;
                if (!style)
                    console.warn(`Could not find the terminal style with the name "${styleName}"`);

                return style.transform;
            }).filter(v => !!v);

            return predefinedTerminalStyles;
        });

        return stylesProcessed;
    }


    addStyles(styles: Styles) {

        const stylesPerLevelProcessed = map(styles, (_level, style) => Styler.getStyleTransform(style));

        this.styles = { ...this.styles, ...stylesPerLevelProcessed };
        return this.styles;
    }


    static stylize(option: { styles: StyleTransform[]; text: string; prop?: string; info?: Info; }) {
        const { styles, text } = option;

        if (!styles)
            return text;

        return styles.reduce((m, style) => style(m, option.prop, option.info), option.text);
    }

    stylize(option: { level: LevelNames; text: string; prop: string; info: Info; }) {

        // "symbol" has to be "unique symbol" to work in indexes
        // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#unique-symbol
        // here, option.level can be any string | number | symbol, so there is an error (Type 'symbol' cannot be used as an index type)
        // and we cannot force to string | ... | unique symbol => casting to string is a weak workaround
        const styles = this.styles[ option.level as string ];

        return Styler.stylize({ ...option, styles });
    }

    transform(info: Info, options: StylerTransformOptions) {
        const props = this.props || options.props;

        // info[ MESSAGE ] === JSON.stringify(info) => it is done in winston/lib/winston/logger.js (_transform)
        const level = info[ LEVEL ];

        const transforms = props
            .map(prop => {
                if (prop === DEFAULT_INFO_PROPS.level)
                    return { text: level, prop, infoProp: LEVEL };

                return { text: info[ prop ], prop, infoProp: prop };
            })
            .filter(info => !!info.text)
            .map(t => ({ ...t, info, level }));


        transforms.forEach(t => { info[ t.infoProp ] = this.stylize(t); });
        return info;
    }
}
