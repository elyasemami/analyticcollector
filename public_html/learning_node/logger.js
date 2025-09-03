class Logger{
	constructor(prefix = 'App'){ this.prefix = prefix;}
	log(...args) {console.log(`[${this.prefix}]`, ...args);}
	error(...args) {console.error(`[${this.prefix}]`, ...args);}

}

module.exports = Logger;
