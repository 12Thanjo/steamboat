var crypto = require('crypto');
var buffer = require('buffer');

var get_signature = function(string, secret){
	return crypto.createHmac('sha256', secret)
           .update(string)
           .digest('hex')
           .replace(/\=+$/, '');
}


module.exports = function(secret){

	this.sign = function(string){
        return string + "." + get_signature(string, secret);
	}

	this.unsign = function(cookie){
		var str = cookie.slice(0, cookie.lastIndexOf('.'))
		var check = this.sign(str, secret);
		var check_buffer = Buffer.from(check)
		var str_buffer = Buffer.alloc(check_buffer.length);

		str_buffer.write(cookie);
		return crypto.timingSafeEqual(check_buffer, str_buffer) ? str : false;
	}

	return this;
}