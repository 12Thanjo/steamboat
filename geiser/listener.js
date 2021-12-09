var udp = require('dgram');

var log = function(message){
	console.log(`%c Steamboat: ${message} `, "background-color: #000080; color: #cccccc; font-family: 'american typewriter';");
}

var error = function(message){
	console.log(`%c Steamboat: ${message} `, "background-color: #771111; color: #cccccc; font-family: 'american typewriter';");
}

var fatal = function(message){
	throw new Error("Steamboat Fatal Error: ", message);
}

class Listener{
	#socket;
	#port;
	constructor(port, config){
		this.#port = port;
		Object.defineProperty(this,"port",{get:()=>{return this.#port;}});
		this.#socket = udp.createSocket('udp4');		
		Object.defineProperty(this,"socket",{get:()=>{return this.#socket;}});

		this.message = (msg, info)=>{
			log(msg, info);
		}

		this.#socket.on('message', (msg, info)=>{
			this.message(msg, info);
		});
	}

	close(){
		this.#socket.close();
	}
}

module.exports = Listener;