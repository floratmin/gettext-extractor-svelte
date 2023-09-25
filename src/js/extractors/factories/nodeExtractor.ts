import { TTranslatorFunction } from './callExpression';
import * as ts from 'typescript';
import { IAddMessageCallback } from 'gettext-extractor/dist/parser';
import { IAddFunctionCallBack, IFunctionData } from '../../../parser';
import { IJsExtractorFunction } from '../../parser';
import { FunctionExtractor, TextNode } from '../functionExtractors';
import { ImportClause } from 'typescript';

export function nodeExtractor(translatorFunctions?: TTranslatorFunction | TTranslatorFunction[]): IJsExtractorFunction {
  return (
    node: ts.Node,
    sourceFile: ts.SourceFile,
    addMessage: IAddMessageCallback,
    addFunction?: IAddFunctionCallBack,
    startChar?: number,
    source?: string,
    translatorFunctionsByFile?: TTranslatorFunction | TTranslatorFunction[],
  ) => {
    extractFunctions(node, sourceFile, translatorFunctions, translatorFunctionsByFile, addFunction, source);
  };
}

export function extractFunctions(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  translatorFunctions?: TTranslatorFunction | TTranslatorFunction[],
  translatorFunctionsByFile?: TTranslatorFunction | TTranslatorFunction[],
  addFunction?: IAddFunctionCallBack,
  source?: string,
): void {
  if (source && (translatorFunctions || translatorFunctionsByFile) && addFunction) {
    [
      ...(translatorFunctions ? (Array.isArray(translatorFunctions) ? translatorFunctions : [translatorFunctions]) : []),
      ...(translatorFunctionsByFile ? (Array.isArray(translatorFunctionsByFile) ? translatorFunctionsByFile : [translatorFunctionsByFile]) : []),
    ].forEach((translatorFunction) => {
      if (!translatorFunction.restrictToFile || translatorFunction.restrictToFile === sourceFile.fileName) {
        const functionExtractor = translatorFunction.functionExtractor;
        const functionNodes = getFunctionFromNode(node, functionExtractor);
        if (functionNodes) {
          if (checkPosLength(functionExtractor, functionNodes)) {
            functionNodes.forEach((slice) => {
              const functionString = source.slice(slice.pos, slice.end);
              const diff = getDiff(functionString);
              const functionData: IFunctionData = {
                functionString: functionString.slice(diff),
                ...(translatorFunction.functionName
                  ? {
                      functionData: {
                        functionName: translatorFunction.functionName,
                        functionArgs: [],
                      },
                    }
                  : {}),
                startChar: slice.pos + diff,
                endChar: slice.end,
                fileName: sourceFile.fileName,
                definition: true,
                ...(translatorFunction.identifier !== undefined ? { identifier: translatorFunction.identifier } : {}),
              };
              addFunction(functionData);
            });
          } else {
            throw new Error(`Could not find function specified by functionExtractor${sourceFile.fileName ? ` in file ${sourceFile.fileName}` : ''}`);
          }
        }
      }
    });
  }
}

function checkPosLength(nodeFinder: FunctionExtractor, posList: CharPos | false): boolean {
  return posList && getPosCount(nodeFinder) === posList.length;
}

function getPosCount(nodeFinder: FunctionExtractor | TextNode): number {
  return Object.entries(nodeFinder).reduce((sum, entries) => {
    const [key, value] = entries;

    if (key === 'getPos') {
      return sum + 1;
    } else if (typeof value !== 'object') {
      return sum;
    } else if (Array.isArray(value)) {
      return value.map((v) => getPosCount(v)).reduce((s, p) => s + p, 0);
    }

    return getPosCount(value);
  }, 0);
}

type CharPos = { pos: number; end: number }[];

function getFunctionFromNode(node: ts.Node, nodeFinder: FunctionExtractor): CharPos | false {
  if (node.kind === nodeFinder.kind) {
    const m = <any>node;
    return Object.entries(nodeFinder)
      .filter(([prop, _]) => prop !== 'kind')
      .reduce(
        (all, entry) => {
          if (all) {
            const [prop, value] = entry;
            if ((['name', 'left', 'moduleSpecifier'].includes(prop) || (prop === 'expression' && m[prop].text)) && value) {
              const c = <TextNode>value;
              const textProp = <'name' | 'left'>prop;
              if (nodeFinder[textProp] && nodeFinder[textProp]?.kind === c.kind) {
                if (m[textProp] && c.text === m[textProp].text) {
                  return all;
                } else {
                  return false;
                }
              }
            } else if (prop === 'getPos') {
              all = [...all, { pos: <number>m.pos, end: <number>m.end }];
              return all;
            } else if (['properties', 'members'].includes(prop) && value) {
              const foundNodes = (<FunctionExtractor[]>value).flatMap((v) =>
                m[prop].map((p: any) => getFunctionFromNode(p, v)).filter((s: any) => s && s.length > 0),
              );
              if (foundNodes) {
                return [...all, ...foundNodes.flatMap((nodes) => <CharPos>nodes).filter((pos) => pos)];
              }
            } else if (['elements'].includes(prop) && value) {
              let foundNodes = (<FunctionExtractor[]>value).flatMap((v) => m[prop].map((p: any) => getFunctionFromNode(p, v)));
              if (foundNodes.some((s) => s)) {
                foundNodes = foundNodes.filter((s: any) => s && s.length > 0);
                if (foundNodes) {
                  return [...all, ...foundNodes.flatMap((nodes) => <CharPos>nodes).filter((pos) => pos)];
                }
              }
            } else if (prop === 'importClause' && value) {
              let foundName: false | CharPos = false;
              const name = (<FunctionExtractor>value).name;
              if (name) {
                if (m[prop].name) {
                  const { text } = <ts.Identifier>m[prop].name;
                  if (text === name.text) {
                    foundName = [];
                  }
                }
              }
              let foundElements: false | CharPos = false;
              if (m[prop].namedBindings && (<ts.ImportClause>value).namedBindings) {
                foundElements =
                  (<ts.ImportClause>value).namedBindings && m[prop].namedBindings
                    ? getFunctionFromNode(m[prop].namedBindings, <FunctionExtractor>(<ts.ImportClause>value).namedBindings)
                    : false;
              }
              if ((<FunctionExtractor>value).getPos) {
                all = [...all, { pos: <number>m[prop].pos, end: <number>m[prop].end }];
              }
              if (foundElements && (!name || foundName)) {
                return [...all, ...foundElements];
              }
              if (foundName || (!name && !(<ImportClause>value).namedBindings)) {
                return all;
              }
            } else {
              const foundNodes = getFunctionFromNode(m[prop], <FunctionExtractor>value);
              if (foundNodes && foundNodes.every((n) => n)) {
                return [...all, ...foundNodes];
              }
            }
          }
          return false;
        },
        <CharPos | false>[],
      );
  }
  return false;
}

function removeJsCommentsStart(functionString: string): string {
  const match = functionString.replace(/^\s*/, '').match(/^(?:\/\*[\s\S]+?\*\/|\/\/[^\n]*\r?\n)([\s\S]*)/);
  return match ? removeJsCommentsStart(match[1]) : functionString.replace(/^\s*/, '');
}

function getDiff(functionString: string): number {
  const shortenedFunctionString = removeJsCommentsStart(functionString);
  return functionString.length - shortenedFunctionString.length;
}
