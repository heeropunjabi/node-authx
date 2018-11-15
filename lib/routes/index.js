/**
 * Loads all routes associated with this module
 */
module.exports = function (config, AuthX, services, eventEmitter) {
  let router = require('./users')(config, AuthX, services, eventEmitter);
  router = require('./password')(config, AuthX, services, router, eventEmitter);
  return {
    users: router,
  };
} // module.exports
