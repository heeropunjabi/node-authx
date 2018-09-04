/**
 * Loads all routes associated with this module
 */
module.exports = function(services)
{
  return {
    users: require('./users')(services)
  };
} // module.exports
