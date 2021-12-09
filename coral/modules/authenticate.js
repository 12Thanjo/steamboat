var database = include('db');
var crypto = require('crypto');

var authenticate = function(db, username, password, perm){
	var db = database.get(db);

	if(db == null || username == null || password == null || perm == null){
		return false; 
	}else{
		var user = db.users.get(username);
		var user_buffer = Buffer.from(user.password);
		var password_buffer = Buffer.from(password);
		if(user == null || !crypto.timingSafeEqual(user_buffer, password_buffer)){
			return false;
		}else if(user.perms[perm] == false){
			return false;
		}
	}

	return true;
}

var table_authenticate = function(db, table, username, password, perm){
	var db = database.get(db);
	var table = db.tables.get(table);
	if(table == null){
		return false;
	}else{
		var user = table.users.get(username);
		var user_buffer = Buffer.from(user.password);
		var password_buffer = Buffer.from(password);
		if(user == null || !crypto.timingSafeEqual(password_buffer, user_buffer)){
			return false;
		}else if(user.perms[perm] == false){
			return false;
		}
	}

	return true;
}




module.exports = {
	authenticate,
	table_authenticate
};