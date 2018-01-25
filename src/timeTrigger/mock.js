var AzureFunction = require('./index');

// Local development query and body params
var debugQuery = {
    "code": "This is the code"
}
var debugBody = {
    "name": "Mock"
}
// Local development request object
var req = {
    originalUrl: 'http://original-azure-function-url',
    method: 'GET',
    query: debugQuery,
    headers: { 
        connection: 'Keep-Alive',
        accept: 'application/json',
        host: 'original-azure-function-url',
        origin: 'https://functions.azure.com',
    },
    body: debugBody,
    rawBody: JSON.stringify(debugBody)
};

// Local development myTimer object
var myTimer = new Date().toISOString();

// Local development context
var debugContext = {
    invocationId: 'ID',
    bindings: {
        req
    },
    log: function (val) {
        //var util = require('util');
        //var val = util.format.apply(null, arguments);
        console.log(val);
    },
    done: function () {
        // When done is called, it will log the response to the console
        // console.log('Response:', this.res);
    },
    res: null
};

// Call the AzureFunction locally with your testing params
AzureFunction(debugContext, myTimer);