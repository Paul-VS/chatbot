// Import necessary modules and objects.
import { Configuration, OpenAIApi } from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

// Set up the OpenAI API configuration with your API key.
const configuration = new Configuration({
	apiKey: OPENAI_API_KEY
});

const openai = new OpenAIApi(configuration);

// Function to validate session token
const validateToken = async (request) => {
	const token = request.headers.get('authorization')?.replace('Bearer ', '');
	if (!token) {
		return { error: { message: 'Authorization header missing' }, status: 401 };
	}

	// Verify the user's session.
	const { data, error: userError } = await supabase.auth.getUser(token);
	if (userError) {
		return { error: { message: 'Invalid session' }, status: 403 };
	}

	const user_id = data.user.id;

	return { user_id };
};

// Function to create embeddings for some text
const createEmbeddings = async (message) => {
	const embeddingResponse = await openai.createEmbedding({
		model: 'text-embedding-ada-002',
		input: message
	});

	// Handle failure to create embedding.
	if (embeddingResponse.status !== 200) {
		console.log(
			`Failed to create embedding for message. OpenAI response status ${embeddingResponse.status}`
		);
		return { error: { message: 'Failed to create embedding' }, status: embeddingResponse.status };
	}

	console.log(`Embedding created for message: ${message}`);

	// Extract embedding from response.
	const [{ embedding }] = embeddingResponse.data.data;
	return { embedding };
};

// Function to match embeddings with similar embeddings in the vector database
const matchEmbeddings = async (embedding) => {
	const { error: matchError, data: chatHistory } = await supabase.rpc('match_chat_history', {
		embedding,
		match_threshold: 0.78,
		match_count: 10,
		min_content_length: 100
	});

	// Handle failure to match embedding.
	if (matchError) {
		console.log(matchError.message);
		return { error: { message: 'Failed to match embeddings' }, status: 500 };
	}

	console.log(`Vector DB query successful`);

	return { chatHistory };
};

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	// Validate session token
	const { user_id, error: tokenError, status: tokenStatus } = await validateToken(request);
	if (tokenError) {
		return json(tokenError, tokenStatus);
	}

	console.log(`/nUser ID: ${user_id}`);

	// Extract message from request.
	const { message, model } = await request.json();
	if (message.trim().length === 0) {
		return json({ error: { message: 'Please enter a message' } }, 400);
	}

	// Create embeddings for message
	const {
		error: embeddingError,
		status: embeddingStatus,
		embedding
	} = await createEmbeddings(message);
	if (embeddingError) {
		return json(embeddingError, embeddingStatus);
	}

	// Match embeddings with similar embeddings in the vector database
	const { error: matchError, status: matchStatus, chatHistory } = await matchEmbeddings(embedding);
	if (matchError) {
		return json(matchError, matchStatus);
	}

	// Append matched results from database to message.
	const message_vdb = JSON.stringify(chatHistory) + '/n/n' + message;
	console.log(`Sending message to OpenAI ${message_vdb}}`);

	try {
		// Create chat completion with OpenAI.
		const completion = await openai.createChatCompletion({
			model: model,
			messages: [{ role: 'user', content: message_vdb }]
		});

		// Extract bot message from response.
		const botMessage = completion.data.choices[0].message.content.trim();
		console.log(`Received bot message: ${botMessage}`);

		// Join the text in the requested format.
		const fullText = `user: ${message}\n\nassistant: ${botMessage}`;

		// Fetch an embedding for the new text.
		const {
			error: embeddingError,
			status: embeddingStatus,
			embedding
		} = await createEmbeddings(fullText);
		if (embeddingError) {
			return json(embeddingError, embeddingStatus);
		}

		// Insert the text and embedding onto the chat_history table in Supabase.
		const { error: insertError } = await supabase
			.from('chat_history')
			.insert({ user_id: user_id, content: fullText, token_count: 123, embedding });

		// Handle failure to insert into the database.
		if (insertError) {
			console.log(insertError.message);
			return json({ error: { message: 'Failed to insert into chat_history' } }, 500);
		}

		// Return bot message to client.
		return json({ message: botMessage });
	} catch (error) {
		// Handle and log errors.
		if (error.response) {
			console.error(error.response.status, error.response.data);
			return json(error.response.data, error.response.status);
		} else {
			console.error(`Error with OpenAI API request: ${error.message}`);
			return json(
				{
					error: {
						message: 'An error occurred during your request.'
					}
				},
				500
			);
		}
	}
}
