var uuid4 = require('../uuid4.js');
var crypto = require('crypto');
var {time, files} = require("virtuosity-server");

var sessions = new Map();
class Session{

	constructor(lifetime){
		this.uuid = uuid4();
		this.data = {};
		this.generate_csrf();
		sessions.set(this.uuid, this);

		// this.lifetime = lifetime
		// this.life_timer = new time.AdvancedTimer(this.lifetime, ()=>{
		// 	this.delete();
		// });
	}

	generate_csrf(){
		return this.csrf = crypto.randomBytes(64).toString('hex');
	}

	checkout(){
		// this.life_timer.restart();
	}

	delete(){
		this.life_timer.stop();
		sessions.delete(this.uuid);
	}
}

module.exports = {
	Session: Session,
	get: function(uuid){
		return sessions.get(uuid);
	},
	check_csrf: function(session, csrf){
		session_buffer = Buffer.from(session.csrf);
		csrf_buffer = Buffer.from(csrf);
		return crypto.timingSafeEqual(session_buffer, csrf_buffer);
	}
};