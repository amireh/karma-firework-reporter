var FireworkClient = require('./lib/FireworkClient');
var extend = require('lodash').extend;

var defaults = {
  fireworkUrl: process.env.FIREWORK_URL,
  fireworkDatabase: process.env.FIREWORK_REPORTER_DB,
  fireworkClientPath: 'firework_client'
};

var FireworkReporter = function(config) {
  var client;
  var adapter = require('./lib/GenericAdapter');

  config = extend({}, defaults, config);
  client = new FireworkClient({
    db: config.fireworkDatabase,
    url: config.fireworkUrl,
    path: config.fireworkClientPath
  });

  if (config.framework) {
    switch(config.framework) {
      case 'mocha':
        adapter = require('./lib/MochaAdapter');
      break;

      case 'qunit':
        adapter = require('./lib/QUnitAdapter');
      break;

      default:
        throw new Error("Unknown test framework '" + config.framework + "'");
    }
  }

  this.onSpecComplete = function(browser, browserResult) {
    var fireworkResult = {
      success: browserResult.success,
      environment: browser.name,
      test: browserResult.description,
      context: browserResult.suite,
      duration_ms: browser.lastResult.netTime,
    };

    if (browserResult.skipped) {
      fireworkResult.success = null;
      fireworkResult.details = "pending";
    }
    else if (!browserResult.success) {
      if (browserResult.log && browserResult.log.length > 0) {
        extend(fireworkResult, adapter(browserResult.log[0]));
      }
    }

    client.send(fireworkResult);
  };

  this.onExit = function(done) {
    client.close(done);
  };
};

FireworkReporter.$inject = [ 'config.fireworkReporter' ];

module.exports = {
  'reporter:firework': ['type', FireworkReporter]
};
