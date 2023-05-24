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
	const { error: userError } = await supabase.auth.getUser(token);
	if (userError) {
		return { error: { message: 'Invalid session' }, status: 403 };
	}

	return { token };
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
	const { error: matchError, data: pageSections } = await supabase.rpc('match_page_sections', {
		embedding,
		match_threshold: 0.78,
		match_count: 3,
		min_content_length: 100
	});

	// Handle failure to match embedding.
	if (matchError) {
		console.log(matchError.message);
		return { error: { message: 'Failed to match embeddings' }, status: 500 };
	}

	console.log(`Vector DB query successful`);

	return { pageSections };
};

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	// Validate session token
	const { error: tokenError, status: tokenStatus } = await validateToken(request);
	if (tokenError) {
		return json(tokenError, tokenStatus);
	}

	// Extract message from request.
	const { message, model, chatHistory } = await request.json();
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
	const { error: matchError, status: matchStatus, pageSections } = await matchEmbeddings(embedding);
	if (matchError) {
		return json(matchError, matchStatus);
	}

	// Extract content from each matched section and format it as a string.
	const pageSectionContents = pageSections.map((section) => `${section.content}`).join('\n');

	// Append matched results from database to message.
	const full_message =
		'The current data in use: \n"""\n ' +
		pageSectionContents +
		'\n"""\n' +
		'Here is the recent chat history for context:\n"""\n' +
		chatHistory +
		'\n"""\n' +
		'The user is asking: \n"""\n' +
		message +
		'\n"""\n';

	console.log(`Sending message to OpenAI: ${full_message}`);

	try {
		// Create chat completion with OpenAI.
		const completion = await openai.createChatCompletion({
			model: model,
			messages: [{ role: 'user', content: full_message }]
		});

		// Extract bot message from response.
		const botMessage = completion.data.choices[0].message.content.trim();
		console.log(`Received bot message: ${botMessage}`);

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
