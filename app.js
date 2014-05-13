var Sonos = require('sonos');

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

