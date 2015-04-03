'use strict';

const _ = require('lodash'),
  ExpressRoutes = require('./express.js').ExpressRoutes,
  express = require('express'),
  http = require('http'),
  log = require('tracer').console();

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
    log.info('starting server');
    var app = this.expressApp();
    this.server = http.createServer(app);
    this.setupServerEvents();
    this.setupRoutes(app);
    this.server.on('error', function httpServerError(err) {
      log.error(err);
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
      log.error('disconnect throw', e);
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

  setupRoutes(app) {
    app.use('/', function ApiRequestRoute(req, res, next) {
      log.info('API request', req.path, JSON.stringify(req.body));
      next();
    });

    app.use(function NotFoundRoute(req, res) {
      log.info(404, req.path);
      res.status(404);
      res.json({'message': 'not found'});
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
    return app;
  }

  defaultCallback(err, data) {
    if (err) {
      log.error(err, data);
      process.exit(1);
      return;
    }
    this.connect();
  }

  end() {
    this.disconnect();
  }
}
exports.Service = Service;