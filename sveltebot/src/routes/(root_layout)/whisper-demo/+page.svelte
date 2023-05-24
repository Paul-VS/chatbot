<script>
	import { onMount } from 'svelte';
	import { pipeline } from '@xenova/transformers';
	import { MicVAD } from '@ricky0123/vad-web';

	let spinning = false;
	let transcriber = null;
	let transcript = '';

	onMount(async () => {
		transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
	});

	async function startVAD() {
		const myvad = await MicVAD.new({
			onSpeechStart: () => {
				spinning = true;
			},
			onSpeechEnd: async (audio) => {
				spinning = false;

				if (transcriber) {
					let result = await transcriber(audio);
					transcript += result.text;
				} else {
					console.log('Transcriber is not initialized yet.');
				}
			}
			// positiveSpeechThreshold: 0.8,
			// negativeSpeechThreshold: 0.3
		});

		myvad.start();
	}

	startVAD();
</script>

<div class="disk" style="animation-play-state: {spinning ? 'running' : 'paused'}" />
<p>{transcript}</p>

<style>
	.disk {
		width: 100px;
		height: 100px;
		border-radius: 50%;
		border: 16px solid #f3f3f3;
		border-top: 16px solid #3498db;
		animation: spin 2s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
