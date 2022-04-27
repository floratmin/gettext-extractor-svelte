import * as ts from 'typescript';
import * as glob from 'glob';
import { Parser } from '../parser';
import { FunctionBuilder, IParsed } from '../builder';
import { CatalogBuilder } from '../builder';
import { IGettextExtractorStats } from 'gettext-extractor/dist/extractor';
import { IJsExtractorFunction, IJsParseOptions } from '../js/parser';
import { TTranslatorFunction } from '../js/extractors/factories/callExpression';

export class SvelteParser extends Parser<IJsExtractorFunction, IJsParseOptions> {
  public parser: string;

  constructor(
    protected builder: CatalogBuilder,
    protected functionBuilder: FunctionBuilder,
    protected extractors: IJsExtractorFunction[] = [],
    protected stats?: IGettextExtractorStats,
  ) {
    super(builder, functionBuilder, extractors, stats);
    this.validateExtractors(...extractors);
    this.parser = 'SvelteParser';
  }

  protected parse(source: string, fileName: string, options: IJsParseOptions = {}): IParsed {
    let sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, <ts.ScriptKind>options.scriptKind);
    return this.parseNode(sourceFile, sourceFile, options.lineNumberStart || 1, options.startChar || 0, source, options.translatorFunctions);
  }

  protected parseNode(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    lineNumberStart: number,
    startChar: number,
    source: string,
    translatorFunctions?: TTranslatorFunction[],
  ): IParsed {
    let parsed: IParsed = {
      messages: [],
      functionsData: [],
    };

    let addMessageCallback = Parser.createAddMessageCallback(parsed.messages, sourceFile.fileName, () => {
      let location = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      return lineNumberStart + location.line;
    });

    let addFunctionCallback = Parser.createAddFunctionCallback(parsed.functionsData, sourceFile.fileName, () => {
      return {
        startChar: startChar + node.pos,
        endChar: startChar + node.end,
        functionString: source.slice(startChar + node.pos, startChar + node.end),
      };
    });

    for (let extractor of this.extractors) {
      extractor(node, sourceFile, addMessageCallback, addFunctionCallback, startChar, source, translatorFunctions);
    }

    ts.forEachChild(node, (n) => {
      const { messages, functionsData } = this.parseNode(n, sourceFile, lineNumberStart, startChar, source, translatorFunctions);
      parsed.messages = parsed.messages.concat(messages);
      parsed.functionsData = parsed.functionsData.concat(functionsData);
    });

    return parsed;
  }

  public parseSvelteString(source: string, fileName?: string, options?: IJsParseOptions, parseId?: string): this {
    super.parseSvelteString(source, fileName, options, parseId);
    return this;
  }

  public addExtractor(extractor: IJsExtractorFunction): this {
    super.addExtractor(extractor);
    return this;
  }

  public parseFile(fileName: string, options?: IJsParseOptions): this {
    super.parseFile(fileName, options);
    return this;
  }

  public parseFilesGlob(pattern: string, globOptions?: glob.IOptions, options?: IJsParseOptions): this {
    super.parseFilesGlob(pattern, globOptions, options);
    return this;
  }

  public parseString(source: string, fileName?: string, options?: IJsParseOptions, parseId?: string): this {
    super.parseString(source, fileName, options, parseId);
    return this;
  }
}
