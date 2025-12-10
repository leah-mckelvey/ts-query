# Mithril Demo

A demonstration of networking and state management using Mithril.js.

## Features

- **Networking**: Fetches and posts data to JSONPlaceholder API
- **State Management**: Custom store implementation with subscribe/setState pattern
- **Todo List**: Interactive todo list with add and toggle functionality

## Getting Started

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Architecture

### State Management (`src/lib.ts`)
- `Store<T>`: Generic state management class with subscribe/setState pattern
- Provides centralized state management with observer pattern

### Networking (`src/lib.ts`)
- `ApiClient`: HTTP client for making GET and POST requests
- Promise-based API with error handling

### Application (`src/App.ts`)
- Mithril component demonstrating todo list functionality
- Integrates state management and networking
- Shows loading states, error handling, and user interactions
