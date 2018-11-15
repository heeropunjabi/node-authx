/**
 * Entry point for AuthX library
 * Load all services here
 *
 * Configuration can be set by passing an object with openId and scim keys
 */
module.exports = function (config = {}) {
  const AuthX = require('./connectors/openid')(config.openId, config.scim);
  config.openIdClient = AuthX;

  const services = require('./services')(config);
  const eventEmitter = require('./custom-events').eventEmitter;
  const routes = require('./routes')(config, AuthX, services, eventEmitter);

  return { AuthX: AuthX, services: services, routes: routes, eventEmitter: eventEmitter };
}
