//Function to send success responses
const sendSuccessResponse = (res, data) => {
    const response = {
        success: true,
        data: data
    };
    res.json(response)
}

//Function to send error responses
const sendErrorResponse = (res, errorMessage, statusCode = 500) => {
    const response = {
        success: false,
        error: errorMessage
    }
    res.status(statusCode).json(response)
}

// Export the functions
module.exports = {
    sendSuccessResponse,
    sendErrorResponse
}