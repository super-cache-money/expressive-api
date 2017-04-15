var PrettyError = require('pretty-error');
var pe = new PrettyError();
module.exports = function (api, inputOptions) {

  // so we can safely check specific options without everything falling apart

  var defaultOptions = {
    transformParams: function(req, callback){
      return [req, callback]; // the identity transform
    }
  }

  // we'll be well behaved citizens; we won't change anything
  var options = Object.assign({}, defaultOptions);
  options = Object.assign(options, inputOptions);

  var requireDirectoryOptions = Object.assign({}, options);
  delete requireDirectoryOptions.transformParams;


  // if a location is passed for an api, create the object
  if (typeof api === 'string') {
    api = require('require-directory')(module.parent, api, requireDirectoryOptions);
  }

  // now we should have an object represnting the api tree
  if (typeof api === 'object') {

    console.log('api is', api);
    return function(req, res, next) {
      var pathPieces = req.url.split('?')[0].split('/').slice(1);

      var currentAction = api;

      // drill down into api object to find the endpoint function, based on the path pieces
      for (var i in pathPieces) {
        if (currentAction.hasOwnProperty(pathPieces[i])) {
          currentAction = currentAction[pathPieces[i]];
        } else {
          break;
        }
      }

      // if the endpoint function was found
      if (currentAction && typeof currentAction === 'function') {

        // if the optional allowedMethods property was defined on endpoint, check that it's honoured
        if (!!currentAction.allowedMethods) {

          var allowedMethods;

          // allowedMethods can be a list of different methods
          if (currentAction.allowedMethods instanceof Array) {
            allowedMethods = currentAction.allowedMethods.map(
              function (method) {
                return method.toUpperCase();
              }
            );
          }
          // allowedMethods can be a single method string
          if (typeof currentAction.allowedMethods === 'string') {
            allowedMethods = [currentAction.allowedMethods.toUpperCase()];
          }

          // stop now and send an error response if the method isn't allowed
          if (allowedMethods.indexOf(req.method.toUpperCase()) < 0) {
            return res.status(405).end('METHOD NOT ALLOWED');
          }
        }

        // allow api params to be supplied either by json body, or by url query
        var params = Object.assign({}, req.query);
        params = Object.assign(params, req.params);

        // either responds to the api call with the resolved promise value
        // or responds with an error if the promise rejects
        function handleOutput(promise) {
          return promise.then(function (result) {
            return res.json(result);
          }).catch(function (reason) {
            if (reason && reason.redirect) {
              return res.redirect(reason.redirect);
            } else {
              console.error('API ERROR:', pe.render(reason));
              var errorResponse = reason.message;
              return res.status(reason.statusCode || 500).json(errorResponse);
            }
          });
        }

        // in case the callback is used instead of returning a promise
        function doneCb(err, result) {
          if (!!err) {
            handleOutput(Promise.reject(err));
          } else {
            handleOutput(Promise.resolve(result));
          }
        }

        // call the api point with the params and request specified


        var output = currentAction.apply(null, options.transformParams(req, doneCb));


        // if the output isn't an object, then it can't be returned (it is a JSON API), so hopefully the callback will be called
        if (typeof output === 'object') {


          // we make sure the output is promisified before handling it
          handleOutput(Promise.resolve(output));
        }

      } else {
        return res.status(404).end('NOT FOUND');
      }
    }
  } else {
    throw new Error('expressive-api needs either a string path to the directory, or an object, containing the promise endpoints')
  }
};
