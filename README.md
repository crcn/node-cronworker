[![build status](https://secure.travis-ci.org/crcn/node-cronworker.png)](http://travis-ci.org/crcn/node-cronworker)
Features:

- Specify when to send jobs
- Multiple ways of handling jobs

Example:

```javascript
var cronworker = require("cronworker").connect({
	type: "mongo",
	host: "mongodb://host/db"
});




var newsletterQueue = cronworker.queue("newsletter");

//add a new job
newsletterQueue.addJob({
	sendAt: Date.now() + 3000,
	data: "hello world!"
});


newsletterQueue.onJob(function(job, onComplete) {
	console.log(job.data); //hello world!

	//send after another 3 seconds
	onComplete(null, {
		sendAt: Date.now() + 3000
	});
});


//or worker file
newsletterQueue.onJob(__dirname + "/newsletter_worker.js");

//or API endpoint
newsletterQueue.onJob("http://sendNewsletter.com/newsletter");
````





