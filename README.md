## Revux

> an experiment at making a vuex-like experience in redux<br>
> with some ✨magic✨ helpers for eliminating API request boilerplate

If you're not familiar with [vuex](https://vuex.vuejs.org/), you may want to check out the docs quickly.
It's the same concepts/design as redux, but without a lot of headaches and boilerplate.

### So what does Revux do?

The main goal is to introduce some of the concepts that make vuex easy to use into a redux world:

- Modules ([see vuex](https://vuex.vuejs.org/guide/modules.html)) - a way to organize all related logic for one chunk of the store together
  - a module has initial state, getters, actions, mutations
- Mutations ([see vuex](https://vuex.vuejs.org/guide/mutations.html)) - a function that knows how to change the store (like one of the cases in a redux reducer)
  - mutations are wrapped with [immer](https://github.com/immerjs/immer) so you can just mutate the state and **skip all the immutability headaches**
- Getters ([see vuex](https://vuex.vuejs.org/guide/getters.html)) - a function used to get derived/computed values from other store properties (ex: `selectedUser(state) => state.allUsers[state.selectedUserId]`)
  - similar to what [reselect](https://github.com/reduxjs/reselect) tries to solve, but this is easier, and organizing it within a module makes it cleaner
- Actions ([see vuex](https://vuex.vuejs.org/guide/actions.html)) - while a mutation only knows how to change the state, an action can be async, and can orchestrate multiple mutations to the store, and trigger other actions
  - this is just a bit of a cleaner setup than redux's actions/action creators/reducers setup
  - using redux-thunk under the hood to allow a dispatched action to trigger other actions

The secondary goal is to introduce some API request related magic to remove all the awful boilerplate. Here are the goals:

- all common logic (tracking request status, errors, making the api request) should be handled by the library
- no need to define 3 constants (`GET_USER_INIT`, `GET_USER_SUCCESS`, `GET_USER_FAILURE`) and reuse them across 3 files
- request status is kept in the store and easy to access
- define the action params alongside the change to the store

### Examples

The easiest way to see how this works is to look at an example:

- TodoList example
  - take a look at the [module](./examples/todo-list-app/src/store/todos-module.js)
  - then how the state is used in the [App.js component](./examples/todo-list-app/src/App.js)

### Project status

This is still an experiment and there is much work left to do, but it seems promising!

Here are next steps:

- make getters memoized/smarter, so things only recompute when necessary. Maybe use reselect?
- figure out inter-module communication (vuex has good patterns for this)
- implement more utilities for getting module state into components (like [mapGetters](https://vuex.vuejs.org/guide/getters.html#the-mapgetters-helper))
  - maybe this works within redux's `connect()`, or maybe its an aleternative?



