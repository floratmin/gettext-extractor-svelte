import { IGettextExtractorStats } from './extractor';

export interface IFunction {
    functionString: string;
    fileName: string;
    startChar: number;
    endChar: number;
    identifier?: string;
    definition?: true;
}

export interface IParsed {
    messages:  IMessage[];
    functionsData: IFunction[];
}

export interface IMessage {
    text: string | null;
    textPlural?: string | null;
    context?: string | null;
    references: string[];
    comments: string[];
    identifier?: string | null;
}

export interface IContext {
    name: string;
    messages: IMessage[];
}

export type IMessageMap = {[text: string]: IMessage};
export type IContextMap = {[context: string]: IMessageMap};

export type IFunctionDict = Record<string, Pick<IFunction, 'functionString' | 'startChar' | 'endChar' | 'identifier'>[]>;

export class FunctionBuilder {
    private context: IFunctionDict = {};

    public addFunction(functionData: IFunction): void {
        if (this.context[functionData.fileName]) {
            this.context[functionData.fileName].push({
                functionString: functionData.functionString,
                startChar: functionData.startChar,
                endChar: functionData.endChar,
                identifier: functionData.identifier,
                ...(functionData.definition ? {definition: true} : {})
            });
        } else {
            this.context[functionData.fileName] = [
                {
                    functionString: functionData.functionString,
                    startChar: functionData.startChar,
                    endChar: functionData.endChar,
                    identifier: functionData.identifier,
                    ...(functionData.definition ? {definition: true} : {})
                }
            ];
        }
    }

    public getFunctions(): IFunctionDict {
        return this.context;
    }

    public getFunctionsByFileName(fileName: string): IFunctionDict {
        return Object.fromEntries(Object.entries(this.context).filter(([key, _]) => key === fileName));
    }
}



export class CatalogBuilder {

    private contexts: IContextMap = {};

    private static compareStrings(a: string, b: string): number {
        return a.localeCompare(b);
    }

    private static concatUnique(array?: any[], items?: any[]): any[] {
        array = array || [];
        for (let item of items || []) {
            if (array.indexOf(item) === -1) {
                array.push(item);
            }
        }
        return array;
    }

    private static extendMessage(message: IMessage, data: Partial<IMessage>): IMessage {

        message.text = typeof data.text === 'string' ? data.text : message.text;
        message.textPlural = typeof data.textPlural === 'string' ? data.textPlural : message.textPlural;
        message.context = typeof data.context === 'string' ? data.context : message.context;
        message.references = CatalogBuilder.concatUnique(message.references, data.references);
        message.comments = CatalogBuilder.concatUnique(message.comments, data.comments);
        message.identifier = typeof data.identifier === 'string' ? data.identifier : message.identifier;
        return message;
    }

    private static normalizeMessage(message: Partial<IMessage>): IMessage {
        return CatalogBuilder.extendMessage({
            text: null,
            textPlural: null,
            context: null,
            references: [],
            comments: [],
            identifier: null
        }, message);
    }

    constructor(
        private stats?: IGettextExtractorStats
    ) {}

    public addMessage(message: Partial<IMessage>): void {
        message = CatalogBuilder.normalizeMessage(message);
        let context = this.getOrCreateContext(message.context || '');
        if (context[message.text!]) {
            if (message.textPlural && context[message.text!].textPlural && context[message.text!].textPlural !== message.textPlural) {
                throw new Error(`Incompatible plurals found for '${message.text}' ('${context[message.text!].textPlural}' and '${message.textPlural}')`);
            }

            if (message.textPlural && !context[message.text!].textPlural) {
                this.stats && this.stats.numberOfPluralMessages++;
            }

            CatalogBuilder.extendMessage(context[message.text!], message);
        } else {
            context[message.text!] = message as IMessage;

            this.stats && this.stats.numberOfMessages++;
            if (message.textPlural) {
                this.stats && this.stats.numberOfPluralMessages++;
            }
        }

        this.stats && this.stats.numberOfMessageUsages++;
    }

    public getRawMessages(): IMessage[] {
        let messages: IMessage[] = [];
        for (let context of Object.keys(this.contexts).sort(CatalogBuilder.compareStrings)) {
            messages = messages.concat(this.getMessagesByContext(context));
        }
        return messages;
    }

    public getMessages(): IMessage[] {
        return <IMessage []>this.getRawMessages().map(message => Object.fromEntries(Object.entries(message).filter(([key, _]) => key !== 'identifier')));
    }

    public getMessageDictionary(): Record<string, string> {
        return Object.fromEntries(this.getRawMessages().map(message => Object.entries(message).filter(([key, _]) => ['text', 'identifier'].includes(key)).map(([_, value]) => value).sort((a, b) => a === 'text' ? 1 : -1)));
    }

    public getTransformedMessages<T>(func: (messages: IMessage[]) => T): T {
        return func(this.getRawMessages());
    }

    public getContexts(): IContext[] {
        let contexts: IContext[] = [];
        for (let context of Object.keys(this.contexts).sort(CatalogBuilder.compareStrings)) {
            contexts.push({
                name: context,
                messages: this.getMessagesByContext(context)
            });
        }
        return contexts;
    }

    public getMessagesByContext(context: string): IMessage[] {
        let messages = this.contexts[context];
        if (!messages) {
            return [];
        }
        return Object.keys(messages).sort(CatalogBuilder.compareStrings).map(text => messages[text]);
    }

    private getOrCreateContext(context: string): IMessageMap {
        if (!this.contexts[context]) {
            this.contexts[context] = {};
            this.stats && this.stats.numberOfContexts++;
        }
        return this.contexts[context];
    }
}
