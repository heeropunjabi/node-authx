/**
 * Entry point for all authx services
 * This will initialize all services that lie within
 * Setup and singleton classes should be loaded here
 */

module.exports = function (config) {
  const Registration = require('./registration')(config);
  const Crud = require('./crud')(config);
  const Activation = require('./activation')(config, Crud);
  const ResetPassword = require('./resetpassword')(config, Crud);

  return {
    // Token storage for this module
    // This will be reused and mutated in other methods of this module
    tokenSet: {},
    initialize(cb) {
      const _this = this;
      config.openIdClient.cb = cb;
      config.openIdClient.getAccessToken(config.scim.username, config.scim.password)
        .then(tokenSet => {
          // Test code to check token expiry
          // Simulate it by setting the expires_at value to 15 seconds later
          // const moment = require('moment');
          // module.exports.tokenSet.expires_at = (moment.now() / 1000) + 15;
          // console.log(module.exports.tokenSet);

          _this.tokenSet = tokenSet;
          Registration.parent = _this;
          Crud.parent = _this;
          Activation.parent = _this;
          ResetPassword.parent = _this;
        }).catch(error => {
          console.error('Could not load AuthX. Please check the following error log.');
          console.error(error);
          throw error;
        });
    }, // initialize
    Registration,
    Crud,
    Activation,
    ResetPassword
  } // return
} // module.exports
