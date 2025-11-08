# Code Editor Server

A collaborative code editor backend server built with NestJS that provides real-time collaboration features using Y.js and AI-powered code completion.

## Features

- Real-time collaboration using Y.js WebSocket server
- AI-powered code completion API
- CORS-enabled for cross-origin requests
- Room-based collaboration support
- Awareness protocol implementation for user presence

## Prerequisites

- Node.js v22.x
- npm v11.x

## Installation

```bash
npm install
```

## Environment Variables

### Configuration

Create a `.env` file in the root directory of the project with the following variables:

```properties
GEMINI_API_KEY="your_api_key_here"
PORT=3000  # optional, defaults to 3000
```

### Getting the Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Click on "View API keys" in the navigation
3. Click on "Create API key"
4. Copy the generated API key
5. Paste it in your `.env` file as the value for `GEMINI_API_KEY`

or follow the detailed instructions at [Google's official documentation](https://ai.google.dev/gemini-api/docs/api-key).

### Available Environment Variables

- `GEMINI_API_KEY`: Required. The API key for Google's Gemini AI service
- `PORT`: Optional. The port for the main NestJS server (default: 3000)
- The Y.js WebSocket server runs on port 1234

## Running the Application

### Development Mode

To run both the NestJS server and Y.js WebSocket server concurrently:

```bash
npm run start:dev
```

### Production Mode

```bash
npm run build
npm run start:prod
```

## API Endpoints

### Code Completion

- **POST** `/api/complete`
  - Provides AI-powered code completion suggestions
  - Request body: `{ codeContext: string }`
  - Response: `{ suggestion: string }`

## WebSocket Server

The Y.js WebSocket server provides real-time collaboration features:
- Automatic room creation based on URL path
- Document synchronization across clients
- User awareness and presence tracking
- Automatic cleanup of inactive rooms

## License

[UNLICENSED]

## Author

This project is maintained by [amfajardoo].
