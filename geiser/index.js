var udp = require('dgram');
var Server = require("./server.js");
var Client = require('./client.js');
var Listener = require('./listener.js');

module.exports = {
	server: (port, config)=>{
		return new Server(port, config);
	},
	client: (port, config)=>{
		return new Client(port, config);
	},
	listener: (port, config)=>{
		return new Listener(port, config);
	}
}