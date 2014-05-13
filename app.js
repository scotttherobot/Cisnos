var Sonos = require('sonos'),
    Express = require('express'),
    app = Express();

// our devices
var devices = [];

// Serach for devices and push them into the pool.
Sonos.search(function (device) {
   device.getZoneAttrs(function(err, data) {
      // If it's not the bridge, push it into the pool.
      // We don't care about the bridge.
      if (data.CurrentZoneName != "BRIDGE") {
         devices.push(device);
         console.log("Pushed", device);
      }
   });
});

app.get('/', function (req, res) {
   var json = { players : devices };
   res.json(json);
});

var server = app.listen(3000, function() {
   console.log('Listening on %d', server.address().port);
});
