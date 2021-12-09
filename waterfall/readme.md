# Waterfall
HTTP request parser
Has a built in:
- query parser
- body parser
- cookie parser


```js
const {waterfall} = require("steamboat");
waterfall.setHandler((req, res)=>{
	// create your handler here
});
```

While Waterfall can operate without it, you should define your own handler as shown above. However, it is recommended to use `ferry` (another Steamboat module) to take care of this for you.

## API
The handler will be passed two variables: `req` (request) and `res` (result).

### Req
Request object:

| Property    | type     | description 											  |
|-------------|----------|--------------------------------------------------------|
| host        | `string` | host from the request 							      |
| headers     | `JSON`   | headers from the request 							  |
| method      | `string` | method from the request  							  |
| query       | `JSON`   | query from the request   						      |
| body        | `JSON`   | body from the request    							  |
| cookies     | `JSON`   | cookies from the request 							  |
| path	      | `string` | path from the request    							  |
| recieved    | `Int`    | Timestamp when the request was recieved 				  |
| parsingTime | `Int`    | The time it took to parse the request (in nanoseconds) |
| original    | `Object` | The original request object							  |



### Res
Result object:

| Property       | type       | description |
|----------------|------------|-------------|
| send           | `function` | Add a string to the body to be sent (takes a string as a parameter) |
| sendFile       | `function` | Set the body to be sent to be the contents of a file (takes the path of the file as a parameter) and sets the header `Content-Type` based on a built in list of MIME tyes |
| sendJSON       | `function` | Set the body to be given JSON (takes JSON as a parameters), and sets the header `content-type` to `application/json` |
| header         | `function` | Sets a header (takes the `key` and `value` as parameters ) |
| statusCode     | `Int`      | The status code to send (defaults to `200`) |
| cookies.add    | `fucntion` | Add a cookie to send (takes `key` and `value` as parameters) |
| cookies.update | `function` | Update the value of a cookie (takes `key` and `value` as parameters) |
| cookies.set    | `function` | If cookie exists, update the value. If it doesn't add it (takes `key` and `value` as parameters) |
| cookies.delete | `function` | Delete a cookie (takes `key` as a parameter) |
| cookies.print  | `function` | Returns an object with all the cookies |
| cors           | `function` | Enable CORS for this request |
| original       | `Object`   | The original response object |