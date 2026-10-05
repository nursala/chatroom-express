// config/constants.js

// Register flow
const REGISTER_TIMEOUT = 30; // seconds (required by assignment)

// Chat polling
const POLLING = 10; // seconds (required by assignment)

// Session / cookies
const SESSION_MAX_AGE = 1000 * 60 * 60 * 2; // 2 hours (you can change later)

// Validation
const NAME_MIN_LENGTH = 3;
const FIELD_MAX_LENGTH = 32;

module.exports = {
    REGISTER_TIMEOUT,
    POLLING,
    SESSION_MAX_AGE,
    NAME_MIN_LENGTH,
    FIELD_MAX_LENGTH,
};
