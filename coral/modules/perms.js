class Perms{

	constructor(read, modify, edit, insert, remove){
		this.read = read; 		// read
		this.modify = modify;	// modify settings (change columns, users, etc.)

		// table specific
		if(edit != null && remove != null && modify != null){
			this.edit = edit; 		// edit line
			this.insert = insert;  	// insert line
			this.remove = remove;	// remove line
			this.table = true;		// needed for authentication
		}else{
			this.table = false;
		}
	}
}

var build_perms = function(perm){
	return new Perms(perm.read, perm.modify, perm.edit, perm.insert, perm.remove);
}


module.exports = {
	Perms,
	build: build_perms
}