/**
 * Routes for user management for csfx-serv-withdraw
 * Contains implementation for user registration, update, etc
 */
module.exports = function (config, AuthX, services, eventEmitter) {
  const express = require('express');
  const router = express.Router();
  const httpError = require('http-errors');

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
      .then(userResponse => {
        eventEmitter.emit('user-signup', { uuid: userResponse.id, activationUrl: userResponse.activationUrl });
        delete userResponse.activationUrl;
        res.status(201).json({
          success: true,
          data: userResponse
        })
      }).catch(error => {
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
   * POST Request to resend activation email for a user
   *
   * @param activationUrl
   */
  router.post('/:id/resend_activation_email', (req, res, next) => {
    var activationUrl = req.body.activationUrl || config.activationUrls[0];
    // Check for valid activation URL
    // Fail if the activation Url was invalid
    if (config.activationUrls.indexOf(activationUrl) < 0) {
      return next(httpError(400, 'Invalid activation URL'));
    }
    // Initiate user creation with registration service
    services.Crud.getUser(req.params.id, {
        filter: [
          'entitlements.type eq "activation"',
          'entitlements.value eq "false"'
        ].join(' and ')
      }).then(userResponse => {
        // Extract the activation token
        // Get index of the appropriate entitlement
        var entitlementIndex = userResponse.entitlements.indexOf(
          userResponse.entitlements.filter(entitlement => entitlement.type == 'activation'  && entitlement.value == 'false')[0]
        );

        // Fail if there was no entitlement with pending activation
        if(entitlementIndex < 0)
        {
          return next(new httpError(422, 'Unable to resend activation email',
            {info: {message: 'Cannot find pending activation for this user'} }));
        }

        // Add the activation token from 'display' field of the entitlement
        // and construct an activation URL for this user
        activationUrl = activationUrl + userResponse.entitlements[entitlementIndex].display;
        eventEmitter.emit('user-signup', { uuid: userResponse.id, activationUrl: activationUrl });
        res.status(202).json({
          success: true,
          data: userResponse
        })
      }).catch(error => {
        console.log(error);
        // The service returns a 409 error in case the server failed with some validation
        // constraints
        // Capture the message for further reporting
        if (!!error.response && !!error.response.data && !!error.response.data.status && error.response.data.status == 409) {
          error.message = error.response.data.detail;
        }
        next(new httpError(422, 'Unable to resend activation email',
          { info: { message: error.message } }
        ));
      });
  }); // POST /resend_activation_email

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

  return router;
} // module.exports
