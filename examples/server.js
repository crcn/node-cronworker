
var connection = require("./connection");


var queue = connection.queue("jobs");

var i = 0;
setInterval(function() {
	queue.addJob({
		data: {
			message: "hello world!",
			index: i++
		},
		sendAt: Date.now()
	});

}, 300);
