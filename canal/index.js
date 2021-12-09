try{
	var http = require('http');


	module.exports = function(config){
		
		var canal = {};

		canal.get = function(url){
			return new Promise((resolve, reject)=>{
				http.get(url, (res)=>{
					var data = '';
					res.on('data', (chunck)=>{
						data += chunck
					});

					res.on('end', ()=>{
						resolve(data);
					});
				}).on('error', (err)=>{
					reject("err: ", err.message);
				});
			});
		}


		canal.post = function(hostname, port, path, headers, body){
			body = JSON.stringify(body);
			return new Promise((resolve, reject)=>{
				var options = {
					protocol: 'http:',
				    hostname: hostname,
				    port: port,
				    path: path,
				    method: 'POST',
				    headers: {
				        'Content-Type': 'application/json',
				        'Content-Length': body.length
				    }
				}

				var req = http.request(options, (res)=>{
					var data = '';
					res.on('data', (chunck)=>{
						data += chunck
					});

					res.on('end', ()=>{
						resolve(data);
					});
				}).on('error', (err)=>{
					reject(err.message);
				});


				req.write(body);
				req.end();
			});
		}
		
		return canal;
	}
}catch{
	window.canal = {};

	window.canal.get = function(url){
		return new Promise((resolve, reject)=>{
			fetch(url)
				.then(response=>response.json())
				.then((data)=>{
					resolve(data);
				}).catch((err)=>{
					reject(err)
				});
		})
	}


	window.canal.post = function(hostname, port, path, headers, body){
		
	}
}

