import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import { RevuxModule } from 'revux';

import api from '../lib/api';
import todosModule from './todos-module';

console.log('todos module from outside', todosModule);

// currently we assume all RevuxModules will use a common api which is an axios instance
// but we could set it up with a service map or something, and modules (or specific actions)
// could specify which api to use
RevuxModule.setApi(api);

// TODO: this could probably be a special Revux.createStore which automactially sets things up
// and adds the thunk middleware
const store = createStore(
  combineReducers({
    [todosModule.namespace]: todosModule.reducer, // the namespace is just 'todo'
  }),
  {},
  applyMiddleware(thunk) // required so we can trigger actions that make multiple mutations
);

// currently we connect the module directly to the store which simplifies some things
// but maybe this is a bad idea...?
todosModule.connectToStore(store);

export default store;
