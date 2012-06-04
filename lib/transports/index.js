var base = require("./base");

exports.BaseTransport = base.Transport;
exports.BaseCollection = base.Collection;


var availableTransportClasses = {
	"mongo": require("./mongo")
}


exports.addTransportClass = function(type, clazz) {
	availableTransportClasses[type] = clazz;
};


exports.getTransport = function(data) {
	return new availableTransportClasses[data.type](data);
}