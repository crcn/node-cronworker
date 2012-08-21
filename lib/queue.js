var structr  = require("structr"),
jobHandlers  = require("./jobHandlers"),
EventEmitter = require("events").EventEmitter,
outcome      = require("outcome"),
async        = require("async"),
step         = require("step"),
tq   		 = require("tq");




module.exports = structr({

	/**
	 */

	"__construct": function(collection, name) {

		this._collection  = collection;
		this._name        = name;

		//jobs that currently aren't working
		this._queuedHandlers = [];
		this._popQueue = tq.queue().start();


		var self = this;

		//on erorr, emit it.
		this._on = outcome.error(function(err) {
			self.emit("error", err);
		});

		this.defaultTimeout = 2000;
	},

	/**
	 */

	"addJob": function(job, next) {
		this._noJobsLeft = false;
		job.data = JSON.parse(JSON.stringify(job.data));
		this._collection.addJob(job, this.getMethod("_fetchJobs"));
	},


	/**
	 * fetches jobs from the connection class
	 */

	"fetchJobs": function() {
		if(this._noJobsLeft) return this._timeout();

		if(this._fetching || !this._queuedHandlers.length) {
			return;
		}

		this._fetching = true;

		var self = this,
		worker = this._nextWorker();

		//first pop the job from the database. 
		this._collection.popJob(function(err, job) {

			//job doesn't exist? Break the queue
			if(!job) {

				//flag that there are no jobs left
				self._noJobsLeft = true;

				//finish the worker
				return workerDone();
			}


			//run the current job with the target worker
			worker.runJob(job, function(err, response) {
				job.complete(err, response);
				workerDone();
			});

			//after pop, run until there are no more items
			runNextWorker();
		});


		function workerDone() {
			self._queuedHandlers.push(worker);
			runNextWorker();
		}

		function runNextWorker() {
			//continue to fetch jobs until
			//A. there are no more jobs
			//B. there are no queue handlers left
			self._fetching = false;
			self.fetchJobs();
		}
	},

	/**
 	 */

 	"onJob": function(jobHandler) {
 		return this._addJobHandler(jobHandlers.getHandler(jobHandler));
 	},

 	/**
 	 */

 	"_nextWorker": function() {
 		var worker;
 		while(worker = this._queuedHandlers.shift()) {
 			if(!worker.disposed) return worker;
 		}
 		return null;
 	},

 	/**
 	 */

 	"_addJobHandler": function(handler) {
 		var self = this;
 		this._queuedHandlers.push(handler);
 		this._fetchJobs();
 		return handler;
 	},

 	/**
 	 * puts a delay on the fetchJobs method
 	 */

 	"_fetchJobs": function() {
 		clearTimeout(this._fetchJobsTimeout);
 		this._fetchJobsTimeout = setTimeout(this.getMethod("fetchJobs"), 1);
 	},

 	/**
 	 */

 	"_timeout": function() {
 		var self = this;
 		this._collection.getTimeout(function(err, timeout) {
 			self._currentTimeout = setTimeout(function() {
 				self._noJobsLeft = false;
 				self._fetchJobs();
 			}, Math.min(timeout || self.defaultTimeout, self.defaultTimeout));
 		})
 	}
});