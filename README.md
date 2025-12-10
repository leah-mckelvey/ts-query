# ts-query
A generic query client that works for different frameworks

## Demo Projects

This repository contains two demo projects showcasing networking and state management libraries:

### 1. Mithril Demo (`/mithril-demo`)
A lightweight Mithril.js application demonstrating:
- Custom state management with Store pattern (subscribe/setState)
- HTTP client for API networking (GET/POST)
- Interactive todo list application

**Getting Started:**
```bash
cd mithril-demo
npm install
npm run dev  # Opens on http://localhost:3000
```

[View Mithril Demo Documentation](./mithril-demo/README.md)

### 2. React Demo (`/react-demo`)
A modern React application demonstrating:
- State management with React Context and custom hooks
- HTTP client for API networking (GET/POST)
- Interactive todo list application

**Getting Started:**
```bash
cd react-demo
npm install
npm run dev  # Opens on http://localhost:3001
```

[View React Demo Documentation](./react-demo/README.md)

## Features Demonstrated

Both demos showcase:
- **Networking**: Fetching and posting data to JSONPlaceholder API
- **State Management**: Centralized state with different patterns (Store pattern for Mithril, Context pattern for React)
- **Error Handling**: Proper loading states and error messages
- **User Interactions**: Adding and toggling todos

## Architecture

### Networking Library
Both demos include an `ApiClient` class that provides:
- GET and POST methods
- Promise-based API
- Error handling with HTTP status checks
- JSON serialization/deserialization

### State Management
- **Mithril**: Custom Store class with subscribe/setState pattern
- **React**: Context API with custom hooks for accessing state and actions

## Building

Each demo can be built for production:
```bash
# Mithril
cd mithril-demo
npm run build

# React
cd react-demo
npm run build
```

