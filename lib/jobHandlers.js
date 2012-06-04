var structr = require("structr"),
fs = require("fs"),
EventEmitter = require("events");


/** 
 * base job handler class
 */

var JobHandlerBase = exports.Base = structr(EventEmitter, {

	/**
	 */

	"override __construct": function(rawHandler) {
		this._handler = rawHandler
	},


	/**
	 */

	"dispose": function() {
		this.disposed = true;
		this.emit("dispose");	
	},

	/**
	 */

	"abstract runJob": function(job, onComplete) {}
});

/**
 * function job handler
 */

var FnJobHandler = JobHandlerBase.extend({

	/**
	 */

	"runJob": function(job, onComplete) {
		this._handler(job, onComplete);
	},

	/**
	 */

	"static test": function(handler) {
		return typeof handler == "function";
	}
});


/**
 * process job handler
 */

var SpawnedJobHandler = JobHandlerBase.extend({

	/**
	 */

	"runJob": function() {
		throw new Error("not implemented yet");
	},

	/**
	 */

	"static test": function(handler) {

		try {
			return typeof handler == "string" && fs.lstatSync(handler)
		} catch(e) {
			return false;
		}
	}
})


var workerClasses = [
	FnJobHandler,
	SpawnedJobHandler
];

/**
 * expose to make extendable
 */


exports.addWorkerClass = function(clazz) {
	workerClasses.push(clazz);
}

/**
 * factory
 */

exports.getHandler = function(rawHandler) {

	for(var i = workerClasses.length; i--;) {
		var clazz = workerClasses[i];
		if(clazz.test(rawHandler)) return new clazz(rawHandler);
	}
}