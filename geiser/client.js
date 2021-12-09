var udp = require('dgram');

class Client{

	constructor(port){	
		this.port = port;
		this.socket = udp.createSocket('udp4');		

		this.socket.on('message', (msg, info)=>{
			console.log('message: ', msg);
			console.log("info: ", info);
		});
	}

	send(message){
		this.socket.send(message, this.port, 'localhost', (e)=>{
			console.log("error: ", e);
		});
	}

}

module.exports = Client;