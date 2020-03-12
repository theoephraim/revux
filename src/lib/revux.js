import _ from 'lodash';
import produce from 'immer';

const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class RevuxModule {
  constructor(config) {

    this.initialState = (_.isFunction(config.state) ? config.state() : config.state) || {};
    this.initialState._requests = {};

    this._namespace = config.namespace;
    this._getters = config.getters;

    this._apiActions = config.apiActions;
    this._otherActions = config.actions;

  }

  connectToStore(_store) { this.connectedStore = _store; }

  async dispatchApiAction(actionName, payload = {}) {
    const actionSpecFn = this._apiActions[actionName].action
    const moduleState = this.connectedStore.getState()[this._namespace];
    const actionSpec = actionSpecFn({ state: moduleState }, _.omit(payload, '_delay'));
    // actionSpec.payload = payload; // attach the original payload too so we have it later

    // build a key for where to store the request status
    // some request statuses are segmented per ID or per some other param
    // while others are singular for that request type
    // ex: "user signup" (singular)
    // vs "add external account" (per type)
    // vs "update external account" (per type and ID)
    let requestStatusKey = actionName;
    if (actionSpec.keyRequestStatusBy) requestStatusKey += `%${actionSpec.keyRequestStatusBy}`;

    actionSpec.requestStatusKey = requestStatusKey;

    // check if we have already made the same exact request and it is still pending
    // const existingRequest = ctx.rootState.apiRequests.statuses[requestStatusKey];
    // if (existingRequest && existingRequest.status === 'PENDING') {
    //   // we exit early if the same request is already being made, but this could cause issues
    //   // if we are expecting a result or awaiting until the request is done
    //   // TODO: figure out a better way here to handle the promise and return value if any!
    //   if (_.isEqual(existingRequest.payload, payload)) return;
    // }

    this.connectedStore.dispatch({
      type: `${this._namespace}/REVUX_REQUEST_INITIATED`,
      requestStatusKey,
    });

    // adds a delay - sometimes helps give the backend time to process things
    // before making next request
    if (payload._delay) {
      await (timeout(payload._delay));
    }

    const { method, url, params, options, afterSuccess, afterFailure } = actionSpec;
    console.log(actionSpec);
    try {
      const requestOptions = {
        method,
        url,
        ...method === 'get' ? { params } : { data: params },
        ...options,
      };
      // api is expecting an axios instance set on RevuxModule class globally
      const request = await RevuxModule.api(requestOptions);

      this.connectedStore.dispatch({
        type: `${this._namespace}/${actionName}`,
        payload,
        actionSpec,
        response: request.data,
        // responseTotalCount: request.headers['x-total-count'], // if using a header
      });

      this.connectedStore.dispatch({
        type: `${this._namespace}/REVUX_REQUEST_SUCCESS`,
        requestStatusKey,
      });

      if (typeof afterSuccess === 'function') await afterSuccess(request.data);
      // option to return the response directly - used for things like fetching the file upload URL
      if (actionSpec.returnResponse) return request.data;
      return true; // return true/false to know if it succeeded
    } catch (err) {
      console.log(err);

      const errorBody = _.get(err, 'response.data');

      this.connectedStore.dispatch({
        type: `${this._namespace}/REVUX_REQUEST_FAILURE`,
        requestStatusKey,
        err: errorBody,
      });
      // TODO: add a way to hook in for global error handler
      // for example detect a certain error code and force a logout

      if (typeof afterFailure === 'function') {
        afterFailure(errorBody);
      }
      return false; // return true/false to know if it succeeded
    }
  }

  getters(getterName) {
    const getterFn = this._getters[getterName];
    if (!getterFn) throw new Error(`Getter ${getterName} does not exist`);
    const state = this.connectedStore.getState();
    console.log(state);
    const moduleState = state[this._namespace];
    return getterFn(moduleState);
  }
  requests(requestStatusKey) {
    const state = this.connectedStore.getState();
    const request = state[this._namespace]._requests[requestStatusKey] || {};

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
      statusProps.errorMessage = request.error.message || '';
      if (request.error.details && request.error.details.messages) {
        statusProps.errorMessages = request.error.details.messages;
      }
    }
    return statusProps;
  }

  reducer = () => (state, action) => {
    if (!action.type.startsWith(`${this._namespace}/`)) return state;

    const actionType = action.type.substr(this._namespace.length + 1);

    let mutation;
    if (actionType === 'REVUX_REQUEST_INITIATED') {
      return produce(state, (draftState) => {
        draftState[this._namespace]._requests[action.requestStatusKey] = {
          requestedAt: new Date(),
          status: 'PENDING',
        }
      });
    } else if (actionType === 'REVUX_REQUEST_SUCCESS') {
      return produce(state, (draftState) => {
        _.assign(draftState[this._namespace]._requests[action.requestStatusKey], {
          completedAt: new Date(),
          status: 'SUCCESS',
        });
      });
    } else if (actionType === 'REVUX_REQUEST_FAILURE') {
      return produce(state, (draftState) => {
        _.assign(draftState[this._namespace]._requests[action.requestStatusKey], {
          completedAt: new Date(),
          status: 'ERROR',
          error: action.error,
        });
      });
    } else if (this._apiActions[actionType]) {
      mutation = this._apiActions[actionType].mutation;
    } else if (this._otherActions[actionType]) {
      mutation = this._otherActions[actionType].mutation;
    } else {
      return state;
    }

    // use immer to simplify changes :D
    return produce(state, (draftState) => {
      // pass only the modules "state" to the mutation to change
      // action has the info about the request and the response
      mutation(draftState[this._namespace], action);
    });
  }
}

// currently assumes you have a single api for all modules
// can set up a service map or something to have multiple
RevuxModule.api = null;
RevuxModule.setApi = function (_api) { RevuxModule.api = _api; }

export {
  RevuxModule,
}