import _ from 'lodash';
import { RevuxModule } from 'revux';

export default new RevuxModule({
  namespace: 'todos', // currently this is required but might add something so it's not
  state: {
    // initial state for this chunk of the store
    list: {},
    selectedTodoId: null,
  },
  getters: {
    // getters are for computed properties based on the state
    // they get passed just the module's chunk of the state, but might add global state too
    // also need to make other getters accessible
    // and incorporate memoization (reselect?) to be more performant
    todos: (state) => _.values(state.list),
    selectedTodoId: (state) => state.selectedTodoId,
  },
  apiActions: {
    // api actions define both the "action" and associated "mutation" to make an API request
    // with an absolute minimum of boilerplate :)
    GET_TODOS: {
      // the action function gets the current module state and a payload form dispatch
      // and returns a description of the api request to make
      // under the hood multiple mutations are made to track the request status
      action: (ctx, payload) => ({
        method: 'get',
        url: '/todos',
      }),
      // the changes to make to the state if the request was successful
      // the state in question is only this module's chunk of the state
      // and it uses immer under the hood so you can just mutate and not worry!
      mutation(state, { response }) {
        state.list = _.keyBy(response.slice(0, 5), 'id'); // always store lists by ID :)
      },
    },
    ADD_TODO: {
      action: (ctx, payload) => ({
        method: 'post',
        url: '/todos',
        params: payload,
      }),
      mutation(state, { response }) {
        state.list[response.id] = response; // now its easy to replace just one
      },
    },
    UPDATE_TODO: {
      action: (ctx, payload) => ({
        method: 'patch',
        url: `/todos/${payload.id}`,
        params: payload,
        keyRequestStatusBy: payload.id, // so each todo has its own update request
      }),
      mutation(state, { response }) {
        state.list[response.id] = response;
      },
    },
    DELETE_TODO: {
      action: (ctx, payload) => ({
        method: 'delete',
        url: `/todos/${payload.id}`,
        keyRequestStatusBy: payload.id, // so each todo has its own update request
      }),
      mutation(state, { response, payload }) {
        delete state.list[payload.id];
      },
    },
  },
  // way to pass in extra actions/mutations that are not api requests
  actions: {
    selectTodo(ctx, payload) {
      ctx.commit('SET_SELECTED_TODO', payload.id);
    },
  },
  mutations: {
    // mutations still use immer under the hood and only affect the module's chunk of the state
    SET_SELECTED_TODO(state, id) {
      state.selectedTodoId = id;
    },
  },
});
