import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';

const TodoPanel: React.FC = () => {
  // Ref for scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  // Zustand performance: separate selectors for different data pieces
  const todos = useAppStore((state) => state.todos);
  const addTodo = useAppStore((state) => state.addTodo);
  const toggleTodo = useAppStore((state) => state.toggleTodo);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  
  const [newTodoText, setNewTodoText] = useState('');

  const handleAddTodo = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      addTodo({
        text: newTodoText.trim(),
        completed: false,
        priority: 'medium',
        source: 'manual'
      });
      setNewTodoText('');
      // Reset auto-scroll when new todo is added
      setUserHasScrolled(false);
    }
  }, [newTodoText, addTodo]);
  
  // Auto-scroll to top when new todos arrive (since todos are added at beginning)
  useEffect(() => {
    if (scrollContainerRef.current && !userHasScrolled && todos.length > 0) {
      const container = scrollContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    }
  }, [todos.length, userHasScrolled]);
  
  // Handle user scroll to disable auto-scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtTop = container.scrollTop < 50;
    setUserHasScrolled(!isAtTop);
  }, []);


  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '📝';
    }
  };

  // Calculate stats using Zustand's optimized state
  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          {/* Auto Todo Toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '11px',
            color: '#ccc',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={settings.autoTodos}
              onChange={(e) => updateSettings({ autoTodos: e.target.checked })}
              style={{
                accentColor: '#007acc',
                transform: 'scale(0.9)'
              }}
            />
            Auto Todos
          </label>
        </div>

        {/* Add new todo form */}
        <form onSubmit={handleAddTodo} style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add new todo..."
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px'
              }}
            />
            <button
              type="submit"
              disabled={!newTodoText.trim()}
              style={{
                padding: '8px 12px',
                background: newTodoText.trim() ? '#007acc' : '#444',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                cursor: newTodoText.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              ➕
            </button>
          </div>
        </form>
      </div>
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{ 
          flex: 1, 
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0',
          scrollBehavior: 'smooth',
          willChange: 'scroll-position',
          WebkitOverflowScrolling: 'touch'
        } as React.CSSProperties}>
        {todos.length === 0 ? (
          <div className="empty-state">
            <h4>✅ No Todos Yet</h4>
            <p>Add todos manually or enable Auto Todos</p>
          </div>
        ) : (
          <div style={{ padding: '12px' }}>
            {/* Render todos using optimized Zustand state */}
            {todos.map((todo) => (
              <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <div
                  className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
                  onClick={() => toggleTodo(todo.id)}
                />
                
                <div style={{ flex: 1 }}>
                  <div className="todo-text">
                    {todo.priority === 'high' && '🔴 '}
                    {todo.priority === 'medium' && '🟡 '}
                    {todo.priority === 'low' && '🟢 '}
                    {todo.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoPanel;