/**
 * Helper module to manage tasks related to user management
 * Currently uses Gluu's SCIM API
 */

module.exports = function(config)
{
  const httpError = require('http-errors');

  return {
    // Token storage for this module
    // This will be reused and mutated in other methods of this module
    tokenSet: {},

    /**
     * Lists all users with the SCIM server
     *
     * @return Promise which resolves user data or transparently rejects on an error
     */
     listUsers: function(query = {})
     {
       const _this = this;
       return new Promise((resolve, reject) => {
         // Check if the tokenSet was initialized with a valid access_token
          if(!_this.tokenSet || !_this.tokenSet.access_token)
          {
            reject(httpError(500,
              'Something went wrong while listing users',
              {info: {
                message: 'Uninitialized access token for crud service. Please initialize the service with a valid access token'
                     }
              }));
          }

          config.openIdClient.ensureAccessToken(_this.tokenSet)
            .then(tokenSet => {
              console.log(tokenSet);
              // Reset/mutate tokenSet based on the latest value
              _this.tokenSet = tokenSet;
            }).catch(error => reject(error));
        
          var queryParams = query;

          const axios = require('axios').create({
            baseURL: config.scim.baseURL,
            timeout: 10000,
            headers: {
              // Set Bearer token for SCIM access
              'Authorization': 'Bearer '+_this.tokenSet.access_token,
              'Content-type': 'application/scim+json'
            }
          });
 
          axios.get('/Users', {params: queryParams}).then(response => resolve(response.data))
            .catch(error => reject(error));
        }); // Promise
       }, // listUsers
    /**
     * Gets a user with the SCIM server based on ID
     *
     * @return Promise which resolves user data or transparently rejects on an error
     */
     getUser: function(userId, query = {})
     {
       const _this = this;
       return new Promise((resolve, reject) => {
         // Check if the tokenSet was initialized with a valid access_token
          if(!_this.tokenSet || !_this.tokenSet.access_token)
          {
            reject(httpError(500,
              'Something went wrong while getting user',
              {info: {
                message: 'Uninitialized access token for crud service. Please initialize the service with a valid access token'
                     }
              }));
          }

          config.openIdClient.ensureAccessToken(_this.tokenSet)
            .then(tokenSet => {
              console.log(tokenSet);
              // Reset/mutate tokenSet based on the latest value
              _this.tokenSet = tokenSet;
            }).catch(error => reject(error));
        
          var queryParams = query;

          const axios = require('axios').create({
            baseURL: config.scim.baseURL,
            timeout: 10000,
            headers: {
              // Set Bearer token for SCIM access
              'Authorization': 'Bearer '+_this.tokenSet.access_token,
              'Content-type': 'application/scim+json'
            }
          });
 
          axios.get('/Users/'+userId, {params: queryParams}).then(response => resolve(response.data))
            .catch(error => reject(error));
        }); // Promise
       }, // getUser
    /**
     * Deletes a user with the SCIM server based on ID
     *
     * @return Promise which resolves user data or transparently rejects on an error
     */
     deleteUser: function(userId)
     {
       const _this = this;
       return new Promise((resolve, reject) => {
         // Check if the tokenSet was initialized with a valid access_token
          if(!_this.tokenSet || !_this.tokenSet.access_token)
          {
            reject(httpError(500,
              'Something went wrong while deleting user',
              {info: {
                message: 'Uninitialized access token for crud service. Please initialize the service with a valid access token'
                     }
              }));
          }

          config.openIdClient.ensureAccessToken(_this.tokenSet)
            .then(tokenSet => {
              console.log(tokenSet);
              // Reset/mutate tokenSet based on the latest value
              _this.tokenSet = tokenSet;
            }).catch(error => reject(error));
        
          const axios = require('axios').create({
            baseURL: config.scim.baseURL,
            timeout: 10000,
            headers: {
              // Set Bearer token for SCIM access
              'Authorization': 'Bearer '+_this.tokenSet.access_token,
              'Content-type': 'application/scim+json'
            }
          });
 
          axios.delete('/Users/'+userId).then(response => resolve(response.data))
            .catch(error => reject(error));
        }); // Promise
       }, // deleteUser
    /**
     * Modifies a user with the SCIM server based on ID
     *
     * @return Promise which resolves user data or transparently rejects on an error
     */
     modifyUser: function(userId, userData, query={})
     {
       const _this = this;
       return new Promise((resolve, reject) => {
         // Check if the tokenSet was initialized with a valid access_token
          if(!_this.tokenSet || !_this.tokenSet.access_token)
          {
            reject(httpError(500,
              'Something went wrong while updating user',
              {info: {
                message: 'Uninitialized access token for crud service. Please initialize the service with a valid access token'
                     }
              }));
          }

          config.openIdClient.ensureAccessToken(_this.tokenSet)
            .then(tokenSet => {
              console.log(tokenSet);
              // Reset/mutate tokenSet based on the latest value
              _this.tokenSet = tokenSet;
            }).catch(error => reject(error));
        
          const axios = require('axios').create({
            baseURL: config.scim.baseURL,
            timeout: 10000,
            headers: {
              // Set Bearer token for SCIM access
              'Authorization': 'Bearer '+_this.tokenSet.access_token,
              'Content-type': 'application/scim+json'
            }
          });
 
          axios.patch('/Users/'+userId, userData, {params: query}
                  ).then(response => resolve(response.data))
            .catch(error => reject(error));
        }); // Promise
       } // modifyUser

     } // return
} // module.exports
