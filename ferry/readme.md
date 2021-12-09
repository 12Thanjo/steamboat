# Ferry
HTTP request handler built on top of `Waterfall` (another Steamboat module).
Ferry has a built in:
- query parser
- body parser
- cookie parser / signing
- logging
- session management
- error reporting

Ferry automatically signs cookies for you without you ever having to see the signed cookies.
Ferry can also automatically manage sessions for you including with automatic creation of CSRF keys. When managing sessions, Ferry uses the keys `|--SESSION--|` and `|--CSRF--|`. Do not use these keys as Ferry will overwrite them.


### Example code:
```js
const {ferry} = require('steamboat');

// GET http://webpage.com
ferry.get([''], (req, res)=>{
	res.send('<h1>This is the landing page</h1>');
});

// GET http://webpage.com/dir
ferry.get(['dir'], (req, res)=>{
	res.sendFile('path_to_dir_page.html');
});



// http://webpage.com/auth?username=user&password=pass
ferry.subdir(['auth'], (req, res)=>{
	if(req.query.username != "user" && req.query.password != "pass"){
		// don't allow user to continue
		// sends a 403 error
		return false;
	}else{
		// allow user to continue
		// not returning anything does the same thing
		return true;
	}
});

// http://webpage.com/auth/dir?username=user&password=pass
ferry.get(['auth', 'dir'], (req, res)=>{
	res.send("<h1>I had to be authorized to get here</h1>");
});

// GET http://webpage.com/auth/dir2?username=user&password=pass
ferry.get(['auth', 'dir2'], (req, res)=>{
	res.send("<h1>I had to be authorized to get here too</h1>");
	res.cookies.set('session', "sessionID");
});



// POST http://webpage.com/form
ferry.post(['form'], (req, res)=>{
	if(req.body.username != null && req.body.password != null){
		res.sendJSON({
			username: req.body.username,
			password: req.body.password
		});
	}else{
		ferry.error['400'](req, res);
	}
});

ferry.log.mode.operation = "silent";

const PORT = 8080;
ferry.start(PORT, {
	cookieSecret: "secret_cookie"
});
```


## API:

##### PathArray
This is how ferry intakes its paths. Each element of the array is a subdirectory:
For example, if the path is `/dir1/dir2/dir3`, the array should look like this: `['dir1', 'dir2', 'dir3']`.




### start
```js
ferry.start(port, config);
```
Begin running Ferry (should be done last)

| Parameter | Type     | Definition |
|-----------|----------|------------|
| port 		| `Int`    | Port for the http server to listen to |
| config 	| `object` | configuration object |


##### config


| Property              | Type      | Definition | Defualt |
|-----------------------|-----------|------------|---------|
| cookieSecret 		    | `String`  | Secret to use when signing cookies | n/a |
| useSession   		    | `Boolean` | **(OPTIONAL)** Set whether Ferry should automatically manage sessions | `true` |
| rejectInvalidCookies  | `Boolean` | **(OPTIONAL)** Set whether Ferry should automatically delete inpropery signed cookies (if *false*, Ferry will pass through the cookies with value it recieves) | `true` |
| rejectInvalidSessions | `Boolean` | **(OPTIONAL)** Set whether Ferry should reject any requests with invalid sessions values (if *false*, Ferry will create a new session) | `false` | 




### Sub-Directory
```js
ferry.subdir(path, callback);
```
Run this before any subsequent Sub-Directories or requests ([see below](#requests)).


| Parameter | Type        				| Definition 		   |
|-----------|---------------------------|----------------------|
| path 		| [`PathArray`](#PathArray) | path to process on   |
| callback 	| `callback`    			| event to run         |



### Requests:
- [GET](#get-request)
- [POST](#post-request)
- [DELETE](#delete-request)
- [PUT](#put-request)
- [OPTIONS](#options-request)
- [PATCH](#patch-request)
- [custom](#custom-request)



#### GET request
```js
ferry.get(path, callback);
```
Process a *GET* request.
`callback` takes `req` and `res` as parameters.

| Parameter | Type        				| Definition 		   |
|-----------|---------------------------|----------------------|
| path 		| [`PathArray`](#PathArray) | path to process on   |
| config 	| `object`    				| configuration object |


#### POST request
```js
ferry.post(path, callback);
```
Process a *POST* request.
`callback` takes `req` and `res` as parameters.

| Parameter | Type        				| Definition 		   |
|-----------|---------------------------|----------------------|
| path 		| [`PathArray`](#PathArray) | path to process on   |
| config 	| `object`    				| configuration object |


#### DELETE request
```js
ferry.delete(path, callback);
```
Process a *DELETE* request.
`callback` takes `req` and `res` as parameters.

| Parameter | Type        				| Definition 		   |
|-----------|---------------------------|----------------------|
| path 		| [`PathArray`](#PathArray) | path to process on   |
| config 	| `object`    				| configuration object |

#### PUT request
```js
ferry.put(path, callback);
```
Process a *PUT* request.
`callback` takes `req` and `res` as parameters.

| Parameter | Type        				| Definition 		   |
|-----------|---------------------------|----------------------|
| path 		| [`PathArray`](#PathArray) | path to process on   |
| config 	| `object`    				| configuration object |


#### OPTIONS request
```js
ferry.options(path, callback);
```
Process a *OPTIONS* request.
`callback` takes `req` and `res` as parameters.


| Parameter | Type        				| Definition 		   |
|-----------|---------------------------|----------------------|
| path 		| [`PathArray`](#PathArray) | path to process on   |
| config 	| `object`    				| configuration object |


#### custom request
```js
ferry.on(method, path, callback);
```
Process a custom request. If there is a request type you want to use that isn't natively supported, you can use this.
`callback` takes `req` and `res` as parameters.


| Parameter | Type        				| Definition 		           |
|-----------|---------------------------|------------------------------|
| method	| `String`					| request method to listen for |
| path 		| [`PathArray`](#PathArray) | path to process on           |
| config 	| `object`    				| configuration object         |



### middleware
```js
ferry.middleware(event);
```
Event to run on every Request before processing any [Sub-Directories](#sub-directory) or [Directories](#requests).
Event takes `req` and `res` as parameters.



### afterware
```js
ferry.afterware(event);
```
Event to run on every Request after processing any [Sub-Directories](#sub-directory) or [Directories](#requests).
Event takes `req` and `res` as parameters.


### Logs
Ferry has built in logging functionality that will print to the console and save to disk.
Logging can be individually set to [three modes](#logging-modes).
When logging to the console, the different log types are colored differently. 


- [operation](#operation)
- [info](#info)
- [warning](#warning)
- [error](#error)


#### Operation
```js
ferry.log.operation(message);
```
The message parameter is the message of the log.
When logging to the console, operation logs are green.

#### Info
```js
ferry.log.info(message);
```
The message parameter is the message of the log.
When logging to the console, info logs are cyan.

#### Warning
```js
ferry.log.warning(message);
```
The message parameter is the message of the log.
When logging to the console, warning logs are yellow.

#### Error
```js
ferry.log.error(message);
```
The message parameter is the message of the log.
When logging to the console, error logs are red.


##### Logging Modes
```js
ferry.log.mode[/*log type*/] = "MODE";
```

The different modes are:
- **full**: `console.log()` the entire log
- **verbose**: `console.log()` just the message of the log
- **silent**: does not `console.log()` anything

All modes log to file.


### Errors 
```js
ferry.error[/*error number*/](req, res);
```
These built in error functions send a page, status code, and log. You can add or redefine as you like. They take `req` and `res` as parameters, but can take more. If you redefine, Ferry will use your custom error function.
`500` errors also take `message` as a parameter.





