import _ from 'lodash';
import produce from 'immer';

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class RevuxModule {
  constructor(config) {
    // TODO: check for valid config
    this.initialState = (_.isFunction(config.state) ? config.state() : config.state) || {};
    this.initialState._requests = {};

    this._namespace = config.namespace;
    this._getters = config.getters;

    this._apiActions = config.apiActions;
    this._otherActions = config.actions;
    this._mutations = config.mutations;
  }

  get namespace() { return this._namespace; }

  // currently we need to connect the module directly to the store to simplify some things
  // TODO: might be able to avoid that?
  connectToStore(_store) { this.connectedStore = _store; }

  // commits a mutation - basically like triggering a regular reducer
  async commitMutation(mutationName, payload) {
    this.connectedStore.dispatch({
      type: `${this._namespace}/${mutationName}`,
      payload,
    });
  }

  // for triggering "regular" (non-api) actions
  async dispatch(actionName, payload = {}) {
    const actionFn = this._otherActions[actionName];
    if (!actionFn) throw new Error(`Action ${actionName} does not exist`);

    await actionFn({ commit: this.commitMutation.bind(this) }, payload);
  }

  async dispatchApiAction(actionName, payload = {}) {
    const actionSpecFn = this._apiActions[actionName].action;
    const moduleState = this.connectedStore.getState()[this._namespace];
    const actionSpec = actionSpecFn({ state: moduleState }, _.omit(payload, '_delay'));

    // build a key for where to store the request status
    // some request statuses are segmented per ID or per some other param
    // while others are singular for that request type
    // ex: "user signup" or "fetch current user" (singular)
    // vs "fetch other user profile" (per id)
    //    "add external account" (per type - facebook, google, etc)
    // vs "update external account" (per type and ID - facebook/123, google/123)
    let requestStatusKey = actionName;
    if (actionSpec.keyRequestStatusBy) requestStatusKey += `%${actionSpec.keyRequestStatusBy}`;
    actionSpec.requestStatusKey = requestStatusKey;

    // TODO: enable some behaviour here for how to handle duplicate requests
    // we could either block them, or allow them and cancel the original or...

    // track the request having been initialized
    // this lets us show a loading status, disable a button, etc
    this.commitMutation('REVUX_REQUEST_INITIATED', { requestStatusKey });

    // option to add a delay, which can be useful for some requests
    // like giving the backend time to process something
    if (payload._delay) {
      await (timeout(payload._delay));
    }

    // build the options to pass to our axios api instance
    const {
      method, url, params, options, afterSuccess, afterFailure,
    } = actionSpec;
    try {
      const requestOptions = {
        method,
        url,
        ...method === 'get' ? { params } : { data: params },
        ...options,
      };
      // currently the api is set on RevuxModule class globally
      // TODO: allow selecting from multiple registered apis?
      const request = await RevuxModule.api(requestOptions);

      // if request is successful, we commit the actual change to the store
      // that is defined in the `mutation` of the api action
      // and pass along info about the action, request, and response
      this.commitMutation(actionName, {
        payload,
        actionSpec,
        response: request.data,
        // example of grabbing data from a header
        // TODO: add a setting to expose particular headers, or just pass them all?
        // maybe allow registering a function that takes the headers and returns an object?
        // responseTotalCount: request.headers['x-total-count'], // if using a header
      });

      // commit the mutation that marks the request as successful
      this.commitMutation('REVUX_REQUEST_SUCCESS', { requestStatusKey });

      // perform and "after success" effects - usually would be triggering other actions
      // or could be trigerring router/url naviation
      if (typeof afterSuccess === 'function') await afterSuccess(request.data);

      // option to return the response directly
      // not common, but can be used for things like fetching a pre-signed file upload URL
      // that doesn't really need to live in the store
      if (actionSpec.returnResponse) return request.data;

      return true; // return true to caller so it knows it succeeded
    } catch (err) {
      // if the api request had an error, either from a timeout or bad http code

      // TODO: detect timeouts and other uncommon errors

      console.log(err);
      const errorBody = _.get(err, 'response.data');

      // commit the mutation that tells us the request failed
      this.commitMutation('REVUX_REQUEST_FAILURE', {
        requestStatusKey,
        err: errorBody || { message: 'unknown error' },
      });

      // TODO: add a way to hook in for global error handler
      // for example detect a certain error code (like UNAUTHORIZED) and force a logout

      // trigger "after failure" function
      if (typeof afterFailure === 'function') afterFailure(errorBody);

      return false; // return false to caller so we know if failed
    }
  }

  // helper for getting computed/derived values from the store
  // TODO: need to implement memoization/selectors something so we dont kill performance
  // this is handled automatically in vue, so this part may be tricky
  getters(getterName) {
    const getterFn = this._getters[getterName];
    if (!getterFn) throw new Error(`Getter ${getterName} does not exist`);
    const state = this.connectedStore.getState();
    const moduleState = state[this._namespace];
    console.log(`getter - ${getterName}`, state);
    return getterFn(moduleState);
  }

  // helper for getting request statuses from the store
  requests(requestStatusKey) {
    const state = this.connectedStore.getState();
    const request = state[this._namespace]._requests[requestStatusKey] || {};

    // translate the raw info into some booleans that are a little easier to use
    const statusProps = {
      wasRequested: !!request.requestedAt,
      isPending: request.status === 'PENDING',
      isPendingOrEmpty: !request.requestedAt || request.status === 'PENDING',
      isEmpty: !request.requestedAt,
      isError: request.status === 'FAILURE',
      isSuccess: request.status === 'SUCCESS',
      error: request.error,
      receivedAt: request.receivedAt,
    };
    if (request.error) {
      // TODO: add a hook here for translating API errors that may be formatted different ways
      statusProps.errorMessage = request.error.message || '';
      if (request.error.details && request.error.details.messages) {
        statusProps.errorMessages = request.error.details.messages;
      }
    }
    return statusProps;
  }

  // needed to use a getter in order to make sure it was bound correctly to `this`
  // TODO: maybe fix that? does it matter?
  get reducer() {
    return (state = this.initialState, { type, payload }) => {
      if (!type.startsWith(`${this._namespace}/`)) return state;

      const mutationName = type.substr(this._namespace.length + 1);

      let mutation;
      if (mutationName === 'REVUX_REQUEST_INITIATED') {
        return produce(state, (draftState) => {
          draftState._requests[payload.requestStatusKey] = {
            requestedAt: new Date(),
            status: 'PENDING',
          };
        });
      } if (mutationName === 'REVUX_REQUEST_SUCCESS') {
        return produce(state, (draftState) => {
          _.assign(draftState._requests[payload.requestStatusKey], {
            completedAt: new Date(),
            status: 'SUCCESS',
          });
        });
      } if (mutationName === 'REVUX_REQUEST_FAILURE') {
        return produce(state, (draftState) => {
          _.assign(draftState._requests[payload.requestStatusKey], {
            completedAt: new Date(),
            status: 'ERROR',
            error: payload.error,
          });
        });
      } if (this._apiActions[mutationName]) {
        mutation = this._apiActions[mutationName].mutation;
      } else if (this._mutations[mutationName]) {
        mutation = this._mutations[mutationName];
      } else {
        // TODO: throw an error?
        return state;
      }

      // uses immer to simplify state mutations :D
      return produce(state, (draftState) => {
        // payload has the action payload for regular actions
        // and the action payload as well as request/response info for api actions
        // mutations are free to just mutate the state and it automatically handles immutability
        mutation(draftState, payload);
      });
    };
  }
}

// currently assumes you have a single api for all modules
// TODO: set up a service map or something so we could have multiple apis
// could select per action, or per module...
RevuxModule.api = null;
RevuxModule.setApi = function (_api) { RevuxModule.api = _api; };

export default RevuxModule;
