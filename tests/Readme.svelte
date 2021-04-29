<script lang="ts">
    import { _ } from './translator-function';
    import Component from './Component.svelte';
    export let place: string;
    let caption = _('FooCaption', 'Context', {comment: 'Comment', path: 'https://www.example.com'});
</script>

<body>
    <h1>{caption}</h1>
    <p>{_('Foo')}</p>
    {#each [_('Bar', 'Context', 'Comment'), _('Baz', 'Context', {comment: 'Comment'})] as text}
        <p>{text}</p>
        <Component label="{_('Bax', 'Context', {comment: 'Comment'})}">
            {_(
                'Hello {PLACE}',
                'Context',
                {comment: 'Multiline\nComment', props: {PLACE: 'The place where you are'}},
                {PLACE: place}
            )}
        </Component>
    {/each}
</body>