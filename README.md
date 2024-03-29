# [gettext-extractor](https://github.com/lukasgeiter/gettext-extractor) for svelte files
This extractor extracts also all the called functions and the function definition into a separate dictionary.

### Installation

npm install gettext-extractor-svelte

### Usage:

```ts
import {
    SvelteGettextExtractor, 
    callExpressionExtractor, 
    ICustomJsExtractorOptions,
    FunctionExtractorBuilder
} from 'gettext-extractor-svelte';

const extractor = new SvelteGettextExtractor();
const functionExtractor = new FunctionExtractorBuilder();
const findTranslationClassExpression = functionExtractor.variableDeclaration(
    'Foo', functionExtractor.classExpression(undefined, [
        functionExtractor.methodDeclaration('bar', true)
    ])
);

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
    identifierKeys: ['text', 'context'],
    translatorFunction: {
        functionExtractor: findTranslationClassExpression,
        identifier: 'translatorFunction',
        restrictToFile: './src/translator.ts'
    }
}

extractor.createSvelteParser()
    .addExtractor(callExpressionExtractor('t', options))
    .parseFilesGlob('./src/**/*.svelte');

const messages = extractor.getMessages();
const functionDict = extractor.getFunctions();
const messageDict = extractor.getMessageDictionary();
```
From the following svelte file named `src/App.svelte`:
```sveltehtml
<script lang="ts">
    import { t } from './translator-function';
    import Component from './Component.svelte';
    export let place: string;
    let caption = t(
        'FooCaption', 
        'Context', 
        {comment: 'Comment', path: 'https://www.example.com'}
    );
</script>

<body>
    <h1>{caption}</h1>
    <p>{t('Foo')}</p>
    {#each [t('Bar'), t('Baz')] as text}
        <p>{text}</p>
        <Component label="{t('Bax', 'Context', {comment: 'Comment'})}">
            {t(
                'Hello {PLACE}', 
                'Context', 
                { 
                    comment: 'Multiline\nComment', 
                    props: {PLACE: 'The place where you are'},
                    messageformat: 'This could be a messageformat function'
                },
                {PLACE: place}
            )}
        </Component>
    {/each}
</body>
```
and the following translation function in file `src/translator.ts`:
```ts
let foo = class Bar {
    bar(translationObject: any) {
        return 'I am translated';
    }
}
```
we extract the following messages:
```js
[
    {
        text: 'FooCaption',
        context: 'Context',
        comments: [
            'Comment',
            'path: https://www.example.com'
        ],
        references: [
            'src/App.svelte:5'
        ],
    },
    {
        text: 'Foo',
        references: [
            'src/App.svelte:14'
        ],
    },
    {
        text: 'Bar',
        references: [
            'src/App.svelte:15'
        ],
    },
    {
        text: 'Baz',
        references: [
            'src/App.svelte:15'
        ],
    },
    {
        text: 'Bax',
        context: 'Context',
        comments: [
            'Comment',
        ],
        references: [
            'src/App.svelte:17'
        ],
    },
    {
        text: 'Hello {PLACE}',
        context: 'Context',
        comments: [
            'Multiline',
            'Comment',
            'messageformat: This could be a messageformat function',
            '{PLACE}: The place where you are'
        ],
        references: [
            'src/App.svelte:18'
        ],
    },
]
```
the following functions:
```js
{
    'src/App.svelte': [
        {
            functionString: `_(
        'FooCaption',
        'Context',
        {comment: 'Comment', path: 'https://www.example.com'}
    )`,
            functionData: {
                functionName: '_',
                functionArgs: []
            },
            identifier: '{"text":"FooCaption","context":"Context"}',
            startChar: 162,
            endChar: 273
        },                
        {
            functionString: "_('Foo')",
            functionData: {
                functionName: '_',
                functionArgs: []
            },
            identifier: '{"text":"Foo"}',
            startChar: 324,
            endChar: 332
        },
        {
            functionString: "_('Bar')",
            functionData: {
                functionName: '_',
                functionArgs: []
            },
            identifier: '{"text":"Bar"}',
            startChar: 350,
            endChar: 358
        },
        {
            functionString: "_('Baz')",
            functionData: {
                functionName: '_',
                functionArgs: []
            },
            identifier: '{"text":"Baz"}',
            startChar: 360,
            endChar: 368
        },
        {
            functionString: "_('Bax')",
            functionData: {
                functionName: '_',
                functionArgs: []
            },
            identifier: '{"text":"Bax"}',
            startChar: 428,
            endChar: 436
        },
        {
            functionString: `_(
                'Hello {PLACE}',
                'Context',
                {
                    comment: 'Multiline\\nComment',
                    props: {PLACE: 'The place where you are'},
                    messageformat: 'This could be a messageformat function'
                },
                {PLACE: place}
            )`,
            functionData: {
                functionName: '_',
                functionArgs: ['{PLACE: place}']
            },
            identifier: '{"text":"Hello {PLACE}","context":"Context"}',
            startChar: 486,
            endChar: 820
        } 
    ],
    'src/translator.ts': [
        {
            functionString:
`bar(translationObject: any) {
        return 'I am translated';
    }`,
            identifier: 'translatorFunction',
            definition: true, // marks that this entry is an extracted translation function
            startChar: 26,
            endChar: 95
        }
    ]
}
```
and the mapping of identifiers to text as an object
```js
{
    '{"text":"Foo"}': 'Foo',
    '{"text":"Bar"}': 'Bar',
    '{"text":"Baz"}': 'Baz',
    '{"text":"Bax"}': 'Bax',
    '{"text":"FooCaption","context":"Context"}': 'FooCaption',
    '{"text":"Hello {PLACE}","context":"Context"}': 'Hello {PLACE}'
}

```
### Additional methods for SvelteGettextExtractor

### &nbsp;&nbsp;`createSvelteParser()`
Create parser for parsing `.svelte` files

##### Return Value
*SvelteParser* · Can be used in the same way as parser created with [`createJsParser()`](https://github.com/lukasgeiter/gettext-extractor/wiki/API-Reference#createjsparserextractors), except the following added parse option:

| **Name**              | **Type**                                           | **Details**                                           |
|-----------------------|----------------------------------------------------|-------------------------------------------------------|
| `options`             | *object*                                           | Additional parse option                               |
| `translatorFunctions` | *TTranslatorFunction &vert; TTranslatorFunction[]* | Translation Function Definition to extract functions. |

### <a id="get-functions"></a>&nbsp;&nbsp;`getFunctions()`
Gets all parsed function calls

##### Return Value
*object* · Dictionary with keys of file name and values of a list of function objects with properties as described below

| **Name**              | **Type**   | **Details**                                                                |
|-----------------------|------------|----------------------------------------------------------------------------|
| `functionString`      | *string*   | String of the function call in the source code                             |
| `functionData`        | *object*   | Object containing keys functionName and functionArgs                       |
| →&nbsp;`functionName` | *string*   | Name of the called function                                                |
| →&nbsp;`functionArgs` | *string[]* | Arguments without arguments defining text, textPlural, context and comment |
| `identifier`          | *string*   | Identifier string constructed trough options.identifierKeys                |
| `definition`          | *true*     | When set marks that string is part of translation function definition      |
| `startChar`           | *number*   | Index where the function call string starts                                |
| `endChar`             | *number*   | Index where the function call string ends                                  |

### &nbsp;&nbsp;`getLastAddedFunctions()`
Receive array of functions, which got added in the last call of `parseJsString`, `parseSvelteString`.

##### Return Value
*array* · Same as values of dictionary described in [`getFunctions()`](#get-functions)

### &nbsp;&nbsp;`getFunctionsByFileName(fileName)`
Gets all parsed function calls in a file

#### Parameters
| **Name**   | **Type** | **Details**                 |
|------------|----------|-----------------------------|
| `fileName` | *string* | **Required** · Name of file |

##### Return Value
*array* · Same as values of dictionary described in [`getFunctions()`](#get-functions)

### &nbsp;&nbsp;`saveFunctionJSON(fileName)`
Save functions dictionary as a JSON file.

#### Parameters
| **Name**   | **Type** | **Details**                 |
|------------|----------|-----------------------------|
| `fileName` | *string* | **Required** · Name of file |

#### Return Value
*void*

### &nbsp;&nbsp;`saveFunctionJSONAsync(fileName)`
Save functions dictionary as a JSON file asynchronously.

#### Parameters
| **Name**   | **Type** | **Details**                 |
|------------|----------|-----------------------------|
| `fileName` | *string* | **Required** · Name of file |

#### Return Value
*Promise*

### &nbsp;&nbsp;`getMessageDictionary()`
Recieve a dictionary mapping message text to function identifiers.

##### Return Value
*object* · Dictionary with identifier strings as keys and message text as value

###  <a id="get-messages-with-id"></a>&nbsp;&nbsp;`getMessagesWithId()`
Recieve array of messages with identifier.

##### Return Value
| **Name**     | **Type**   | **Details**                                                   |
|--------------|------------|---------------------------------------------------------------|
| `text`       | *string*   | Message string                                                |
| `textPlural` | *string*   | Plural version of the message string                          |
| `context`    | *string*   | Message context                                               |
| `references` | *string[]* | Array of file references where the message was extracted from |
| `comments`   | *string[]* | Array of comments for this message                            |
| `identifier` | *string*   | Identifier string constructed trough options.identifierKeys   |

### &nbsp;&nbsp;`getLastAddedMessages()`
Receive array of messages with identifier, which got added in the last call of `parseJsString`, `parseSvelteString` or `parseHtmlString`.

##### Return Value
*array* · List of message objects (same properties as for [`getMessagesWithId()`](#get-messages-with-id))

### &nbsp;&nbsp;`getTransformedMessages<T = any>(func: (messages: IMessage[]) => T)`
Transform message object with custom function.

#### Parameters
| **Name**   | **Type** | **Details**                 |
|------------|----------|-----------------------------|
| `func` | *(messages: IMessage[]) => T* | **Required** · Transformer function |

##### Return Value
*T* · Depends on your function

For all other available options please look at the package [gettext-extractor](https://github.com/lukasgeiter/gettext-extractor)

# JS Parser for [gettext-extractor](https://github.com/lukasgeiter/gettext-extractor)

Extract comments provided by a string or an object in the translator function.

```ts
import { callExpressionExtractor, ICustomJsExtractorOptions } 
    from 'gettext-extractor-svelte';
import { GettextExtractor } from 'gettext-extractor'; // Works also with SvelteGettextExtractor

const options: ICustomJsExtractorOptions = {
    arguments: {
        text: 0,
        textPlural: 1,
        comments: 2,
        context: 3,
    },
    comments: {
        commentString: 'comment',
        props: {
            props: ['{', '}']
        }
    }
};

const extractor = new GettextExtractor();

extractor
    .createJsParser()
    .addExtractor(callExpressionExtractor('_', options))
    .parseFilesGlob('src/**/*.@(ts|js|tsx|jsx)');
```

### `callExpressionExtractor(calleeName, options)`

#### Parameters
| Name          | Type   | Details                                                                 |
|---------------|--------|-------------------------------------------------------------------------|
| `calleeName`  | *string* or<br>*string[]* | **Required** · Name(s) of the function(s)            |
| `options`     | *object*                  | Options to configure the extractor function          |
| → `arguments` | *object*                  | **Required** · See [Argument Mapping](#argument-mapping) below          |
| → `comments`  | *object*                  | See [Comment Options](#comment-options) below                           |
| → `identifierKeys`  | *<'text' &vert; 'textPlural' &vert; 'context'>[]* | Fields for constructing ids to map messages to functions, defaults to all. At least one of these keys should match each message function. Defaults to `['text', 'context']` |
| →&nbsp;`translatorFunction` | *object* | See [Translator Function Options](#translator-function-options) below      |
| → `content`   | *object*                  | See [Content Options](#content-options) below                           |

##### <a id="argument-mapping"></a>Argument Mapping
| Name          | Type     | Details                                                             |
|---------------|----------|---------------------------------------------------------------------|
| `text`        | *number* | **Required** · Position of the argument containing the message text |
| `textPlural`  | *number* | Position of the argument containing the plural message text         |
| `context`     | *number* | Position of the argument containing the message context             |
| `comments`    | *number* | Position of the argument containing the comments string or object   |

##### <a id="comment-options"></a>Comment Options
If ommitted the comment is expected to be a string. If fallback is true, the comment has to be an object, otherwise it can be a string or an object.

| Name                 | Type      | Default   | Details                                                               |
|----------------------|-----------|-----------|-----------------------------------------------------------------------|
| `commentString`      | *string*  | `comment` | Key for providing plain comments                                      |
| `props`              | *object*  |           | Each key under `props` has a value of an array with two strings. In the comment object we can provide key value pairs under each key defined under `props`. Each of these keys gets wrapped in between the provided two strings. Then after a semicolon the value is concatenated. |
| `throwWhenMalformed` | *boolean* | `true`    | If set to `true`, throws an error when in the comment object any value is not a plain string |
| `fallback`           | *boolean* | `false`   | If set to `true`, an omitted argument fallbacks to the next argument if the next argument is of different type|

If not trough commentString or props specified keys are used in the comment object, then these keys (concatenated with dots when they are nested) are added
to the comments with a semicolon followed by the value of the key.

##### <a id="content-options"></a>Content Options
| Name                  | Type                    | Default   | Details                                                |
|-----------------------|-------------------------|-----------|--------------------------------------------------------|
| `trimWhiteSpace`      | *boolean*               | `false`   | If set to `true`, white space at the very beginning and at the end of the content will get removed<br>Normally this behaves like `.trim()`, however if `preseveIndentation` is `true`, the indentation of the first line is kept as well.|
| `preserveIndentation` | *boolean*               | `true`    | If set to `false`, white space at the beginning of the line will get removed |
| `replaceNewLines`     | *false* or <br>*string* | `false`   | If a string is provided all new lines will be replaced with it |

##### <a id="translator-function-options"></a>Function Extractor Options
| Name                  | Type                    | Default   | Details                                                                           |
|-----------------------|-------------------------|-----------|-----------------------------------------------------------------------------------|
| `functionExtractor`   | *FunctionExtractor*     |           | The function extractor describing the typescript nodes of the function to extract |
| `identifier`          | *string*                |           | The identifier under which the function will be added to the dict                 |
| `restrictToFile`      | *string*                |           | When set than only the specified file will be parsed for the function             |

##### Return Value
*function* · An extractor function that extracts messages from call expressions.

#### Example
With the example settings from the usage example and the following functions
```ts
// We can provide comments as string
const string1 = _(
    'Foo',
    'Plural',
    'Comment',
    'Context'
);
// Or we can provide comments as object
const string2 = _(
    'Hello {PLACE}',
    'Plural',
    {
        comment: 'Comment',
        props: {
            PLACE: 'The place of interest'
        },
        path: 'https://www.example.com',
        nested: {
            key1: 'Key1',
            key2: 'Key2'
        }
    }
);
// When type of argument does not match declared type, then all following arguments are ignored
const string3 = _(
    'Foo2',
    {
        comment: 'Comment'
    },
    'Context'
)
// We can omit empty arguments with `null`, `undefined` or `0`
const string4 = _(
    'Foo3',
    null,
    null,
    'Context'
);
```
We extract the following messages
```ts
[
    {
        text: 'Foo',
        textPlural: 'Plural',
        coments: ['Comment'],
        context: 'Context'
    },
    {
        text: 'Hello {PLACE}',
        textPlural: 'Plural',
        comments: [
            'Comment',
            'path: https://www.example.com',
            '{PLACE}: The place of interest',
            'nested.key1: Key1',
            'nested.key2: Key2'
        ]
    },
    {
        text: 'Foo2'
    },
    {
        text: 'Foo3',
        context: 'Context'
    }
]
```
If we have the option `fallback: true` set:
```ts
const options: ICustomJsExtractorOptions = {
    arguments: {
        text: 0,
        textPlural: 1,
        comments: 2,
        context: 3,
    },
    comments: {
        commentString: 'comment',
        props: {
            props: ['{', '}']
        },
        fallback: true
    }
};

```
and the following functions
```ts
const string1 = (worldPlace: string) => _(
    'Hello {PLACE}', 
    'Plural', 
    {
        comment: 'Comment', 
        props: {
            PLACE: 'The place of interest'
        }, 
        path: 'http://www.example.com', 
        nested: {
            key1: 'Key1',
            key2: 'Key2'
        }
    },
    'Context',
    {
        PLACE: worldPlace
    }
);
// when omitting the second argument the third argument can take the place of the second argument 
// if the arguments are of different type. If there are more arguments, they also change their
// place accordingly.
const string2 = _(
    'Foo',
    {
        comment: 'No Plural here.'
    }
);
// omit comment object
const string3 = _(
    'Foo2',
    'Plural',
    'Context'
);
// skip textPlural and comment object, allowed placeholders are `null`, `undefined` or `0`
const string4 = _(
    'Foo3',
    null,
    null,
    'Context'
);
// if argument is not string or comment object than rest of arguments are ignored
const string5 = (props: {PROPS: string}) => _(
    'My {PROPS}',
    {
        props: {
            PROPS: 'Some props'
        }
    },
    props
);
```

we extract the following messages
```js
[
    {
        text: 'Hello {PLACE}',
        textPlural: 'Plural',
        comments: [
            'Comment',
            'path: http://www.example.com',
            '{PLACE}: The place of interest',
            'nested.key1: Key1',
            'nested.key2: Key2'
        ],
        context: 'Context'
    },
    {
        text: 'Foo',
        comments: [
            'No Plural here.'
        ],
    },
    {
        text: 'Foo2',
        textPlural: 'Plural',
        context: 'Context'
    },
    {
        text: 'Foo3',
        context: 'Context'
    },
    {
        text: 'My {PROPS}',
        comments: [
            '{PROPS}: Some props'
        ]
    }
]
```
If any argument is not a string or comment object then the parsing is cut off starting from this argument. If there are
other arguments in between these arguments, their position is not considered in the fallback.

# JS Node Parser for [gettext-extractor](https://github.com/lukasgeiter/gettext-extractor)
Extracts nodes provided by `TTranslatorFunction` or by providing `TTranslatorFunction[]` on each `.parseString` or `.parseSvelteString` method call.

```ts
import { nodeExtractor, TTranslatorFunction, FunctionExtractorBuilder, SvelteGettextExtractor } from 'gettext-extractor-svelte';

const functionExtractor = new FunctionExtractorBuilder();
const importDeclaration = functionExtractor.importDeclaration(
    './translations',
    functionExtractor.importClause(
        't'
    ),
    true,
);

const translatorFunctions: TTranslatorFunction[] = [
    {
        identifier: 'translationFunctionImport',
        functionName: 't',
        functionExtractor: importDeclaration
    }
];

const extractor = new SvelteGettextExtractor();

extractor.createJsParser()
    .addExtractor(nodeExtractor())
    .parseString('import t from "./translations";', 'src/app.js', {translatorFunctions});

extractor.getFunctions() === {
    'src/app.js': [
        {
            functionString: 'import t from "./translations";',
            functionData: {
                functionName: 't',
                functionArgs: []
            },
            startChar: 0,
            endChar: 31,
            identifier: 'translationFunctionImport',
            definition: true
        }
    ]
}; // true
```

### `nodeExtractor(translatorFunction)`

#### Parameters
| Name          | Type   | Details                                                                 |
|---------------|--------|-------------------------------------------------------------------------|
| `translatorFunction` | *TTranslatorFunction* or *TTranslatorFunction[]* | See [Translator Function Options](#translator-function-options2) below      |

##### <a id="translator-function-options2"></a>Function Extractor Options
| Name                  | Type                    | Default   | Details                                                                           |
|-----------------------|-------------------------|-----------|-----------------------------------------------------------------------------------|
| `functionExtractor`   | *FunctionExtractor*     |           | The function extractor describing the typescript nodes of the function to extract |
| `identifier`          | *string*                |           | The identifier under which the function will be added to the dict                 |
| `restrictToFile`      | *string*                |           | When set than only the specified file will be parsed for the function             |
# Function Extractor Builder

```js
import {
    FunctionExtractorBuilder
} from 'gettext-extractor-svelte';

const functionExtractor = new FunctionExtractorBuilder();
```
## Methods for FunctionExtractorBuilder

### &nbsp;&nbsp;`objectLiteralExpression(properties?, getPos?)`
Marks object literal expressions

#### Parameters
| **Name**     | **Type**               | **Default** | **Details**                                                                |
|--------------|------------------------|-------------|----------------------------------------------------------------------------|
| `properties` | *FunctionExtractor []* |             | List of function extractors defining the properties of the object          |
| `getPos`     | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`variableDeclaration(variableName, initializer?, getPos?)`
Marks variable declarations

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `variableName` | *string*               |             | **Required** · Name of declared variable                                   |
| `initializer`  | *FunctionExtractor*    |             | Function extractor defining the initializer                                |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`propertyAssignment(keyName, initializer?, getPos?)`
Marks property assignment

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `keyName`      | *string*               |             | **Required** · Name of property                                            |
| `initializer`  | *FunctionExtractor*    |             | Function extractor defining the initializer                                |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`methodDeclaration(methodName, getPos?)`
Marks method declaration

#### Parameters
| **Name**     | **Type**               | **Default** | **Details**                                                                |
|--------------|------------------------|-------------|----------------------------------------------------------------------------|
| `methodName` | *string*               |             | **Required** · Name of method                                              |
| `getPos`     | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`arrowFunction(getPos?)`
Marks arrow function

#### Parameters
| **Name**     | **Type**               | **Default** | **Details**                                                                |
|--------------|------------------------|-------------|----------------------------------------------------------------------------|
| `getPos`     | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`propertyDeclaration(propertyName, initializer?, getPos?)`
Marks property declaration

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `propertyName` | *string*               |             | **Required** · Name of property                                            |
| `properties`   | *FunctionExtractor*    |             | Function extractor defining the initializer                                |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`functionDeclaration(functionName, getPos?)`
Marks function declaration

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `functionName` | *string*               |             | **Required** · Name of function declaration                                                |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`functionExpression(functionName?, getPos?)`
Marks function expression

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `functionName` | *string*               |             | Name of function expression                                                |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`classDeclaration(className, members?, getPos?)`
Marks class declarations

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `className`    | *string*               |             | **Required** · Name of class                                               |
| `members`      | *FunctionExtractor[]*  |             | Array of function extractors defining the members of the class             |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`classExpression(className?, members?, getPos?)`
Marks class expression

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `className`    | *string*               |             | Name of class                                                              |
| `members`      | *FunctionExtractor[]*  |             | Array of function extractors defining the members of the class             |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`getAccessor(accessorName, body?, getPos?)`
Marks get accessor

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `accessorName` | *string*               |             | **Required** · Name of accessor                                            |
| `body`         | *FunctionExtractor*    |             | Function extractor defining the body of the get accessor                   |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`setAccessor(accessorName, body?, getPos?)`
Marks set accessor

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `accessorName` | *string*               |             | **Required** · Name of accessor                                            |
| `body`         | *FunctionExtractor*    |             | Function extractor defining the body of the set accessor                   |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`expressionStatement(identifier, right?, getPos?)`
Marks expression statement

#### Parameters
| **Name**       | **Type**               | **Default** | **Details**                                                                |
|----------------|------------------------|-------------|----------------------------------------------------------------------------|
| `identifier`   | *string*               |             | **Required** · Name of identifier on the left side of expression statement |
| `right`        | *FunctionExtractor*    |             | Function extractor defining the right side of the expression statement     |
| `getPos`       | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`labeledStatement(statement?, getPos?)`
Marks labeled statement

#### Parameters
| **Name**     | **Type**               | **Default** | **Details**                                                                |
|--------------|------------------------|-------------|----------------------------------------------------------------------------|
| `statement`  | *FunctionExtractor*    |             | Function extractor for defining the right side of the labeled statement    |
| `getPos`     | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`importDeclaration(moduleSpecifier, importClause?, getPos?)`
Marks import declaration

#### Parameters
| **Name**          | **Type**               | **Default** | **Details**                                                                |
|-------------------|------------------------|-------------|----------------------------------------------------------------------------|
| `moduleSpecifier` | *string*               |             | **Required** · Name of module imported in this declaration                 |
| `importClause`    | *FunctionExtractor*    |             | Function extractor defining the import clause                              |
| `getPos`          | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`importClause(name?, elements?, getPos?)`
Marks import clause

#### Parameters
| **Name**          | **Type**               | **Default** | **Details**                                                                |
|-------------------|------------------------|-------------|----------------------------------------------------------------------------|
| `name`            | *string*               |             | Name of main import in this clause                                         |
| `elements`        | *FunctionExtractor[]*  |             | List of function extractors defining the imported elements                 |
| `getPos`          | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`importSpecifier(name, getPos?)`
Marks import specifier

#### Parameters
| **Name**          | **Type**               | **Default** | **Details**                                                                |
|-------------------|------------------------|-------------|----------------------------------------------------------------------------|
| `name`            | *string*               |             | Name of import in this specifier                                           |
| `getPos`          | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`variableStatment(declarations?, getPos?)`
Marks variable statement

#### Parameters
| **Name**          | **Type**               | **Default** | **Details**                                                                |
|-------------------|------------------------|-------------|----------------------------------------------------------------------------|
| `declarations`    | *FunctionExtractor[]*  |             | List of variable declared in this statement                                |
| `getPos`          | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 

### &nbsp;&nbsp;`newExpression(name, getPos?)`
Marks new expression

#### Parameters
| **Name**          | **Type**               | **Default** | **Details**                                                                |
|-------------------|------------------------|-------------|----------------------------------------------------------------------------|
| `name`            | *string*               |             | Name of new expression                                                     |
| `getPos`          | *boolean*              | `false`     | Return start and end position in call expression to extract node as string |

##### Return Value
*FunctionExtractor* 
