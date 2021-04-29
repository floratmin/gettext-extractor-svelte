import { svelteFragmentDivider } from '@floratmin/svelte-fragment-divider';

import { Parser, IParseOptions } from 'gettext-extractor/dist/parser';

export abstract class SParser<TExtractorFunction extends Function, TParseOptions extends IParseOptions> extends Parser<TExtractorFunction, TParseOptions> {

    public parseString(source: string, fileName?: string, options?: IParseOptions): this {
        const { scriptInHTMLFragments, script } = svelteFragmentDivider(source);
        [
            ...(script ? [script] : []),
            ...(scriptInHTMLFragments ? scriptInHTMLFragments : [])
        ]
            .forEach((jsFragment) => {
                super.parseString(
                    jsFragment.fragment,
                    fileName,
                    <TParseOptions>{...options, ...{lineNumberStart: jsFragment.startLine + (options?.lineNumberStart || 0)}}
                );
            });
        return this;
    }

}
