<script>
	import { onMount } from 'svelte';
	import { pipeline } from '@xenova/transformers';

	let media = [];
	let mediaRecorder = null;
	let transcriber = null;
	let transcript = '';

	onMount(async () => {
		transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		mediaRecorder = new MediaRecorder(stream);
		mediaRecorder.ondataavailable = (e) => media.push(e.data);
		mediaRecorder.onstop = async function () {
			const audio = document.querySelector('audio');
			const blob = new Blob(media, { type: 'audio/ogg; codecs=opus' });
			media = [];
			audio.src = window.URL.createObjectURL(blob);

			if (transcriber) {
				let result = await transcriber(audio.src);
				transcript = result.text;
			} else {
				console.log('Transcriber is not initialized yet.');
			}
		};
	});

	async function startRecording() {
		mediaRecorder.start();
	}

	function stopRecording() {
		mediaRecorder.stop();
	}
</script>

<h1>Whisper Demo</h1>

<section>
	<audio controls />
	<button on:click={startRecording}>Record</button>
	<button on:click={stopRecording}>Stop</button>
</section>

<p>{transcript}</p>
