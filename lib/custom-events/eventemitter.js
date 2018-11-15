const EventEmitter = require('events');

class AuthXEventEmitter extends EventEmitter { };

const eventEmitter = new AuthXEventEmitter();
module.exports = eventEmitter;