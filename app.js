var Sonos = require('sonos'),
    Express = require('express'),
    builder = require('xmlbuilder'),
    SortedMap = require('collections/sorted-map'),
    app = Express();

// Create the HTTP server
var server = app.listen(3000, function() {
   console.log('Listening on %d', server.address().port);
});

// Set the content type to text/xml
app.use(function(req, res, next) {
   res.contentType('text/xml');
   next();
});

// our devices
var devices = new SortedMap();

// Serach for devices and push them into the pool.
Sonos.search(function (device) {
   device.getZoneAttrs(function(err, data) {
      // If it's not the bridge, push it into the pool.
      // We don't care about the bridge.
      if (data.CurrentZoneName != "BRIDGE") {
         var player = { device : device, attributes : data };
         devices.set(device.host.split('.').join(""), player);
         console.log(JSON.stringify(player, null, 2));
      }
   });
});

var error = function (message) {
   var root = builder.create('CiscoIPPhoneText');
   root.ele('Title', 'Error!');
   root.ele('Prompt', 'Something\'s gone wrong!');
   root.ele('Text', message);
   return root.end({ pretty : true });
};

app.get('/', function (req, res, next) {
   var root = builder.create('CiscoIPPhoneMenu');

   root.ele('Title', 'Cisnos Sonos controller');
   root.ele('Prompt', 'Select a player:');

   // Foreach device add a button.
   devices.forEach(function (device, key) {
      var item = root.ele('MenuItem');
      item.ele('Name', device.attributes.CurrentZoneName)
      item.ele('URL', "/" + key);
   });

   res.send(root.end({ pretty: true }));
});

app.get('/:id', function (req, res, next) {
   var player = devices.get(req.params.id);
   if (!player) {
      res.status(404).send(error('No player found by that ID'));
      return;
   }

   var softkeys = [
      { name : "-", action : "vdown" },
      { name : "+", action : "vup" },
      { name : ">>", action : "next" }
   ];

   // Get the current state so we know what actions to make available to it
   player.device.getCurrentState(function (err, state) {
      if (state == 'stopped' || state == 'paused') {
         softkeys.push({ name : "play", action : "play" });
      } else {
         softkeys.push({ name : "pause", action : "pause" });
      }

      var root = builder.create('CiscoIPPhoneText');
      root.ele('Title', player.attributes.CurrentZoneName);
      root.ele('Prompt', 'Now Playing:');
      root.ele('Text', 'Amy Winehouse');

      for (var k in softkeys) {
         var key = root.ele('SoftKeyItem');
         key.ele('Name', softkeys[k].name);
         key.ele('URL', "/" + req.params.id + "/" + softkeys[k].action);
         key.ele('position', parseInt(k) + 1);
      }

      res.send(root.end({ pretty : true }));
   });
});

