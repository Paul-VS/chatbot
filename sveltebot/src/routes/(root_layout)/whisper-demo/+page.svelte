<script>
	import { onMount } from 'svelte';
	import { MicVAD } from '@ricky0123/vad-web';

	let spinning = false;
	let worker = undefined;
	let transcript = '';

	const loadWorker = async () => {
		const TranscriberWorker = await import('$lib/transcribe.worker?worker');
		worker = new TranscriberWorker.default();
		if (worker) {
			worker.postMessage({ command: 'init' });
		}

		worker.onmessage = function (event) {
			if (event.data.status === 'transcribed') {
				transcript += event.data.text;
			}
		};
	};

	onMount(loadWorker);

	async function startVAD() {
		const myvad = await MicVAD.new({
			onSpeechStart: () => {
				spinning = true;
			},
			onSpeechEnd: async (audio) => {
				spinning = false;
				if (worker) {
					worker.postMessage({ command: 'transcribe', audio });
				}
			}
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
