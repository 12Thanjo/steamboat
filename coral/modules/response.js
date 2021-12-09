var Responder = function(req, res){
	var soul = {};

	this.req = req;
	this.res = res;
	soul.start_time = process.hrtime();
	soul.calc_latency = function(){
		var diff = process.hrtime(soul.start_time);
		var nanoseconds = diff[0] * 1e9 + diff[1];
		nanoseconds += req.parsingTime;
		if(nanoseconds < 1e6){
			var with_commas = nanoseconds.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			return with_commas + "ns";
		}else{
			var milliseconds = Math.floor(nanoseconds / 1e3) / 1e3;
			if(milliseconds < 1e3){
				return milliseconds + "ms";
			}else{
				var seconds = Math.floor(milliseconds) / 1e3;
				// var with_commas = seconds.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
				return seconds + "s";
			}
		}
	}

	soul.emit = function(status, data){
		res.sendJSON({
			status: status,
			latency: soul.calc_latency(),
			...data
		});
	}

	this.success = function(data){
		soul.emit("success", data);
	}

	this.fail = function(error){
		ferry.log.warning(error);
		soul.emit("fail", {
			error: error
		});
	}

	this.error = function(error){
		ferry.log.error(error);
		soul.emit("error", {
			error: error
		});
	}
}


module.exports = Responder;