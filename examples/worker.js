
var connection = require("./connection");


var queue = connection.queue("jobs");


for(var i = 5; i--;)
queue.onJob(function(job, next) {
	console.log("running job %s, %s", job.data.message, job.data.index);
	// console.log(job)
	next();
});

