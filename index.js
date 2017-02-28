'use strict';

var path = require('path');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var Promise = require('promise');

var readPath = Promise.denodeify(require('glob'));
var readFile = Promise.denodeify(require('fs').readFile);
var parseXml = Promise.denodeify(parser.parseString);

function parseFile(filename) {
  var tokens = path.basename(filename, path.extname(filename)).split('.');
  return readFile(filename)
    .then(parseXml)
    .then(function (result) {
      var keyValues = {};
      if (result.root.data) {
        result.root.data.forEach(function (item) {
          var key = item.$.name;
          var val = item.value && item.value.length === 1 ? item.value[0] : item.value;
          keyValues[key] = val || '';
        });
      }
      return {
        language: tokens[1] || 'en-US',
        module: tokens[0],
        keyValues: keyValues
      };
    });
}

module.exports = function (source) {
  var self = this;
  var callback = this.async();
  var conf = JSON.parse(source);
  var resxPath = path.resolve(conf.path);

  readPath(resxPath, 'utf-8')
    .then(function (files) {
      return Promise.all(files.map(function (file) {
        self.addDependency(file);
        return parseFile(file);
      }));
    })
    .then(function (result) {
      var locales = {};
      result.forEach(function (item) {
        if (!locales[item.language]) {
          locales[item.language] = {'app': {}};
        }
        locales[item.language]['app'][item.module] = item.keyValues;
      });
      return locales;
    }).nodeify(callback);
};