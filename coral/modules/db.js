var perms = include("perms");
var User = include("user");
var Table = include('table');


var DBs = new Map();
class DB{

	constructor(name, admin_password, responder){
		this.name = name;
		this.users = new Map();
		this.tables = new Map();
		this.addUser("admin", admin_password, new perms.Perms(true, true));
		DBs.set(this.name, this);

		responder.success({
			type: "DB",
			created: this.name
		});
		ferry.log.info(`Created new database (${name})`);
	}

	addUser(name, password, perms, responder){
		this.users.set(name, new User(name, password, {
			read: perms.read,
			modify: perms.modify
		}));
		if(responder != null){
			ferry.log.info(`Created new user (${name}) in database (${this.name})`);
			responder.success({
				type: "DB User",
				created: name
			});
		}
	}

	addTable(name, responder){
		var new_table = new Table(name, this.name);
		new_table.addUser(this.users.get('admin'), new perms.Perms(true, true, true, true, true));
		this.tables.set(name, new_table);
		ferry.log.info(`Created new Table (${name}) in database (${this.name})`);
		responder.success({
			type: "table",
			created: name
		});
	}
}



module.exports = {
	DB,
	get: function(name){
		return DBs.get(name);
	},
	forEach: function(event){
		DBs.forEach((DB)=>{
			event(DB);
		});
	}
};