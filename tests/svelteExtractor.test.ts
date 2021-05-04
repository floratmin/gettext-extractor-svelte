import { SvelteGettextExtractor, callExpressionExtractor, ICustomJsExtractorOptions, FunctionExtractorBuilder } from '../src';
import { IMessage } from 'gettext-extractor/dist/builder';
import { HtmlExtractors } from 'gettext-extractor';

function i(strings: TemplateStringsArray): string {
    const stringArray = strings[0].split('\n');
    const indentation = stringArray[1].match(/\s*/g)![0].length;
    return stringArray.slice(1, -1).map((line) => line.slice(indentation)).join('\n');
}

function sortByText(comments1: IMessage, comments2: IMessage): number {
    if (comments1.text && comments2.text) {
        return comments1.text >= comments2.text ? 1 : -1;
    }
    return 0;
}

function sortMessages(extractor: IMessage[]): IMessage[] {
    return extractor.sort(sortByText);
}

function getExtractor(svelteFile: string, options: ICustomJsExtractorOptions): SvelteGettextExtractor {
    const extractor = new SvelteGettextExtractor();
    extractor.createSvelteParser()
        .addExtractor(callExpressionExtractor('_', options))
        .parseSvelteString(svelteFile, 'src/App.svelte');
    return extractor;
}

function getMessagesFromExtractor(extractor: SvelteGettextExtractor): IMessage[] {
    return sortMessages(extractor.getMessages());
}


describe('Extract translation functions to gettext and to function dict', () => {
    test('Comments are strings', () => {
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            }
        };
        const svelteFile = i`
            <script lang="ts">
                import Component from './Component.svelte';
                const translate = _('Foo', 'Context', 'Comment');
            </script>

            <p>
                {
                    _('Bar', 'Context', 'Comment')
                 +
                    _('Baz', 'Context', 'Comment')
                }
            </p>
            <Component label="{
                    _('Bax', 'Context', 'Comment')
                +
                    _('Bay', 'Context', 'Comment')
            }" />
            `;

        const extractor = getExtractor(svelteFile, options);
        expect(
            getMessagesFromExtractor(extractor)
        ).toEqual(sortMessages([
            {
                text: 'Foo',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:3'
                ],
                textPlural: null
            },
            {
                text: 'Bar',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:8'
                ],
                textPlural: null
            },
            {
                text: 'Baz',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:10'
                ],
                textPlural: null
            },
            {
                text: 'Bax',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:14'
                ],
                textPlural: null
            },
            {
                text: 'Bay',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:16'
                ],
                textPlural: null
            }
        ]));

        expect(extractor.getFunctions()).toEqual({
            'src/App.svelte': [
                {
                    functionString: '_(\'Foo\', \'Context\', \'Comment\')',
                    identifier: '{"text":"Foo","context":"Context"}',
                    startChar: 89,
                    endChar: 119
                },
                {
                    functionString: '_(\'Bar\', \'Context\', \'Comment\')',
                    identifier: '{"text":"Bar","context":"Context"}',
                    startChar: 150,
                    endChar: 180
                },
                {
                    functionString: '_(\'Baz\', \'Context\', \'Comment\')',
                    identifier: '{"text":"Baz","context":"Context"}',
                    startChar: 196,
                    endChar: 226
                },
                {
                    functionString: '_(\'Bax\', \'Context\', \'Comment\')',
                    identifier: '{"text":"Bax","context":"Context"}',
                    startChar: 266,
                    endChar: 296
                },
                {
                    functionString: '_(\'Bay\', \'Context\', \'Comment\')',
                    identifier: '{"text":"Bay","context":"Context"}',
                    startChar: 311,
                    endChar: 341
                }
            ]
        });
    });
    test('Comments are objects with fallback', () => {
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            comments: {
                commentString: 'comment',
                props: {
                    props: ['{', '}']
                },
                fallback: true
            }
        };
        const svelteFile = i`
            <script>
                import Component from './Component.svelte';
                const translate = _('Foo', 'Context', {comment: 'Comment'});
            </script>

            <p>
                {
                    _('Bar', 'Context', {comment: 'Comment', props: {BAR: 'Bar comment'}})
                 +
                    _('Baz', {comment: 'Comment'})
                }
            </p>
            <Component label="{
                    _('Bax', 'Context', {comment: 'Comment', props: {BAX: 'Bax comment'}})
                +
                    _('Bay', {comment: 'Comment'})
            }" />
            `;

        expect(
            getMessagesFromExtractor(getExtractor(svelteFile, options))
        ).toEqual(sortMessages([
            {
                text: 'Foo',
                context: 'Context',
                comments: ['Comment'],
                references: [
                   'src/App.svelte:3'
                ],
                textPlural: null
            },
            {
                text: 'Bar',
                context: 'Context',
                comments: [
                    'Comment',
                    '{BAR}: Bar comment'
                ],
                references: [
                    'src/App.svelte:8'
                ],
                textPlural: null
            },
            {
                text: 'Baz',
                comments: ['Comment'],
                context: null,
                references: [
                    'src/App.svelte:10'
                ],
                textPlural: null
            },
            {
                text: 'Bax',
                context: 'Context',
                comments: [
                    'Comment',
                    '{BAX}: Bax comment'
                ],
                references: [
                    'src/App.svelte:14'
                ],
                textPlural: null
            },
            {
                text: 'Bay',
                context: null,
                comments: ['Comment'],
                references: [
                    'src/App.svelte:16'
                ],
                textPlural: null
            }
        ]));
    });
    test('Comments are objects/strings without fallback', () => {
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            comments: {
                commentString: 'comment',
                props: {
                    props: ['{', '}']
                }
            }
        };
        const svelteFile = i`
            <script>
                import Component from './Component.svelte';
                const translate = _('Foo', 'Context', {comment: 'Comment'});
            </script>

            <p>
                {
                    _('Bar', 'Context', {comment: 'Comment', props: {BAR: 'Bar comment'}})
                +
                    _('Baz', 'Context', 'Comment')
                }
            </p>
            <Component label="{
                    _('Bax', 'Context', {comment: 'Comment', props: {BAX: 'Bax comment'}})
                +
                    _('Bay', 'Context', 'Comment')
            }" />
            `;

        expect(
            getMessagesFromExtractor(getExtractor(svelteFile, options))
        ).toEqual(sortMessages([
            {
                text: 'Foo',
                context: 'Context',
                comments: ['Comment'],
                references: [
                   'src/App.svelte:3'
                ],
                textPlural: null
            },
            {
                text: 'Bar',
                context: 'Context',
                comments: [
                    'Comment',
                    '{BAR}: Bar comment'
                ],
                references: [
                    'src/App.svelte:8'
                ],
                textPlural: null
            },
            {
                text: 'Baz',
                comments: ['Comment'],
                context: 'Context',
                references: [
                    'src/App.svelte:10'
                ],
                textPlural: null
            },
            {
                text: 'Bax',
                context: 'Context',
                comments: [
                    'Comment',
                    '{BAX}: Bax comment'
                ],
                references: [
                    'src/App.svelte:14'
                ],
                textPlural: null
            },
            {
                text: 'Bay',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:16'
                ],
                textPlural: null
            }
        ]));
    });
    test('Comments are objects/strings without fallback, multiple svelte functions per string, each block', () => {
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            comments: {
                commentString: 'comment',
                props: {
                    props: ['{', '}']
                },
                fallback: false
            }
        };
        const svelteFile = i`
            <script>
                import Component from './Component.svelte';
                const translate = _('Foo', 'Context', {comment: 'Comment'});
            </script>

            <p>
                {_('Bar', 'Context', {comment: 'Comment', props: {BAR: 'Bar comment'}})}
                {_('Baz', 'Context', 'Comment')}
            </p>
            <Component label="
                {_('Bax', 'Context', {comment: 'Comment', props: {BAX: 'Bax comment'}})}
                {_('Bay', 'Context', 'Comment')}
            " />
            {#each [_('Foo1', 'Context', 'Comment'), _('Foo2', 'Context', {comment: 'Comment'})] as content}
                <p>{content}{_('Bar1', 'Context', 'Comment')}</p>
            {/each}
            `;

        expect(
            getMessagesFromExtractor(getExtractor(svelteFile, options))
        ).toEqual(sortMessages([
            {
                text: 'Foo',
                context: 'Context',
                comments: ['Comment'],
                references: [
                   'src/App.svelte:3'
                ],
                textPlural: null
            },
            {
                text: 'Bar',
                context: 'Context',
                comments: [
                    'Comment',
                    '{BAR}: Bar comment'
                ],
                references: [
                    'src/App.svelte:7'
                ],
                textPlural: null
            },
            {
                text: 'Baz',
                comments: ['Comment'],
                context: 'Context',
                references: [
                    'src/App.svelte:8'
                ],
                textPlural: null
            },
            {
                text: 'Bax',
                context: 'Context',
                comments: [
                    'Comment',
                    '{BAX}: Bax comment'
                ],
                references: [
                    'src/App.svelte:11'
                ],
                textPlural: null
            },
            {
                text: 'Bay',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:12'
                ],
                textPlural: null
            },
            {
                text: 'Foo1',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:14'
                ],
                textPlural: null
            },
            {
                text: 'Foo2',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:14'
                ],
                textPlural: null
            },
            {
                text: 'Bar1',
                context: 'Context',
                comments: ['Comment'],
                references: [
                    'src/App.svelte:15'
                ],
                textPlural: null
            }
        ]));
    });
    test('Read files with glob', () => {
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            comments: {
                commentString: 'comment',
                props: {
                    props: ['{', '}']
                }
            },
            identifierKeys: ['text']
        };
        const extractor = new SvelteGettextExtractor();
        extractor.createSvelteParser()
            .addExtractor(callExpressionExtractor('t', options))
            .parseFilesGlob('./**/[!Error]*.svelte');
        const messages = sortMessages(extractor.getMessages());

        expect(messages).toEqual(sortMessages([
            {
                text: 'Welcome {NAME}',
                textPlural: null,
                context: 'app',
                references: [
                    'tests/App.svelte:4'
                ],
                comments: [
                    'Welcoming the user',
                    '{NAME}: Name of user'
                ]
            },
            {
                text: 'Hello World',
                textPlural: null,
                context: 'app',
                references: [
                    'tests/App.svelte:8'
                ],
                comments: ['Computer is greeting']
            },
            {
                text: 'FooCaption',
                textPlural: null,
                context: 'Context',
                comments: [
                    'Comment',
                    'path: https://www.example.com'
                ],
                references: [
                    'tests/Readme.svelte:5'
                ]
            },
            {
                text: 'Foo',
                textPlural: null,
                context: null,
                references: [
                    'tests/Readme.svelte:14'
                ],
                comments: []
            },
            {
                text: 'Bar',
                textPlural: null,
                context: null,
                comments: [],
                references: [
                    'tests/Readme.svelte:15'
                ]
            },
            {
                text: 'Baz',
                textPlural: null,
                context: null,
                comments: [],
                references: [
                    'tests/Readme.svelte:15'
                ]
            },
            {
                text: 'Bax',
                textPlural: null,
                context: 'Context',
                comments: [
                    'Comment'
                ],
                references: [
                    'tests/Readme.svelte:17'
                ]
            },
            {
                text: 'Hello {PLACE}',
                textPlural: null,
                context: 'Context',
                comments: [
                    'Multiline',
                    'Comment',
                    'messageformat: This could be a messageformat function',
                    '{PLACE}: The place where you are'
                ],
                references: [
                    'tests/Readme.svelte:18'
                ]
            }
        ]));
        expect(extractor.getFunctions()).toEqual({
            'tests/App.svelte': [
                {
                    functionString: 't(\'Welcome {NAME}\', \'app\', {comment: \'Welcoming the user\', props: {NAME: \'Name of user\'}}, {NAME: name})',
                    identifier: 'Welcome {NAME}',
                    startChar: 80,
                    endChar: 184
                },
                {
                    functionString: 't(\'Hello World\', \'app\', \'Computer is greeting\')',
                    identifier: 'Hello World',
                    startChar: 210,
                    endChar: 257
                }
            ],
            'tests/Readme.svelte': [
                {
                    functionString: `t(
        'FooCaption',
        'Context',
        {comment: 'Comment', path: 'https://www.example.com'}
    )`,
                    identifier: 'FooCaption',
                    startChar: 162,
                    endChar: 273
                },
                {
                    functionString: 't(\'Foo\')',
                    identifier: 'Foo',
                    startChar: 324,
                    endChar: 332
                },
                {
                    functionString: 't(\'Bar\')',
                    identifier: 'Bar',
                    startChar: 350,
                    endChar: 358
                },
                {
                    functionString: 't(\'Baz\')',
                    identifier: 'Baz',
                    startChar: 360,
                    endChar: 368
                },
                {
                    functionString: 't(\'Bax\', \'Context\', {comment: \'Comment\'})',
                    identifier: 'Bax',
                    startChar: 428,
                    endChar: 469
                },
                {
                    functionString: `t(
                'Hello {PLACE}',
                'Context',
                {
                    comment: 'Multiline\\nComment',
                    props: {PLACE: 'The place where you are'},
                    messageformat: 'This could be a messageformat function'
                },
                {PLACE: place}
            )`,
                    identifier: 'Hello {PLACE}',
                    startChar: 486,
                    endChar: 820
                }
            ]
        });
    });
    test('Throw error on file Error.svelte', () => {
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            comments: {
                commentString: 'comment',
                props: {
                    props: ['{', '}']
                }
            }
        };
        expect( () => new SvelteGettextExtractor()
            .createSvelteParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseFile(`tests/Error.svelte`)
        ).toThrow();
    });
    test('Extracts from plain js', () => {
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            }
        };
        const jsString = i`
        const s = _('Foo');
        `;
        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(jsString, './src/file.js');
        expect(sortMessages(extractor.getMessages())).toEqual([
            {
                text: 'Foo',
                textPlural: null,
                comments: [],
                context: null,
                references: [
                    'src/file.js:1'
                ]
            }
        ]);
        expect(extractor.getFunctions()).toEqual({
            'src/file.js': [
                {
                    functionString: '_(\'Foo\')',
                    identifier: '{"text":"Foo"}',
                    startChar: 10,
                    endChar: 18
                }
            ]
        });
    });
    test('Extracts function declaration', () => {
        const functionExtractor = new FunctionExtractorBuilder();
        const findFunctionDeclaration = functionExtractor.functionDeclaration('foo', true);
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            translatorFunction:
                {
                    functionExtractor: findFunctionDeclaration,
                    identifier: 'functionIdentifier'
                }
        };
        const jsString = i`
        // some comments
        function foo(bar: string): string { // other comments
            return bar;
        }
        `;

        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(jsString, './src/file.js');

        expect(extractor.getFunctions()).toEqual({
            'src/file.js': [
                {
                    functionString: i`
                    function foo(bar: string): string { // other comments
                        return bar;
                    }
                    `,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 17,
                    endChar: 88
                }
            ]
        });
    });
    test('Extracts function expression, multiple positions, restrict parsing to src/file.ts', () => {
        const functionExtractor = new FunctionExtractorBuilder();
        const findFunctionExpression = functionExtractor.variableDeclaration('foo', functionExtractor.functionExpression(undefined, true), true);
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            translatorFunction:
                {
                    functionExtractor: findFunctionExpression,
                    identifier: 'functionIdentifier',
                    restrictToFileName: 'src/file.ts'
                }
        };
        const jsString = i`
        const /* some comments
        going bad */foo = function(bar: string): string {
            return bar; /* other comments */
        };
        `;

        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(jsString, './src/file.ts');

        expect(extractor.getFunctions()).toEqual({
            'src/file.ts': [
                {
                    functionString: i`
                    function(bar: string): string {
                        return bar; /* other comments */
                    }
                    `,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 41,
                    endChar: 111
                },
                {
                    functionString: i`
                    foo = function(bar: string): string {
                        return bar; /* other comments */
                    }
                    `,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 35,
                    endChar: 111
                }
            ]
        });
    });
    test('Extracts class declaration and class expression', () => {
        const functionExtractor = new FunctionExtractorBuilder();
        const findTranslationClassDeclaration = functionExtractor.classDeclaration('Foo', [
            functionExtractor.methodDeclaration('bar', true),
            functionExtractor.propertyDeclaration('baz', functionExtractor.functionExpression( undefined, true)),
            functionExtractor.propertyDeclaration('bax', functionExtractor.arrowFunction(true))
        ]);
        const findTranslationClassExpression = functionExtractor.variableDeclaration('Foo2', functionExtractor.classExpression([
            functionExtractor.methodDeclaration('bar2', true)
        ]));
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            translatorFunction:
                [
                    {
                        functionExtractor: findTranslationClassDeclaration,
                        identifier: 'functionIdentifier'
                    },
                    {
                        functionExtractor: findTranslationClassExpression,
                        identifier: 'functionIdentifier2'
                    }
                ]
        };
        const jsString =
`// some comments
export class Foo {
    // some comments
    bar(a: string): string {
        return a;
    }
    /* some comments */
    baz = function(b: string): string {
        return b;
    }
    bax = (c: string): string => c;
}
let Foo2 = class Bar2 {
    bar2(d: string): string {
        return d;
    }
}`;

        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(jsString, './src/file.ts');

        expect(extractor.getFunctions()).toEqual({
            'src/file.ts': [
                {
                    functionString:
`bar(a: string): string {
        return a;
    }`,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 61,
                    endChar: 109
                },
                {
                    functionString:
`function(b: string): string {
        return b;
    }`,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 144,
                    endChar: 197
                },
                {
                    functionString: `(c: string): string => c`,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 208,
                    endChar: 232
                },
                {
                    functionString:
`bar2(d: string): string {
        return d;
    }`,
                    identifier: 'functionIdentifier2',
                    declaration: true,
                    startChar: 264,
                    endChar: 313
                }
            ]
        });
    });
    test('Extracts class expression, readme example', () => {
        const functionExtractor = new FunctionExtractorBuilder();
        const findTranslationClassExpression = functionExtractor.variableDeclaration('foo', functionExtractor.classExpression([
            functionExtractor.methodDeclaration('bar', true)
        ]));
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            translatorFunction:
                [
                    {
                        functionExtractor: findTranslationClassExpression,
                        identifier: 'translatorFunction',
                        restrictToFileName: 'src/file.ts'
                    }
                ]
        };
        const jsString =
`let foo = class Bar {
    bar(translationObject: any) {
        return 'I am translated';
    }
}`;

        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(jsString, './src/file.ts');

        console.log(extractor.getFunctions());
        expect(extractor.getFunctions()).toEqual({
            'src/file.ts': [
                {
                    functionString:
`bar(translationObject: any) {
        return 'I am translated';
    }`,
                    identifier: 'translatorFunction',
                    declaration: true,
                    startChar: 26,
                    endChar: 95
                }
            ]
        });
    });
    test('Extracts class getters / setters', () => {
        const functionExtractor = new FunctionExtractorBuilder();
        const findTranslationClassDeclaration = functionExtractor.classDeclaration('Foo', [
            functionExtractor.getAccessor('bar', undefined, true),
            functionExtractor.setAccessor('bar', undefined, true)
        ]);
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            translatorFunction:
                {
                    functionExtractor: findTranslationClassDeclaration,
                    identifier: 'functionIdentifier'
                }
        };
        const jsString =
`// some comments
export class Foo {
    private b: string;
    /* some comments */
    constructor() {
        this.b = 'Bar';
    }
    // some comments
    get bar(): string {
        return this.b;
    } /* some comments */
    set bar (b: string) {
        this.b = b;
    }
}`;

        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(jsString, './src/file.ts');

        expect(extractor.getFunctions()).toEqual({
            'src/file.ts': [
                {
                    functionString:
`get bar(): string {
        return this.b;
    }`,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 158,
                    endChar: 206
                },
                {
                    functionString:
`set bar (b: string) {
        this.b = b;
    }`,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 231,
                    endChar: 278
                }
            ]
        });
    });
    test('Extracts expression and labeled statement', () => {
        const functionExtractor = new FunctionExtractorBuilder();
        const findExpressionStatement = functionExtractor.expressionStatement('foo', functionExtractor.functionExpression(), true );
        const findLabeledStatement = functionExtractor.labeledStatement(functionExtractor.expressionStatement('bar'), true);
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            translatorFunction:
                [
                    {
                        functionExtractor: findExpressionStatement,
                        identifier: 'functionIdentifier'
                    },
                    {
                        functionExtractor: findLabeledStatement,
                        identifier: 'functionIdentifier2'
                    }
                ]
        };
        const jsString = i`
        foo = function(bar: string): string { // other comments
            return bar;
        };
        $: bar = (baz: string): string => baz;
        `;

        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(jsString, './src/file.js');

        expect(extractor.getFunctions()).toEqual({
            'src/file.js': [
                {
                    functionString: i`
                    foo = function(bar: string): string { // other comments
                        return bar;
                    };
                    `,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 0,
                    endChar: 74
                },
                {
                    functionString: '$: bar = (baz: string): string => baz;',
                    identifier: 'functionIdentifier2',
                    declaration: true,
                    startChar: 75,
                    endChar: 113
                }
            ]
        });
    });
    test('Extracts from object literal expression', () => {
        const functionExtractor = new FunctionExtractorBuilder();
        const findTranslationObject = functionExtractor.variableDeclaration('foo', functionExtractor.objectLiteralExpression([
            functionExtractor.propertyAssignment('bar', functionExtractor.arrowFunction(), true),
            functionExtractor.methodDeclaration('baz', true),
            functionExtractor.propertyAssignment('bax', functionExtractor.objectLiteralExpression([
                functionExtractor.propertyAssignment('bay', functionExtractor.arrowFunction(), true)
            ]), true)
        ], true), true);
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            translatorFunction:
                {
                    functionExtractor: findTranslationObject,
                    identifier: 'functionIdentifier'
                }
        };
        const jsString =
`const foo = {
    bar: (a: string): string => a, // some comments
    baz(b: string):string {return b}, /* some comments */
    bax: { // rendered comments
        /* rendered comments */
        bay: (c: string): string {
            return string => c
        }
    }
};`;
        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(jsString, './src/file.ts');
        expect(extractor.getFunctions()).toEqual({
            'src/file.ts': [
                {
                    functionString: 'bar: (a: string): string => a',
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 18,
                    endChar: 47
                },
                {
                    functionString: 'baz(b: string):string {return b}',
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 70,
                    endChar: 102
                },
                {
                    functionString:
`bay: (c: string): string {
            return string => c
        }`,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 196,
                    endChar: 263
                },
                {
                    functionString:
`bax: { // rendered comments
        /* rendered comments */
        bay: (c: string): string {
            return string => c
        }
    }`,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 128,
                    endChar: 269
                },
                {
                    functionString:
`{
    bar: (a: string): string => a, // some comments
    baz(b: string):string {return b}, /* some comments */
    bax: { // rendered comments
        /* rendered comments */
        bay: (c: string): string {
            return string => c
        }
    }
}`,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 12,
                    endChar: 271
                },
                {
                    functionString:
`foo = {
    bar: (a: string): string => a, // some comments
    baz(b: string):string {return b}, /* some comments */
    bax: { // rendered comments
        /* rendered comments */
        bay: (c: string): string {
            return string => c
        }
    }
}`,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 6,
                    endChar: 271
                }
            ]
        });
    });
    test('Extracts function expression from svelte files (looks like function declaration when between script tags)', () => {
        const functionExtractor = new FunctionExtractorBuilder();
        const findFunctionDeclaration = functionExtractor.functionExpression(undefined, true);
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            translatorFunction:
                {
                    functionExtractor: findFunctionDeclaration,
                    identifier: 'functionIdentifier'
                }
        };
        const svelteString = i`
        <script lang="ts">
            // some comments
            function foo(bar: string): string { // other comments
                return bar;
            }
        </script>
        `;

        const extractor = new SvelteGettextExtractor();
        extractor.createSvelteParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(svelteString, './src/App.svelte');

        expect(extractor.getFunctions()).toEqual({
            'src/App.svelte': [
                {
                    functionString: i`
                    function foo(bar: string): string { // other comments
                            return bar;
                        }
                    `,
                    identifier: 'functionIdentifier',
                    declaration: true,
                    startChar: 44,
                    endChar: 123
                }
            ]
        });
    });
    test('Does not find anything if function not in restricted file name', () => {
        const functionExtractor = new FunctionExtractorBuilder();
        const findFunctionExpression = functionExtractor.variableDeclaration('foo', functionExtractor.functionExpression(undefined, true), true);
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            },
            translatorFunction:
                [
                    {
                        functionExtractor: findFunctionExpression,
                        restrictToFileName: 'src/nofile.ts'
                    }
                ]
        };
        const jsString = i`
        const /* some comments
        going bad */foo = function(bar: string): string {
            return bar; /* other comments */
        };
        `;

        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseString(jsString, './src/file.ts');

        expect(extractor.getFunctions()).toEqual({});
    });
    test('Extracts from js files', () => {
        const options: ICustomJsExtractorOptions = {
            arguments: {
                text: 0,
                context: 1,
                comments: 2
            }
        };
        const extractor = new SvelteGettextExtractor();
        extractor.createJsParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseFilesGlob('./tests/**/*.js');
        expect(sortMessages(extractor.getMessages())).toEqual([
            {
                text: 'Foo',
                textPlural: null,
                comments: ['Comment'],
                context: 'Context',
                references: [
                    'tests/file.js:3'
                ]
            }
        ]);
        expect(extractor.getFunctions()).toEqual({
            'tests/file.js': [
                {
                    functionString: '_(\'Foo\', \'Context\', \'Comment\')',
                    identifier: '{"text":"Foo","context":"Context"}',
                    startChar: 37,
                    endChar: 67
                }
            ]
        });
    });
    test('Parses HTML', () => {
        const htmlFile = i`
            <p translate translate-context="Context">Foo</p>
        `;
        const extractor = new SvelteGettextExtractor();
        extractor.createHtmlParser([HtmlExtractors.elementContent(
            '[translate]', {
                attributes: {
                    context: 'translate-context'
                }
            }
        )]).parseString(htmlFile, 'src/index.html');
        expect(extractor.getMessages()).toEqual([
            {
                text: 'Foo',
                textPlural: null,
                context: 'Context',
                references: [
                    'src/index.html:1'
                ],
                comments: []
            }
        ]);
        expect(Object.keys(extractor.getFunctions()).length).toEqual(0);
    });
});
