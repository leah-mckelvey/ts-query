import { useEffect } from 'react'
import { useStore } from './lib'

function App() {
  const {
    todos,
    loading,
    error,
    newTodo,
    fetchTodos,
    addTodo,
    toggleTodo,
    updateNewTodo
  } = useStore()

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#333' }}>React Demo - Todo List</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: '#666' }}>This demo showcases:</p>
        <ul style={{ color: '#666' }}>
          <li>Networking: Fetching and posting data to JSONPlaceholder API</li>
          <li>State Management: React Context with custom hooks pattern</li>
        </ul>
      </div>

      {/* Add todo form */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Enter new todo..."
          value={newTodo}
          onChange={(e) => updateNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          style={{ 
            padding: '8px', 
            width: '70%', 
            border: '1px solid #ddd', 
            borderRadius: '4px' 
          }}
        />
        <button
          onClick={addTodo}
          disabled={loading || !newTodo.trim()}
          style={{ 
            padding: '8px 16px', 
            marginLeft: '10px', 
            background: '#2196F3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: loading || !newTodo.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !newTodo.trim() ? 0.6 : 1
          }}
        >
          Add
        </button>
      </div>

      {/* Loading state */}
      {loading && <p style={{ color: '#666' }}>Loading...</p>}

      {/* Error state */}
      {error && <p style={{ color: '#f44336' }}>Error: {error}</p>}

      {/* Todos list */}
      <div style={{ border: '1px solid #ddd', borderRadius: '4px' }}>
        {todos.length === 0 && !loading ? (
          <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            No todos yet
          </p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              style={{ 
                padding: '12px', 
                borderBottom: '1px solid #eee', 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer' 
              }}
              onClick={() => toggleTodo(todo.id)}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                readOnly
                style={{ marginRight: '10px' }}
                onClick={(e) => e.stopPropagation()}
              />
              <span style={todo.completed ? { textDecoration: 'line-through', color: '#999' } : {}}>
                {todo.title}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default App
