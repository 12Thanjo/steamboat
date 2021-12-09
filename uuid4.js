var crypto = require('crypto');

var regex = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
var validate = function(uuid){
	return typeof uuid == "string" && regex.test(uuid);
}

// stringify
var byte_to_hex = [];
for(var i=0; i<256;i++){
	byte_to_hex.push((i + 0x100).toString(16).substr(1));
}
var stringify = function(arr){
	var uuid = (
	    byte_to_hex[arr[0]] +
	    byte_to_hex[arr[1]] +
	    byte_to_hex[arr[2]] +
	    byte_to_hex[arr[3]] +
	    '-' +
	    byte_to_hex[arr[4]] +
	    byte_to_hex[arr[5]] +
	    '-' +
	    byte_to_hex[arr[6]] +
	    byte_to_hex[arr[7]] +
	    '-' +
	    byte_to_hex[arr[8]] +
	    byte_to_hex[arr[9]] +
	    '-' +
	    byte_to_hex[arr[10]] +
	    byte_to_hex[arr[11]] +
	    byte_to_hex[arr[12]] +
	    byte_to_hex[arr[13]] +
	    byte_to_hex[arr[14]] +
	    byte_to_hex[arr[15]]
	).toLowerCase();

	if(!validate(uuid)){
		throw TypeError('stringify created an Invalid UUID');
	}

	return uuid;
}



var u_int_8_array = new Uint8Array(256);
var pool_prt = u_int_8_array.length;
var rng = function(){
	if (pool_prt > u_int_8_array.length - 16) {
		crypto.randomFillSync(u_int_8_array);
		pool_prt = 0;
	}

	return u_int_8_array.slice(pool_prt, (pool_prt += 16));
}


var v4 = function(options, buf, offset){
	var rnds = rng();
	rnds[6] = (rnds[6] & 0x0f) | 0x40;
	rnds[8] = (rnds[8] & 0x3f) | 0x80;


	return stringify(rnds);
}


module.exports = v4;
