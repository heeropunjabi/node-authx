/**
 * Routes for user management for csfx-serv-withdraw
 * Contains implementation for forgot password flow.
 */
module.exports = function (config, AuthX, services) {
    const express = require('express');
    const router = express.Router();
    const httpError = require('http-errors');
    const nodemailer = require('nodemailer');
    const sendgridTransport = require('nodemailer-sendgrid-transport');
    const emailClient = nodemailer.createTransport(sendgridTransport(
        { auth: { api_key: config.mailerApiKey } }
    ));

    /**
     * This forgotPassword API has following structure
     * {
          "userId": "hp6@mailinator.com",
          "resetUrl": "https://localhost:3000/resetPassword/"
      }
     */

    router.post('/forgotPassword', (req, res, next) => {
        // Fail fast if user data was absent
        debugger
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
                            emailClient.sendMail({
                                to: primaryEmail.value, from: config.activationEmailSender, subject: config.passwordResetEmailSubject,
                                html: config.passwordResetEmailBody.replace(/\{\{passwordResetUrl\}\}/g, passwordResetUrl)
                            }, (error, response) => {
                                console.log(response);
                                if (error) { console.log(error); reject(error) };
                            });
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

    router.post('/changePassword', (req, res, next) => {
        debugger
        if (!req.body.resetPasswordToken) {
            return next(new httpError(400, 'Activation Token is required'));
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
