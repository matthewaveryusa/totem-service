'use strict';

const _ = require('lodash'),
  ExpressRoutes = require('./express.js').ExpressRoutes,
  express = require('express'),
  http = require('http'),
  log = require('totem-log'),
  tools = require('totem-tools'),
  cors = require('cors');


/**
 * @module libs/service
 */

class Service {
  constructor(options) {
    var self = this;
    this.options = options;
    process.on('SIGTERM', function sigtermEvent() {
      self.end();
      setTimeout(function sigtermTimeout() {
          process.exit(0);
        },
        self.sigtermTimeout || 0);
    });
  }


  connect() {
    log.info('starting server', ('totem-service/src/service.js:31' || '__LOCATION__'));
    var app = this.expressApp();
    this.server = http.createServer(app);
    this.setupServerEvents(app);

    app.use(function (req, res, next) {
      req.start = Date.now();
      next();
    });

    this.setupPreRoutes(app);
    this.setupRoutes(app);
    this.setupPostRoutes(app);
    
    //this is the final handler that prints metrics
    app.use(function (req, res) {
      var time = Date.now() - req.start;
      log.metric({'time':time, 'status':res.statusCode, 'method': req.method, 'url': req.originalUrl, 'ip': req.ip, 'referer': req.referer},  ('totem-service/src/service.js:48' || '__LOCATION__'));
    });
    

    this.server.on('error', function httpServerError(err) {
      log.error({'error':err, 'stack':err.stack},('totem-service/src/service.js:53' || '__LOCATION__'));
      process.exit(1);
    });
    if (this.options.host === '*') {
      this.server.listen(this.options.port);
    } else {
      this.server.listen(this.options.port, this.options.host);
    }
  }

  reconnect() {
    var self = this;
    this.disconnect(function reconnectCallback() {
      self.connect();
    });
  }

  disconnect(callback) {
    try {
      this.server.close(callback);
    } catch (e) {
      log.error(e,('totem-service/src/service.js:74' || '__LOCATION__'));
    }
    _.forEach(this.serverConnections, function closeConnection(connection) {
      connection.destroy();
    });
  }

  setupServerEvents() {
    this.serverConnections = {};
    this.nextConnectionId = 0;
    var self = this;
    this.server.on('connection', function ConnectionEvent(connection) {

      self.nextConnectionId++;
      var id = self.nextConnectionId;
      self.serverConnections[id] = connection;

      connection.on('close', function CloseEvent() {
        delete self.serverConnections[id];
      });
    });
  }

  setupPreRoutes(app) {
    app.use(cors());
    //if req.identity exists, it means this request is from a logged-in user.
    app.use(function (req, res, next) {
      var sessionId = req.headers['x-totem-session-id'];
      if (!sessionId) {
        return next();
      }
      tools.sessionExists(self.redis, sessionId, function (err, data) {
        if (err) {
          return next(err);
        }
        req.identity = {'userId': data.userId};
        next();
      });
    });
  }

  setupRoutes(app) {
  }
  
  setupPostRoutes(app) {
    app.use(function (req, res, next) {
      if (!res.headersSent) {
        res.status(404).json({'errorCode': 'notFound'});
      }
      next();
    });

    app.use(function (err, req, res, next) {
      if(_.isPlainObject(err) && 'status' in err && 'errorCode' in err) {
        res.status(err.status).json(_.pick(err,['errorCode','clientDetails']));
        if('serverDetails' in err) {
          log.error({'err':err},('totem-service/src/service.js:130' || '__LOCATION__'));
        }
        next();
      } else if (err instanceof SyntaxError) {
        res.status(400).json({'errorCode': 'invalidJSON'});
        next();
      } else {
        log.error({'error':err,'stack':err.stack},('totem-service/src/service.js:137' || '__LOCATION__'));
        res.status(500).json({'errorCode': 'internalError'});
      }
    });
  }

  expressApp() {
    var app = express(),
      adminRoute = express.Router();
    var routes = new ExpressRoutes();
    app.disable('x-powered-by');
    app.enable('trust proxy');

    var serviceRouteCtx = function (route) {
      return function ServiceRoute(req, res) {
        route(req, res);
      };
    };

    _.keys(routes.routeDetails()).forEach(function registerServiceRoute(route) {
      adminRoute.route('/' + route).get(serviceRouteCtx(routes[route].bind(routes)));
    });

    app.use('/_/', adminRoute);

    //if req.identity exists, it means this request is from a logged-in user.
    app.use(function (req, res, next) {
      var sessionId = req.headers['x-totem-session-id'];
      if (!sessionId) {
        return next();
      }
      tools.sessionExists(self.redis, sessionId, function (err, data) {
        if (err) {
          return next(err);
        }
        req.identity = {'userId': Number(data.userId), 'username': data.username,'session': sessionId};
        next();
      });
    });

    return app;
  }

  end() {
    this.disconnect();
  }
}
exports.Service = Service;