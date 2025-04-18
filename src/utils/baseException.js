class BaseException extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;

        Error.captureStackTrace(this, this.constructor);
    }
}


class NotFoundError extends BaseException {
    constructor(message = 'Resource not found', errorCode = 'RESOURCE_NOT_FOUND') {
        super(message, 404, errorCode);
    }
}

// src/errors/ValidationError.js
class ValidationError extends BaseException {
    constructor(message = 'Validation failed', errors = [], errorCode = 'VALIDATION_ERROR') {
        super(message, 400, errorCode);
        this.errors = errors;
    }
}

// src/errors/AuthorizationError.js
class AuthorizationError extends BaseException {
    constructor(message = 'Not authorized', errorCode = 'NOT_AUTHORIZED') {
        super(message, 401, errorCode);
    }
}

// src/errors/ForbiddenError.js
class ForbiddenError extends BaseException {
    constructor(message = 'Access forbidden', errorCode = 'ACCESS_FORBIDDEN') {
        super(message, 403, errorCode);
    }
}

// src/errors/DatabaseError.js
class DatabaseError extends BaseException {
    constructor(message = 'Database error occurred', errorCode = 'DATABASE_ERROR') {
        console.error(message); // Log the error message
        super('Service is under maintaining. Try again later!', 500, errorCode);
    }
}

// src/errors/ServerError.js
class ServerError extends BaseException {
    constructor(message = 'Internal server error', errorCode = 'SERVER_ERROR') {
        super(message, 500, errorCode);
    }
}

// src/errors/ConflictError.js
class ConflictError extends BaseException {
    constructor(message = 'Conflict occurred', errorCode = 'CONFLICT_ERROR') {
        super(message, 409, errorCode);
    }
}

// src/errors/BadRequestError.js
class BadRequestError extends BaseException {
    constructor(message = 'Bad request', errorCode = 'BAD_REQUEST') {
        super(message, 400, errorCode);
    }
}

// src/errors/PaymentError.js
class PaymentError extends BaseException {
    constructor(message = 'Payment error occurred', errorCode = 'PAYMENT_ERROR') {
        super(message, 402, errorCode);
    }
}


// src/errors/TimeoutError.js
class TimeoutError extends BaseException {
    constructor(message = 'Request timed out', errorCode = 'TIMEOUT_ERROR') {
        super(message, 504, errorCode);
    }
}



// src/errors/UnsupportedMediaTypeError.js
class UnsupportedMediaTypeError extends BaseException {
    constructor(message = 'Unsupported media type', errorCode = 'UNSUPPORTED_MEDIA_TYPE') {
        super(message, 415, errorCode);
    }
}

// src/errors/MethodNotAllowedError.js  
class MethodNotAllowedError extends BaseException {
    constructor(message = 'Method not allowed', errorCode = 'METHOD_NOT_ALLOWED') {
        super(message, 405, errorCode);
    }
}

// src/errors/CloudinaryError.js
class CloudinaryError extends BaseException {
    constructor(message = 'File upload service error', errorCode = 'CLOUDINARY_ERROR') {
        super(message, 502, errorCode);
    }
}

module.exports = {
    BaseException,
    NotFoundError,
    ValidationError,
    AuthorizationError,
    ForbiddenError,
    DatabaseError,
    ServerError,
    ConflictError,
    BadRequestError,
    PaymentError,
    TimeoutError,
    UnsupportedMediaTypeError,
    MethodNotAllowedError,
    CloudinaryError
};

