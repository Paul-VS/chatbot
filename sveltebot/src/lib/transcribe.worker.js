import { pipeline } from '@xenova/transformers';

let transcriber = null;

self.onmessage = async function (event) {
	if (event.data.command === 'init') {
		console.log('init command received');
		transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
		console.log('Transcriber is initialized.');
		postMessage({ status: 'initialized' });
	}
	if (event.data.command === 'transcribe') {
		if (transcriber) {
			let result = await transcriber(event.data.audio);
			postMessage({ status: 'transcribed', text: result.text });
		} else {
			console.log('Transcriber is not initialized yet.');
		}
	}
};
