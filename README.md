# [gettext-extractor](https://github.com/lukasgeiter/gettext-extractor) for svelte files

### Usage:

```ts
import {SvelteGettextExtractor, callExpressionExtractor, ICustomJsExtractorOptions } from '@floratmin/gettext-extractor-svelte';

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
    .addExtractor(callExpressionExtractor('_', options))
    .parseFilesGlob('./src/**/*.svelte');

const messages = extractor.getMessages();
```
From the following svelte file named `src/App.svelte`:
```
<script lang="ts">
    import { _ } from './translator-function';
    import Component from './Component.svelte';
    let caption = _('FooCaption', 'Context', {comment: 'Comment', path: 'https://www.example.com'});
</script>

<body>
    <h1>{caption}</h1>
    <p>{_('Foo')}</p>
    {#each [_('Bar', 'Context', 'Comment'), _('Baz', 'Context', {comment: 'Comment'})] as text}
        <p>{text}</p>
        <Component label="{_('Bax', 'Context', {comment: 'Comment'})}">
            {_('Hello {PLACE}', 'Context', {comment: 'Multiline\nComment', props: {PLACE: 'The place where you are'}})}
        </Component>
    {/each}
</body>
```
we extract the following messages:
```ts
m = [
    {
        text: 'FooCaption',
        context: 'Context',
        comments: [
            'Comment',
            'path: https://www.example.com'
        ],
        references: [
            'src/App.svelte:4'
        ],
    },
    {
        text: 'Foo',
        references: [
            'src/App.svelte:9'
        ],
    },
    {
        text: 'Bar',
        context: 'Context',
        comments: [
            'Comment',
        ],
        references: [
            'src/App.svelte:10'
        ],
    },
    {
        text: 'Baz',
        context: 'Context',
        comments: [
            'Comment',
        ],
        references: [
            'src/App.svelte:10'
        ],
    },
    {
        text: 'Bax',
        context: 'Context',
        comments: [
            'Comment',
        ],
        references: [
            'src/App.svelte:12'
        ],
    },
    {
        text: 'Hello {PLACE}',
        context: 'Context',
        comments: [
            'Multiline',
            'Comment',
            '{PLACE}: The place where you are'
        ],
        references: [
            'src/App.svelte:13'
        ],
    },
]
```

For all available options please look at package [gettext-extractor](https://github.com/lukasgeiter/gettext-extractor)