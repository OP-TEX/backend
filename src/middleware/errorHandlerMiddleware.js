const { BaseException } = require('../utils/baseException');

const exceptionHandler = (
    err,
    req,
    res,
    next
) => {

    console.log(req.originalUrl);
    console.log(req.method);
    console.log(req.body);
    console.log(req.params);
    console.error(err.errorCode);
    console.error(err.statusCode);
    console.log(err.name);
    console.error(err.errors || []);
    console.error(err.stack || err.message);
    console.log(new Date().toISOString());

    if (err instanceof BaseException) {
        return res.status(err.statusCode).json({
            message: err.message,
            errorCode: err.errorCode,
            path: req.originalUrl,
            timestamp: new Date().toISOString(),
        });
    }

    return res.status(500).json({
        message: 'Something went wrong. Please try again later.',
        errorCode: 500,
        path: req.originalUrl,
        timestamp: new Date().toISOString(),
    });
};

module.exports = { exceptionHandler };
