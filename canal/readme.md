# Canal
Promise based HTTP client for node.js

### Get
```js
canal.get(url);
```

### post
```js
canal.post(hostname, port, path, headers, body);
```

## Usage
```js
canal.get("url.com")
	.then((response)=>{
		// on success
	})
	.catch((err)=>{
		// on fail
	});
```
