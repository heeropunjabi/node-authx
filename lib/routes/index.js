/**
 * Loads all routes associated with this module
 */
module.exports = function(config, AuthX, services)
{
  return {
    users: require('./users')(config, AuthX, services)
  };
} // module.exports
