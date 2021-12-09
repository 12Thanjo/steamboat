

var ops = new Map();


ops.set("=", (alpha, beta, record)=>{
	return record[alpha] == beta;
});
ops.set("is", (alpha, beta, record)=>{
	return record[alpha] == beta;
});

ops.set("!", (alpha, beta, record)=>{
	return record[alpha] != beta;
});
ops.set("not", (alpha, beta, record)=>{
	return record[alpha] != beta;
});

ops.set("<", (alpha, beta, record)=>{
	return record[alpha] < beta;
});
ops.set(">", (alpha, beta, record)=>{
	return record[alpha] > beta;
});
ops.set("<", (alpha, beta, record)=>{
	return record[alpha] < beta;
});
ops.set("<=", (alpha, beta, record)=>{
	return record[alpha] <= beta;
});





var Conditional = function(alpha, op, beta){
	
	this.op = ops.get(op);

	this.compare = function(record){
		return this.op(alpha, beta, record);
	}
}


module.exports = Conditional;