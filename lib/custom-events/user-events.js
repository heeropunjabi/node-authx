const EventEmitter = require('events');

class UserEvents extends EventEmitter { };

const userEvent = new UserEvents();
module.exports = userEvent;