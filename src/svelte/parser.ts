import * as ts from 'typescript';
import { SParser } from '../parser';
import { IAddMessageCallback, IParseOptions } from 'gettext-extractor/dist/parser';
import { IMessage } from 'gettext-extractor/dist/builder';

export type IJsExtractorFunction = (node: ts.Node, sourceFile: ts.SourceFile, addMessage: IAddMessageCallback) => void;

export interface IJsParseOptions extends IParseOptions {
    scriptKind?: ts.ScriptKind;
}

export class SvelteParser extends SParser<IJsExtractorFunction, IJsParseOptions> {

    protected parse(source: string, fileName: string, options: IJsParseOptions = {}): IMessage[] {
        let sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, options.scriptKind);
        return this.parseNode(sourceFile, sourceFile, options.lineNumberStart || 1);
    }

    protected parseNode(node: ts.Node, sourceFile: ts.SourceFile, lineNumberStart: number): IMessage[] {
        let messages: IMessage[] = [];
        let addMessageCallback = SParser.createAddMessageCallback(messages, sourceFile.fileName, () => {
            let location = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            return lineNumberStart + location.line;
        });

        for (let extractor of this.extractors) {
            extractor(node, sourceFile, addMessageCallback);
        }

        ts.forEachChild(node, n => {
            messages = messages.concat(this.parseNode(n, sourceFile, lineNumberStart));
        });

        return messages;
    }
}
