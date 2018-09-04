/**
 * Entry point for all authx services
 * This will initialize all services that lie within
 * Setup and singleton classes should be loaded here
 */

module.exports = function(config)
{
  const Registration = require('./registration')(config);

  return {
    initialize() {
    config.openIdClient.getAccessToken(config.scim.username, config.scim.password)
      .then(tokenSet => {
        // Test code to check token expiry
        // Simulate it by setting the expires_at value to 15 seconds later
        // const moment = require('moment');
        // module.exports.tokenSet.expires_at = (moment.now() / 1000) + 15;
        // console.log(module.exports.tokenSet);
        Registration.tokenSet = tokenSet;
      }).catch(error => {
        console.error('Could not load AuthX. Please check the following error log.');
        console.error(error);
        throw error;
      });
    }, // initialize
    Registration
  } // return
} // module.exports
