<script>
	import { t } from './translations';
	export let name;
	let greeting = t('Welcome {NAME}', 'app', {comment: 'Welcoming the user', props: {NAME: 'Name of user'}}, {NAME: name});
</script>

<main>
	<h1>{t('Hello World', 'app', 'Computer is greeting')}!</h1>
	<p>{greeting}</p>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}
	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
