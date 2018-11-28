/**
 * Helper module to manage tasks related to password management
 * Currently uses Gluu's SCIM API
 */

module.exports = function (config, CrudService) {
    const httpError = require('http-errors');

    return {
        parent: {},
      /**
       * Resets a user's password using a reset password token
       *
       * @param resetPasswordToken
       * @param newPassword
       *
       * @return Promise that resolves on an updated user object or rejects on error
       *
       */
        resetPassword: (resetPasswordToken, newPassword) => {
            return new Promise((resolve, reject) => {
                // Find a user with provided activation token that is yet to be used
                CrudService.listUsers({
                    filter: [
                        'entitlements.type eq "resetPassword"',
                        'entitlements.display eq "' + resetPasswordToken + '"',
                        'entitlements.value eq "false"'
                    ].join(' and ')
                }).then(userResponses => {
                    // Fail if user with this activation token as inactive was not found
                    if (!userResponses.Resources || !userResponses.Resources[0]) {
                        reject(new httpError(400, 'Invalid activation token'));
                    }
                    else {
                        var user = userResponses.Resources[0];
                        // Get index of the appropriate entitlement
                        var entitlementIndex = user.entitlements.indexOf(
                            user.entitlements.filter(entitlement => entitlement.type == 'resetPassword' && entitlement.display == resetPasswordToken && entitlement.value == 'false')[0]
                        );

                        var entitlements = user.entitlements;
                        // Set activation value to true
                        entitlements[entitlementIndex].value = true;

                        CrudService.modifyUser(user.id, {
                            Operations: [
                                // Update entitlements
                                { op: 'replace', path: 'entitlements', value: entitlements },
                                // Also set the active flag to true
                                { op: 'replace', path: 'password', value: newPassword }
                            ] // Operations
                        }).then(userResponse => resolve({ success: 200 }))
                            .catch(error => reject(error)); // modifyUser
                    }
                }).catch(error => reject(error));
            }); // Promise
        }, // resetPassword
      /**
       * Changes a user's password by verifying the old password first
       *
       * @param username
       * @param oldPassword
       * @param newPassword
       *
       * @return Promise that resolves on an updated user object or rejects on error
       *
       */
        changePassword: (userId, username, oldPassword, newPassword) => {
            return new Promise((resolve, reject) => {
              // Validate old password
              config.openIdClient.getAccessToken(username, oldPassword)
              .catch(error => {
                reject(new httpError(401, 'Invalid credentials'));
              })
              .then(tokenSet => CrudService.modifyUser(
                userId,
                {
                  Operations: [{
                    op: 'replace', path: 'password', value: newPassword
                  }]
                })
              ).then(userResponse => resolve(userResponse))
                .catch(error => reject(error));
            }); // Promise
        } // changePassword
    }; // return
} // module.exports
