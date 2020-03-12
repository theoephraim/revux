import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';

import './App.css';
import todosModule from './store/todos-module'

export default connect(
  (state) => {
    console.log(state)
    return {
      todos: todosModule.getters('todos'),
      getTodosRequest: todosModule.requests('GET_TODOS'),
      addTodoRequest: todosModule.requests('ADD_TODO'),
    };
  },
  { },
)(function App(props) {

  const [newTodoTitle, setNewTodoTitle] = useState("");

  // trigger fetch on load
  useEffect(() => {
    todosModule.dispatchApiAction('GET_TODOS', { _delay: 1000 });
  }, []);

  async function addButtonHandler() {
    if (!newTodoTitle.trim()) {
      alert('Enter something!');
      return;
    }

    // can get success directly but usually would rely on the request getter for most things
    const success = await todosModule.dispatchApiAction('ADD_TODO', {
      _delay: 500,
      title: newTodoTitle,
    });
    if (success) setNewTodoTitle('');
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
              <input type='text' value={newTodoTitle} onChange={e => setNewTodoTitle(e.target.value)} />


            </label>
            <button
              onClick={addButtonHandler}
              disabled={addTodoRequest.isPending}
            >
              { addTodoRequest.isPending ? "Saving..." : "Add Todo" }
            </button>
            { addTodoRequest.isError && <div>{addTodoRequest.errorMessage}</div> }
          </div>
          <ul>
            { !props.todos.length && <li><i>No todos :(</i></li> }

            { props.todos.length > 0 && props.todos.map((todo) =>
            <li key={`todo-${todo.id}`}>
              {todo.title}
            </li>)}
          </ul>
          </div>}

      </header>
    </div>
  );
})
