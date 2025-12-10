# React Demo

A demonstration of networking and state management using React.

## Features

- **Networking**: Fetches and posts data to JSONPlaceholder API
- **State Management**: React Context with custom hooks pattern
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

Open [http://localhost:3001](http://localhost:3001) to view it in the browser.

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

### State Management (`src/lib.tsx`)
- `StoreProvider`: React Context provider for global state management
- `useStore`: Custom hook to access store state and actions
- Provides centralized state management with React Context pattern

### Networking (`src/lib.tsx`)
- `ApiClient`: HTTP client for making GET and POST requests
- Promise-based API with error handling

### Application (`src/App.tsx`)
- React component demonstrating todo list functionality
- Integrates state management and networking
- Shows loading states, error handling, and user interactions
