// Simple state management using React Context
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// API client for networking
export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }
}

// Store Context
interface Todo {
  userId: number
  id: number
  title: string
  completed: boolean
}

interface StoreState {
  todos: Todo[]
  loading: boolean
  error: string | null
  newTodo: string
}

interface StoreContextType extends StoreState {
  fetchTodos: () => Promise<void>
  addTodo: () => Promise<void>
  toggleTodo: (id: number) => void
  updateNewTodo: (value: string) => void
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

const api = new ApiClient('https://jsonplaceholder.typicode.com')

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    todos: [],
    loading: false,
    error: null,
    newTodo: ''
  })

  const fetchTodos = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const todos = await api.get<Todo[]>('/todos?_limit=5')
      setState(prev => ({ ...prev, todos, loading: false }))
    } catch (error) {
      setState(prev => ({ 
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch todos',
        loading: false 
      }))
    }
  }, [])

  const addTodo = useCallback(async () => {
    if (!state.newTodo.trim()) return

    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const newTodo = await api.post<Todo>('/todos', {
        title: state.newTodo,
        completed: false,
        userId: 1
      })
      setState(prev => ({ 
        ...prev,
        todos: [newTodo, ...prev.todos],
        loading: false,
        newTodo: ''
      }))
    } catch (error) {
      setState(prev => ({ 
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add todo',
        loading: false 
      }))
    }
  }, [state.newTodo])

  const toggleTodo = useCallback((id: number) => {
    setState(prev => ({
      ...prev,
      todos: prev.todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    }))
  }, [])

  const updateNewTodo = useCallback((value: string) => {
    setState(prev => ({ ...prev, newTodo: value }))
  }, [])

  return (
    <StoreContext.Provider
      value={{
        ...state,
        fetchTodos,
        addTodo,
        toggleTodo,
        updateNewTodo
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
