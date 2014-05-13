var Sonos = require('sonos');
var search = Sonos.search();

search.on('DeviceAvailable', function (device, model) {
   console.log(device, model);
});
