
var connection = require("./connection");


var queue = connection.queue("jobs");

for(var i = 10; i--;)
queue.addJob({
	_id: i,
	data: {
		message: "hello world!",
		index: i
	},
	sendAt: Date.now() + i * 500
});


queue.onJob(function(job, next) {
	console.log("RUN IT!", job.data.index);
	// console.log(job)
	next(null, {
		sendAt: Date.now()
	});
});