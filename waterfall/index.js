var parse_cookies = function(req_cookies){
	var cookie_split = req_cookies.split(/; */);
	var cookies = {};
	cookie_split.forEach((cookie)=>{
		var equals = cookie.indexOf('=');
		var left = cookie.slice(0, equals);
		var right = cookie.slice(equals+1, cookie.lenght);
		cookies[left] = right;
	});
	return cookies;
}

var stringify_cookies = function(cookies){
	var header = [];
	cookies.forEach((cookie)=>{
		if(cookie.delete){
			header.push(`${cookie.key}=; max-age=0`);
		}else{
			header.push(`${cookie.key}=${cookie.value}; SameSite=None; Secure`);
		}
	});
	return header;
}



class Header{

	constructor(key, value){
		this.key = key;
		this.value = value;
	}
}

class Cookie{

	constructor(key, value){
		this.key = key;
		this.value = value;
		this.delete = false;
	}
}



const http = require('http');
const {parse} = require('querystring');
const MIME = require('./MIME.js');
const {files} = require('virtuosity-server');


module.exports = function(PORT){
	var handler = function(req, res){
		console.log("request: ", req);
		res.header('Content-Type', 'application/json');
		res.send(JSON.stringify({request: req}));
	}

	http.createServer((request, response)=>{
		const { headers, method, url } = request;
		let raw_body = [];
		request.on('error', (err)=>{
			console.error(err);
		}).on('data', (chunk)=>{
			raw_body.push(chunk);
		}).on('end', ()=>{
			response.on('error', (err)=>{
				console.error(err);
			});


			// setup req /////////////////////////////////////////////////////////////////////
			var recieved_time = process.hrtime();
			var req = {
				host: request.headers.host,
				headers: headers,
				method: method,
				query: {},
				body: {},
				cookies: {},
				recieved: Date.now(),
				recieved_ns: recieved_time[0] * 1e9 + recieved_time[1],
				parsingTime: null,
				original: request
			};

			raw_body = Buffer.concat(raw_body).toString();

			if(headers['content-type'] == "application/json"){
				req.body = JSON.parse(raw_body);
			}else{
				req.body = parse(raw_body);
			}


			// parse body
			var questionmark = url.indexOf("?");
			if(questionmark != -1){
				req.path = url.slice(0, questionmark);
				req.query = parse( url.slice(questionmark+1, url.length) );
			}else{
				req.path = url;
			}

			// parse cookies
			var cookies = new Map();
			if(request.headers.cookie){
				req.cookies = parse_cookies(request.headers.cookie);
				for(var key in req.cookies){
					cookies.set(key, new Cookie(key, req.cookies[key]));
				}
			}

			// setup res ////////////////////////////////////////////////////////////////////////
			
			var headers_list = [];
			var send_str = "";
			var lock = false;
			var lock_send_str = function(str){
				send_str = str;
				lock = true;
			}
			var add_to_send_str = function(str){
				if(!lock){
					send_str += str;
				}
			}


			var res = {
				statusCode: 200,
				send: function(data){
					add_to_send_str(data);
				},
				sendFile: function(path){
					if(files.fileExists(path)){
						lock_send_str(files.readFile(path));
						var ext = files.getFileExtention(path);
						res.header('Content-Type', MIME(ext) || ext);
					}else{
						var err = `File (${path}) does not exist`;
						throw new ReferenceError(err);
					}
				},
				sendJSON: function(json){
					res.header('Content-Type', 'application/json');
					lock_send_str(JSON.stringify(json));
				},
				redirect: function(url){
					res.statusCode = 302;
					lock_send_str("");
					response.setHeader("Location", url);
				},
				header: function(key, value){
					headers_list.push(new Header(key, value));
				},
				cors: function(){
					response.setHeader("Access-Control-Allow-Origin", "*");
					response.setHeader("Access-Control-Allow-Credentials", "true");
					response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
					response.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
				},
				cookies: {
					add: function(key, value){
						if(!cookies.has(key)){
							cookies.set(key, new Cookie(key, value));
						}else{
							var err = `Cookie (${key}) already exists.\nDid you mean: res.cookie.update`;
							throw new ReferenceError(err);
						}
					},
					update: function(key, value){
						if(cookies.has(key)){
							cookies.get(key).value = value;
						}else{
							var err = `Cookie (${key}) does not exist.\nDid you mean: res.cookie.add`;
							throw new ReferenceError(err);
						}
					},
					set: function(key, value){
						if(cookies.has(key)){
							// update
							cookies.get(key).value = value;
						}else{
							// add
							cookies.set(key, new Cookie(key, value));
						}
					},
					delete: function(key){
						if(cookies.has(key)){
							cookies.get(key).delete = true;
						}else{
							var err = `Cookie (${key}) does not exist.`;
							throw new ReferenceError(err);
						}
					},
					print: function(){
						var output = {};
						cookies.forEach((cookie)=>{
							output[cookie.key] = cookie.value;
						});
						return output;
					},

					// this will removed by ferry
					destroy: function(key){
						cookies.delete(key);
					}
				},
				original: response
			}


			// handler ////////////////////////////////////////////////////////////////////////

			var diff = process.hrtime(recieved_time);
			req.parsingTime = diff[0] * 1e9 + diff[1];
			delete req.recieved_ns;

			handler(req, res);


			if(req.cookies != {}){
				response.setHeader('Set-Cookie', stringify_cookies(cookies));
			}

			response.statusCode = res.statusCode;
			// response.setHeader('Content-Type', 'application/json');


			headers_list.forEach((header)=>{
				response.setHeader(header.key, header.value);

			});
			response.end(send_str);
		});
	}).listen(PORT);


	return {
		setHandler: function(event){
			handler = event;
		}
	}

}