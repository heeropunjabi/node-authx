/**
 * Helper module to manage tasks related to user registration
 * Currently uses Gluu's SCIM API
 */

module.exports = function (config) {
  const httpError = require('http-errors');

  return {
    parent: {},
    /**
     * Creates a user record with the SCIM server
     *
     * @param user User data with email and password keys
     * @return Promise which resolves user data or transparently rejects on an error
     */
    createUser: function (user, activationUrl = config.activationUrls[0]) {
      const _this = this;
      return new Promise((resolve, reject) => {
        // Check if the tokenSet was initialized with a valid access_token
        if (!_this.parent.tokenSet || !_this.parent.tokenSet.access_token) {
          reject(httpError(500,
            'Something went wrong while creating the user',
            {
              info: {
                message: 'Uninitialized access token for registration service. Please initialize the service with a valid access token'
              }
            }));
        }

        // Check for valid activation URL
        if (config.activationUrls.indexOf(activationUrl) < 0) {
          reject(httpError(400, 'Invalid activation URL'));
        }

        config.openIdClient.ensureAccessToken(_this.parent.tokenSet)
          .then(tokenSet => {
            console.log(tokenSet);
            // Reset/mutate tokenSet based on the latest value
            _this.parent.tokenSet = tokenSet;

            var activationToken = null;
            require('crypto').randomBytes(16, function (err, buffer) {
              activationToken = buffer.toString('hex');
              var userBody = {
                schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
                userName: user.email,
                emails: [{ value: user.email, primary: true }],
                password: user.password,
                entitlements: [{ type: 'activation', value: 'false', display: activationToken }]
              };

              const axios = require('axios').create({
                baseURL: config.scim.baseURL,
                timeout: 10000,
                headers: {
                  // Set Bearer token for SCIM access
                  'Authorization': 'Bearer ' + _this.parent.tokenSet.access_token,
                  'Content-type': 'application/scim+json'
                }
              });

              activationUrl = activationUrl + activationToken;
              axios.post('/Users', userBody).then(response => {
                response.data.activationUrl = activationUrl;
                resolve(response.data);
              }).catch(error => reject(error)); // axios
            });

          }).catch(error => reject(error)); // ensureAccessToken
      }); // Promise
    } // createUser
  } // return
} // module.exports
