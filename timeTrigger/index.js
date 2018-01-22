var request = require("request")
var mg = require('mongodb').MongoClient;

var postingsDb;
var closedDb;
var dbHandler;


// Uri's for Azure Cosmos DB
var user = process.env["user"];
var pass = process.env["pass"];
var mgdburl = process.env["mgdburl"];

// Uri's for nofluffjobs
var jobsPortalAll = process.env["jobsPortalAll"];
var jobsPortalOne = process.env["jobsPortalOne"];

// Global flags used to synchronize code
var newJobsReady = false;
var closedJobsReady = false;
var storedJobsReady = false;
var onlineJobsReady = false;
var allNewJobsInserted = false;
var allClosedJobsInserted = false;
var allClosedJobsRemoved = false;

var onlineJobs = {};
var storedJobs = {};
var newJobs = {};
var closedJobs = {};

var close = function (context) {

    if(!allNewJobsInserted || !allClosedJobsInserted || !allClosedJobsRemoved){
        setTimeout(
            () => {close(context);},
            1000
        );
    } else {
        dbHandler.close();
        context.log("Connection to db closed!");
        context.done();
    }

}

var processOpenAndClosedJobs = function (context){

    if(!newJobsReady || !closedJobsReady){
        setTimeout(
            () => {processOpenAndClosedJobs(context);},
            500
        );
    } else {
    
        if (newJobs.length === 0) {allNewJobsInserted=true;};
        if (closedJobs.length === 0) {allClosedJobsRemoved=true;allClosedJobsInserted=true;};

        // Insert new jobs into collection 'postings'
        newJobs.forEach(job => {
            // Fecth detailed information about this job
            request(
                {
                    url: jobsPortalOne+job.id,
                    json: true
                },
                function(err, body, response){
                    if (err) throw err;

                    // Store it in mongoDB                    
                    postingsDb.insertOne(
                        response.posting,
                        function (err, res) {
                            if (err) throw err;

                            if ((newJobs.length-1) === newJobs.indexOf(job)) {allNewJobsInserted=true;}
                            context.log(`Job inserted: ${response.posting.id}`);
                        }
                    );

                }
            );

        });
        
        // Process closed jobs
        // 1. Copy this job element from postings collection to closed
        // 2. Delete this job element from postings
        closedJobs.forEach(job => {
            // Remove closed jobs from collection 'postings'
            postingsDb.deleteOne(
                {id: job.id},
                function(err, obj){
                    if (err) throw err;

                    if((closedJobs.length-1) === closedJobs.indexOf(job)) {allClosedJobsRemoved=true;}
                    context.log(`Job removed from postings: ${job.id}`);
                }
            );

            // Insert closed jobs into collection 'closed'
            job.closed = new Date().toDateString();
            closedDb.insertOne(
                job,
                function(err, obj){
                    if (err) throw err;

                    if((closedJobs.length-1) === closedJobs.indexOf(job)) {allClosedJobsInserted=true;}
                    context.log(`Job inserted into deleted: ${job.id}`);
                }

            );
        });

    }

    // Async function which will check if all tasks are completed
    // Once completed, it will close db connection and terminate function
    close(context);


}

// Work with job data
// This function will wait until onlineJobs and storedJobs data is available
// storedJobs is an array with just the job Id 
// onlineJobs has limited data
var workWithJobData = function (context){

    if(!onlineJobsReady || !storedJobsReady){
        setTimeout(
            () => {workWithJobData(context);},
            1000
        );
    } else { 
        
        // Get the new jobs wich are not stored yet
        newJobs = onlineJobs.filter(
            function(online){
                if (onlineJobs.indexOf(online) === (onlineJobs.length-1)) {
                    newJobsReady=true;
                }
                return !storedJobs.find(
                    function(stored){
                        return online.id === stored.id;
                    }
                );
            }
        );
    
        // Get the closed jobs
        // Present in database but not in the online results
        closedJobs = storedJobs.filter(
            function(stored){
                if (storedJobs.indexOf(stored) === (storedJobs.length - 1)) {
                    closedJobsReady=true;
                }
                return !onlineJobs.find(
                    function(online){
                        return online.id === stored.id;
                    }
                );
            }
        );

        processOpenAndClosedJobs(context);
    }
    
}

module.exports = function (context, myTimer) {
    var timeStamp = new Date().toISOString();

    if(myTimer.isPastDue)
    {
        context.log('JavaScript is running late! Aborting function');
        context.done();
    }
    
    // Gets Ids of currently active jobs
    request(
        {
            url: jobsPortalAll,
            json: true
        }, 
        function(error, body, response){
            if(error) throw error;

            onlineJobs = response.postings;
            onlineJobsReady = true;

        }
    ); 
    
    // Async function that takes all stored jobs IDs
    // Once the function is ready, the flag storedJobsReady turns to True
    mg.connect(
        mgdburl,
        {auth: {
            user: user,
            password: pass,
        }},
        function (err, db){
            if (err) throw err;
            
            // Search for new found jobs and insert
            dbHandler = db;
            postingsDb = db.db("jobs").collection("postings");
            closedDb = db.db("jobs").collection("closed");
            
            postingsDb.find({}).toArray(
                function(err, result){
                    if (err) throw err;

                    storedJobs = result;
                    storedJobsReady = true;
                    //db.close();
                }
            );
            
        }
    );

    // Work with job data
    // This function will wait until onlineJobs and storedJobs data is available
    // storedJobs is an array with just the job Id 
    // onlineJobs has limited data
    workWithJobData(context);
    
};