/**
 * Routes for user management for csfx-serv-withdraw
 * Contains implementation for user registration, update, etc
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
   * POST Request to create a user on the SCIM server
   *
   * Expects {user: {email: "some.valid@email", password: "password"}} in POST body
   */
  router.post('/', (req, res, next) => {
    // Fail fast if user data was absent
    if (!req.body.user) {
      return next(httpError(400,
        'User data is required in POST body. Pass user data as {user: {email: <email>, password: <password>}}'));
    }

    // Initiate user creation with registration service
    services.Registration.createUser(req.body.user, req.body.activationUrl)
      .then(userResponse => res.status(201).json({
        success: true,
        data: userResponse
      })).catch(error => {
        console.log(error);
        // The service returns a 409 error in case the server failed with some validation
        // constraints
        // Capture the message for further reporting
        if (!!error.response && !!error.response.data && !!error.response.data.status && error.response.data.status == 409) {
          error.message = error.response.data.detail;
        }
        next(new httpError(422, 'Unable to register the user',
          { info: { message: error.message } }
        ));
      });
  }); // POST '/'


  router.post('/forgotPassword', (req, res, next) => {
    // Fail fast if user data was absent
    if (!req.body.userId) {
      return next(httpError(400,
        'User data is required in POST body. Pass user data as {user: {email: <email>, password: <password>}}'));
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
                // Update entitlements
                { op: 'replace', path: 'entitlements', value: entitlements },

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
  }); // POST '/'



  /**
   * PATCH Request to modify a user on the SCIM server
   *
   * @param attributes Comma seperated string to list attributes requested in 
   *        response
   * @param excludedAttributes Comma separated string to list attributes to be
   *        excluded in response body
   *
   * Expects PATCH request body
   * E.g.:
   *
   * {
   *  user: {
   *    Operations: [
   *      {op: "add", path: "displayName", value: "John"},
   *      {op: "remove", path: "emails"},
   *      {op: "replace", path: "active", value: false},
   *    ]
   *  }
   * }
   */
  router.patch('/:id', AuthX.authorize, (req, res, next) => {
    // Fail fast if user data was absent
    if (!req.body.user) {
      return next(httpError(400,
        'User data is required in PATCH body'));
    }

    // Initiate user update with CRUD service
    services.Crud.modifyUser(req.params.id, req.body.user, req.query)
      .then(userResponse => res.status(200).json({
        success: true,
        data: userResponse
      })).catch(error => {
        console.log(error);
        // The service returns a 409 error in case the server failed with some validation
        // constraints
        // Capture the message for further reporting
        if (!!error.response && !!error.response.data && !!error.response.status) {
          error.message = error.response.data.detail;
          error.status = error.response.status;
        }
        next(new httpError(error.status || 422, 'Unable to update the user',
          { info: { message: error.message } }
        ));
      });
  }); // PUT '/:id'

  /**
    * GET Request to list all users with the SCIM server
    *
    * @param startIndex Start index for pagination
    * @param count Total number of entries requested
    * @param filter Filtering criteria based on RFC#7644 Section 3.4.2.2
    *
    */
  router.get('/', (req, res, next) => AuthX.authorize(req, res, next,
    config.openId.adminScope || 'admin'),
    (req, res, next) => {
      // Initiate user listing with crud service
      services.Crud.listUsers(req.query)
        .then(userResponses => res.status(200).json({
          success: true,
          data: userResponses
        })).catch(error => {
          console.log(error);
          // Capture the message for further reporting
          if (!!error.response && !!error.response.data && !!error.response.status) {
            error.message = error.response.data.detail;
            error.status = error.response.status;
          }
          next(new httpError(error.status || 500, 'Unable to list users',
            { info: { message: error.message } }
          ));
        });

    }); // GET '/'

  /**
   * GET Request to list attributes for one user by ID
   *
   * @param id User ID
   * @param attributes Requested attributes as a comma seperated string
   * @param excludedAttributes Attributes to be excluded from a response
   *
   */
  router.get('/:id', AuthX.authorize, (req, res, next) => {
    // Initiate getUser service
    services.Crud.getUser(req.params.id, req.query)
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
        next(new httpError(error.status || 500, 'Unable to get user',
          { info: { message: error.message } }
        ));
      });
  }); // GET '/:id'

  /**
   * DELETE Request to delete one user by ID
   *
   * @param id User ID
   *
   */
  router.delete('/:id', (req, res, next) => AuthX.authorize(req, res, next,
    config.openId.adminScope || 'admin'),
    (req, res, next) => {
      // Initiate deleteUser service
      services.Crud.deleteUser(req.params.id)
        .then(userResponse => res.status(204).json({
          success: true
        })).catch(error => {
          console.log(error);
          // Capture the message for further reporting
          if (!!error.response && !!error.response.data && !!error.response.status) {
            error.message = error.response.data.detail;
            error.status = error.response.status;
          }
          next(new httpError(error.status || 500, 'Unable to delete user',
            { info: { message: error.message } }
          ));
        });
    }); // DELETE '/:id'

  /**
   * POST Request to activate a user
   *
   * @param activationToken
   */
  router.post('/activate', (req, res, next) => {
    if (!req.body.activationToken) {
      return next(new httpError(400, 'Activation Token is required'));
    }

    services.Activation.activateUser(req.body.activationToken)
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
        next(new httpError(error.status || 500, 'Unable to activate user',
          { info: { message: error.message } }
        ));
      });

  }); // POST /activate

  router.post('/changePassword', (req, res, next) => {
    if (!req.body.resetPasswordToken) {
      return next(new httpError(400, 'Activation Token is required'));
    }

    services.Activation.resetPassword(req.body.resetPasswordToken, req.body.newPassword)
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
