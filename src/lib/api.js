/* eslint-disable no-param-reassign */

import Axios from 'axios';

const api = Axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  baseURL: 'https://jsonplaceholder.typicode.com/',
});
window.api = api; // useful for dev

api.interceptors.request.use((config) => {
  // here you can attach auth headers, other headers, etc

  // if (window.store.state.auth.token) {
  //   config.headers['x-auth'] = window.store.state.auth.token;
  // }
  return config;
});
api.interceptors.response.use((response) => {
  // transform api responses if necessary...
  // response.data = camelizeKeysDeep(response.data);
  return response;
});

export default api;
