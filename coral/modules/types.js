
typeOf = function(val){
	return {}.toString.call(val).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
}


class Type{

	constructor(name, validator){
		this.name = name;
		this.validator = validator;
		module.exports[this.name] = this;
	}
}


var is_number = function(val){
	return val !== undefined && val !== null && val.constructor == Number;
}


new Type('int', (val)=>{
	return is_number(val) && Number.isInteger(val);
});

new Type('safeInt', (val)=>{
	return is_number(val) && Number.isSafeInteger(val);
})

new Type('number', (val)=>{
	return is_number(val);
});

new Type('string', (val)=>{
	return val !== undefined && val !== null && val.constructor == String;
});

new Type("JSON", (val)=>{
	return  val !== undefined && val !== null && val.constructor == Object;
});

new Type("bool", (val)=>{
	return val !== undefined && val !== null && val.constructor == Boolean;
});