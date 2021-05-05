import * as ts from 'typescript';

import { IAddFunctionCallBack, Parser } from '../parser';
import { FunctionBuilder, IParsed, CatalogBuilder } from '../builder';
import { IParseOptions } from '../parser';
import { IGettextExtractorStats } from '../extractor';
import { IAddMessageCallback } from 'gettext-extractor/dist/parser';

export type IJsExtractorFunction = (node: ts.Node, sourceFile: ts.SourceFile, addMessage: IAddMessageCallback, addFunction?: IAddFunctionCallBack, startChar?: number, source?: string) => void;

export interface IJsParseOptions extends IParseOptions {
    scriptKind?: ts.ScriptKind;
}

export class JsParser extends Parser<IJsExtractorFunction, IParseOptions> {

    public parser: string;

    constructor(
        protected builder: CatalogBuilder,
        protected functionBuilder: FunctionBuilder,
        protected extractors: IJsExtractorFunction[] = [],
        protected stats?: IGettextExtractorStats
    ) {
        super(builder, functionBuilder, extractors, stats);
        this.validateExtractors(...extractors);
        this.parser = 'JsParser';
    }

    protected parse(source: string, fileName: string, options: IJsParseOptions = {}): IParsed {
        let sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, options.scriptKind);
        return this.parseNode(sourceFile, sourceFile, options.lineNumberStart || 1, options.startChar || 0, source);
    }

    protected parseNode(node: ts.Node, sourceFile: ts.SourceFile, lineNumberStart: number, startChar: number, source: string): IParsed {
        let parsed: IParsed = {
            messages: [],
            functionsData: []
        };
        let addMessageCallback = Parser.createAddMessageCallback(parsed.messages, sourceFile.fileName, () => {
            let location = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            return lineNumberStart + location.line;
        });

        let addFunctionCallback = Parser.createAddFunctionCallback(parsed.functionsData, sourceFile.fileName, () => {
            return {
                startChar: startChar + node.pos,
                endChar: startChar + node.end,
                functionString: source.slice(startChar + node.pos, startChar + node.end)
            };
        });

        for (let extractor of this.extractors) {
            extractor(node, sourceFile, addMessageCallback, addFunctionCallback, startChar, source);
        }

        ts.forEachChild(node, n => {
            const {messages, functionsData } = this.parseNode(n, sourceFile, lineNumberStart, startChar, source);
            parsed.messages = parsed.messages.concat(messages);
            parsed.functionsData = parsed.functionsData.concat(functionsData);
        });

        return parsed;
    }
}
