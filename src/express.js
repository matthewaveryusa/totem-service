'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

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

var ExpressRoutes = (function () {
  function ExpressRoutes() {
    _classCallCheck(this, ExpressRoutes);

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

  _createClass(ExpressRoutes, [{
    key: 'routeDetails',

    /**
     * Ping route. Pings the service for a timestamp
     * @param {external:express/Request} req
     * @param {external:express/Response} res
     * @example
     * //sample response:
     */

    value: function routeDetails() {
      return this.description;
    }
  }, {
    key: 'ping',
    value: function ping(req, res) {
      res.json({ pong: tools.nowMs() });
    }
  }, {
    key: 'ok',
    value: function ok(req, res) {
      res.send('OK');
    }
  }, {
    key: 'help',
    value: function help(req, res) {
      res.json(this.description);
    }
  }, {
    key: 'crash',
    value: function crash(req, res) {
      res.json({});
      process.exit(1);
    }
  }, {
    key: 'end',
    value: function end(req, res) {
      res.json({});
      process.kill(process.pid, 'SIGTERM');
    }
  }, {
    key: 'process',
    value: (function (_process) {
      function process(_x, _x2) {
        return _process.apply(this, arguments);
      }

      process.toString = function () {
        return _process.toString();
      };

      return process;
    })(function (req, res) {
      var mem = process.memoryUsage();
      var humanMem = _.mapValues(mem, function (val) {
        return tools.humanSize(val);
      });
      res.json({
        argv: process.argv,
        pid: process.pid,
        title: process.title,
        execArgv: process.execArgv,
        cwd: process.cwd(),
        arch: process.arch,
        platform: process.platform,
        memory: mem,
        humanMemory: humanMem,
        uptime: process.uptime(),
        umask: process.umask(),
        gid: process.getgid(),
        uid: process.getuid(),
        execPath: process.execPath
      });
    })
  }, {
    key: 'env',
    value: function env(req, res) {
      res.json(process.env);
    }
  }, {
    key: 'os',
    value: (function (_os) {
      function os(_x3, _x4) {
        return _os.apply(this, arguments);
      }

      os.toString = function () {
        return _os.toString();
      };

      return os;
    })(function (req, res) {
      var mem = { total: os.totalmem(), free: os.freemem() };
      var humanMem = _.mapValues(mem, function (val) {
        return tools.humanSize(val);
      });
      var cpus = os.cpus();
      res.json({
        hostname: os.hostname(),
        endianness: os.endianness(),
        type: os.type(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        CPUs: { count: cpus.length, model: cpus[0].model, peed: cpus[0].speed },
        loadAvg: _.map(os.loadavg(), function (val) {
          return val.toFixed(4);
        }),
        memory: mem,
        humanMemory: humanMem,
        uptime: os.uptime(),
        tmpDir: os.tmpdir()
      });
    })
  }, {
    key: 'network',
    value: function network(req, res) {
      res.json(os.networkInterfaces());
    }
  }]);

  return ExpressRoutes;
})();

exports.ExpressRoutes = ExpressRoutes;
