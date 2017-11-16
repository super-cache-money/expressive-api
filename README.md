# Express API serving that just makes sense

You think of an API like a directory structure, so it's time you served it out of one.

Define your api like this:

    |-apiDir
      |-user
         |-fetch.js
         |-delete.js
         |-create.js
      |-deep
         |-deeper
            |-explore.js
      |-mcHammer
         |-touch.js

Each endpoint must export a function which accepts requests and produces **json-friendly** output, like this:

**explore.js**

    module.exports = function explore(req, callback) {
      var depth = req.body.depth;
      if (depth > 1000) {
        return {
          balrog: true
        };
      } else {
        return {
          balrog: false
        }
      }
    }

For async functions, either works:
 
 - return a promise
 - call the `callback` param supplied to your endpoint
 
Here's how to actually serve the API:

    var express = require('express');
    var app = express();
    
    // you'll want to be able to parse json and querystrings
    var bodyParser = require('body-parser'); 
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded());
    
    // serve away
    var serveApi = require('expressive-api');
    app.use(serveApi('./apiDir'));
    
    app.listen(3000, function () {
      console.log('And it's running - easy hey?');
    });

Now you can hit your API:
    
    GET /user/fetch
    POST /deep/deeper/explore

It's worth mentioning again that this is a **JSON only** API.

## Extra Features

### Controlling which API files are included

Under the hood, this uses [require-directory](https://www.npmjs.com/package/require-directory), so you can pass in any of its options directly like this:

    app.use(serveApi('./apiDir'), {
      whitelist: /\.js$/
    });

### Define endpoints with whatever params you want

You can specify a `transformParams(req, callback, res)` function which gets applied to the usual parameters.
The result should be **an array** of the parameters you want your API endpoints to receive.

Here's one I use:

    function transformParams(req, callback, res) {
      // combine body and query into the params for the api
      var params = Object.assign({}, req.body);
      params = Object.assign(params, req.query);
      return [params, req.user, callback];
    }
    
    app.use(serveApi('./apiDir'), {
      transformParams: transformParams
    });
    
### Restricting endpoints to certain HTTP methods

Just add an array of `allowedMethods` as a property of your endpoint function, like this:

    function saveData(req, callback){
      // do the saving
    }
    
    saveData.allowedMethods = ['POST']
    
    module.exports = saveData;

### Responding in whatever way you choose

Ordinarily, whatever object an endpoint's exported function returns, is sent to the client.

However, since `res` is passed as an argument too, you can actually respond however you like, overriding the default JSON response.

Your feature suggestions and pull requests are welcome on [the repo](https://github.com/super-cache-money/expressive-api). 

PS: Dear [react-redux-universal-hot-example](https://github.com/erikras/react-redux-universal-hot-example), your sick boilerplate inspired some of what's baked into this. Thank you!
