import { callExpressionExtractor, ICustomJsExtractorOptions } from '../src';
import { CatalogBuilder, IMessage } from 'gettext-extractor/dist/builder';
import { JsParser } from 'gettext-extractor/dist/js/parser';

describe('JS: Call Expression Extractor with comment function', () => {
    let builder: CatalogBuilder,
        parser: JsParser,
        messages: IMessage[];

    beforeEach(() => {
        messages = [];
        builder = <any>{
            addMessage: jest.fn((message: IMessage) => {
                messages.push(message);
            })
        };
    });

    describe('test js extractor function', () => {
        function createParser(calleeName: string | string[], options: ICustomJsExtractorOptions): JsParser {
            return new JsParser(builder, [
                callExpressionExtractor(calleeName, options)
            ]);
        }
        describe('Test comment options', () => {
            test('Test comment options parsing', () => {
                parser = createParser('t', {
                    arguments: {
                        text: 0,
                        comments: 1
                    },
                    comments: {
                        commentString: 'comment', props: {props: ['{', '}']}
                    }
                });
                // First comment, than other, props and keyed comments.
                parser.parseString(`t('Foo', {comment: 'My Comment', props: { prop1: 'Prop1 is prop1', prop2: 'Prop2 is prop2'}, other: 'other comment',`
                    + ` keyed: {single: 'Single key comment', key1: {key2: 'This is a keyed comment'}}})`);
                parser.parseString(`t('Foo', {comment: 'My\\nComment', props: { prop1: 'Prop1 is\\nprop1'}, other: 'other\\ncomment',`
                    + ` keyed: {single: 'Single\\nkey comment'}})`);

                expect(messages).toEqual([
                    {
                        text: 'Foo',
                        comments: [
                            'My Comment',
                            'other: other comment',
                            '{prop1}: Prop1 is prop1',
                            '{prop2}: Prop2 is prop2',
                            'keyed.single: Single key comment',
                            'keyed.key1.key2: This is a keyed comment'
                        ]
                    },
                    {
                        text: 'Foo',
                        comments: [
                            'My',
                            'Comment',
                            'other: other',
                            'other: comment',
                            '{prop1}: Prop1 is',
                            '{prop1}: prop1',
                            'keyed.single: Single',
                            'keyed.single: key comment'
                        ]
                    }
                ]);
            });
            test('Throw when comment object has non string values.', () => {
                parser = createParser('t', {
                    arguments: {
                        text: 0,
                        comments: 1
                    },
                    comments: {
                        commentString: 'comment',
                        props: {props: ['{', '}']},
                        throwWhenMalformed: true
                    }
                });
                expect(() => parser.parseString(`t('Foo', {test: t})`)).toThrow(
                    `Key test at "Foo" with id "undefined" has invalid value. Allowed are string or object.`
                );
                expect(() => parser.parseString(`t('Foo', {test2: \`\${t}\`})`)).toThrow(
                    `Key test2 at "Foo" with id "undefined" has invalid value. Allowed are string or object.`
                );
            });
            test('Do not throw when comment object has non string values', () =>  {
                parser = createParser('t', {
                    arguments: {
                        text: 0,
                        comments: 1
                    },
                    comments: {
                        commentString: 'comment',
                        props: {props: ['{', '}']},
                        throwWhenMalformed: false // default
                    }
                });
                expect(() => parser.parseString(`t('Foo', {test: t})`)).not.toThrow();
                parser.parseString(`t('Foo2', {test: t, comment: 'My Comment'})`);
                expect(messages).toEqual([
                    {
                        text: 'Foo'
                    },
                    {
                        text: 'Foo2',
                        comments: ['My Comment']
                    }
                ]);
            });
        });
        describe('Test other objects in between arguments', () => {
            test('Object in front', () => {
                parser = createParser('t', {
                    arguments: {
                        text: 1,
                        comments: 2
                    },
                    comments: {
                        commentString: 'comment', props: {props: ['{', '}']}
                    }
                });
                parser.parseString(`t(myObject, 'Foo', {comment: 'My Comment'})`);
                expect(messages).toEqual([
                    {
                        text: 'Foo',
                        comments: ['My Comment']
                    }
                ]);
            });
            test('Object in between', () => {
                parser = createParser('t', {
                    arguments: {
                        text: 0,
                        textPlural: 2,
                        comments: 4
                    }
                });
                parser.parseString(`t('Foo', something, 'Plural', somethingDifferent, 'My Comment')`);
                expect(messages).toEqual([
                    {
                        text: 'Foo',
                        textPlural: 'Plural',
                        comments: ['My Comment']
                    }
                ]);
            });
            test('Object in between with fallback', () => {
                parser = createParser('i18n.gettext', {
                    arguments: {
                        text: 1,
                        context: 3,
                        comments: 5
                    },
                    comments: {
                        commentString: 'comment', props: {props: ['{', '}']},
                        fallback: true
                    }
                });
                parser.parseString(`i18n.gettext(something, 'Foo', somethingElse, 'Context', somethingDifferent, {comment: 'My Comment'})`);
                parser.parseString(`i18n.gettext(something, 'Foo2', somethingElse, null, somethingDifferent, {comment: 'My Comment'})`);
                parser.parseString(`i18n.gettext(something, 'Foo3', somethingElse, {comment: 'My Comment'}, somethingDifferent )`);

                expect(messages).toEqual([
                    {
                        text: 'Foo',
                        context: 'Context',
                        comments: ['My Comment']
                    },
                    {
                        text: 'Foo2',
                        comments: ['My Comment']
                    },
                    {
                        text: 'Foo3',
                        comments: ['My Comment']
                    }
                ]);
            });
            test('Allowed placeholders', () => {
                parser = createParser('t', {
                    arguments: {
                        text: 0,
                        textPlural: 1,
                        context: 2
                    }
                });
                parser.parseString(`t('Foo', 'Plural', 'Context')`);
                parser.parseString(`t('Foo', null, 'Context')`);
                parser.parseString(`t('Foo', undefined, 'Context')`);
                parser.parseString(`t('Foo', 0, 'Context')`);
                expect(messages).toEqual([
                    {
                        text: 'Foo',
                        textPlural: 'Plural',
                        context: 'Context'
                    },
                    {
                        text: 'Foo',
                        context: 'Context'
                    },
                    {
                        text: 'Foo',
                        context: 'Context'
                    },
                    {
                        text: 'Foo',
                        context: 'Context'
                    }
                ]);
            });
            test('Multi-line template literals', () => {
                parser = createParser('t', {
                    arguments: {
                        text: 0,
                        textPlural: 1,
                        comments: 2
                    },
                    comments: {
                        commentString: 'comment', props: {props: ['{', '}']}
                    }
                });
                parser.parseString(`t(
                    \`Line one
                    Line two
                    Line three\`,
                    \`Line four
                    Line five
                    Line six\`,
                    {
                        comment:
                            \`Comment 1
                            Comment 2
                            Comment 3\`,
                        props: {
                            TEST: \`Test1
                            Test2
                            Test3\`
                        },
                        other:
                        \`Other 1
                        Other 2
                        Other 3\`,
                        key1: {
                            key2:
                            \`Keyed 1
                            Keyed 2
                            Keyed 3\`
                        }
                    }
                )`);

                expect(messages).toEqual([
                    {
                        text: 'Line one\n                    Line two\n                    Line three',
                        textPlural: 'Line four\n                    Line five\n                    Line six',
                        comments: [
                            'Comment 1',
                            '                            Comment 2',
                            '                            Comment 3',
                            'other: Other 1',
                            'other:                         Other 2',
                            'other:                         Other 3',
                            '{TEST}: Test1',
                            '{TEST}:                             Test2',
                            '{TEST}:                             Test3',
                            'key1.key2: Keyed 1',
                            'key1.key2:                             Keyed 2',
                            'key1.key2:                             Keyed 3'
                        ]
                    }
                ]);
            });
            test('Concatenated strings', () => {
                parser = createParser('t', {
                    arguments: {
                        text: 0,
                        context: 1,
                        comments: 2
                    },
                    comments: {
                        commentString: 'comment', props: {props: ['{', '}']}
                    }
                });
                parser.parseString('t("Foo " + \'bar \' + `template literal`, "Context " + "1", {comment: "My " + `Comment`)');
                parser.parseString(`t('Foo', null, {
                    props: {
                        PROP: 'Prop ' + "1"
                    },
                    path: \`https://\` + "www." + 'example.com',
                    key1: {
                        key2: "Keyed " + 'Comment'
                    }
                })`);

                expect(messages).toEqual([
                    {
                      text: 'Foo bar template literal',
                      context: 'Context 1',
                      comments: ['My Comment']
                    },
                    {
                        text: 'Foo',
                        comments: [
                            'path: https://www.example.com',
                            '{PROP}: Prop 1',
                            'key1.key2: Keyed Comment'
                        ]
                    }
                ]);
            });
        });
        describe('Comment as Text', () => {
            describe('Only text',  () => {
                test('Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0
                        }
                    });
                    parser.parseString(`t('Foo')`);
                    parser.parseString(`t('Foo2', 'Bar')`);
                    parser.parseString(`t('Foo3', {comment: 'My Comment'})`);
                    // invalid
                    parser.parseString(`t(Foo4)`);
                    parser.parseString(`t(null)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo'
                        },
                        {
                            text: 'Foo2'
                        },
                        {
                            text: 'Foo3'
                        }
                    ]);
                });
            });
            describe('Text and Second Entry', () => {
                test('Text and Plural', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural')`);
                    parser.parseString(`t('Foo2', 'Plural', 'Bar')`);
                    parser.parseString(`t('Foo3', 'Plural', {comment: 'My Comment'})`);
                    parser.parseString(`t('Foo4')`);
                    // partial
                    parser.parseString(`t('Foo5', other)`);
                    // invalid
                    parser.parseString(`t( other, 'Plural')`);
                    parser.parseString(`t( null, 'Plural')`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo4'
                        },
                        {
                            text: 'Foo5'
                        }
                    ]);
                });
                test('Context and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            context: 0,
                            text: 1
                        }
                    });
                    parser.parseString(`t('Context', 'Foo')`);
                    parser.parseString(`t('Context', 'Foo2', 'Plural')`);
                    parser.parseString(`t('Context', 'Foo3', {comment: 'My Comment'})`);
                    parser.parseString(`t( null, 'Foo4')`);
                    // invalid
                    parser.parseString(`t('Context', other)`);
                    parser.parseString(`t('Foo5')`);

                    expect(messages).toEqual([
                        {
                            context: 'Context',
                            text: 'Foo'
                        },
                        {
                            context: 'Context',
                            text: 'Foo2'
                        },
                        {
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo4'
                        }
                    ]);
                });
                test('Text and Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            comments: 1
                        }
                    });
                    parser.parseString(`t('Foo', 'My Comment')`);
                    parser.parseString(`t('Foo2', 'My Comment', 'Context')`);
                    parser.parseString(`t('Foo3')`);
                    // partial
                    parser.parseString(`t('Foo4', other)`);
                    // invalid
                    parser.parseString(`t( null, 'My Comment')`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);


                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            comments: ['My Comment']
                        },
                        {
                            text: 'Foo2',
                            comments: ['My Comment']
                        },
                        {
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo4'
                        }
                    ]);
                });
                test('Comment and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            text: 1
                        }
                    });
                    parser.parseString(`t('My Comment', 'Foo')`);
                    parser.parseString(`t('My Comment', 'Foo2', 'Bar')`);
                    parser.parseString(`t( null, 'Foo3')`);
                    // invalid
                    parser.parseString(`t('My Comment', other)`);
                    parser.parseString(`t( variable, 'Foo4')`);
                    parser.parseString(`t('Foo5')`);

                    expect(messages).toEqual([
                        {
                            comments: ['My Comment'],
                            text: 'Foo'
                        },
                        {
                            comments: ['My Comment'],
                            text: 'Foo2'
                        },
                        {
                            text: 'Foo3'
                        }
                    ]);
                });
            });
            describe('Text and two Entries', () => {
                test('Text, Plural and Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            context: 2
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', 'Context')`);
                    parser.parseString(`t('Foo2', 'Plural', 'Context', 'Comment')`);
                    parser.parseString(`t('Foo3', 'Plural')`);
                    parser.parseString(`t('Foo4', null, 'Context')`);
                    parser.parseString(`t('Foo5')`);
                    // partial
                    parser.parseString(`t('Foo6', 'Plural', other)`);
                    parser.parseString(`t('Foo7', other)`);
                    // invalid
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);
                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo4',
                            context: 'Context'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7'
                        }
                    ]);
                });
                test('Plural, Text and Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            text: 1,
                            context: 2
                        }
                    });
                    parser.parseString(`t('Plural', 'Foo', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo2', 'Context', 'Comment')`);
                    parser.parseString(`t('Plural', 'Foo3')`);
                    parser.parseString(`t( null, 'Foo4', 'Context')`);
                    parser.parseString(`t( null, 'Foo5')`);
                    // partial
                    parser.parseString(`t('Plural', 'Foo6', other)`);
                    // invalid
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t('Plural', null)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            text: 'Foo',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo2',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo4',
                            context: 'Context'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo6'
                        }
                    ]);
                });
                test('Context, Plural and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            context: 0,
                            textPlural: 1,
                            text: 2
                        }
                    });
                    parser.parseString(`t('Context', 'Plural', 'Foo')`);
                    parser.parseString(`t('Context', 'Plural', 'Foo2', 'Comment')`);
                    parser.parseString(`t('Context', null, 'Foo3')`);
                    parser.parseString(`t( null, 'Plural', 'Foo4')`);
                    parser.parseString(`t( null, null, 'Foo5')`);
                    // invalid
                    parser.parseString(`t( 'Context', 'Plural', other)`);
                    parser.parseString(`t( 'Context', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t(null)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            context: 'Context',
                            textPlural: 'Plural',
                            text: 'Foo'
                        },
                        {
                            context: 'Context',
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo4'
                        },
                        {
                            text: 'Foo5'
                        }
                    ]);
                });
                test('Text, Plural and Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            comments: 2
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', 'Comment')`);
                    parser.parseString(`t('Foo2', 'Plural', 'Comment', 'Context')`);
                    parser.parseString(`t('Foo3', 'Plural')`);
                    parser.parseString(`t('Foo4', null, 'Comment')`);
                    parser.parseString(`t('Foo5')`);
                    // partial
                    parser.parseString(`t('Foo6', 'Plural', other)`);
                    parser.parseString(`t('Foo7', other)`);
                    // invalid
                    parser.parseString(`t(other)`);
                    parser.parseString(`t(null)`);
                    parser.parseString(`t()`);


                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7'
                        }
                    ]);
                });
                test('Text, Comment and Plural', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            comments: 1,
                            textPlural: 2
                        }
                    });
                    parser.parseString(`t('Foo', 'Comment', 'Plural')`);
                    parser.parseString(`t('Foo2', 'Comment', 'Plural', 'Context')`);
                    parser.parseString(`t('Foo3', 'Comment')`);
                    parser.parseString(`t('Foo4', null, 'Plural')`);
                    parser.parseString(`t('Foo5')`);
                    // partial
                    parser.parseString(`t('Foo6', 'Comment', other)`);
                    parser.parseString(`t('Foo7', other)`);
                    // invalid
                    parser.parseString(`t(other)`);
                    parser.parseString(`t(null)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo2',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo3',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo7'
                        }
                    ]);
                });
                test('Plural, Text and Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            text: 1,
                            comments: 2
                        }
                    });
                    parser.parseString(`t('Plural', 'Foo', 'Comment')`);
                    parser.parseString(`t('Plural', 'Foo2', 'Comment', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo3')`);
                    parser.parseString(`t( null, 'Foo4', 'Comment')`);
                    parser.parseString(`t( null, 'Foo5')`);
                    // partial
                    parser.parseString(`t('Plural', 'Foo7', other)`);
                    parser.parseString(`t( null, 'Foo8', other)`);
                    // invalid
                    parser.parseString(`t('Plural', null, 'Comment')`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t('Plural')`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            text: 'Foo',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo2',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        }
                    ]);
                });
                test('Context, Comment and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            context: 0,
                            comments: 1,
                            text: 2
                        }
                    });
                    parser.parseString(`t('Context', 'Comment', 'Foo')`);
                    parser.parseString(`t('Context', 'Comment', 'Foo2', 'Comment')`);
                    parser.parseString(`t('Context', null, 'Foo3')`);
                    parser.parseString(`t( null, 'Comment', 'Foo4')`);
                    parser.parseString(`t( null, null, 'Foo5')`);
                    // invalid
                    parser.parseString(`t('Context', 'Comment', other)`);
                    parser.parseString(`t( null, 'Comment')`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo'
                        },
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo2'
                        },
                        {
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo4'
                        },
                        {
                            text: 'Foo5'
                        }
                    ]);
                });
                test('Comment, Text and Plural', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            text: 1,
                            textPlural: 2
                        }
                    });
                    parser.parseString(`t('Comment', 'Foo', 'Plural')`);
                    parser.parseString(`t('Comment', 'Foo2', 'Plural', 'Context')`);
                    parser.parseString(`t('Comment', 'Foo3')`);
                    parser.parseString(`t( null, 'Foo4', 'Plural')`);
                    parser.parseString(`t( null, 'Foo5')`);
                    // partial
                    parser.parseString(`t('Comment', 'Foo6', other)`);
                    parser.parseString(`t( null, 'Foo7', other)`);
                    // invalid
                    parser.parseString(`t('Comment', other)`);
                    parser.parseString(`t('Comment')`);
                    parser.parseString(`t()`);


                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            text: 'Foo',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo2',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7'
                        }
                    ]);
                });
                test('Comment, Plural and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            textPlural: 1,
                            text: 2
                        }
                    });
                    parser.parseString(`t('Comment', 'Plural', 'Foo')`);
                    parser.parseString(`t('Comment', 'Plural', 'Foo2', 'Comment')`);
                    parser.parseString(`t('Comment', null, 'Foo3')`);
                    parser.parseString(`t( null, 'Plural', 'Foo4')`);
                    parser.parseString(`t( null, null, 'Foo5')`);
                    // invalid
                    parser.parseString(`t('Comment', 'Plural', other)`);
                    parser.parseString(`t('Comment', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo4'
                        },
                        {
                            text: 'Foo5'
                        }
                    ]);
                });
            });
            describe('Text and three entries', () => {
                test('Text, Plural, Context, Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            context: 2,
                            comments: 3
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', 'Context', 'Comment')`);
                    parser.parseString(`t('Foo2', 'Plural', 'Context')`);
                    parser.parseString(`t('Foo3', 'Plural', null, 'Comment')`);
                    parser.parseString(`t('Foo4', null, 'Context', 'Comment')`);
                    parser.parseString(`t('Foo5', 'Plural')`);
                    parser.parseString(`t('Foo6', null, 'Context')`);
                    parser.parseString(`t('Foo7', null, null, 'Comment')`);
                    parser.parseString(`t('Foo8')`);
                    // partial
                    parser.parseString(`t('Foo9', 'Plural', 'Context', other)`);
                    parser.parseString(`t('Foo10', null, 'Context', other)`);
                    parser.parseString(`t('Foo11', 'Plural', other, 'Comment')`);
                    parser.parseString(`t('Foo12', other, 'Context', 'Comment')`);
                    // invalid
                    parser.parseString(`t( null, 'Plural', 'Context', 'Comment')`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo4',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo5',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo6',
                            context: 'Context'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo10',
                            context: 'Context'
                        },
                        {
                            text: 'Foo11',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Text, Plural, Comment, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            comments: 2,
                            context: 3
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', 'Comment', 'Context')`);
                    parser.parseString(`t('Foo2', 'Plural', 'Comment')`);
                    parser.parseString(`t('Foo3', 'Plural', null, 'Context')`);
                    parser.parseString(`t('Foo4', null, 'Comment', 'Context')`);
                    parser.parseString(`t('Foo5', 'Plural')`);
                    parser.parseString(`t('Foo6', null, 'Comment')`);
                    parser.parseString(`t('Foo7', null, null, 'Context')`);
                    parser.parseString(`t('Foo8')`);
                    // partial
                    parser.parseString(`t('Foo9', 'Plural', 'Comment', other)`);
                    parser.parseString(`t('Foo10', null, 'Comment', other)`);
                    parser.parseString(`t('Foo11', 'Plural', other, 'Context')`);
                    parser.parseString(`t('Foo12', other, 'Comment', 'Context')`);
                    // invalid
                    parser.parseString(`t( null, 'Plural', 'Comment', 'Context')`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo5',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo6',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo10',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo11',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Text, Comment, Plural, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            comments: 1,
                            textPlural: 2,
                            context: 3
                        }
                    });
                    parser.parseString(`t('Foo', 'Comment', 'Plural', 'Context')`);
                    parser.parseString(`t('Foo2', 'Comment', 'Plural')`);
                    parser.parseString(`t('Foo3', 'Comment', null, 'Context')`);
                    parser.parseString(`t('Foo4', null, 'Plural', 'Context')`);
                    parser.parseString(`t('Foo5', 'Comment')`);
                    parser.parseString(`t('Foo6', null, 'Plural')`);
                    parser.parseString(`t('Foo7', null, null, 'Context')`);
                    parser.parseString(`t('Foo8')`);
                    // partial
                    parser.parseString(`t('Foo9', 'Comment', 'Plural', other)`);
                    parser.parseString(`t('Foo10', null, 'Plural', other)`);
                    parser.parseString(`t('Foo11', 'Comment', other, 'Context')`);
                    parser.parseString(`t('Foo12', other, 'Plural', 'Context')`);
                    // invalid
                    parser.parseString(`t( null, 'Comment', 'Plural', 'Context')`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo2',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo3',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo5',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo10',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo11',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Plural, Text, Context, Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            text: 1,
                            context: 2,
                            comments: 3
                        }
                    });
                    parser.parseString(`t('Plural', 'Foo', 'Context', 'Comment')`);
                    parser.parseString(`t('Plural', 'Foo2', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo3', null, 'Comment')`);
                    parser.parseString(`t( null, 'Foo4', 'Context', 'Comment')`);
                    parser.parseString(`t('Plural', 'Foo5')`);
                    parser.parseString(`t( null, 'Foo6', 'Context')`);
                    parser.parseString(`t( null, 'Foo7', null, 'Comment')`);
                    parser.parseString(`t( null, 'Foo8')`);
                    // partial
                    parser.parseString(`t('Plural', 'Foo9', 'Context', other)`);
                    parser.parseString(`t('Plural', 'Foo10', other, 'Comment')`);
                    parser.parseString(`t( null, 'Foo11', other, 'Comment')`);
                    // invalid
                    parser.parseString(`t('Plural', null, 'Context', 'Comment')`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            text: 'Foo',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo2',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo4',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            context: 'Context'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo9',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            text: 'Foo11'
                        }
                    ]);
                });
                test('Plural, Text, Comment, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            text: 1,
                            comments: 2,
                            context: 3
                        }
                    });
                    parser.parseString(`t('Plural', 'Foo', 'Comment', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo2', 'Comment')`);
                    parser.parseString(`t('Plural', 'Foo3', null, 'Context')`);
                    parser.parseString(`t( null, 'Foo4', 'Comment', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo5')`);
                    parser.parseString(`t( null, 'Foo6', 'Comment')`);
                    parser.parseString(`t( null, 'Foo7', null, 'Context')`);
                    parser.parseString(`t( null, 'Foo8')`);
                    // partial
                    parser.parseString(`t('Plural', 'Foo9', 'Comment', other)`);
                    parser.parseString(`t('Plural', 'Foo10', other, 'Context')`);
                    parser.parseString(`t( null, 'Foo11', other, 'Context')`);
                    // invalid
                    parser.parseString(`t('Plural', null, 'Comment', 'Context')`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            text: 'Foo',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo2',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo9',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            text: 'Foo11'
                        }
                    ]);
                });
                test('Comment, Text, Plural, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            text: 1,
                            textPlural: 2,
                            context: 3
                        }
                    });
                    parser.parseString(`t('Comment', 'Foo', 'Plural', 'Context')`);
                    parser.parseString(`t('Comment', 'Foo2', 'Plural')`);
                    parser.parseString(`t('Comment', 'Foo3', null, 'Context')`);
                    parser.parseString(`t( null, 'Foo4', 'Plural', 'Context')`);
                    parser.parseString(`t('Comment', 'Foo5')`);
                    parser.parseString(`t( null, 'Foo6', 'Plural')`);
                    parser.parseString(`t( null, 'Foo7', null, 'Context')`);
                    parser.parseString(`t( null 'Foo8')`);
                    // partial
                    parser.parseString(`t('Comment', 'Foo9', 'Plural', other)`);
                    parser.parseString(`t('Comment', 'Foo10', other, 'Context')`);
                    parser.parseString(`t( null, 'Foo11', other, 'Context')`);
                    // invalid
                    parser.parseString(`t('Comment', null, 'Plural', 'Context')`);
                    parser.parseString(`t('Comment', other)`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            text: 'Foo',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo2',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo9',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo10'
                        },
                        {
                            text: 'Foo11'
                        }
                    ]);
                });
                test('Plural, Context, Text, Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            context: 1,
                            text: 2,
                            comments: 3
                        }
                    });
                    parser.parseString(`t('Plural', 'Context', 'Foo', 'Comment')`);
                    parser.parseString(`t('Plural', 'Context', 'Foo2')`);
                    parser.parseString(`t('Plural', null, 'Foo3', 'Comment')`);
                    parser.parseString(`t( null, 'Context', 'Foo4', 'Comment')`);
                    parser.parseString(`t('Plural', null, 'Foo5')`);
                    parser.parseString(`t( null, 'Context', 'Foo6')`);
                    parser.parseString(`t( null, null, 'Foo7', 'Comment')`);
                    parser.parseString(`t( null, null, 'Foo8')`);
                    // partial
                    parser.parseString(`t('Plural', 'Context', 'Foo9', other)`);
                    parser.parseString(`t('Plural', null, 'Foo10', other)`);
                    parser.parseString(`t( null, 'Context', 'Foo11', other)`);
                    parser.parseString(`t( null, null, 'Foo12', other)`);
                    // invalid
                    parser.parseString(`t('Plural', 'Context', null, 'Comment')`);
                    parser.parseString(`t('Plural', 'Context', other)`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            comments: ['Comment']
                        },
                        {
                            context: 'Context',
                            text: 'Foo4',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            context: 'Context',
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo9'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            context: 'Context',
                            text: 'Foo11'
                        },
                        {
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Plural, Comment, Text, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            comments: 1,
                            text: 2,
                            context: 3
                        }
                    });
                    parser.parseString(`t('Plural', 'Comment', 'Foo', 'Context')`);
                    parser.parseString(`t('Plural', 'Comment', 'Foo2')`);
                    parser.parseString(`t('Plural', null, 'Foo3', 'Context')`);
                    parser.parseString(`t( null, 'Comment', 'Foo4', 'Context')`);
                    parser.parseString(`t('Plural', null, 'Foo5')`);
                    parser.parseString(`t( null, 'Comment', 'Foo6')`);
                    parser.parseString(`t( null, null, 'Foo7', 'Context')`);
                    parser.parseString(`t( null, null, 'Foo8')`);
                    // partial
                    parser.parseString(`t('Plural', 'Comment', 'Foo9', other)`);
                    parser.parseString(`t('Plural', null, 'Foo10', other)`);
                    parser.parseString(`t( null, 'Comment', 'Foo11', other)`);
                    parser.parseString(`t( null, null, 'Foo12', other)`);
                    // invalid
                    parser.parseString(`t('Plural', 'Comment', null, 'Context')`);
                    parser.parseString(`t('Plural', 'Comment', other)`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo4',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo9'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo11'
                        },
                        {
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Comment, Plural, Text, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            textPlural: 1,
                            text: 2,
                            context: 3
                        }
                    });
                    parser.parseString(`t('Comment', 'Plural', 'Foo', 'Context')`);
                    parser.parseString(`t('Comment', 'Plural', 'Foo2')`);
                    parser.parseString(`t('Comment', null, 'Foo3', 'Context')`);
                    parser.parseString(`t( null, 'Plural', 'Foo4', 'Context')`);
                    parser.parseString(`t('Comment', null, 'Foo5')`);
                    parser.parseString(`t( null, 'Plural', 'Foo6')`);
                    parser.parseString(`t( null, null, 'Foo7', 'Context')`);
                    parser.parseString(`t( null, null, 'Foo8')`);
                    // partial
                    parser.parseString(`t('Comment', 'Plural', 'Foo9', other)`);
                    parser.parseString(`t('Comment', null, 'Foo10', other)`);
                    parser.parseString(`t( null, 'Plural', 'Foo11', other)`);
                    parser.parseString(`t( null, null, 'Foo12', other)`);
                    // invalid
                    parser.parseString(`t('Comment', 'Plural', null, 'Context')`);
                    parser.parseString(`t('Comment', 'Plural', other)`);
                    parser.parseString(`t('Comment', other)`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo4',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo9'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo10'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo11'
                        },
                        {
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Plural, Context, Comment, Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            context: 1,
                            comments: 2,
                            text: 3
                        }
                    });
                    parser.parseString(`t('Plural', 'Context', 'Comment', 'Foo')`);
                    parser.parseString(`t('Plural', 'Context', null, 'Foo2')`);
                    parser.parseString(`t('Plural', null, 'Comment', 'Foo3')`);
                    parser.parseString(`t( null, 'Context', 'Comment', 'Foo4')`);
                    parser.parseString(`t('Plural', null, null, 'Foo5')`);
                    parser.parseString(`t( null, 'Context', null, 'Foo6')`);
                    parser.parseString(`t( null, null, 'Comment', 'Foo7')`);
                    parser.parseString(`t( null, null, null, 'Foo8')`);
                    // invalid
                    parser.parseString(`t('Plural', 'Context', 'Comment', other)`);
                    parser.parseString(`t('Plural', 'Context', other)`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo3'
                        },
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo4'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            context: 'Context',
                            text: 'Foo6'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        }
                    ]);
                });
                test('Plural, Comment, Context, Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            comments: 1,
                            context: 2,
                            text: 3
                        }
                    });
                    parser.parseString(`t('Plural', 'Comment', 'Context', 'Foo')`);
                    parser.parseString(`t('Plural', 'Comment', null, 'Foo2')`);
                    parser.parseString(`t('Plural', null, 'Context', 'Foo3')`);
                    parser.parseString(`t( null, 'Comment', 'Context', 'Foo4')`);
                    parser.parseString(`t('Plural', null, null, 'Foo5')`);
                    parser.parseString(`t( null, 'Comment', null, 'Foo6')`);
                    parser.parseString(`t( null, null, 'Context', 'Foo7')`);
                    parser.parseString(`t( null, null, null, 'Foo8')`);
                    // invalid
                    parser.parseString(`t('Plural', 'Comment', 'Context', other)`);
                    parser.parseString(`t('Plural', 'Comment', other)`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo4'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo6'
                        },
                        {
                            context: 'Context',
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        }
                    ]);
                });
                test('Comment, Plural, Context, Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            textPlural: 1,
                            context: 2,
                            text: 3
                        }
                    });
                    parser.parseString(`t('Comment', 'Plural', 'Context', 'Foo')`);
                    parser.parseString(`t('Comment', 'Plural', null, 'Foo2')`);
                    parser.parseString(`t('Comment', null, 'Context', 'Foo3')`);
                    parser.parseString(`t( null, 'Plural', 'Context', 'Foo4')`);
                    parser.parseString(`t('Comment', null, null, 'Foo5')`);
                    parser.parseString(`t( null, 'Plural', null, 'Foo6')`);
                    parser.parseString(`t( null, null, 'Context', 'Foo7')`);
                    parser.parseString(`t( null, null, null, 'Foo8')`);
                    // invalid
                    parser.parseString(`t('Comment', 'Plural', 'Context', other)`);
                    parser.parseString(`t('Comment', 'Plural', other)`);
                    parser.parseString(`t('Comment', other)`);
                    parser.parseString(`t( other )`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo4'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo6'
                        },
                        {
                            context: 'Context',
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        }
                    ]);
                });
            });
        });
        describe('Comment as Object', () => {
            describe('Text and Second Entry', () => {
                test('Text and Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            comments: 1
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Foo', {comment: 'My Comment'})`);
                    parser.parseString(`t('Foo2', {comment: 'My Comment'}, 'Context')`);
                    parser.parseString(`t('Foo3')`);
                    parser.parseString(`t('Foo4', 'Context')`);
                    // partial
                    parser.parseString(`t('Foo5', other)`);
                    // invalid
                    parser.parseString(`t(other, {comment: 'My Comment'})`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            comments: ['My Comment']
                        },
                        {
                            text: 'Foo2',
                            comments: ['My Comment']
                        },
                        {
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo4'
                        },
                        {
                            text: 'Foo5'
                        }
                    ]);
                });
                test('Comment and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            text: 1
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t({comment: 'My Comment'}, 'Foo')`);
                    parser.parseString(`t({comment: 'My Comment'}, 'Foo2', 'Bar')`);
                    parser.parseString(`t( null, 'Foo3')`);
                    parser.parseString(`t( variable, 'Foo4')`);
                    // fallback
                    parser.parseString(`t('Foo5')`);
                    // invalid
                    parser.parseString(`t({comment: 'My Comment'}, other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['My Comment'],
                            text: 'Foo'
                        },
                        {
                            comments: ['My Comment'],
                            text: 'Foo2'
                        },
                        {
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo5'
                        }
                    ]);
                });
            });
            describe('Text and two Entries', () => {
                test('Text, Plural and Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            comments: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo2', 'Plural', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Foo3', 'Plural')`);
                    parser.parseString(`t('Foo4', null, {comment: 'Comment'})`);
                    parser.parseString(`t('Foo5')`);
                    // fallback
                    parser.parseString(`t('Foo6', {comment: 'Comment'})`);
                    // partial
                    parser.parseString(`t('Foo7', 'Plural', other)`);
                    parser.parseString(`t('Foo8', other)`);
                    // invalid
                    parser.parseString(`t( null, 'Plural', {comment: 'Comment'})`);
                    parser.parseString(`t( null, {comment: 'Comment'})`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo7',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo8'
                        }
                    ]);
                });
                test('Text, Comment and Plural', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            comments: 1,
                            textPlural: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Foo', {comment: 'Comment'}, 'Plural')`);
                    parser.parseString(`t('Foo2', {comment: 'Comment'}, 'Plural', 'Context')`);
                    parser.parseString(`t('Foo3', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo4', null, 'Plural')`);
                    parser.parseString(`t('Foo5')`);
                    // fallback
                    parser.parseString(`t('Foo6', 'Plural')`);
                    // partial
                    parser.parseString(`t('Foo7', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Foo8', other)`);
                    // invalid
                    parser.parseString(`t(null, {comment: 'Comment'}, 'Plural')`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo2',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo3',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8'
                        }
                    ]);
                });
                test('Plural, Text and Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            text: 1,
                            comments: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Plural', 'Foo', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Foo2', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Plural', 'Foo3')`);
                    parser.parseString(`t( null, 'Foo4', {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Foo5')`);
                    // partial
                    parser.parseString(`t('Plural', 'Foo6', options)`);
                    parser.parseString(`t( null, 'Foo7', options)`);
                    // invalid
                    parser.parseString(`t('Plural', null, {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', options)`);
                    parser.parseString(`t(options)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            text: 'Foo',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo2',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7'
                        }
                    ]);
                });
                test('Context, Comment and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            context: 0,
                            comments: 1,
                            text: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Context', {comment: 'Comment'}, 'Foo')`);
                    parser.parseString(`t('Context', {comment: 'Comment'}, 'Foo2', 'Comment')`);
                    parser.parseString(`t('Context', null, 'Foo3')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, 'Foo4')`);
                    parser.parseString(`t( null, null, 'Foo5')`);
                    // fallback
                    parser.parseString(`t('Context', 'Foo6')`);
                    parser.parseString(`t(null, 'Foo7')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo8')`);
                    // invalid
                    parser.parseString(`t('Context', {comment: 'Comment'}, options)`);
                    parser.parseString(`t('Context')`);
                    parser.parseString(`t(options)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo'
                        },
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo2'
                        },
                        {
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo4'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            context: 'Context',
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo8'
                        }
                    ]);
                });
                test('Comment, Text and Plural', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            text: 1,
                            textPlural: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Foo', 'Plural')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo2', 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo3')`);
                    parser.parseString(`t( null, 'Foo4', 'Plural')`);
                    parser.parseString(`t( null, 'Foo5')`);
                    // fallback
                    parser.parseString(`t( 'Foo6', 'Plural')`);
                    parser.parseString(`t( 'Foo7')`);
                    // partial
                    parser.parseString(`t({comment: 'Comment'}, 'Foo8', other)`);
                    parser.parseString(`t(null, 'Foo9', other)`);
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            text: 'Foo',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo2',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9'
                        }
                    ]);
                });
                test('Comment, Plural and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            textPlural: 1,
                            text: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo2', 'Comment')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Foo3')`);
                    parser.parseString(`t( null, 'Plural', 'Foo4')`);
                    parser.parseString(`t( null, null, 'Foo5')`);
                    // fallback
                    parser.parseString(`t( 'Plural', 'Foo7')`);
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', other)`);
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t( null, 'Plural')`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo4'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo7'
                        }
                    ]);
                });
            });
            describe('Text and three entries', () => {
                test('Text, Plural, Context, Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            context: 2,
                            comments: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo2', 'Plural', 'Context')`);
                    parser.parseString(`t('Foo3', 'Plural', null, {comment: 'Comment'})`);
                    parser.parseString(`t('Foo4', null, 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo5', 'Plural')`);
                    parser.parseString(`t('Foo6', null, 'Context')`);
                    parser.parseString(`t('Foo7', null, null, {comment: 'Comment'})`);
                    parser.parseString(`t('Foo8')`);
                    // fallback
                    parser.parseString(`t('Foo9', 'Plural', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo10', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo11', null, {comment: 'Comment'})`);
                    // partial
                    parser.parseString(`t('Foo12', 'Plural', 'Context', other)`);
                    parser.parseString(`t('Foo13', null, 'Context', other)`);
                    parser.parseString(`t('Foo14', 'Plural', other)`);
                    parser.parseString(`t('Foo15', other)`);
                    // invalid
                    parser.parseString(`t(null, 'Plural', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t(options)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo4',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo5',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo6',
                            context: 'Context'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo10',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo11',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo12',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo13',
                            context: 'Context'
                        },
                        {
                            text: 'Foo14',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo15'
                        }
                    ]);
                });
                test('Text, Plural, Comment, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            comments: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Foo2', 'Plural', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo3', 'Plural', null, 'Context')`);
                    parser.parseString(`t('Foo4', null, {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Foo5', 'Plural')`);
                    parser.parseString(`t('Foo6', null, {comment: 'Comment'})`);
                    parser.parseString(`t('Foo7', null, null, 'Context')`);
                    parser.parseString(`t('Foo8')`);
                    // fallback
                    parser.parseString(`t('Foo9', 'Plural', 'Context')`);
                    parser.parseString(`t('Foo10', null, 'Context')`);
                    parser.parseString(`t('Foo11', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Foo12', {comment: 'Comment'})`);
                    // partial
                    parser.parseString(`t('Foo13', 'Plural', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Foo14', null, {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Foo15', 'Plural', other)`);
                    parser.parseString(`t('Foo16', other)`);
                    parser.parseString(`t('Foo17', {comment: 'Comment'}, other)`);
                    // invalid
                    parser.parseString(`t( null, 'Plural', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);


                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo5',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo6',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo10',
                            context: 'Context'
                        },
                        {
                            text: 'Foo11',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo12',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo13',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo14',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo15',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo16'
                        },
                        {
                            text: 'Foo17',
                            comments: ['Comment']
                        }
                    ]);
                });
                test('Text, Comment, Plural, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            comments: 1,
                            textPlural: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Foo', {comment: 'Comment'}, 'Plural', 'Context')`);
                    parser.parseString(`t('Foo2', {comment: 'Comment'}, 'Plural')`);
                    parser.parseString(`t('Foo3', {comment: 'Comment'}, null, 'Context')`);
                    parser.parseString(`t('Foo4', null, 'Plural', 'Context')`);
                    parser.parseString(`t('Foo5', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo6', null, 'Plural')`);
                    parser.parseString(`t('Foo7', null, null, 'Context')`);
                    parser.parseString(`t('Foo8')`);
                    // fallback
                    parser.parseString(`t('Foo9', 'Plural', 'Context')`);
                    // partial
                    parser.parseString(`t('Foo10', {comment: 'Comment'}, 'Plural', other)`);
                    parser.parseString(`t('Foo11', null, 'Plural', other)`);
                    parser.parseString(`t('Foo12', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Foo13', other)`);
                    parser.parseString(`t('Foo14', 'Plural', other)`);
                    // invalid
                    parser.parseString(`t(null, {comment: 'Comment'}, 'Plural', 'Context')`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo2',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo3',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo5',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo10',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo11',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo12',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo13'
                        },
                        {
                            text: 'Foo14',
                            textPlural: 'Plural'
                        }
                    ]);
                });
                test('Plural, Text, Context, Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            text: 1,
                            context: 2,
                            comments: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Plural', 'Foo', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Foo2', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo3', null, {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Foo4', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Foo5')`);
                    parser.parseString(`t( null, 'Foo6', 'Context')`);
                    parser.parseString(`t( null, 'Foo7', null, {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Foo8')`);
                    // fallback
                    parser.parseString(`t('Plural', 'Foo9', {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Foo10', {comment: 'Comment'})`);
                    // partial
                    parser.parseString(`t('Plural', 'Foo11', 'Context', other)`);
                    parser.parseString(`t( null, 'Foo12', 'Context', other)`);
                    parser.parseString(`t('Plural', 'Foo13', other)`);
                    // invalid
                    parser.parseString(`t('Plural', null, 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            text: 'Foo',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo2',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo4',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            context: 'Context'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo9',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo10',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo11',
                            context: 'Context'
                        },
                        {
                            text: 'Foo12',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo13'
                        }
                    ]);
                });
                test('Plural, Text, Comment, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            text: 1,
                            comments: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Plural', 'Foo', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Plural', 'Foo2', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Foo3', null, 'Context')`);
                    parser.parseString(`t( null, 'Foo4', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Plural', 'Foo5')`);
                    parser.parseString(`t( null, 'Foo6', {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Foo7', null, 'Context')`);
                    parser.parseString(`t( null, 'Foo8')`);
                    // fallback
                    parser.parseString(`t('Plural', 'Foo9', 'Context')`);
                    parser.parseString(`t( null, 'Foo10', 'Context')`);
                    // partial
                    parser.parseString(`t('Plural', 'Foo11', {comment: 'Comment'}, other)`);
                    parser.parseString(`t(null, 'Foo12', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Plural', 'Foo13', other)`);
                    parser.parseString(`t(null, 'Foo14', other)`);
                    // invalid
                    parser.parseString(`t('Plural', null, {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);


                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            text: 'Foo',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo2',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo9',
                            context: 'Context'
                        },
                        {
                            text: 'Foo10',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo11',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo12',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo13'
                        },
                        {
                            text: 'Foo14'
                        }
                    ]);
                });
                test('Comment, Text, Plural, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            text: 1,
                            textPlural: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Foo', 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo2', 'Plural')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo3', null, 'Context')`);
                    parser.parseString(`t( null, 'Foo4', 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo5')`);
                    parser.parseString(`t( null, 'Foo6', 'Plural')`);
                    parser.parseString(`t( null, 'Foo7', null, 'Context')`);
                    parser.parseString(`t( null 'Foo8')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Plural', 'Context')`);
                    // fallback
                    parser.parseString(`t('Foo9', 'Plural', 'Context')`);
                    parser.parseString(`t('Foo10', null, 'Context')`);
                    parser.parseString(`t('Foo11', 'Plural')`);
                    parser.parseString(`t('Foo12')`);
                    // partial
                    parser.parseString(`t({comment: 'Comment'}, 'Foo13', 'Plural', other)`);
                    parser.parseString(`t(null, 'Foo14', 'Plural', other)`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo15', other)`);
                    parser.parseString(`t(null, 'Foo16', other)`);
                    parser.parseString(`t('Foo17', 'Plural', other)`);
                    parser.parseString(`t('Foo18', other)`);
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, null, 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            text: 'Foo',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo2',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo10',
                            context: 'Context'
                        },
                        {
                            text: 'Foo11',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo12'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo13',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo14',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo15'
                        },
                        {
                            text: 'Foo16'
                        },
                        {
                            text: 'Foo17',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo18'
                        }
                    ]);
                });
                test('Plural, Context, Text, Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            context: 1,
                            text: 2,
                            comments: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Plural', 'Context', 'Foo', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Context', 'Foo2')`);
                    parser.parseString(`t('Plural', null, 'Foo3', {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Context', 'Foo4', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', null, 'Foo5')`);
                    parser.parseString(`t( null, 'Context', 'Foo6')`);
                    parser.parseString(`t( null, null, 'Foo7', {comment: 'Comment'})`);
                    parser.parseString(`t( null, null, 'Foo8')`);
                    // partial
                    parser.parseString(`t('Plural', 'Context', 'Foo9', other)`);
                    parser.parseString(`t('Plural', null, 'Foo10', other)`);
                    parser.parseString(`t(null, 'Context', 'Foo11', other)`);
                    parser.parseString(`t(null, null, 'Foo12', other)`);
                    // invalid
                    parser.parseString(`t('Plural', 'Context', null, {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Context', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            comments: ['Comment']
                        },
                        {
                            context: 'Context',
                            text: 'Foo4',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            context: 'Context',
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo9'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            context: 'Context',
                            text: 'Foo11'
                        },
                        {
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Plural, Comment, Text, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            comments: 1,
                            text: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Foo', 'Context')`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Foo2')`);
                    parser.parseString(`t('Plural', null, 'Foo3', 'Context')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, 'Foo4', 'Context')`);
                    parser.parseString(`t('Plural', null, 'Foo5')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, 'Foo6')`);
                    parser.parseString(`t( null, null, 'Foo7', 'Context')`);
                    parser.parseString(`t( null, null, 'Foo8')`);
                    // fallback
                    parser.parseString(`t('Plural', 'Foo9', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo10')`);
                    parser.parseString(`t( null, 'Foo11', 'Context')`);
                    parser.parseString(`t( null, 'Foo12')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo13', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo14')`);
                    // partial
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Foo15', other)`);
                    parser.parseString(`t('Plural', null, 'Foo16', other)`);
                    parser.parseString(`t(null, {comment: 'Comment'}, 'Foo17', other)`);
                    parser.parseString(`t(null, null, 'Foo18', other)`);
                    parser.parseString(`t('Plural', 'Foo19', other)`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo20', other)`);
                    // invalid
                    parser.parseString(`t('Plural', {comment: 'Comment'}, null, 'Context')`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo4',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo9',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            text: 'Foo11',
                            context: 'Context'
                        },
                        {
                            text: 'Foo12'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo13',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo14'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo15'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo16'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo17'
                        },
                        {
                            text: 'Foo18'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo19'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo20'
                        }
                    ]);
                });
                test('Comment, Plural, Text, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            textPlural: 1,
                            text: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo2')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Foo3', 'Context')`);
                    parser.parseString(`t( null, 'Plural', 'Foo4', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Foo5')`);
                    parser.parseString(`t( null, 'Plural', 'Foo6')`);
                    parser.parseString(`t( null, null, 'Foo7', 'Context')`);
                    parser.parseString(`t( null, null, 'Foo8')`);
                    // fallback
                    parser.parseString(`t('Plural', 'Foo9', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo10')`);
                    // partial
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo11', other)`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Foo12', other)`);
                    parser.parseString(`t(null, 'Plural', 'Foo13', other)`);
                    parser.parseString(`t(null, null, 'Foo14', other)`);
                    parser.parseString(`t('Plural', 'Foo15', other)`);
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', null, 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', other)`);
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t(null, 'Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);


                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo4',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo9',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo11'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo12'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo13'
                        },
                        {
                            text: 'Foo14'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo15'
                        }
                    ]);
                });
                test('Plural, Context, Comment, Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            context: 1,
                            comments: 2,
                            text: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Plural', 'Context', {comment: 'Comment'}, 'Foo')`);
                    parser.parseString(`t('Plural', 'Context', null, 'Foo2')`);
                    parser.parseString(`t('Plural', null, {comment: 'Comment'}, 'Foo3')`);
                    parser.parseString(`t( null, 'Context', {comment: 'Comment'}, 'Foo4')`);
                    parser.parseString(`t('Plural', null, null, 'Foo5')`);
                    parser.parseString(`t( null, 'Context', null, 'Foo6')`);
                    parser.parseString(`t( null, null, {comment: 'Comment'}, 'Foo7')`);
                    parser.parseString(`t( null, null, null, 'Foo8')`);
                    // fallback
                    parser.parseString(`t('Plural', 'Context', 'Foo9')`);
                    parser.parseString(`t('Plural', null, 'Foo10')`);
                    parser.parseString(`t( null, 'Context', 'Foo11')`);
                    parser.parseString(`t( null, null, 'Foo12')`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Foo13')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo14')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, 'Foo15')`);
                    // invalid
                    parser.parseString(`t('Plural', 'Context', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Plural', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Context', other)`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo3'
                        },
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo4'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            context: 'Context',
                            text: 'Foo6'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo9'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            context: 'Context',
                            text: 'Foo11'
                        },
                        {
                            text: 'Foo12'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo13'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo14'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo15'
                        }
                    ]);
                });
                test('Plural, Comment, Context, Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            comments: 1,
                            context: 2,
                            text: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Context', 'Foo')`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, null, 'Foo2')`);
                    parser.parseString(`t('Plural', null, 'Context', 'Foo3')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, 'Context', 'Foo4')`);
                    parser.parseString(`t('Plural', null, null, 'Foo5')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, null, 'Foo6')`);
                    parser.parseString(`t( null, null, 'Context', 'Foo7')`);
                    parser.parseString(`t( null, null, null, 'Foo8')`);
                    // fallback
                    parser.parseString(`t('Plural', 'Context', 'Foo9')`);
                    parser.parseString(`t( null, 'Context', 'Foo10')`);
                    parser.parseString(`t( null, null, 'Foo11')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Context', 'Foo11')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Foo12')`);
                    // invalid
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Context', other)`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo4'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo6'
                        },
                        {
                            context: 'Context',
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo9'
                        },
                        {
                            context: 'Context',
                            text: 'Foo10'
                        },
                        {
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo11'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Comment, Plural, Context, Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            textPlural: 1,
                            context: 2,
                            text: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']},
                            fallback: true
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Context', 'Foo')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', null, 'Foo2')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Context', 'Foo3')`);
                    parser.parseString(`t( null, 'Plural', 'Context', 'Foo4')`);
                    parser.parseString(`t({comment: 'Comment'}, null, null, 'Foo5')`);
                    parser.parseString(`t( null, 'Plural', null, 'Foo6')`);
                    parser.parseString(`t( null, null, 'Context', 'Foo7')`);
                    parser.parseString(`t( null, null, null, 'Foo8')`);
                    // fallback
                    parser.parseString(`t('Plural', 'Context', 'Foo9')`);
                    parser.parseString(`t('Plural', null, 'Foo10')`);
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Context', other)`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', other)`);
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo4'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo6'
                        },
                        {
                            context: 'Context',
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo9'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10'
                        }
                    ]);
                });
            });
        });
        describe('Comment as Object, no fallback', () => {
            describe('Text and Second Entry', () => {
                test('Comment and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            text: 1
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t({comment: 'My Comment'}, 'Foo')`);
                    parser.parseString(`t({comment: 'My Comment'}, 'Foo2', 'Bar')`);
                    parser.parseString(`t( null, 'Foo3')`);
                    // comment string
                    parser.parseString(`t( 'My Comment', 'Foo4')`);
                    // invalid
                    parser.parseString(`t( variable, 'Foo4')`);
                    parser.parseString(`t( 'My Comment')`);
                    parser.parseString(`t({comment: 'My Comment'}, other)`);
                    parser.parseString(`t('My Comment', other)`); // comment string
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['My Comment'],
                            text: 'Foo'
                        },
                        {
                            comments: ['My Comment'],
                            text: 'Foo2'
                        },
                        {
                            text: 'Foo3'
                        },
                        {
                            comments: ['My Comment'],
                            text: 'Foo4'
                        }
                    ]);
                });
            });
            describe('Text and two Entries', () => {
                test('Text, Plural and Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            comments: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo2', 'Plural', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Foo3', 'Plural')`);
                    parser.parseString(`t('Foo4', null, {comment: 'Comment'})`);
                    parser.parseString(`t('Foo5')`);
                    // comment string
                    parser.parseString(`t('Foo6', 'Plural', 'Comment')`);
                    parser.parseString(`t('Foo7', null, 'Comment')`);
                    // partial
                    parser.parseString(`t('Foo8', 'Plural', other)`);
                    parser.parseString(`t('Foo9', other)`);
                    // invalid
                    parser.parseString(`t( null, 'Plural', {comment: 'Comment'})`);
                    parser.parseString(`t( null, {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Plural', 'Comment')`); // comment string
                    parser.parseString(`t( null, 'Comment')`); // comment string
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo9'
                        }
                    ]);
                });
                test('Text, Comment and Plural', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            comments: 1,
                            textPlural: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Foo', {comment: 'Comment'}, 'Plural')`);
                    parser.parseString(`t('Foo2', {comment: 'Comment'}, 'Plural', 'Context')`);
                    parser.parseString(`t('Foo3', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo4', null, 'Plural')`);
                    parser.parseString(`t('Foo5')`);
                    // comment string
                    parser.parseString(`t('Foo6', 'Comment', 'Plural')`);
                    parser.parseString(`t('Foo7', 'Comment')`);
                    // partial
                    parser.parseString(`t('Foo8', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Foo9', other)`);
                    parser.parseString(`t('Foo10', 'Comment', other)`); // comment string
                    // invalid
                    parser.parseString(`t(null, {comment: 'Comment'}, 'Plural')`);
                    parser.parseString(`t(null, 'Comment', 'Plural')`); // comment string
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo2',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo3',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo9'
                        },
                        {
                            text: 'Foo10',
                            comments: ['Comment']
                        }
                    ]);
                });
                test('Context, Comment and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            context: 0,
                            comments: 1,
                            text: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Context', {comment: 'Comment'}, 'Foo')`);
                    parser.parseString(`t('Context', {comment: 'Comment'}, 'Foo2', 'Comment')`);
                    parser.parseString(`t('Context', null, 'Foo3')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, 'Foo4')`);
                    parser.parseString(`t( null, null, 'Foo5')`);
                    // comment string
                    parser.parseString(`t('Context', 'Comment', 'Foo6')`);
                    parser.parseString(`t( null, 'Comment', 'Foo7')`);
                    // invalid
                    parser.parseString(`t('Context', {comment: 'Comment'}, options)`);
                    parser.parseString(`t('Context', 'Comment', options)`); // comment string
                    parser.parseString(`t('Context')`);
                    parser.parseString(`t(options)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo'
                        },
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo2'
                        },
                        {
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo4'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo6'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo7'
                        }
                    ]);
                });
                test('Comment, Text and Plural', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            text: 1,
                            textPlural: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Foo', 'Plural')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo2', 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo3')`);
                    parser.parseString(`t( null, 'Foo4', 'Plural')`);
                    parser.parseString(`t( null, 'Foo5')`);
                    // comment string
                    parser.parseString(`t('Comment', 'Foo6', 'Plural')`);
                    parser.parseString(`t('Comment', 'Foo7')`);
                    // partial
                    parser.parseString(`t({comment: 'Comment'}, 'Foo8', other)`);
                    parser.parseString(`t(null, 'Foo9', other)`);
                    parser.parseString(`t('Comment', 'Foo10', other)`); // comment string
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t('Comment', other)`); // comment string
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            text: 'Foo',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo2',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3'
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo7'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo10'
                        }
                    ]);
                });
                test('Comment, Plural and Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            textPlural: 1,
                            text: 2
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo2', 'Comment')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Foo3')`);
                    parser.parseString(`t( null, 'Plural', 'Foo4')`);
                    parser.parseString(`t( null, null, 'Foo5')`);
                    // fallback
                    parser.parseString(`t('Comment', 'Plural', 'Foo6')`);
                    parser.parseString(`t('Comment', null, 'Foo7')`);
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', other)`);
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t('Comment', 'Plural', other)`); // comment string
                    parser.parseString(`t('Comment', other)`); // comment string
                    parser.parseString(`t(other)`);
                    parser.parseString(`t( null, 'Plural')`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo4'
                        },
                        {
                            text: 'Foo5'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo6'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo7'
                        }
                    ]);
                });
            });
            describe('Text and three entries', () => {
                test('Text, Plural, Context, Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            context: 2,
                            comments: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo2', 'Plural', 'Context')`);
                    parser.parseString(`t('Foo3', 'Plural', null, {comment: 'Comment'})`);
                    parser.parseString(`t('Foo4', null, 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo5', 'Plural')`);
                    parser.parseString(`t('Foo6', null, 'Context')`);
                    parser.parseString(`t('Foo7', null, null, {comment: 'Comment'})`);
                    parser.parseString(`t('Foo8')`);
                    // comment string
                    parser.parseString(`t('Foo9', 'Plural', 'Context', 'Comment')`);
                    parser.parseString(`t('Foo10', 'Plural', null, 'Comment')`);
                    parser.parseString(`t('Foo11', null, 'Context', 'Comment')`);
                    parser.parseString(`t('Foo12', null, null, 'Comment')`);
                    // partial
                    parser.parseString(`t('Foo13', 'Plural', 'Context', other)`);
                    parser.parseString(`t('Foo14', null, 'Context', other)`);
                    parser.parseString(`t('Foo15', 'Plural', other)`);
                    parser.parseString(`t('Foo16', other)`);
                    // invalid
                    parser.parseString(`t(null, 'Plural', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t(null, 'Plural', 'Context', 'Comment')`); // comment string
                    parser.parseString(`t(options)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo4',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo5',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo6',
                            context: 'Context'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            textPlural: 'Plural',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo10',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo11',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo12',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo13',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo14',
                            context: 'Context'
                        },
                        {
                            text: 'Foo15',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo16'
                        }
                    ]);
                });
                test('Text, Plural, Comment, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            textPlural: 1,
                            comments: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Foo', 'Plural', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Foo2', 'Plural', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo3', 'Plural', null, 'Context')`);
                    parser.parseString(`t('Foo4', null, {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Foo5', 'Plural')`);
                    parser.parseString(`t('Foo6', null, {comment: 'Comment'})`);
                    parser.parseString(`t('Foo7', null, null, 'Context')`);
                    parser.parseString(`t('Foo8')`);
                    // comment string
                    parser.parseString(`t('Foo9', 'Plural', 'Comment', 'Context')`);
                    parser.parseString(`t('Foo10', 'Plural', 'Comment')`);
                    parser.parseString(`t('Foo11', null, 'Comment', 'Context')`);
                    parser.parseString(`t('Foo12', null, 'Comment'`);
                    // partial
                    parser.parseString(`t('Foo13', 'Plural', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Foo14', null, {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Foo15', 'Plural', other)`);
                    parser.parseString(`t('Foo16', other)`);
                    parser.parseString(`t('Foo17', 'Plural', 'Comment', other)`); // comment string
                    parser.parseString(`t('Foo18', null, 'Comment', other)`); // comment string
                    // invalid
                    parser.parseString(`t( null, 'Plural', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t( null, 'Plural', 'Comment', 'Context')`); // comment string
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);


                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo2',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo3',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo5',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo6',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo10',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo11',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo12',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo13',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo14',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo15',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo16'
                        },
                        {
                            text: 'Foo17',
                            textPlural: 'Plural',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo18',
                            comments: ['Comment']
                        }
                    ]);
                });
                test('Text, Comment, Plural, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            text: 0,
                            comments: 1,
                            textPlural: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Foo', {comment: 'Comment'}, 'Plural', 'Context')`);
                    parser.parseString(`t('Foo2', {comment: 'Comment'}, 'Plural')`);
                    parser.parseString(`t('Foo3', {comment: 'Comment'}, null, 'Context')`);
                    parser.parseString(`t('Foo4', null, 'Plural', 'Context')`);
                    parser.parseString(`t('Foo5', {comment: 'Comment'})`);
                    parser.parseString(`t('Foo6', null, 'Plural')`);
                    parser.parseString(`t('Foo7', null, null, 'Context')`);
                    parser.parseString(`t('Foo8')`);
                    // comment string
                    parser.parseString(`t('Foo9', 'Comment', 'Plural', 'Context')`);
                    parser.parseString(`t('Foo10', 'Comment', 'Plural')`);
                    parser.parseString(`t('Foo11', 'Comment', null, 'Context')`);
                    parser.parseString(`t('Foo12', 'Comment')`);
                    // partial
                    parser.parseString(`t('Foo13', {comment: 'Comment'}, 'Plural', other)`);
                    parser.parseString(`t('Foo14', null, 'Plural', other)`);
                    parser.parseString(`t('Foo15', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Foo16', other)`);
                    parser.parseString(`t('Foo17', 'Comment', 'Plural', other)`); // comment string
                    parser.parseString(`t('Foo18', 'Comment', other)`); // comment string
                    // invalid
                    parser.parseString(`t(null, {comment: 'Comment'}, 'Plural', 'Context')`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            text: 'Foo',
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo2',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo3',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo5',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            text: 'Foo9',
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            text: 'Foo10',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo11',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo12',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo13',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo14',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo15',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo16'
                        },
                        {
                            text: 'Foo17',
                            comments: ['Comment'],
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo18',
                            comments: ['Comment']
                        }
                    ]);
                });
                test('Plural, Text, Context, Comment', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            text: 1,
                            context: 2,
                            comments: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Plural', 'Foo', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Foo2', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo3', null, {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Foo4', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Foo5')`);
                    parser.parseString(`t( null, 'Foo6', 'Context')`);
                    parser.parseString(`t( null, 'Foo7', null, {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Foo8')`);
                    // comment string
                    parser.parseString(`t('Plural', 'Foo9', 'Context', 'Comment')`);
                    parser.parseString(`t('Plural', 'Foo10', null, 'Comment')`);
                    parser.parseString(`t( null, 'Foo11', 'Context', 'Comment')`);
                    parser.parseString(`t( null, 'Foo12', null, 'Comment')`);
                    // partial
                    parser.parseString(`t('Plural', 'Foo13', 'Context', other)`);
                    parser.parseString(`t( null, 'Foo14', 'Context', other)`);
                    parser.parseString(`t('Plural', 'Foo15', other)`);
                    // invalid
                    parser.parseString(`t('Plural', null, 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', null, 'Context', 'Comment')`); // comment string
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            text: 'Foo',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo2',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo4',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            context: 'Context'
                        },
                        {
                            text: 'Foo7',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo9',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo11',
                            context: 'Context',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo12',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo13',
                            context: 'Context'
                        },
                        {
                            text: 'Foo14',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo15'
                        }
                    ]);
                });
                test('Plural, Text, Comment, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            text: 1,
                            comments: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Plural', 'Foo', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Plural', 'Foo2', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Foo3', null, 'Context')`);
                    parser.parseString(`t( null, 'Foo4', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Plural', 'Foo5')`);
                    parser.parseString(`t( null, 'Foo6', {comment: 'Comment'})`);
                    parser.parseString(`t( null, 'Foo7', null, 'Context')`);
                    parser.parseString(`t( null, 'Foo8')`);
                    // comment string
                    parser.parseString(`t('Plural', 'Foo9', 'Comment', 'Context')`);
                    parser.parseString(`t('Plural', 'Foo10', 'Comment')`);
                    parser.parseString(`t( null, 'Foo11', 'Comment', 'Context')`);
                    parser.parseString(`t( null, 'Foo12', 'Comment')`);
                    // partial
                    parser.parseString(`t('Plural', 'Foo13', {comment: 'Comment'}, other)`);
                    parser.parseString(`t(null, 'Foo14', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Plural', 'Foo15', other)`);
                    parser.parseString(`t(null, 'Foo16', other)`);
                    parser.parseString(`t('Plural', 'Foo17', 'Comment', other)`); // comment string
                    parser.parseString(`t(null, 'Foo18', 'Comment', other)`); // comment string
                    // invalid
                    parser.parseString(`t('Plural', null, {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Plural', null, 'Comment', 'Context')`); // comment string
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);


                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            text: 'Foo',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo2',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo9',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo10',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo11',
                            comments: ['Comment'],
                            context: 'Context'
                        },
                        {
                            text: 'Foo12',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo13',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo14',
                            comments: ['Comment']
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo15'
                        },
                        {
                            text: 'Foo16'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo17',
                            comments: ['Comment']
                        },
                        {
                            text: 'Foo18',
                            comments: ['Comment']
                        }
                    ]);
                });
                test('Comment, Text, Plural, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            text: 1,
                            textPlural: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Foo', 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo2', 'Plural')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo3', null, 'Context')`);
                    parser.parseString(`t( null, 'Foo4', 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo5')`);
                    parser.parseString(`t( null, 'Foo6', 'Plural')`);
                    parser.parseString(`t( null, 'Foo7', null, 'Context')`);
                    parser.parseString(`t( null 'Foo8')`);
                    // comment string
                    parser.parseString(`t('Comment', 'Foo9', 'Plural', 'Context')`);
                    parser.parseString(`t('Comment', 'Foo10', 'Plural')`);
                    parser.parseString(`t('Comment', 'Foo11', null, 'Context')`);
                    parser.parseString(`t('Comment', 'Foo12')`);
                    // partial
                    parser.parseString(`t({comment: 'Comment'}, 'Foo13', 'Plural', other)`);
                    parser.parseString(`t(null, 'Foo14', 'Plural', other)`);
                    parser.parseString(`t({comment: 'Comment'}, 'Foo15', other)`);
                    parser.parseString(`t(null, 'Foo16', other)`);
                    parser.parseString(`t('Comment', 'Foo17', 'Plural', other)`); // comment string
                    parser.parseString(`t('Comment', 'Foo18', other)`); // comment string
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, null, 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t('Comment', null, 'Plural', 'Context')`); // comment string
                    parser.parseString(`t('Comment', other)`); // comment string
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            text: 'Foo',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo2',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            text: 'Foo4',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo5'
                        },
                        {
                            text: 'Foo6',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo9',
                            textPlural: 'Plural',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo10',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo11',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo12'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo13',
                            textPlural: 'Plural'
                        },
                        {
                            text: 'Foo14',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo15'
                        },
                        {
                            text: 'Foo16'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo17',
                            textPlural: 'Plural'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo18'
                        }
                    ]);
                });
                test('Plural, Comment, Text, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            comments: 1,
                            text: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Foo', 'Context')`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Foo2')`);
                    parser.parseString(`t('Plural', null, 'Foo3', 'Context')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, 'Foo4', 'Context')`);
                    parser.parseString(`t('Plural', null, 'Foo5')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, 'Foo6')`);
                    parser.parseString(`t( null, null, 'Foo7', 'Context')`);
                    parser.parseString(`t( null, null, 'Foo8')`);
                    // comment string
                    parser.parseString(`t('Plural', 'Comment', 'Foo9', 'Context')`);
                    parser.parseString(`t('Plural', 'Comment', 'Foo10')`);
                    parser.parseString(`t( null, 'Comment', 'Foo11', 'Context')`);
                    parser.parseString(`t( null, 'Comment', 'Foo12')`);
                    // partial
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Foo13', other)`);
                    parser.parseString(`t('Plural', null, 'Foo14', other)`);
                    parser.parseString(`t(null, {comment: 'Comment'}, 'Foo15', other)`);
                    parser.parseString(`t(null, null, 'Foo16', other)`);
                    parser.parseString(`t('Plural', 'Comment', 'Foo17', other)`); // comment string
                    parser.parseString(`t(null, 'Comment', 'Foo18', other)`); // comment string
                    // invalid
                    parser.parseString(`t('Plural', {comment: 'Comment'}, null, 'Context')`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Plural', 'Comment', null, 'Context')`); // comment string
                    parser.parseString(`t('Plural', 'Comment', other)`); // comment string
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo4',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo9',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo10'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo11',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo12'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo13'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo14'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo15'
                        },
                        {
                            text: 'Foo16'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo17'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo18'
                        }
                    ]);
                });
                test('Comment, Plural, Text, Context', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            textPlural: 1,
                            text: 2,
                            context: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo2')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Foo3', 'Context')`);
                    parser.parseString(`t( null, 'Plural', 'Foo4', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Foo5')`);
                    parser.parseString(`t( null, 'Plural', 'Foo6')`);
                    parser.parseString(`t( null, null, 'Foo7', 'Context')`);
                    parser.parseString(`t( null, null, 'Foo8')`);
                    // comment string
                    parser.parseString(`t('Comment', 'Plural', 'Foo9', 'Context')`);
                    parser.parseString(`t('Comment', 'Plural', 'Foo10')`);
                    parser.parseString(`t('Comment', null, 'Foo11', 'Context')`);
                    parser.parseString(`t('Comment', null, 'Foo12')`);
                    // partial
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Foo13', other)`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Foo14', other)`);
                    parser.parseString(`t(null, 'Plural', 'Foo15', other)`);
                    parser.parseString(`t(null, null, 'Foo16', other)`);
                    parser.parseString(`t('Comment', 'Plural', 'Foo17', other)`); // comment string
                    parser.parseString(`t('Comment', null, 'Foo18', other)`); // comment string
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', null, 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', other)`);
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t('Comment', 'Plural', null, 'Context')`); // comment string
                    parser.parseString(`t('Comment', 'Plural', other)`); // comment string
                    parser.parseString(`t('Comment', other)`); // comment string
                    parser.parseString(`t(null, 'Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);


                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo3',
                            context: 'Context'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo4',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo6'
                        },
                        {
                            text: 'Foo7',
                            context: 'Context'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo9',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo11',
                            context: 'Context'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo12'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo13'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo14'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo15'
                        },
                        {
                            text: 'Foo16'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo17'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo18'
                        }
                    ]);
                });
                test('Plural, Context, Comment, Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            context: 1,
                            comments: 2,
                            text: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Plural', 'Context', {comment: 'Comment'}, 'Foo')`);
                    parser.parseString(`t('Plural', 'Context', null, 'Foo2')`);
                    parser.parseString(`t('Plural', null, {comment: 'Comment'}, 'Foo3')`);
                    parser.parseString(`t( null, 'Context', {comment: 'Comment'}, 'Foo4')`);
                    parser.parseString(`t('Plural', null, null, 'Foo5')`);
                    parser.parseString(`t( null, 'Context', null, 'Foo6')`);
                    parser.parseString(`t( null, null, {comment: 'Comment'}, 'Foo7')`);
                    parser.parseString(`t( null, null, null, 'Foo8')`);
                    // comment string
                    parser.parseString(`t('Plural', 'Context', 'Comment', 'Foo9')`);
                    parser.parseString(`t('Plural', null, 'Comment', 'Foo10')`);
                    parser.parseString(`t( null, 'Context', 'Comment', 'Foo11')`);
                    parser.parseString(`t( null, null, 'Comment', 'Foo12')`);
                    // invalid
                    parser.parseString(`t('Plural', 'Context', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Plural', 'Context', {comment: 'Comment'})`);
                    parser.parseString(`t('Plural', 'Context', 'Comment', other)`); // comment string
                    parser.parseString(`t('Plural', 'Context', 'Comment')`); // comment string
                    parser.parseString(`t('Plural', 'Context', other)`);
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo3'
                        },
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo4'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            context: 'Context',
                            text: 'Foo6'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo9'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo10'
                        },
                        {
                            context: 'Context',
                            comments: ['Comment'],
                            text: 'Foo11'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Plural, Comment, Context, Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            textPlural: 0,
                            comments: 1,
                            context: 2,
                            text: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Context', 'Foo')`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, null, 'Foo2')`);
                    parser.parseString(`t('Plural', null, 'Context', 'Foo3')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, 'Context', 'Foo4')`);
                    parser.parseString(`t('Plural', null, null, 'Foo5')`);
                    parser.parseString(`t( null, {comment: 'Comment'}, null, 'Foo6')`);
                    parser.parseString(`t( null, null, 'Context', 'Foo7')`);
                    parser.parseString(`t( null, null, null, 'Foo8')`);
                    // comment string
                    parser.parseString(`t('Plural', 'Comment', 'Context', 'Foo9')`);
                    parser.parseString(`t('Plural', 'Comment', null, 'Foo10')`);
                    parser.parseString(`t( null, 'Comment', 'Context', 'Foo11')`);
                    parser.parseString(`t( null, 'Comment', null, 'Foo12')`);
                    // invalid
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Context', other)`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, 'Context')`);
                    parser.parseString(`t('Plural', {comment: 'Comment'}, other)`);
                    parser.parseString(`t('Plural', 'Comment', 'Context', other)`); // comment string
                    parser.parseString(`t('Plural', 'Comment', 'Context')`); // comment string
                    parser.parseString(`t('Plural', 'Comment', other)`); // comment string
                    parser.parseString(`t('Plural', other)`);
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo2'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo4'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo5'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo6'
                        },
                        {
                            context: 'Context',
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo9'
                        },
                        {
                            textPlural: 'Plural',
                            comments: ['Comment'],
                            text: 'Foo10'
                        },
                        {
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo11'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo12'
                        }
                    ]);
                });
                test('Comment, Plural, Context, Text', () => {
                    parser = createParser('t', {
                        arguments: {
                            comments: 0,
                            textPlural: 1,
                            context: 2,
                            text: 3
                        },
                        comments: {
                            commentString: 'comment', props: {props: ['{', '}']}
                        }
                    });
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Context', 'Foo')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', null, 'Foo2')`);
                    parser.parseString(`t({comment: 'Comment'}, null, 'Context', 'Foo3')`);
                    parser.parseString(`t( null, 'Plural', 'Context', 'Foo4')`);
                    parser.parseString(`t({comment: 'Comment'}, null, null, 'Foo5')`);
                    parser.parseString(`t( null, 'Plural', null, 'Foo6')`);
                    parser.parseString(`t( null, null, 'Context', 'Foo7')`);
                    parser.parseString(`t( null, null, null, 'Foo8')`);
                    // comment string
                    parser.parseString(`t('Comment', 'Plural', 'Context', 'Foo9')`);
                    parser.parseString(`t('Comment', 'Plural', null, 'Foo10')`);
                    parser.parseString(`t('Comment', null, 'Context', 'Foo11')`);
                    parser.parseString(`t('Comment', null, null, 'Foo12')`);
                    // invalid
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Context', other)`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', 'Context')`);
                    parser.parseString(`t({comment: 'Comment'}, 'Plural', other)`);
                    parser.parseString(`t({comment: 'Comment'}, other)`);
                    parser.parseString(`t('Comment', 'Plural', 'Context', other)`); // comment string
                    parser.parseString(`t('Comment', 'Plural', 'Context')`); // comment string
                    parser.parseString(`t('Comment', 'Plural', other)`); // comment string
                    parser.parseString(`t('Comment', other)`); // comment string
                    parser.parseString(`t(other)`);
                    parser.parseString(`t()`);

                    expect(messages).toEqual([
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo2'
                        },
                        {
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo3'
                        },
                        {
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo4'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo5'
                        },
                        {
                            textPlural: 'Plural',
                            text: 'Foo6'
                        },
                        {
                            context: 'Context',
                            text: 'Foo7'
                        },
                        {
                            text: 'Foo8'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            context: 'Context',
                            text: 'Foo9'
                        },
                        {
                            comments: ['Comment'],
                            textPlural: 'Plural',
                            text: 'Foo10'
                        },
                        {
                            comments: ['Comment'],
                            context: 'Context',
                            text: 'Foo11'
                        },
                        {
                            comments: ['Comment'],
                            text: 'Foo12'
                        }
                    ]);
                });
            });
        });
    });
});
