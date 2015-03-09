'use strict';
var _ = require('lodash'),
  tools = require('totem-tools'),
  os = require('os');
/**
 * @module libs/service
 */

/**
 * admin routes for the service giving task and system details as well as the ability to gracefully end or crash the task for testing purposes
 * @constructor
 */

function ExpressRoutes(){
  this.description = {
    ping: 'returns a timestamped pong',
    ok: 'returns string OK. for HAProxy high-level health-checks',
    end: 'gracefully end the task',
    crash: 'SIGTERM the task',
    process: 'information about the process',
    //TODO security issue
    //env: 'environment variables the process is exposed to',
    os: 'operating system details',
    network: 'network interfaces available',
    help: 'help file'
  };
}

ExpressRoutes.prototype.constructor = ExpressRoutes;

exports.ExpressRoutes = ExpressRoutes;

/**
 * Ping route. Pings the service for a timestamp
 * @param {external:express/Request} req
 * @param {external:express/Response} res
 * @example
 * //sample response: 
 */

ExpressRoutes.prototype.routeDetails = function () {
  return this.description;
};

ExpressRoutes.prototype.ping = function (req, res) {
  res.json({'pong': tools.nowMs()});
};

ExpressRoutes.prototype.ok = function (req, res) {
  res.send('OK');
};

ExpressRoutes.prototype.help = function(req,res) {
  res.json(this.description);
};

ExpressRoutes.prototype.crash = function(req,res) {
  res.json({});
  process.exit(1);
};

ExpressRoutes.prototype.end = function(req,res) {
  res.json({});
  process.kill(process.pid, 'SIGTERM');
};

ExpressRoutes.prototype.process = function(req,res){
  var mem = process.memoryUsage();
  var humanMem = _.mapValues(mem,function(val){ return tools.humanSize(val);});
  res.json({
    'argv' : process.argv,
    'pid' : process.pid,
    'title': process.title,
    'execArgv' : process.execArgv,
    'cwd' : process.cwd(),
    'arch': process.arch,
    'platform' : process.platform,
    'memory': mem,
    'humanMemory': humanMem,
    'uptime': process.uptime(),
    'umask': process.umask(),
    'gid': process.getgid(),
    'uid': process.getuid(),
    'execPath': process.execPath
  });
};

ExpressRoutes.prototype.env = function(req,res) {
  res.json(process.env);
};

ExpressRoutes.prototype.os = function(req,res){
  var mem = { 'total': os.totalmem(), 'free': os.freemem()};
  var humanMem = _.mapValues(mem,function(val){ return tools.humanSize(val);});
  var cpus = os.cpus();
  res.json({
    'hostname': os.hostname(),
    'endianness': os.endianness(),
    'type': os.type(),
    'platform': os.platform(),
    'release': os.release(),
    'arch': os.arch(),
    'CPUs': {'count': cpus.length, 'model' : cpus[0].model, 'peed' : cpus[0].speed },
    'loadAvg' : _.map(os.loadavg(),function(val){ return val.toFixed(4);}),
    'memory': mem,
    'humanMemory': humanMem,
    'uptime': os.uptime(),
    'tmpDir' : os.tmpdir()
  });
};

ExpressRoutes.prototype.network = function(req,res){
  res.json(os.networkInterfaces());
};

