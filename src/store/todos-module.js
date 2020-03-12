import _ from 'lodash';
import { RevuxModule } from '../lib/revux';

export default new RevuxModule({
  namespace: 'todos',
  state: {
    list: {},
    selectedTodoId: null,
  },
  getters: {
    todos: (state) => _.values(state.list),
  },
  apiActions: {
    GET_TODOS: {
      action: (ctx, payload) => ({
        method: 'get',
        url: '/todos',
      }),
      mutation(state, { response }) {
        state.list = _.keyBy(response.slice(0, 5), 'id');
      },
    },
    ADD_TODO: {
      action: (ctx, payload) => ({
        method: 'post',
        url: '/todos',
        params: payload,
      }),
      mutation(state, { response }) {
        state.list[response.id] = response;
      },
    }
  },
  actions: {
    selectedTodo(ctx, payload) {
      ctx.commit('SET_SELECTED_TODO', payload.id);
    },
  },
  mutations: {
    SET_SELECTED_TODO(state, id) {
      state.selectedTodoId = id;
    },
  },
});
