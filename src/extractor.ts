import * as fs from 'fs';
import pofile from 'pofile';

import { HtmlParser, IHtmlExtractorFunction } from './html/parser';
import { StatsOutput } from 'gettext-extractor/dist/utils/output';
import { Validate } from 'gettext-extractor/dist/utils/validate';
import { SvelteParser } from './svelte/parser';
import { FunctionBuilder, IFunctionDict, IFunction, CatalogBuilder, IMessage, IContext, IFunctionDictData } from './builder';
import { IJsExtractorFunction } from './js/parser';
import { JsParser } from './js/parser';

export interface IGettextExtractorStats {
  numberOfMessages: number;
  numberOfPluralMessages: number;
  numberOfMessageUsages: number;
  numberOfContexts: number;
  numberOfParsedFiles: number;
  numberOfParsedFilesWithMessages: number;
}

interface IHeaders {
  'Project-Id-Version': string;
  'Report-Msgid-Bugs-To': string;
  'POT-Creation-Date': string;
  'PO-Revision-Date': string;
  'Last-Translator': string;
  Language: string;
  'Language-Team': string;
  'Content-Type': string;
  'Content-Transfer-Encoding': string;
  'Plural-Forms': string;
  [name: string]: string;
}

function getAsArray<T>(obj?: T | T[]): T[] | undefined {
  if (obj === undefined) return;
  return Array.isArray(obj) ? obj : [obj];
}

export class SvelteGettextExtractor {
  private stats: IGettextExtractorStats = {
    numberOfMessages: 0,
    numberOfPluralMessages: 0,
    numberOfMessageUsages: 0,
    numberOfContexts: 0,
    numberOfParsedFiles: 0,
    numberOfParsedFilesWithMessages: 0,
  };

  private readonly builder: CatalogBuilder;

  private readonly functionBuilder: FunctionBuilder;

  constructor() {
    this.builder = new CatalogBuilder(this.stats);
    this.functionBuilder = new FunctionBuilder();
  }

  public createJsParser(extractors?: IJsExtractorFunction | IJsExtractorFunction[]): JsParser {
    Validate.optional.nonEmptyArray({ extractors });

    return new JsParser(this.builder, this.functionBuilder,  getAsArray(extractors), this.stats);
  }

  public createHtmlParser(extractors?: IHtmlExtractorFunction | IHtmlExtractorFunction[]): HtmlParser {
    Validate.optional.nonEmptyArray({ extractors });
    return new HtmlParser(this.builder, this.functionBuilder,  getAsArray(extractors), this.stats);
  }

  public createSvelteParser(extractors?: IJsExtractorFunction | IJsExtractorFunction[]): SvelteParser {
    Validate.optional.nonEmptyArray({ extractors });
    return new SvelteParser(this.builder, this.functionBuilder, getAsArray(extractors), this.stats);
  }

  public addMessage(message: IMessage, fileName?: string): void {
    if (message.text !== null) {
      Validate.required.stringProperty(message, 'message.text');
    }
    if ('textPlural' in message && message.textPlural !== null) {
      Validate.optional.stringProperty(message, 'message.textPlural');
    }
    if ('context' in message && message.context !== null) {
      Validate.optional.stringProperty(message, 'message.context');
    }
    Validate.optional.arrayProperty(message, 'message.references');
    Validate.optional.arrayProperty(message, 'message.comments');
    if ('identifier' in message && message.identifier !== null) {
      Validate.required.stringProperty(message, 'message.identifier');
    }

    this.builder.addMessage(message, fileName);
  }

  public getMessages(): IMessage[] {
    return this.builder.getMessages();
  }

  public getMessagesWithId(): IMessage[] {
    return this.builder.getMessagesWithId();
  }

  public getLastAddedMessages(): IMessage[] {
    return this.builder.getLastAddedMessages();
  }

  public getContexts(): IContext[] {
    return this.builder.getContexts();
  }

  public getMessagesByContext(context: string): IMessage[] {
    return this.builder.getMessagesByContext(context);
  }

  public getMessageDictionary(): Record<string, string> {
    return this.builder.getMessageDictionary();
  }

  public getTransformedMessages<T = any>(func: (messages: IMessage[]) => T): T {
    return this.builder.getTransformedMessages(func);
  }

  public addFunctions(functionData: IFunction, fileName?: string): void {
    this.functionBuilder.addFunction(functionData, fileName);
  }

  public getFunctions(): IFunctionDict {
    return this.functionBuilder.getFunctions();
  }

  public getLastAddedFunctions(): IFunctionDictData[] {
    return this.functionBuilder.getLastAddedFunctions();
  }

  public getFunctionsByFileName(fileName: string): IFunctionDictData[] {
    return this.functionBuilder.getFunctionsByFileName(fileName);
  }

  public getPotString(headers: Partial<IHeaders> = {}): string {
    Validate.optional.object({ headers });

    let po = new (<any>pofile)();
    po.items = this.getPofileItems();
    po.headers = {
      'Content-Type': 'text/plain; charset=UTF-8',
      ...headers,
    };
    return po.toString();
  }

  public savePotFile(fileName: string, headers?: Partial<IHeaders>): void {
    Validate.required.nonEmptyString({ fileName });
    Validate.optional.object({ headers });

    fs.writeFileSync(fileName, this.getPotString(headers));
  }

  public savePotFileAsync(fileName: string, headers?: Partial<IHeaders>): Promise<any> {
    Validate.required.nonEmptyString({ fileName });
    Validate.optional.object({ headers });

    return new Promise((resolve, reject) => {
      fs.writeFile(fileName, this.getPotString(headers), (error) => {
        if (error) {
          return reject(error);
        }
        // @ts-ignore
        resolve();
      });
    });
  }

  public saveFunctionJSON(fileName: string): void {
    Validate.required.nonEmptyString({ fileName });
    fs.writeFileSync(fileName, JSON.stringify(this.getFunctions()));
  }

  public saveFunctionJSONAsync(fileName: string): Promise<any> {
    Validate.required.nonEmptyString({ fileName });

    return new Promise((resolve, reject) => {
      fs.writeFile(fileName, JSON.stringify(this.getFunctions()), (error) => {
        if (error) {
          return reject(error);
        }
        // @ts-ignore
        resolve();
      });
    });
  }

  public getStats(): IGettextExtractorStats {
    return this.stats;
  }

  public printStats(): void {
    new StatsOutput(this.getStats()).print();
  }

  private getPofileItems() {
    return this.getMessages().map((message) => {
      let item = new pofile.Item();

      item.msgid = message.text as string;
      item.msgid_plural = message.textPlural as string;
      item.msgctxt = message.context as string;
      item.references = message.references.sort((a, b) => a.localeCompare(b));
      item.extractedComments = message.comments;

      return item;
    });
  }
}
