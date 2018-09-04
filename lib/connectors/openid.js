/**
 * Helper to enable OpenID authorization
 * This will include middleware code to authorize requests based on their
 * authority levels as specified at the auth server
 * Also includes code to grant and refresh access tokens for a user
 */
module.exports = function(openIdConfiguration)
{
  const httpError = require("http-errors");

  const { Issuer } = require("openid-client");

  // Initialize Issuer
  Issuer.defaultHttpOptions = { timeout: openIdConfiguration.httpTimeout };
  const issuer = new Issuer({
    issuer: openIdConfiguration.issuer,
    authorization_endpoint: openIdConfiguration.authorization_endpoint,
    token_endpoint: openIdConfiguration.token_endpoint,
    userinfo_endpoint: openIdConfiguration.userinfo_endpoint,
    jwks_uri: openIdConfiguration.jwks_uri,
    introspection_endpoint: openIdConfiguration.introspection_endpoint
  });

  // Initialize client
  const openIdClient = new issuer.Client({
    client_id: openIdConfiguration.client_id,
    client_secret: openIdConfiguration.client_secret
  });

  return {
    /**
     * Authorizes a request by introspecting a token,
     * then checking if the desired scope is present with the token
     * and raising an Unauthorized error if the scope wasn't found
     * or if the auth server denied access
     *
     * @param request
     * @param response
     * @param next
     * @param scope
     */
    authorize: function(
      request,
      response,
      next,
      scope = openIdConfiguration.defaultScope
    ) {
      // Reject the request if Authorization header was missing
      if (!request.header("Authorization")) {
        return next(
          new httpError.Unauthorized("Authorization is required", {
            info: { message: "Authorization header was missing" }
          })
        );
      }

      // Extract token value from the Authorization header
      const token = request.header("Authorization").replace("Bearer ", "");

      // Introspect the token with auth server and act appropriately
      openIdClient
        .introspect(token, "access_token")
        .then(introspectionResponse => {
          if (introspectionResponse.scopes.indexOf(scope) < 0) {
            return next(
              new httpError.Unauthorized("Access Denied", {
                info: { message: "Access token is invalid for " + scope }
              })
            );
          } else {
            next();
          }
        })
        .catch(error => {
          // Throw an Unauthorized error if the error message from auth server
          // indicates that access was denied
          if (
            error.name == "OpenIdConnectError" &&
              !!error.message.match(/^access_denied/)
          ) {
            return next(
              new httpError.Unauthorized("Access denied", {
                info: { message: error.message }
              })
            );
          }

          // In case of any other errors, return an InternalServerError
          return next(
            new httpError.InternalServerError(
              "Something went wrong while authorizing your request",
              { info: { message: error.message } }
            ) // httpError
          ); // next
        }); // catch
    }, // authorize

    /**
     * Generates an access token for a user/password combination
     *
     * @param username
     * @param password
     *
     * @return Promise that emits a TokenSet object with a token set containing access token,
     * expires_at timestamp, and refresh token
     *
     * E.g.
     * TokenSet {
     *   access_token: '1dd2558f-a459-4f08-9c59-a1ec53586b02',
     *   token_type: 'bearer',
     *   expires_at: 1535557379,
     *   refresh_token: '845341ae-3112-47ad-855f-625c3b5d693d' }
     */
    getAccessToken: function(username, password)
    {
      return openIdClient.grant({
        username: username, 
        password: password,
        grant_type: 'password',
        scopes: ['uma_protection', 'openid', 'profile']
      });
    },

    /**
     * Ensures a valid access token by first inspecting an incoming token for expiry
     * Then making a refresh token request if the token was expired
     * Returns the source token if it were still valid
     *
     * @param tokenSet TokenSet object containing an access token, expires_at timestamp,
     * and refresh token
     *
     * @return A Promise that resolves into a valid tokenSet object
     */
    ensureAccessToken: function(tokenSet)
    {
      const moment = require('moment');

      return new Promise((resolve, reject) => {
        // Check if the token set is still valid
        // Consider a 5 second window before the token expires so that it's not a last minute
        // request
        if(moment(moment.now() + 5000).isBefore(moment(tokenSet.expires_at * 1000)))
        {
          console.log('Token is still valid. Returning it as is.');
          // Return the same tokenSet
          resolve(tokenSet);
        } else // The token has expired. Let's refresh it!
        {
          console.log('Token has expired. Refreshing it.');
          resolve(openIdClient.refresh(tokenSet.refresh_token));
        } // else
      }); // Promise
    } // ensureAccessToken
  }
}
