var User = include('user');
var perms = include('perms');
var types = include('types');
var Conditional = include('conditional');

class Column{
	constructor(name, type, config){
		this.name = name;
		this.type = types[type];
		this.nullish = config.nullish ?? true;
		this.unique = config.unique ?? false;

		config.speed = config.speed ?? true;
		if(config.speed && this.unique){
			this.speed_map = new Map();
		}
	}

	check(val){
		if(val == null){
			return this.nullish;
		}else{
			return this.type.validator(val);
		}
	}
}




class Table{

	constructor(name, db_name){
		this.name = name;
		this.users = new Map();
		this.columns = new Map();
		this.records = new Map();
		this.db_name = db_name;


		this.i = -1;
		this.index = function(){
			this.i += 1;
			return this.i;
		}
	}

	addUser(db_user, perms, responder){
		var new_user = new User(db_user.name, db_user.password, perms);
		this.users.set(db_user.name, new_user);
		if(responder != null){
			responder.success({
				type: "Table User",
				added: db_user.name
			});
			ferry.log.info(`Created new User (${db_user.name}) in table (${this.name}) in database (${this.db_name})`);	
		}
	}

	addColumn(name, type, config, responder){
		if(types[type] != null){
			this.columns.set(name, new Column(name, type, config));
			responder.success({
				type: "Table Column",
				added: name
			});
			ferry.log.info(`Created new Column (${name}) in table (${this.name}) in database (${this.db_name})`);
		}else{
			responder.fail(`(${type}) is an invalid column type`);
		}
	}

	// addColumns(arr){
	// 	arr.forEach((column)=>{
	// 		this.addColumn(column.name, column.type, column.config);
	// 	});
	// }

	#insert(data){
		var index = this.index();
		var add = {};

		var success = true;
		var error;
		this.columns.forEach((column)=>{
			var val = data[column.name];
			if(val == null){
				if(column.nullish){
					val = null;
				}else{
					success = false;
					error = {
						status: "fail",
						data: `(${column.name}) in table (${this.name}) in database (${this.db_name}) is not nullish`
					}
					
				}
			}

			if(column.unique){
				if(column.speed_map != null){
					if(column.speed_map.has(val)){
						success = false;
						error = {
							status: "fail",
							data: `Value (${val}) already exists in column (${column.name}) in table (${this.name}) in database (${this.db_name})`
						}
					}else{
						column.speed_map.set(val, index);
						add[column.name] = val;
					}
				}else{
					for(var [key, value] of this.records.entries()){
						if(value[column.name] == val){
							success = false;
							error = {
								status: "fail",
								data: `Value (${val}) already exists in column (${column.name}) in table (${this.name}) in database (${this.db_name})`
							}
							break;
						}
					}
					if(success){
						add[column.name] = val;
					}
				}
			}else{
				add[column.name] = val;
			}
		});

		if(success){
			this.records.set(index, add);
			return {
				status: "success",
				data: {
					type: "Table Insert",
					index: index
				}
			}
		}else{
			return error;
		}
	}


	insertSingle(data, responder){
		var insert = this.#insert(data);

		responder[insert.status](insert.data);
	}


	insertMultiple(data, responder){
		var insert_arr_failed = false;
		for(var i = data.length - 1; i>=0; i--){
			var entry = data[i];
			var insert_success = true;

			for(var key in entry){
				var target_column = this.columns.get(key);
				if(target_column != null){
					var val = entry[key];
					if(!target_column.type.validator(val)){
						responder.fail(`Recieved type (${typeOf(val)}) for column (${target_column.name}) in table (${this.name}) in database (${this.db_name}) [expected type (${target_column.type.name})]`);
						insert_success = false;
						break;
					}
				}else{
					responder.fail(`Column (${target_column.name}) does not exist in table (${this.name}) in database (${this.db_name})`);
					insert_success = false;
					break;
				}
			}

			if(insert_success){
				var insert = this.#insert(entry);
				if(insert.status == "fail"){
					responder.fail(insert.data);
				}
			}else{
				insert_arr_failed = true;
				break;
			}
		}

		if(!insert_arr_failed){
			responder.success({
				type: "Table Insert Multiple",
				index_low: this.i - data.length + 1,
				index_high: this.i
			});
		}
	}

	getRecords(where, responder){
		var output = [];
		if(where != null){
			var complete = this.#itterateRecords(where, responder, (record)=>{
				output.push(record);
			});
			if(complete){
				return output;
			}else{
				return false;
			}
		}else{
			this.records.forEach((record)=>{
				output.push(record);
			});
			return output;
		}
	}


	#itterateRecords(where, responder, event){
		var conditionals = [];
		var fail = false;

		var unique;
		where.forEach((arr)=>{
			var column = this.columns.has(arr[0]);
			if(column){
				if(!column.unique){
					conditionals.push(new Conditional(arr[0], arr[1], arr[2]));
				}else{
					unique = {
						column: column,
						value: arr[2]
					};
				}
			}else{
				responder.fail(`Column (${arr[0]}) does not exist in table (${this.name}) in database (${this.db_name})`);
				fail = true;
			}
		});


		if(!fail){
			if(unique == null){
				// no columns that are unique
				for(var [key, value] of this.records.entries()){
					var push = true;
					for(var i = conditionals.length - 1; i>=0; i--){
						if(!conditionals[i].compare(value)){
							push = false;
							break;
						}
					}

					if(push){
						event(value, key);
					}
				}

				return true;
			}else{
				event(column.speed_map.get(unique.value));
				return true;
			}
		}else{
			return false;
		}
	}


	edit(where, edit, responder){
		var fail = false;
		for(var key in edit){
			var column = this.columns.get(key);
			if(column){
				if(!column.type.validator(edit[key])){
					responder.fail(`Recieved type (${typeOf(edit[key])}) for column (${column.name}) in table (${this.name}) in database (${this.db_name}) [expected type (${column.type.name})]`);
					fail = true;
				}
			}else{
				responder.fail(`Column (${key}) does not exist in table (${this.name}) in database (${this.db_name})`);
				fail = true;
			}
		}

		if(!fail){
			var i = 0;
			var complete = this.#itterateRecords(where, responder, (record)=>{
				i += 1;
				for(var key in edit){
					record[key] = edit[key];
				}
			});

			if(complete){
				responder.success({
					type: "table edit",
					db: this.db_name,
					table: this.name,
					edited: i
				})
			}else{
				responder.fail('edit fail');
			}
		}
	}


	delete(where, responder){
		if(where != null){
			var unique_columns = [];
			this.columns.forEach((column)=>{
				if(column.speed_map != null){
					unique_columns.push(column);
				}
			});


			var i = 0;
			var complete = this.#itterateRecords(where, responder, (record, key)=>{
				i += 1;
				unique_columns.forEach((column)=>{
					column.speed_map.delete(record[column.name]);
				});
				this.records.delete(key);
			});
			if(complete){
				responder.success({
					type: "table delete",
					db: this.db_name,
					table: this.name,
					deleted: i
				});
			}
		}else{
			this.records.forEach((record)=>{
				output.push(record);
			});
			return output;
		}
	}




	export(){
		var output = {
			name: this.name,
			users: [],
			columns: [],
			records: []
		};

		this.users.forEach((user)=>{
			output.users.push(user);
		});

		this.columns.forEach((column)=>{
			output.columns.push({
				...column,
				type: column.type.name,
			});
		});

		this.records.forEach((record)=>{
			output.records.push(record);
		});

		return output;
	}
}


module.exports = Table;