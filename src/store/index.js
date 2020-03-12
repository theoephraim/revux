import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';

import todosModule from './todos-module';

import { RevuxModule } from '../lib/revux'
import api from '../lib/api'

RevuxModule.setApi(api)



const store = createStore(
  todosModule.reducer(),
  // combineReducers({
  //   todos: todosModule.reducer,
  // }),
  {
    someInitialThing: 'foo',
    todos: todosModule.initialState,
  },
  applyMiddleware(thunk),
);

console.log('initialized store', store.getState());

todosModule.connectToStore(store);

export default store;