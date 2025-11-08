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

## Development

To start the development server, run:

```bash
ng serve
```

Open your browser to `http://localhost:4200/`. The application will automatically reload on changes.

## Building

To build the project for production, run:

```bash
ng build
```

Build artifacts will be stored in the `dist/` directory.

## Running Unit Tests

To execute unit tests via [Karma](https://karma-runner.github.io), run:

```bash
ng test
```

## License

[UNLICENSED]

## Author

This project is maintained by [amfajardoo](https://github.com/amfajardoo).