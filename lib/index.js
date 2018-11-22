/**
 * Entry point for AuthX library
 * Load all services here
 *
 * Configuration can be set by passing an object with openId and scim keys
 */
let AuthxInstance;
module.exports = function (config = {}, cb) {
  if (!AuthxInstance) {
    const AuthX = require('./connectors/openid')(config.openId, config.scim, cb);
    config.openIdClient = AuthX;

    const services = require('./services')(config);
    const eventEmitter = require('./custom-events').eventEmitter;
    const routes = require('./routes')(config, AuthX, services, eventEmitter);

    AuthxInstance = { AuthX: AuthX, services: services, routes: routes, eventEmitter: eventEmitter };
    return AuthxInstance;
  } else {
    return AuthxInstance;
  }

}
