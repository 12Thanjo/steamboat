var ADMIN = {
	username: "admin",
	password: "asdf"
}

var FOO = {
	username: "foo",
	password: "bar",
}


var DATABASE = "name_of_db";
var TABLE = "name_of_table";

////////////////////////////////////////////////////////////////////////////////////

var next = function(response, callback){
	if(callback != null){
		callback(response);
	}
}

var next_print = function(response, callback){
	try{
		console.log(JSON.parse(response));
		console.log();
	}catch(e){
		console.log("--Ummmmm--: ", response);
		console.log();
	}

	if(callback != null){
		callback(response);
	}
}


var post = function(path, body, callback, print){
	canal.post('localhost', '4400', path, {}, body)
		.then((response)=>{
			if(print == true){
				next_print(response, callback);
			}else{
				next(response, callback);
			}
		})
		.catch((err)=>{
			console.log(err);
		})
}

////////////////////////////////////////////////////////////////////////////////////

const canal = require('./canal/index.js')();


create_new_database = function(callback){
	var body = {
		name: 'name_of_db',
		password: ADMIN.password
	}


	post('/new/db', body, callback);
}


add_user_to_database = function(callback){
	var body = {
		auth: ADMIN,
		db: DATABASE,
		...FOO,
		perms: {
			read: false,
			modify: false
		}
	}

	post('/db/add/user', body, callback);
}

create_new_table = function(callback){
	var body = {
		auth: ADMIN,
		db: DATABASE,
		table: TABLE
	}

	post('/db/add/table', body, callback);
}


no_auth_create_new_table = function(callback){
	var body = {
		auth: FOO,
		db: DATABASE,
		table: "foos_table"
	}

	post('/db/add/table', body, callback);
}


add_user_to_table = function(callback){
	var body = {
		auth: ADMIN,
		db: DATABASE,
		table: TABLE,
		username: "foo",
		perms: {
			read: false,
			modify: false,
			edit: false,
			insert: false,
			remove: false
		}
	}

	post("/table/add/user", body, callback);
}


add_collumns_to_table = function(callback){
	var body = {
		auth: ADMIN,
		db: DATABASE,
		table: TABLE,
		name: "name",
		type: "string",
		config: {
			// nullish: false
			unique: true,
			// speed: false
		}
	};

	post('/table/add/collumn', body, ()=>{
		body.name = "id";
		body.type = "number";
		body.config = {
			// unique: true
		}
		post('/table/add/collumn', body, callback);
	});	
}

insert = function(callback){
	var body = {
		auth: ADMIN,
		db: DATABASE,
		table: TABLE,
		data: [
			{
				name: "12Thanjo",
				id: 12
			},
			{
				name: "GiganticIrony",
				id: 12
			}
		]
	}

	console.log("--- Begin Generating");
	for(var i=0; i<4e6;i++){
		body.data.push({
			name: Math.random().toString(36).substring(4),
			id: Math.random() * 15
		})
	}

	console.log("===> send");
	post('/table/insert', body, callback, true);
}


read = function(callback){
	var body = {
		auth: ADMIN,
		db: DATABASE,
		table: TABLE,
		where: [
			// ['id', ">", -1]
			["id", '>', 11.9999],
			['id', "<=", 12]
		]
	}

	post('/table/read', body, callback, true);
}



edit = function(callback){
	var body = {
		auth: ADMIN,
		db: DATABASE,
		table: TABLE,
		where: [
			["name", 'is', "GiganticIrony"]
		],
		edit: {
			name: 'New Name'
		}
	}

	post('/table/edit', body, callback, true);
}


remove = function(callback){
	var body = {
		auth: ADMIN,
		db: DATABASE,
		table: TABLE,
		where: [
			["name", 'is', "GiganticIrony"]
		]
	}

	post('/table/remove', body, callback, true);
}

////////////////////////////////////////////////////////////////////////////////////


create_new_database(()=>{
	add_user_to_database(()=>{
		create_new_table(()=>{
			add_user_to_table(()=>{
				add_collumns_to_table(()=>{
					insert(()=>{
						read(()=>{
							remove(()=>{});
						})
					});
				});
			});
		});
	});
});


















