var structr = require("structr"),
jobHandlers = require("./jobHandlers"),
transports  = require("./transports"),
Queue       = require("./queue");


var Connection = structr({

	/**
	 */

	"__construct": function(ops) {
		this._queues = {};
		this._connection = transports.getTransport(ops);

	},

	/**
	 */

	"queue": function(name) {
		return this._queues[name] || (this._queues[name] = new Queue(this._connection.collection(name), name));
	}	
})





exports.addWorkerClass = jobHandlers.addWorkerClass;
exports.connect = function(ops) {
	return new Connection(ops);
}
