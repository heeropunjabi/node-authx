/**
 * Entry point for AuthX library
 * Load all services here
 *
 * Configuration can be set by passing an object with openId and scim keys
 */
module.exports = function(config = {})
{
  const AuthX = require('./connectors/openid')(config.openId);
  config.openIdClient = AuthX;

  const services = require('./services')(config);
  const routes = require('./routes')(config, AuthX, services);

  return {AuthX: AuthX, services: services, routes: routes};
}
