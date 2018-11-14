/**
 * Loads all routes associated with this module
 */
module.exports = function (config, AuthX, services, events) {
  let router = require('./users')(config, AuthX, services, events);
  router = require('./password')(config, AuthX, services, router, events);
  return {
    users: router,
  };
} // module.exports
