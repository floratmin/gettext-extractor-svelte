import { SvelteGettextExtractor, nodeExtractor, FunctionExtractorBuilder, TTranslatorFunction } from '../src';
import { i } from './svelteExtractor.test';

describe('JS: Function Extractor', () => {
  test('Extracts functions', () => {
    const functionExtractor = new FunctionExtractorBuilder();
    const functionDeclaration = functionExtractor.functionDeclaration('foo', true);
    const translatorFunction = {
      functionExtractor: functionDeclaration,
      identifier: 'functionDeclaration',
      functionName: 'foo',
    };
    const extractor = new SvelteGettextExtractor();
    const parser = extractor.createSvelteParser().addExtractor(nodeExtractor(translatorFunction));
    const jsString = i`
        // some comments
        function foo(bar: string): string { // other comments
            return bar;
        }
        `;
    parser.parseString(jsString, 'foo.js');
    const extractedFunctions = {
      'foo.js': [
        {
          functionString: `function foo(bar: string): string { // other comments
    return bar;
}`,
          functionData: {
            functionName: 'foo',
            functionArgs: [],
          },
          startChar: 17,
          endChar: 88,
          identifier: 'functionDeclaration',
          definition: true,
        },
      ],
    };
    expect(extractor.getFunctions()).toEqual(extractedFunctions);
  });
  test('Extracts function import supplied to .parseString method', () => {
    const functionExtractor = new FunctionExtractorBuilder();
    const importDeclaration = functionExtractor.importDeclaration('./translations', functionExtractor.importClause('t'), true);

    const translatorFunctions: TTranslatorFunction[] = [
      {
        identifier: 'translationFunctionImport',
        functionName: 't',
        functionExtractor: importDeclaration,
      },
    ];

    const extractor = new SvelteGettextExtractor();

    extractor.createJsParser().addExtractor(nodeExtractor()).parseString('import t from "./translations";', 'src/app.js', { translatorFunctions });

    const extractedFunctions = {
      'src/app.js': [
        {
          functionString: 'import t from "./translations";',
          functionData: {
            functionName: 't',
            functionArgs: [],
          },
          startChar: 0,
          endChar: 31,
          identifier: 'translationFunctionImport',
          definition: true,
        },
      ],
    };
    expect(extractor.getFunctions()).toEqual(extractedFunctions);
  });
});
