# NPM Package to manage AuthX with Gluu server

## Usage

### Initialization

    const config = {
      openId: {...},
      scim: {...}
      };

    const {AuthX, services, routes} = require('authx')(config);

    // Optional step to initialize services with an admin token, etc
    // Particularly required for APIs which leverage SCIM endpoints
    // Such as the Registration service
    services.initialize();

### Using predefined routes

    // Using specific routes
    app.use('/users', routes.users);

### Enabling authorization on specific routes

    router.post('/foo', AuthX.authorize, (req, res, next) => {...})


