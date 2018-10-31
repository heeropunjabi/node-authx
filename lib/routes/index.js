/**
 * Loads all routes associated with this module
 */
module.exports = function (config, AuthX, services) {
  let router = require('./users')(config, AuthX, services);
  router = require('./password')(config, AuthX, services, router);
  return {
    users: router,
  };
} // module.exports
