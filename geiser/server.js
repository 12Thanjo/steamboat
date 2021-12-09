var udp = require('dgram');
var time = require("virtuosity-server");




class Server{

	constructor(port){

		this.port = port;
		this.socket = udp.createSocket('udp4');		


		this.socket.on('error', (e)=>{
			console.log(e);
			this.socket.close();
		});

		// socket init
		this.socket.on('listening', ()=>{
			var address = this.socket.address();
			console.log(`Server is listening at port: ${address.port}`);
			console.log(`Server IP: ${address.address}`);
			console.log(`Server is IP4/IP6: ${address.family}`);
		});

		this.socket.on('message', (msg, info)=>{
			console.log('message: ', msg);
			console.log("info: ", info);
		});

		this.socket.on('close',function(){
			console.log('Server closed');
		});


		this.socket.bind(this.port);
	}

	send(port, message){
		this.socket.send(JSON.stringify(message), port, 'localhost', (e)=>{
			if(e){
				this.log("Error: ", e);
				this.socket.close();
			}
		});	
	}
}


module.exports = Server;