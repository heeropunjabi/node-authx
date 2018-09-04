/**
 * Entry point for AuthX library
 * Load all services here
 */
module.exports = function(config = {})
{
  const AuthX = require('./connectors/openid')(config.openId);
  config.openIdClient = AuthX;

  const services = require('./services')(config);
  const routes = require('./routes')(services);

  return {AuthX: AuthX, services: services, routes: routes};
}
