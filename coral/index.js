global.ferry = require('../ferry/index.js');
var crypto = require('crypto');
global.include = require('./include.js');

global.Responder = include('response');


var types = include('types');
var {authenticate, table_authenticate} = include('authenticate');
var database = include('db');
var permissions = include('perms');

/////////////////////////////////////////////////////////////////////////////

// assume authentication succeeded for all (it is done somewhere else)


var command = {
	read: function(db, table, where, responder){
		var target_db = database.get(db);
		var target_table = target_db.tables.get(table);

		var records = target_table.getRecords(where, responder);
		if(records != false){
			responder.success({
				type: "Table read",
				data: records
			})
		}
	},
	
	add: {
		user: {
			db: function(db, username, password, perms, responder){
				var target_db = database.get(db);
				if(!target_db.users.has(username)){
					target_db.addUser(username, password, permissions.build(perms), responder);
				}else{
					responder.fail(`User (${username}) already exists in database (${db})`);
				}
			},
			table: function(db, table, username, perms, responder){
				var target_db = database.get(db);
				var target_user = target_db.users.get(username);
				var target_table = target_db.tables.get(table);

				if(target_user){
					if(!target_table.users.has(username)){
						target_table.addUser(target_user, permissions.build(perms), responder);
					}else{
						responder.fail(`User (${username}) already exists in table (${table}) in database (${db})`);
					}
				}else{
					responder.fail(`User (${username}) does not exist in table (${db})`);
				}				
			}
		},

		db: function(name, password, responder){
			if(database.get(name) == null){
				new database.DB(name, password, responder);
			}else{
				responder.fail(`Database (${name}) already exists`);
			}
		},

		table: function(db, name, responder){
			var target_db = database.get(db);
			if(target_db.tables.get(name) == null){
				target_db.addTable(name, responder)
			}else{
				responder.fail(`Table (${name}) already exists in database (${db})`);
			}
		},

		column: function(db, table, name, type, config, responder){
			var target_db = database.get(db);
			var target_table = target_db.tables.get(table);

			if(!target_table.columns.has(name)){
				target_table.addColumn(name, type, config, responder);
			}else{
				responder.fail(`Column (${name}) already exists in table (${table}) in database (${db})`);
			}
		}
	},
	edit: function(db, table, where, edit, responder){
		var target_db = database.get(db);
		var target_table = target_db.tables.get(table);

		var records = target_table.edit(where, edit, responder);
	},
	insert: {
		single: function(db, table, data, responder){
			var target_db = database.get(db);
			var target_table = target_db.tables.get(table);

			var success = true;
			for(var key in data){
				var target_column = target_table.columns.get(key);
				if(target_column != null){
					var val = data[key];
					if(!target_column.type.validator(val)){
						responder.fail(`Recieved type (${typeOf(val)}) for column (${target_column.name}) in table (${table}) in database (${db}) [expected type (${target_column.type.name})]`);
						success = false;
					}
				}else{
					responder.fail(`Column (${name}) does not exist in table (${table}) in database (${db})`);
					break;
				}
			}

			if(success){
				target_table.insertSingle(data, responder);
			}
		},
		multiple: function(db, table, data, responder){
			var target_db = database.get(db);
			var target_table = target_db.tables.get(table);

			target_table.insertMultiple(data, responder);
		}
	},

	remove: function(db, table, where, responder){
		var target_db = database.get(db);
		var target_table = target_db.tables.get(table);

		var records = target_table.delete(where, responder);
	},


	delete: {
		db: function(){
			
		},
		table: function(){
			
		}
	}
}




//////////////////////////////////////////////////////////////////////////////////////////////////

var nodehp = require('nodehp');

var admin = require('../ferry/index.js');

admin.middleware((req, res)=>{
	res.cors();
	res.nodehp = function(path, data){
		var page = nodehp(path, data);
		res.send(page);
	}
});


admin.get([''], (req, res)=>{
	if(req.session.auth == null){
		res.redirect("http://" + req.host + "/login");
	}else{
		var memory_used = process.memoryUsage().heapUsed / 1024 / 1024;
		res.nodehp('./admin/index.nodehp', {
			session: req.session,
			memoryUsage: (Math.round(memory_used * 100) / 100) + "MB",
			database: database
		});
	}
});

admin.get(['login'], (req, res)=>{
	res.nodehp("./admin/login.nodehp", {});
});

admin.post(['login'], (req, res)=>{
	req.session.auth = {
		username: req.body.username,
		password: req.body.password
	}
	res.redirect("http://localhost:4440/");
});

admin.get(['meta'], (req, res)=>{
	var memory_used = process.memoryUsage().heapUsed / 1024 / 1024;
	res.sendJSON({
		engine: "coral",
		memoryUsage: (Math.round(memory_used * 100) / 100) + "MB"
	});
});

admin.start(4440, {
	cookieSecret: "ferry_secret"
});



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// API

ferry.middleware((req, res)=>{
	res.cors();
});



ferry.post(['new', 'db'], (req, res)=>{
	if(
		req.body.name != null &&
		req.body.password != null
	){
		var responder = new Responder(req, res);
		try{
			command.add.db(req.body.name, req.body.password, responder);
		}catch(e){
			responder.fail(e);
		}
	}else{
		ferry.error['400'](req, res);
	}
});


ferry.get(['get', 'db'], (req, res)=>{
	var output = {};
	database.forEach((db)=>{
		var add = {
			users: [],
			tables: []
		};
		db.users.forEach((user)=>{
			add.users.push(user);
		});

		db.tables.forEach((table)=>{
			add.tables.push(table.export());
		});

		output[db.name] = add;
	});
	res.sendJSON(output);
});



ferry.subdir(['db', 'add'], (req, res)=>{
	var body = req.body;
	return authenticate(body.db, body.auth.username, body.auth.password, "modify");
});

////////////////////////////////////////////
// db add
ferry.post(['db', 'add', 'user'], (req, res)=>{
	var body = req.body;
	command.add.user.db(body.db, body.username, body.password, body.perms, new Responder(req, res));
});

ferry.post(['db', 'add', 'table'], (req, res)=>{
	var body = req.body;
	command.add.table(body.db, body.table, new Responder(req, res));
});

////////////////////////////////////////////
// table add
ferry.subdir(["table", 'add'], (req, res)=>{
	var body = req.body;
	return table_authenticate(body.db, body.table, body.auth.username, body.auth.password, 'modify');
});

ferry.post(['table', 'add', 'user'], (req, res)=>{
	var body = req.body;
	command.add.user.table(body.db, body.table, body.username, body.perms, new Responder(req, res));
});

ferry.post(['table', 'add', 'column'], (req, res)=>{
	var body = req.body;
	command.add.column(body.db, body.table, body.name, body.type, body.config, new Responder(req, res));
});

////////////////////////////////////////////
// table insert
ferry.post(['table', 'insert'], (req, res)=>{
	var body = req.body;
	var authenticated = table_authenticate(body.db, body.table, body.auth.username, body.auth.password, 'insert');
	if(authenticated){
		if(typeOf(body.data) == "object"){
			command.insert.single(body.db, body.table, body.data, new Responder(req, res));
		}else{
			command.insert.multiple(body.db, body.table, body.data, new Responder(req, res));
		}
	}else{
		ferry.error['403'](req, res);
	}
});


////////////////////////////////////////////
// table read
ferry.post(['table', 'read'], (req, res)=>{
	var body = req.body;
	var authenticated = table_authenticate(body.db, body.table, body.auth.username, body.auth.password, 'insert');
	if(authenticated){
		command.read(body.db, body.table, body.where, new Responder(req, res));
	}else{
		ferry.error['403'](req, res);
	}
});


////////////////////////////////////////////
// table edit
ferry.post(['table', 'edit'], (req, res)=>{
	var body = req.body;
	var authenticated = table_authenticate(body.db, body.table, body.auth.username, body.auth.password, 'edit');
	if(authenticated){
		command.edit(body.db, body.table, body.where, body.edit, new Responder(req, res));
	}else{
		ferry.error['403'](req, res);
	}
});


////////////////////////////////////////////
// table remove
ferry.post(['table', 'remove'], (req, res)=>{
	var body = req.body;
	var authenticated = table_authenticate(body.db, body.table, body.auth.username, body.auth.password, 'remove');
	if(authenticated){
		command.remove(body.db, body.table, body.where, new Responder(req, res));
	}else{
		ferry.error['403'](req, res);
	}
});


//////////////////////////////////////////////////////////////////////////////////////////////////



ferry.error['403'] = function(req, res){
	res.statusCode = 403;
	res.sendJSON({
		error: '403',
		message: `Forbidden Access Attempt: ${req.method} ${req.path}`
	});
	ferry.log.warning(`Forbidden Access Attempt: ${req.method} ${req.path}`);
}

ferry.error['404'] = function(req, res){
	res.statusCode = 404;
	res.sendJSON({
		error: '404',
		message: `Cannot get path: ${req.method} ${req.path}`
	});
	ferry.log.info(`Cannot get path: ${req.method} ${req.path}`);
}


ferry.start(4400, {
	cookieSecret: '',
	useSession: false
});



