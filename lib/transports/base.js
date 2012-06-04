var structr = require("structr"),
outcome = require("outcome"),
EventEmitter = require("events").EventEmitter;


exports.Transport  = structr({

	/**
	 */

	"__construct": function(options) {
		this.connect(options);
	},

	/**
	 */

	"abstract connect": function(options) { },
	"abstract collection": function(name) { }
});


exports.Collection = structr({


	/**
	 */


	"final popJob": function(onJobs) { 
		var self = this;
		this._popJob(outcome.error(onJobs).success(function(rawJob) {

			if(!rawJob) return onJobs();

			var job = new Job(rawJob, self);
			job.once("complete", function() {
				self._onJobComplete(job);
			});

			onJobs(null, job);
		}));
	},

	"abstract addJob": function(data, onUpdate) {},
	// "abstract updateJob": function(data, onUpdate) {},
	// "abstract deleteJob": function(data, onUpdate) {},
	"abstract _popJob": function(count, onJobs) {},
	"abstract _onJobComplete": function(job) {},
	"abstract getTimeout": function(){}
});


var Job = structr(EventEmitter, {


	/**
	 */

	"__construct": function(raw, transport) {
		this.transport = transport;

		this.data = raw.data;
		this._id  = raw._id;
	},

	/**
	 */

	"complete": function(err, response) {

		this.error    = err;
		this.response = response || {};

		this.emit("complete");
	}
})