var installer = require('ep_carabiner/static/js/installer');
var plugins = require('ep_carabiner/static/js/plugins');
var webaccess = require('ep_express/node/webaccess');
var _ = require('underscore');
var semver = require('semver');

exports.getInstalled = function (io, socket, query) {
  // send currently installed plugins
  var installed = Object.keys(plugins.plugins).map(function(plugin) {
    return plugins.plugins[plugin].package
  })
  socket.emit("results:installed", {installed: installed});
};

exports.checkUpdates = function(io, socket) {
  // Check plugins for updates
  installer.getAvailablePlugins(/*maxCacheAge:*/60*10, function(er, results) {
    if(er) {
      console.warn(er);
      socket.emit("results:updatable", {updatable: {}});
      return;
    }
    var updatable = _(plugins.plugins).keys().filter(function(plugin) {
      if(!results[plugin]) return false;
      var latestVersion = results[plugin].version
      var currentVersion = plugins.plugins[plugin].package.version
      return semver.gt(latestVersion, currentVersion)
    });
    socket.emit("results:updatable", {updatable: updatable});
  });
};

exports.getAvailable = function (io, socket, query) {
  installer.getAvailablePlugins(/*maxCacheAge:*/false, function (er, results) {
    if(er) {
      console.error(er)
      results = {}
    }
    socket.emit("results:available", results);
  });
};

exports.search = function (io, socket, query) {
  installer.search(query.searchTerm, /*maxCacheAge:*/60*10, function (er, results) {
    if(er) {
      console.error(er)
      results = {}
    }
    var res = Object.keys(results)
      .map(function(pluginName) {
        return results[pluginName]
      })
      .filter(function(plugin) {
        return !plugins.plugins[plugin.name]
      });
    res = sortPluginList(res, query.sortBy, query.sortDir)
      .slice(query.offset, query.offset+query.limit);
    socket.emit("results:search", {results: res, query: query});
  });
};

exports.install = function (io, socket, plugin_name) {
  installer.install(plugin_name, function (er) {
    if(er) console.warn(er)
    socket.emit("finished:install", {plugin: plugin_name, code: er? er.code : null, error: er? er.message : null});
  });
};

exports.uninstall = function (io, socket, plugin_name) {
  installer.uninstall(plugin_name, function (er) {
    if(er) console.warn(er)
    socket.emit("finished:uninstall", {plugin: plugin_name, error: er? er.message : null});
  });
};

function sortPluginList(plugins, property, /*ASC?*/dir) {
  return plugins.sort(function(a, b) {
    if (a[property] < b[property])
       return dir? -1 : 1;
    if (a[property] > b[property])
       return dir? 1 : -1;
    // a must be equal to b
    return 0;
  })
}
