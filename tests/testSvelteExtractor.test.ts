import { SvelteGettextExtractor, callExpressionExtractor, ICustomJsExtractorOptions } from '../src';
import { IMessage } from 'gettext-extractor/dist/builder';

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

function sortMessages(messages: IMessage[]): IMessage[] {
    return messages.sort(sortByText);
}

function getMessagesFromExtractor(svelteFile: string, options: ICustomJsExtractorOptions): IMessage[] {
    const extractor = new SvelteGettextExtractor();
    extractor.createSvelteParser()
        .addExtractor(callExpressionExtractor('_', options))
        .parseSvelteString(svelteFile, 'src/App.svelte');
    return sortMessages(extractor.getMessages());
}

describe('Extract translation functions to gettext', () => {
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

        expect(
            getMessagesFromExtractor(svelteFile, options)
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
            getMessagesFromExtractor(svelteFile, options)
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
            getMessagesFromExtractor(svelteFile, options)
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
            getMessagesFromExtractor(svelteFile, options)
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
            }
        };
        const extractor = new SvelteGettextExtractor();
        extractor.createSvelteParser()
            .addExtractor(callExpressionExtractor('_', options))
            .parseFilesGlob('**/[!Error]*.svelte');
        const messages = sortMessages(extractor.getMessages());

        console.log(messages);
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
                context: 'Context',
                comments: [
                    'Comment'
                ],
                references: [
                    'tests/Readme.svelte:15'
                ]
            },
            {
                text: 'Baz',
                textPlural: null,
                context: 'Context',
                comments: [
                    'Comment'
                ],
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
                    '{PLACE}: The place where you are'
                ],
                references: [
                    'tests/Readme.svelte:18'
                ]
            }
        ]));
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
});
