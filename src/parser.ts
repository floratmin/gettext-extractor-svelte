import * as fs from 'fs';
import * as glob from 'glob';
import * as ts from 'typescript';

import { IGettextExtractorStats } from './extractor';
import { IAddMessageCallback } from 'gettext-extractor/dist/parser';
import { Validate } from 'gettext-extractor/dist/utils/validate';
import { svelteFragmentDivider } from '@floratmin/svelte-fragment-divider';
import { FunctionBuilder, IMessage, IFunction, TFunctionData, IParsed, CatalogBuilder } from './builder';
import { TTranslatorFunction } from './js/extractors/factories/callExpression';

export type Pos = {
  pos: number;
  end: number;
};

export interface IFunctionData {
  functionString?: string;
  functionData?: TFunctionData;
  fileName?: string;
  startChar?: number;
  endChar?: number;
  definition?: true;
  identifier?: string;
}
export interface IMessageData {
  text: string;
  textPlural?: string;
  context?: string;
  lineNumber?: number;
  fileName?: string;
  comments?: string[];
  identifier?: string;
  pos?: Pos[];
}

export type IAddFunctionCallBack = (data: IFunctionData) => void;


export interface IParseOptions {
  lineNumberStart?: number;
  transformSource?: (source: string) => string;
  startChar?: number;
  translatorFunctions?: TTranslatorFunction[];
}

export abstract class Parser<TExtractorFunction extends Function, TParseOptions extends IParseOptions> {

  public static STRING_LITERAL_FILENAME: string = 'gettext-extractor-string-literal';

  public abstract parser: string;

  public static createAddMessageCallback(messages: Partial<IMessage>[], fileName: string, getLineNumber: () => number | undefined): IAddMessageCallback {
    return (data: IMessageData) => {
      let references: string[] | undefined;

      if (typeof data.lineNumber !== 'number') {
        data.lineNumber = getLineNumber();
      }

      data.fileName = data.fileName || fileName;

      if (data.fileName && data.lineNumber && data.fileName !== Parser.STRING_LITERAL_FILENAME) {
        references = [`${data.fileName}:${data.lineNumber}`];
      }

      let message: Partial<IMessage> = {
        text: data.text,
        textPlural: data.textPlural || undefined,
        context: data.context || undefined,
        references: references,
        comments: data.comments && data.comments.length ? data.comments : undefined,
        identifier: data.identifier,
      };

      messages.push(message);
    };
  }

  public static createAddFunctionCallback(
    functionsData: IFunction[], fileName: string, getFirstAndLastChar: () => Pick<IFunction, 'functionString' | 'startChar' | 'endChar'>,
  ): IAddFunctionCallBack {
    return (data: IFunctionData) => {
      if (typeof data.startChar !== 'number' || typeof data.endChar !== 'number') {
        Object.assign(data, getFirstAndLastChar());
      }

      data.fileName = data.fileName || fileName;

      const functionData: IFunction = {
        functionString: data.functionString || '',
        ...(data.functionData ? {functionData: data.functionData } : {}),
        fileName: data.fileName,
        startChar: <number>data.startChar,
        endChar: <number>data.endChar,
        identifier: <string>data.identifier,
        ...(data.definition ? {definition: data.definition} : {}),
      };

      functionsData.push(functionData);
    };
  }

  constructor(
    protected builder: CatalogBuilder,
    protected functionBuilder: FunctionBuilder,
    protected extractors: TExtractorFunction[] = [],
    protected stats?: IGettextExtractorStats,
  ) {
    this.validateExtractors(...extractors);
  }

  public parseSvelteString(source: string, fileName?: string, options?: TParseOptions): this {
    const { scriptInHTMLFragments, script } = svelteFragmentDivider(source, <string>fileName);
    [
      ...(script ? [script] : []),
      ...(scriptInHTMLFragments ? scriptInHTMLFragments : []),
    ]
      .forEach((jsFragment) => {
        jsFragment = Array.isArray(jsFragment) ? jsFragment : [jsFragment];
        jsFragment.forEach((jsFrag) => {
          this.parseString(
            jsFrag.fragment,
            fileName,
            <TParseOptions>{
              ...options,
              ...{
                lineNumberStart: jsFrag.startLine + (options?.lineNumberStart || 0),
                startChar: jsFrag.startChar + (options?.startChar || 0),
              },
            },
          );
        });
      });
    return this;
  }

  public parseString(source: string, fileName?: string, options?: TParseOptions): this {
    Validate.required.string({source});
    Validate.optional.nonEmptyString({fileName});
    fileName = fileName || Parser.STRING_LITERAL_FILENAME;
    this.validateParseOptions(options);

    if (!this.extractors.length) {
      throw new Error(`Missing extractor functions. Provide them when creating the parser or dynamically add extractors using 'addExtractor()'`);
    }

    if (options && options.transformSource) {
      source = options.transformSource(source);
    }

    let { messages, functionsData} = this.parse(source, fileName, options);

    for (let message of messages) {
      this.builder.addMessage(message, fileName);
    }

    for (let functionData of functionsData) {
      this.functionBuilder.addFunction(functionData, fileName);
    }

    this.stats && this.stats.numberOfParsedFiles++;
    if (messages.length) {
      this.stats && this.stats.numberOfParsedFilesWithMessages++;
    }

    return this;
  }

  public parseFile(fileName: string, options?: TParseOptions): this {
    Validate.required.nonEmptyString({fileName});
    this.validateParseOptions(options);
    if (this.parser === 'SvelteParser') {
      this.parseSvelteString(fs.readFileSync(fileName).toString(), fileName, options);
    } else {
      this.parseString(fs.readFileSync(fileName).toString(), fileName, options);
    }

    return this;
  }

  public parseFilesGlob(pattern: string, globOptions?: glob.IOptions, options?: TParseOptions): this {
    Validate.required.nonEmptyString({pattern});
    Validate.optional.object({globOptions});
    this.validateParseOptions(options);

    for (let fileName of glob.sync(pattern, <glob.IOptions>globOptions)) {
      this.parseFile(fileName, options);
    }

    return this;
  }

  public addExtractor(extractor: TExtractorFunction): this {
    Validate.required.argument({extractor});
    this.validateExtractors(extractor);

    this.extractors.push(extractor);

    return this;
  }

  protected validateParseOptions(options?: TParseOptions): void {
    Validate.optional.numberProperty(options, 'options.lineNumberStart');
    Validate.optional.functionProperty(options, 'options.transformSource');
    Validate.optional.functionProperty(options, 'options.functionExtractors');
  }

  protected validateExtractors(...extractors: TExtractorFunction[]): void {
    for (let extractor of extractors) {
      if (typeof extractor !== 'function') {
        throw new TypeError(`Invalid extractor function provided. '${extractor}' is not a function`);
      }
    }
  }


  protected abstract parse(source: string, fileName: string, options?: TParseOptions): IParsed;

  protected abstract parseNode(
    node: ts.Node | any,
    sourceFile: ts.SourceFile | string,
    lineNumberStart: number,
    startChar?: number,
    source?: string,
    translatorFunctions?: TTranslatorFunction[],
  ): IParsed;

}
