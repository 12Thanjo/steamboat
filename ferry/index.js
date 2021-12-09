var {cmd, files} = require("virtuosity-server");
var cookies_lib = require('./cookies.js');
var sessions = require('./sessions.js');

var site_map = new Map();
var middlewares = [];
var afterwares = [];

// logging write streams
// var operation_init = files.readFile(__dirname + "/persistance/operation.log"); 
// var operation_stream = new files.WriteStream(__dirname + "/persistance/operation.log");
// operation_stream.write(operation_init);

// var info_init = files.readFile(__dirname + "/persistance/info.log"); 
// var info_stream = new files.WriteStream(__dirname + "/persistance/info.log");
// info_stream.write(info_init);

// var warning_init = files.readFile(__dirname + "/persistance/warning.log"); 
// var warning_stream = new files.WriteStream(__dirname + "/persistance/warning.log");
// warning_stream.write(warning_init);

// var error_init = files.readFile(__dirname + "/persistance/error.log"); 
// var error_stream = new files.WriteStream(__dirname + "/persistance/error.log");
// error_stream.write(error_init);

// var all_init = files.readFile(__dirname + "/persistance/all.log");
// var all_stream = new files.WriteStream(__dirname + "/persistance/all.log");
// all_stream.write(all_init);



class SubDir{

	constructor(callback){
		this.callback = callback;
		this.children = new Map();
	}
}

class Dir{

	constructor(){
		this.events = new Map();
	}
}


var log_builder = function(type, message){
	return {
		type: type,
		message: message,
		timestamp: new Date().toUTCString()
	};
}


var setup_dir = function(method, path, callback){
	if(path instanceof Array){
		var target = site_map;
		for(var i=0; i<path.length-1;i++){
			if(!target.has(path[i])){
				target.set(path[i], new SubDir(()=>{}));
			}
			target = target.get(path[i]).children;
		}
		if(!target.has(path[path.length-1])){
			target.set(path[path.length-1], new Dir());
		}

		target.get(path[path.length-1]).events.set(method, callback);
	}else{
		throw Error(`Paths must be in array format (${path})`);
	}
}


var create_error_string = function(code, status, message, req){
	return `<h1><b>${code}</b> ${status}</h1><p>${message}: ${req.method} ${req.path}</p>`;
}


module.exports = {
	start: function(port, config){
		var PORT = port;
		var cookies = cookies_lib(config.cookieSecret);

		var waterfall = require('../waterfall/index.js')(PORT);
		module.exports.log.operation(`Server started on port: ${PORT}`);

		config.useSession = config.useSession ?? true;
		config.rejectInvalidCookies = config.rejectInvalidCookies ?? true;
		config.rejectInvalidSessions = config.rejectInvalidSessions ?? false;


		waterfall.setHandler((req, res)=>{
			// cookies
			for(var key in req.cookies){
				var parsed = cookies.unsign(req.cookies[key]);
				if(parsed){//false means its an invalid signature
					req.cookies[key] = parsed;
					if(!config.useSession || (key != "|--SESSION--|" && key != "|--CSRF--|") ){
						// if using session, dont want to add the session and csrf until after (don't expose it)
						res.cookies.set(key, parsed);
					}else{
						res.cookies.destroy(key);
					}
				}else if(config.rejectInvalidCookies){
					res.cookies.delete(key);
					delete req.cookies[key];
				}
			}

			delete res.cookies.destroy;

			// sessions
			var session;
			if(config.useSession){
				var create = true;
				if(req.cookies['|--SESSION--|'] != null){
					var session = sessions.get(req.cookies['|--SESSION--|']);
					if(session){
						create = false;
						req.session = session.data;
						session = session;
						if(!sessions.check_csrf(session, req.cookies['|--CSRF--|'])){
							module.exports.log.warning(`Someone with an incorrect csrf attempted to connect (uuid: ${req.cookies['|--SESSION--|']}, csrf: ${req.cookies['|--SESSION--|']})`);
							create = !config.rejectInvalidSessions;
						}
					}else{
						module.exports.log.warning(`Someone with an invalid session uuid attempted to connect (${req.cookies['|--SESSION--|']})`);
						create = !config.rejectInvalidSessions;
					}
				}

				if(create){
					var new_session = new sessions.Session();
					req.session = new_session.data;
					module.exports.log.info(`Created a new session | uuid: ${new_session.uuid}`);
					session = new_session;
				}

				delete req.cookies['|--SESSION--|'];
			}

			if(!config.useSession || session != null){
				middlewares.forEach((middleware)=>{
					middleware(req, res);
				});

				var paths_arr = req.path.split('/');
				paths_arr.splice(0,1);

				var cont = true;;

				var target = site_map;
				var l = paths_arr.length-1;
				for(var i=0; i<l;i++){
					if( target.has(paths_arr[i]) ){
						var target = target.get(paths_arr[i]);
						try{
							var callback = target.callback(req, res);
							if(callback == null || callback == true){
								target = target.children;
							}else if(callback.error != null && callback.message != null){
								module.exports.error[callback.error](req, res, callback.message);
								cont = false;
								break;
							}else{
								module.exports.error['403'](req, res);
								cont = false;
								break;
							}
						}catch(e){
							module.exports.error['500'](req, res, e.message + " | " + e.stack);
							cont = false;
						}
					}else{
						module.exports.error['404'](req, res);
						cont = false;
						break;
					}
				}


				if(cont){
					var target = target.get(paths_arr[paths_arr.length-1]);
					if(target != null && target instanceof Dir){
						var event = target.events.get(req.method);
						if(event != null){
							try{
								event(req, res);
							}catch(e){
								module.exports.error['500'](req, res, e.message + " | " + e.stack);
							}
						}else{
							module.exports.error['406'](req, res);
						}
					}else{
						module.exports.error['404'](req, res);
					}
				}


				afterwares.forEach((afterware)=>{
					afterware(req, res);
				});

				if(config.useSession){
					res.cookies.set("|--SESSION--|", session.uuid);
					res.cookies.set("|--CSRF--|", session.generate_csrf());
				}

				// sign cookies
				var cookie_list = res.cookies.print();
				for(var key in cookie_list){
					res.cookies.set(key, cookies.sign(cookie_list[key]));
				}
			}
		});
	},
	middleware: function(event){
		middlewares.push(event);
	},
	afterware: function(event){
		afterwares.push(event)
	},

	get: function(path, callback){
		setup_dir("GET", path, callback);
	},
	post: function(path, callback){
		setup_dir("POST", path, callback);
	},
	delete: function(path, callback){
		setup_dir("DELETE", path, callback);
	},
	put: function(path, callback){
		setup_dir("PUT", path, callback);
	},
	options: function(path, callback){
		setup_dir("OPTIONS", path, callback);
	},
	patch: function(path, callback){
		setup_dir("PATCH", path, callback);
	},
	on: function(method, path, callback){
		setup_dir(method, path, callback);
	},


	subdir: function(path, callback){
		if(path instanceof Array){
			var target = site_map;
			for(var i=0; i<path.length-1;i++){
				if(!target.has(path[i])){
					target.set(path[i], new SubDir(()=>{return true}));
					
				}
				target = target.get(path[i]).children;
			}
			target.set(path[path.length-1], new SubDir(callback));
		}else{
			throw Error(`Paths must be in array format (${path})`);
		}
	},
	

	log: {
		operation: function(message){
			var log = log_builder("operation", message);
			var mode = module.exports.log.mode.operation;
			if(mode == "full"){
				cmd.log(JSON.stringify(log), cmd.color.green);
			}else if(mode == "verbose"){
				cmd.log(message, cmd.color.green);
			}else if(mode != "silent"){
				throw Error(`operation log is set to an invalid mode.\nGot(${mode})\nSupported modes are: "verbose", "debug", "silent"`);
			}
			var str = JSON.stringify(log);
			// operation_stream.write(str + "\n");
			// all_stream.write(str + "\n");
		},
		info: function(message){
			var log = log_builder("info", message);
			var mode = module.exports.log.mode.info;
			if(mode == "full"){
				cmd.log(JSON.stringify(log), cmd.color.cyan);
			}else if(mode == "verbose"){
				cmd.log(message, cmd.color.cyan);
			}else if(mode != "silent"){
				throw Error(`info log is set to an invalid mode.\nGot(${mode})\nSupported modes are: "verbose", "debug", "silent"`);
			}
			var str = JSON.stringify(log);
			// info_stream.write(str + "\n");
			// all_stream.write(str + "\n");
		},
		warning: function(message){
			var log = log_builder("warning", message);
			var mode = module.exports.log.mode.warning;
			if(mode == "full"){
				cmd.log(JSON.stringify(log), cmd.color.yellow);
			}else if(mode == "verbose"){
				cmd.log(message, cmd.color.yellow);
			}else if(mode != "silent"){
				throw Error(`warning log is set to an invalid mode.\nGot(${mode})\nSupported modes are: "verbose", "debug", "silent"`);
			}
			var str = JSON.stringify(log);
			// warning_stream.write(str + "\n");
			// all_stream.write(str + "\n");
		},
		error: function(message){
			var log = log_builder("error", message);
			var mode = module.exports.log.mode.error;
			if(mode == "full"){
				cmd.log(JSON.stringify(log), cmd.color.red);
			}else if(mode == "verbose"){
				cmd.log(message, cmd.color.red);
			}else if(mode != "silent"){
				throw Error(`error log is set to an invalid mode.\nGot(${mode})\nSupported modes are: "verbose", "debug", "silent"`);
			}
			var str = JSON.stringify(log);
			// error_stream.write(str + "\n");
			// all_stream.write(str + "\n");
		},
		mode: {
			operation: "verbose",
			info: "verbose",
			warning: "verbose",
			error: "verbose"
		}
	},

	error: {
		'400': function(req, res){
			res.send(create_error_string(400, "Bad Request", "Bad Request", req));
			res.statusCode = 400;
			module.exports.log.warning(`400 - Bad Request: ${req.method} ${req.path}`);
		},
		'401': function(req, res){
			res.send(create_error_string(401, "Unauthorized", "Unauthorized Access", req));
			res.statusCode = 401;
			module.exports.log.warning(`401 - Unauthorized Access Attempt: ${req.method} ${req.path}`);
		},
		'403': function(req, res){
			res.send(create_error_string(403, "Forbidden", "Forbidden Access", req));
			res.statusCode = 403;
			module.exports.log.warning(`403 - Forbidden Access Attempt: ${req.method} ${req.path}`);
		},
		'404': function(req, res){
			res.send(create_error_string(404, "Not Found", "Cannot get path", req));
			res.statusCode = 404;
			module.exports.log.info(`404 - Cannot get path: ${req.method} ${req.path}`);
		},
		'405': function(req, res){
			res.send(create_error_string(405, "Not Acceptable", "Not Acceptable", req));
			res.statusCode = 405;
			module.exports.log.info(`405 - Not Acceptable: ${req.method} ${req.path}`);
		},
		'418': function(req, res){
			res.send(create_error_string(418, "I am a teapot", "I am a teapot", req));
			res.statusCode = 418;
			module.exports.log.info(`418 - I am a teapot: ${req.method} ${req.path}`);
		},


		'500': function(req, res, message){
			res.send(create_error_string(500, "Internal Server Error", "Internal Server Error", req));
			res.statusCode = 500;
			module.exports.log.error(`500 - Internal Server Error: ${req.method} ${req.path} | ${message}`);
		},
		'501': function(req, res){
			res.send(create_error_string(501, "Not Implimented", "Method Not Implimented", req));
			res.statusCode = 501;
			module.exports.log.info(`501 - Method Not Implimented: ${req.method} ${req.path}`);
		},
		'502': function(req, res){
			res.send(create_error_string(502, "Bad Gateway", "Gateway returned invalid response", req));
			res.statusCode = 502;
			module.exports.log.info(`502 - Gateway returned invalid response: ${req.method} ${req.path}`);
		}
	}
}