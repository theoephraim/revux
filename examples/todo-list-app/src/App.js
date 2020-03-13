import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';

import './App.css';
import todosModule from './store/todos-module'

export default connect(
  (state) => {
    console.log(state)
    return {
      todos: todosModule.getters('todos'),
      selectedTodoId: todosModule.getters('selectedTodoId'),
      getTodosRequest: todosModule.requests('GET_TODOS'),
      addTodoRequest: todosModule.requests('ADD_TODO'),
    };
  },
  { },
)(function App(props) {

  const [newTodoTitle, setNewTodoTitle] = useState("");

  // trigger fetch on load
  useEffect(() => {
    // artificial delay just so we can see it loading
    todosModule.dispatchApiAction('GET_TODOS', { _delay: 2000 });
  }, []);

  async function addButtonHandler() {
    if (!newTodoTitle.trim()) {
      alert('Enter something!');
      return;
    }

    // can get success directly but usually would rely on the request getter for most things
    const success = await todosModule.dispatchApiAction('ADD_TODO', {
      title: newTodoTitle,
    });
    if (success) setNewTodoTitle('');
  }
  async function selectButtonHandler(todoId) {
    todosModule.dispatch('selectTodo', { id: todoId });
  }

  const { getTodosRequest, addTodoRequest } = props;

  return (
    <div className="App">
      <header className="App-header">
        <h2>Todo List</h2>

        { getTodosRequest.isPending && <div>Loading...</div> }
        { getTodosRequest.isError && <div>Error loading todos - {getTodosRequest.errorMessage}</div> }
        { getTodosRequest.isSuccess && <div>
          <div>
            <label>
              New Todo Title:
              <input type='text' value={newTodoTitle} onChange={e => setNewTodoTitle(e.target.value)} />
            </label>
            <button
              onClick={addButtonHandler}
              disabled={addTodoRequest.isPending}
            >
              { addTodoRequest.isPending ? "Saving..." : "Add Todo" }
            </button>
            { addTodoRequest.isError && <div>{addTodoRequest.errorMessage}</div> }
            <p style={{fontSize: '12px', fontStyle: 'italic'}}><i>NOTE - only one todo can be added because the mock api always returns the same id</i></p>
          </div>
          <ul>
            { !props.todos.length && <li><i>No todos :(</i></li> }

            { props.todos.length > 0 && props.todos.map((todo) =>
            <li key={`todo-${todo.id}`}>
              {props.selectedTodoId === todo.id && <span>⭐</span>}
              {todo.title}
              <button onClick={() => selectButtonHandler(todo.id)}>select</button>
            </li>)}
          </ul>
          </div>}

      </header>
    </div>
  );
})
