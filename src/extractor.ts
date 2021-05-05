import * as fs from 'fs';
import * as pofile from 'pofile';

import { HtmlParser, IHtmlExtractorFunction } from './html/parser';
import { StatsOutput } from 'gettext-extractor/dist/utils/output';
import { Validate } from 'gettext-extractor/dist/utils/validate';
import { SvelteParser } from './svelte/parser';
import { FunctionBuilder, IFunctionDict, IFunction, CatalogBuilder, IMessage, IContext } from './builder';
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

export class SvelteGettextExtractor {

    private stats: IGettextExtractorStats = {
        numberOfMessages: 0,
        numberOfPluralMessages: 0,
        numberOfMessageUsages: 0,
        numberOfContexts: 0,
        numberOfParsedFiles: 0,
        numberOfParsedFilesWithMessages: 0
    };

    private readonly builder: CatalogBuilder;
    private readonly functionBuilder: FunctionBuilder;

    constructor() {
        this.builder = new CatalogBuilder(this.stats);
        this.functionBuilder = new FunctionBuilder();
    }

    public createJsParser(extractors?: IJsExtractorFunction[]): JsParser {
        Validate.optional.nonEmptyArray({extractors});

        return new JsParser(this.builder, this.functionBuilder, extractors, this.stats);
    }

    public createHtmlParser(extractors?: IHtmlExtractorFunction[]): HtmlParser {
        Validate.optional.nonEmptyArray({extractors});
        return new HtmlParser(this.builder, this.functionBuilder, extractors, this.stats);
    }

    public createSvelteParser(extractors?: IJsExtractorFunction[]): SvelteParser {
        Validate.optional.nonEmptyArray({extractors});
        return new SvelteParser(this.builder, this.functionBuilder, extractors, this.stats);
    }

    public addMessage(message: IMessage): void {
        Validate.required.stringProperty(message, 'message.text');
        Validate.optional.stringProperty(message, 'message.textPlural');
        Validate.optional.stringProperty(message, 'message.context');
        Validate.optional.arrayProperty(message, 'message.references');
        Validate.optional.arrayProperty(message, 'message.comments');
        Validate.required.stringProperty(message, 'message.identifier');

        this.builder.addMessage(message);
    }

    public getMessages(): IMessage[] {
        return this.builder.getMessages();
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

    public addFunctions(functionData: IFunction): void {
        this.functionBuilder.addFunction(functionData);
    }

    public getFunctions(): IFunctionDict {
        return this.functionBuilder.getFunctions();
    }

    public getFunctionsByFileName(fileName: string): IFunctionDict {
        return this.functionBuilder.getFunctionsByFileName(fileName);
    }

    public getPotString(headers: Partial<pofile.IHeaders> = {}): string {
        Validate.optional.object({headers});

        let po = new (<any>pofile)();
        po.items = this.getPofileItems();
        po.headers = {
          'Content-Type': 'text/plain; charset=UTF-8',
          ...headers
        };
        return po.toString();
    }

    public savePotFile(fileName: string, headers?: Partial<pofile.IHeaders>): void {
        Validate.required.nonEmptyString({fileName});
        Validate.optional.object({headers});

        fs.writeFileSync(fileName, this.getPotString(headers));
    }

    public savePotFileAsync(fileName: string, headers?: Partial<pofile.IHeaders>): Promise<any> {
        Validate.required.nonEmptyString({fileName});
        Validate.optional.object({headers});

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
        Validate.required.nonEmptyString({fileName});
        fs.writeFileSync(fileName, JSON.stringify(this.getFunctions()));
    }

    public saveFunctionJSONAsync(fileName: string): Promise<any> {
        Validate.required.nonEmptyString({fileName});

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

    private getPofileItems(): pofile.Item[] {
        return this.getMessages().map(message => {
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
