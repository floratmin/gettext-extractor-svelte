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
