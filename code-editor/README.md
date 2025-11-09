# CodeEditor

This project is a web-based code editor built with Angular. It features real-time collaboration, AI-powered autocompletion, and a robust editor view powered by CodeMirror.

## Project Structure

The `src` directory contains the core application logic and components:

- `app/`: Contains the main application components, services, and routing.
  - `ai/`: Modules related to AI features like autocompletion.
  - `code-mirror/`: Integration and setup for the CodeMirror editor.
  - `editor/`: Core editor functionality, including collaboration features.
  - `editor-view/`: Components responsible for rendering the editor UI.
  - `home/`: The landing page or home view of the application.
- `index.html`: The main HTML file.
- `main.ts`: The application's entry point.
- `styles.css`: Global styles for the application.

## Prerequisites

- Node.js v22.x
- npm v11.x
- Angular 20.x

## Installation

```bash
npm install
```

## Development

To start the development server, run:

```bash
ng serve
```

or

```bash
npm start
```

Open your browser to `http://localhost:4200/`. The application will automatically reload on changes.

## Testing

To execute the unit tests via [Karma](https://karma-runner.github.io), run:

```bash
ng test
```

or

```bash
npm test
```

This command will open a browser window and automatically run the tests. Results will be displayed in the terminal and in the browser's Karma dashboard.

## Building

To build the project for production, run:

```bash
ng build
```

## License

[UNLICENSED]

## Author

This project is maintained by ![avatar](https://github.com/amfajardoo.png?size=32) [amfajardoo](https://github.com/amfajardoo).
