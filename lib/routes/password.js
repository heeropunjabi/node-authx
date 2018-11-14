/**
 * Routes for user management for csfx-serv-withdraw
 * Contains implementation for forgot password flow.
 */
module.exports = function (config, AuthX, services, router, events) {
    const express = require('express');
    //const router = express.Router();
    const httpError = require('http-errors');


    /**
     * This forgotPassword API has following structure
     * {
          "userId": "hp6@mailinator.com",
          "resetUrl": "https://localhost:3000/resetPassword/"
      }
     */

    router.post('/password', (req, res, next) => {
        // Fail fast if user data was absent
        if (!req.body.userId) {
            return next(httpError(400,
                'User data is required in POST body. Pass user data as {userId: "", resetUrl: ""}'));
        }
        // Check for valid activation URL
        if (config.passwordResetUrls.indexOf(req.body.resetUrl) < 0) {
            reject(httpError(400, 'Invalid activation URL'));
        }

        // Initiate user creation with registration service
        services.Crud.listUsers({ filter: `userName eq "${req.body.userId}"` })
            .then(userResponses => {
                if (userResponses.Resources && userResponses.Resources[0]) {
                    const userInfo = userResponses.Resources[0];
                    const primaryEmail = (userInfo.emails.filter((email) => email.primary === true ? email : null)[0]);
                    var resetPasswordToken = null;
                    const entitlements = userInfo.entitlements || [];

                    require('crypto').randomBytes(16, (err, buffer) => {
                        resetPasswordToken = buffer.toString('hex');
                        entitlements.push({
                            type: 'resetPassword',
                            display: resetPasswordToken,
                            value: false
                        });
                        services.Crud.modifyUser(userInfo.id, {
                            Operations: [
                                // Update entitlements with resetPasswordToken
                                { op: 'replace', path: 'entitlements', value: entitlements }
                            ]
                        }).then((response) => {
                            passwordResetUrl = req.body.resetUrl + resetPasswordToken;
                            events.emit('user-password-reset', { uuid: response.id, passwordResetUrl: passwordResetUrl });
                            res.status(200).json({
                                success: true
                            });
                        });
                    });

                }
                else {
                    next(new httpError(error.status || 500, 'No such user found',
                        { info: { message: error.message } }
                    ));
                }
            }).catch(error => {
                console.log(error);
                // Capture the message for further reporting
                if (!!error.response && !!error.response.data && !!error.response.status) {
                    error.message = error.response.data.detail;
                    error.status = error.response.status;
                }
                next(new httpError(error.status || 500, 'No such user found',
                    { info: { message: error.message } }
                ));
            });
    });

    router.put('/password', (req, res, next) => {
        if (!req.body.resetPasswordToken || !req.body.newPassword) {
            return next(new httpError(400, 'Reset Token is required'));
        }

        services.ResetPassword.changePassword(req.body.resetPasswordToken, req.body.newPassword)
            .then(userResponse => res.status(200).json({
                success: true,
                data: userResponse
            })).catch(error => {
                console.log(error);
                // Capture the message for further reporting
                if (!!error.response && !!error.response.data && !!error.response.status) {
                    error.message = error.response.data.detail;
                    error.status = error.response.status;
                }
                next(new httpError(error.status || 500, 'Unable to Change Password',
                    { info: { message: error.message } }
                ));
            });

    }); // POST /activate



    return router;
} // module.exports
