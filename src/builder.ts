import { IMessage } from 'gettext-extractor/dist/builder';

export interface IFunction {
    functionString: string;
    fileName: string;
    startChar: number;
    endChar: number;
}

export interface IParsed {
    messages:  IMessage[];
    functionsData: IFunction[];
}

export type IFunctionDict = Record<string, Pick<IFunction, 'functionString' | 'startChar' | 'endChar'>[]>;

export class FunctionBuilder {
    private context: IFunctionDict = {};

    public addFunction(functionData: IFunction): void {
        if (this.context[functionData.fileName]) {
            this.context[functionData.fileName].push({
                functionString: functionData.functionString,
                startChar: functionData.startChar,
                endChar: functionData.endChar
            });
        } else {
            this.context[functionData.fileName] = [
                {
                    functionString: functionData.functionString,
                    startChar: functionData.startChar,
                    endChar: functionData.endChar
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
