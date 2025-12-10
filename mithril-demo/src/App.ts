import m from 'mithril'
import { Store, ApiClient } from './lib'

// Types
interface Todo {
  userId: number
  id: number
  title: string
  completed: boolean
}

interface AppState {
  todos: Todo[]
  loading: boolean
  error: string | null
  newTodo: string
}

// Initialize store and API client
const store = new Store<AppState>({
  todos: [],
  loading: false,
  error: null,
  newTodo: ''
})

const api = new ApiClient('https://jsonplaceholder.typicode.com')

// Actions
const actions = {
  async fetchTodos() {
    store.setState({ loading: true, error: null })
    try {
      const todos = await api.get<Todo[]>('/todos?_limit=5')
      store.setState({ todos, loading: false })
    } catch (error) {
      store.setState({ 
        error: error instanceof Error ? error.message : 'Failed to fetch todos',
        loading: false 
      })
    }
  },

  async addTodo() {
    const state = store.getState()
    if (!state.newTodo.trim()) return

    store.setState({ loading: true, error: null })
    try {
      const newTodo = await api.post<Todo>('/todos', {
        title: state.newTodo,
        completed: false,
        userId: 1
      })
      store.setState({ 
        todos: [newTodo, ...state.todos],
        loading: false,
        newTodo: ''
      })
    } catch (error) {
      store.setState({ 
        error: error instanceof Error ? error.message : 'Failed to add todo',
        loading: false 
      })
    }
  },

  toggleTodo(id: number) {
    const state = store.getState()
    const todos = state.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
    store.setState({ todos })
  },

  updateNewTodo(value: string) {
    store.setState({ newTodo: value })
  }
}

// Mithril component
const App = {
  oninit() {
    actions.fetchTodos()
    // Subscribe to store changes to trigger redraw
    store.subscribe(() => m.redraw())
  },

  view() {
    const state = store.getState()

    return m('div', { style: 'max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif;' }, [
      m('h1', { style: 'color: #333;' }, 'Mithril Demo - Todo List'),
      
      m('div', { style: 'margin-bottom: 20px;' }, [
        m('p', { style: 'color: #666;' }, 'This demo showcases:'),
        m('ul', { style: 'color: #666;' }, [
          m('li', 'Networking: Fetching and posting data to JSONPlaceholder API'),
          m('li', 'State Management: Custom store with subscribe/setState pattern')
        ])
      ]),

      // Add todo form
      m('div', { style: 'margin-bottom: 20px;' }, [
        m('input', {
          type: 'text',
          placeholder: 'Enter new todo...',
          value: state.newTodo,
          oninput: (e: InputEvent) => actions.updateNewTodo((e.target as HTMLInputElement).value),
          style: 'padding: 8px; width: 70%; border: 1px solid #ddd; border-radius: 4px;'
        }),
        m('button', {
          onclick: () => actions.addTodo(),
          disabled: state.loading || !state.newTodo.trim(),
          style: 'padding: 8px 16px; margin-left: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;'
        }, 'Add')
      ]),

      // Loading state
      state.loading && m('p', { style: 'color: #666;' }, 'Loading...'),

      // Error state
      state.error && m('p', { style: 'color: #f44336;' }, `Error: ${state.error}`),

      // Todos list
      m('div', { style: 'border: 1px solid #ddd; border-radius: 4px;' }, 
        state.todos.length === 0 && !state.loading
          ? m('p', { style: 'padding: 20px; text-align: center; color: #999;' }, 'No todos yet')
          : state.todos.map(todo =>
              m('div', {
                key: todo.id,
                style: 'padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: center; cursor: pointer;',
                onclick: () => actions.toggleTodo(todo.id)
              }, [
                m('input', {
                  type: 'checkbox',
                  checked: todo.completed,
                  style: 'margin-right: 10px;',
                  onclick: (e: Event) => e.stopPropagation()
                }),
                m('span', {
                  style: todo.completed ? 'text-decoration: line-through; color: #999;' : ''
                }, todo.title)
              ])
            )
      )
    ])
  }
}

export default App
