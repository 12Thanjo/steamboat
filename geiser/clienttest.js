var geiser = require('./index.js');

var client = geiser.client(12);
var str = "";
for(var i=0; i<9216;i++){
	str+="a";
}

client.send(Buffer.from(str));