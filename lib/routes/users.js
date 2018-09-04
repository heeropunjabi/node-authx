/**
 * Routes for user management for csfx-serv-withdraw
 * Contains implementation for user registration, update, etc
 */
module.exports = function(services)
{
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
    if(!req.body.user)
    {
      return next(httpError(400,
        'User data is required in POST body. Pass user data as {user: {email: <email>, password: <password>}}'));
    }

    // Initiate user creation with registration service
    services.Registration.createUser(req.body.user)
      .then(userResponse => res.status(201).json({
        success: true,
        data: userResponse
      })).catch(error => {
        console.log(error);
        // The service returns a 409 error in case the server failed with some validation
        // constraints
        // Capture the message for further reporting
        if(!!error.response && !!error.response.data && !!error.response.data.status && error.response.data.status == 409)
        {
          error.message = error.response.data.detail;
        }
        next(new httpError(422, 'Unable to register the user',
          {info: {message: error.message}}
        ));
      });
  }); // POST '/'

  return router;
} // module.exports
