var base          = require("./base"),
step              = require("step"),
mongoose          = require("mongoose"),
cashew	          = require("cashew"),
outcome           = require("outcome");


var Collection = base.Collection.extend({

	/**
	 */

	"__construct": function(connection, name) {

		this._queue      = connection._db.collection("jobs.queue." + name);
		this._failed     = connection._db.collection("jobs.failed." + name);
		this._idGen      = cashew.register("queue");
		this._name       = name;             
		this._queuedPops = [];


		this._queue.ensureIndex('jobId', function(){}); 

		this._staleTime  = 1000 * 60 * 60; //N minutes
		setInterval(this.getMethod("_resetStaleTasks"), 1000 * 60 * 10, 0);  
		this._resetStaleTasks(0);
	},

	/**
	 */

	"addJob": function(task, callback) {


		//job id could be set, or unique                          
		var self = this,
		jobId    = this._idGen.hash(this._group + (String(task._id || self._idGen.uid()))),
		sendAt   = task.sendAt;

		if(!sendAt) sendAt = Date.now();
		if(sendAt instanceof Date) sendAt = sendAt.getTime();

		function insert() {      

			var toInsert = { group: self._name, 
				sendAt: sendAt, 
				data: task.data, 
				state: 'queued', 
				jobId: jobId,
				createdAt: Date.now() };

			self._queue.insert(toInsert, callback);
		} 

		if(task._id) {


			this._queue.findOne({ jobId: jobId }, function(err, item) {
				
				if(item) {          
					var update = {};

					if(task.data) update.data = task.data;
					if(task.sendAt) update.sendAt = task.sendAt;



                	return self._queue.update({ _id: item._id }, { $set: update }, callback)
				}          

				insert();

			})
		} else {
			insert();
		}  
	},

	/**
	 */

	"updateJob": function(task, callback) {
		this._queue.update({ _id: task._id }, { $set: { state: 'queued', data: task.data }}, callback || function(){});
	},


	/**
	 */

	"getTimeout": function(next) {

		var since = Date.now();

		this._queue.findOne(this._queuedQuery(since), function(err, item) {
			if(!item) return next();
			return next(null, Math.max(since - item.sendAt, 0));
		})
	},

	/**
	 */

	"_popJob": function(callback) {

		//caught in the middle of popping? make it wait incase the same item is popped off.
		if(this._popping) {                                       
			return this._queuedPops.unshift(callback);
		}          

		this._popping = true;

		var self = this,
		now      = Date.now(),
		on       = outcome.error(callback);

		step(

			/**
			 * fetch the next job
			 */

			function() {
				self.next(now, this);
			},


			/**
			 * run the job
			 */

			on.success(function(task) {
				self._popping = false;
				callback(null, task);

				if(self._queuedPops.length) self._popJob(self._queuedPops.pop());
			})
		);

	},

	/**
	 * returns the next task
	 */

	'next': function(since, callback) {

		if(!callback) {

			callback = since;
			since = undefined;

		}        

		var sentAt = Date.now(), self = this;


		var query = {
			$set: {
				state: 'running',
				sentAt: Date.now()
			},
			$inc: {
				tries: 1,
				executions: 1
			}
		};         

		this._queue.findAndModify(this._queuedQuery(since), [['sendAt', 1]], query, function(err, item) {  

			callback(err, item);

		});    
	}, 

	/**
	 */

	'_resetStaleTasks': function(staleTime) {

		var search = { $or: [{ sentAt: undefined }, { sentAt: {$lt:  Date.now() - staleTime } }] , state: 'running' },
		self = this;



		self._queue.find(search, function(err, cursor) {

			cursor.count(function(err, count) {

				if(!count) return;

				// console.warn('Resetting %d stale workers', count);

				self._queue.update(search,  { $set: { sentAt: 0, state: 'queued' }}, { multi: true }, function(){});
			});

		});
	},

	/**
	 */


   	'_queuedQuery': function(since) {

		var search = { group: this._name, state: 'queued' };

		if(since) search.sendAt = { $lt: since || Date.now() };

		return search;

	},


	/**
	 */

	'_onJobComplete': function(job) {

		var self = this;

		step(

			function() {

				if(job.response.sendAt == undefined) return this();

				var toUpdate = { sendAt: job.response.sendAt instanceof Date ? job.response.sendAt.getTime() : job.response.sendAt, state: 'queued', tries: 0, responseAt: Date.now() };

				//set new data...
				if(job.response.data) toUpdate.data = job.response.data;


				self._queue.update({ _id: job._id }, { $set: toUpdate }, function() { });          
			},

			/**
			 * done? remove the job.
			 */

			function() {

				self._queue.remove({ _id: job._id }, function(){});

			}
		)
	}
})



module.exports = base.Transport.extend({

	/**
	 */

	"connect": function(ops) {
		if(ops.connection) {
			this._db = ops.connection;
			return;
		}

		this._db = mongoose.createConnection(ops.host);
	},

	/**
	 */

	"collection": function(name) {
		return new Collection(this, name);
	}
	
})