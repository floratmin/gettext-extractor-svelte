import * as parse5 from 'parse5';

import { IAddMessageCallback } from 'gettext-extractor/dist/parser';
import { Parser, IParseOptions, IAddFunctionCallBack } from '../parser';
import { CatalogBuilder, FunctionBuilder, IFunction, IMessage, IParsed } from '../builder';
import { IGettextExtractorStats } from '../extractor';
import { IJsParseOptions } from '../js/parser';
import * as glob from 'glob';

export type Node = parse5.DefaultTreeNode;
export type TextNode = parse5.DefaultTreeTextNode;
export type Element = parse5.DefaultTreeElement;

export type IHtmlExtractorFunction = (
  node: Node,
  fileName: string,
  addMessage: IAddMessageCallback,
  addFunction?: IAddFunctionCallBack,
  startChar?: number,
  source?: string,
) => void;

export class HtmlParser extends Parser<IHtmlExtractorFunction, IParseOptions> {
  public parser: string;

  constructor(
    protected builder: CatalogBuilder,
    protected functionBuilder: FunctionBuilder,
    protected extractors: IHtmlExtractorFunction[] = [],
    protected stats?: IGettextExtractorStats,
  ) {
    super(builder, functionBuilder, extractors, stats);
    this.validateExtractors(...extractors);
    this.parser = 'JsParser';
  }

  protected parse(source: string, fileName: string, options: IParseOptions = {}): IParsed {
    let document = parse5.parse(source, { sourceCodeLocationInfo: true });
    return this.parseNode(document, fileName, options.lineNumberStart || 1);
  }

  protected parseNode(node: any, fileName: string, lineNumberStart: number): IParsed {
    let messages: IMessage[] = [];
    let addMessageCallback = Parser.createAddMessageCallback(messages, fileName, () => {
      if (node.sourceCodeLocation && node.sourceCodeLocation.startLine) {
        return lineNumberStart + node.sourceCodeLocation.startLine - 1;
      }
    });

    for (let extractor of this.extractors) {
      extractor(node, fileName, addMessageCallback);
    }

    let childNodes = node.content ? node.content.childNodes : node.childNodes;
    if (childNodes) {
      for (let n of childNodes) {
        const parsed = this.parseNode(n, fileName, lineNumberStart);
        messages = messages.concat(parsed.messages);
      }
    }

    return { messages, functionsData: <IFunction[]>[] };
  }

  public parseSvelteString(source: string, fileName?: string, options?: IJsParseOptions): this {
    super.parseSvelteString(source, fileName, options);
    return this;
  }

  public addExtractor(extractor: IHtmlExtractorFunction): this {
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

  public parseString(source: string, fileName?: string, options?: IJsParseOptions): this {
    super.parseString(source, fileName, options);
    return this;
  }
}
