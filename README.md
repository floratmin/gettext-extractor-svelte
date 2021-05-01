# [gettext-extractor](https://github.com/lukasgeiter/gettext-extractor) for svelte files

### Installation

npm install gettext-extractor-svelte

### Usage:

```ts
import {
    SvelteGettextExtractor, 
    callExpressionExtractor, 
    ICustomJsExtractorOptions 
} from 'svelte-gettext-extractor';

const extractor = new SvelteGettextExtractor();

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
}

extractor.createSvelteParser()
    .addExtractor(callExpressionExtractor('t', options))
    .parseFilesGlob('./src/**/*.svelte');

const messages = extractor.getMessages();
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

For all available options please look at package [gettext-extractor](https://github.com/lukasgeiter/gettext-extractor)