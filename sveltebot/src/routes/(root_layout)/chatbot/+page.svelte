<script>
	// This is the page component for the chatbot route
	import { getAccessToken } from '$lib/supabase';
	import showdown from 'showdown';

	let messageInput = '';
	let messages = [];
	let model = 'gpt-3.5-turbo';
	let isTyping = false;
	let chatHistory = '';
	const converter = new showdown.Converter();

	// Takes a message and sends it to the chatbot API
	const sendMessage = async (message) => {
		messages = [...messages, { text: message, isUser: true }];
		isTyping = true;
		let access_token = await getAccessToken();
		try {
			const response = await fetch('/api/chatbot', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${access_token}`
				},
				body: JSON.stringify({ message, model, chatHistory })
			});
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}
			if (response.headers.get('Content-Type') !== 'application/json') {
				throw new Error('Unexpected content type in server response');
			}
			const data = await response.json();
			const botMessageHTML = converter.makeHtml(data.message);
			messages = [...messages, { text: botMessageHTML, isUser: false }];
			chatHistory += `user: ${message}\n\n` + `assistant: ${data.message}\n\n`;
		} catch (error) {
			console.error(error);
			messages = [...messages, { text: error.message, isUser: false }];
		} finally {
			isTyping = false;
		}
	};

	// Check input and send message if it's not empty
	const onSubmit = async (event) => {
		event.preventDefault();
		const message = messageInput.trim();
		if (message.length === 0) return;
		messageInput = '';
		await sendMessage(message);
	};
</script>

<h1>Chatbot</h1>
<div class="model-selection">
	<label for="model">Model:</label>
	<select id="model" bind:value={model}>
		<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
		<option value="gpt-4">gpt-4</option>
	</select>
	<button
		on:click={() => {
			messages = [];
			chatHistory = '';
		}}>Clear Messages</button
	>
</div>

<div class="messages">
	{#each messages as message}
		<div class={message.isUser ? 'userMessage' : 'botMessage'}>
			{#if message.isUser}
				{message.text}
			{:else}
				{@html message.text}
			{/if}
		</div>
	{/each}
	{#if isTyping}
		<div class="botMessage">
			<div class="typing-dots">
				<div />
				<div />
				<div />
			</div>
		</div>
	{/if}
</div>
<form on:submit={onSubmit}>
	<input
		type="text"
		name="message"
		placeholder="Type your message here"
		bind:value={messageInput}
	/>
	<button type="submit">Send</button>
</form>

<style>
	@import './styles.css';
</style>
