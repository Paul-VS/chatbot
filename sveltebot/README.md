# Chatbot with OpenAI and Svelte

This project demonstrates how to integrate the OpenAI API with a Svelte application to build a chat interface. The AI model used can be either `gpt-3.5-turbo` or `gpt-4` (if available).

## Features

- User-friendly chat interface.
- Interaction with OpenAI's powerful language models.
- User session verification with Supabase.
- Error handling for missing API key, invalid session, and invalid inputs.

## Getting Started

### Prerequisites

- Node.js (>=14.0.0)
- npm (>=6.14.0)
- OpenAI API key
- Supabase API key and URL

### Setup

1. Clone the repository to your local machine:

```
git clone https://github.com/Paul-VS/chatGPT.git
```

2. Install the required dependencies:

```
cd chatGPT
npm install
```

3. Create a `.env` file in the root directory of the project:

```
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace `your_openai_api_key`, `your_supabase_url`, and `your_supabase_anon_key` with your actual keys.

4. Start the development server:

```
npm run dev
```

Visit `http://localhost:5000` in your browser to start chatting with the AI.

## Usage

Type your message into the input field and click "Send" or press enter. You can switch between different AI models using the dropdown menu.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## Acknowledgements

- [OpenAI](https://openai.com/)
- [Svelte](https://svelte.dev/)
- [Supabase](https://supabase.io/)
