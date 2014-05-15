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
      item.ele('URL', "http://" + req.headers.host + "/" + key);
   });

   res.send(root.end({ pretty: true }));
});

app.get('/:id/:action?', function (req, res, next) {
   var player = devices.get(req.params.id);
   if (!player) {
      res.status(404).send(error('No player found by that ID'));
      return;
   }
   // If there's an action to do, do it.
   if (req.params.action) {
      switch (req.params.action) {
         case "play":
            player.device.play(function (err, playing) {
            });
            break;
         case "pause":
            player.device.pause(function (err, paused) {
            });
            break;
         case "vdown":
            player.device.getVolume(function (err, volume) {
               player.device.setVolume(parseInt(volume) - 2, function (err, data) {
               });
            });
            break;
         case "vup":
            player.device.getVolume(function (err, volume) {
               player.device.setVolume(parseInt(volume) + 2, function (err, data) {
               });
            });
            break;
         case "next":
            player.device.next(function (err, movedToNext) {
            });
            break;
         case "prev":
            player.device.previous(function (err, movedToPrevious) {
            });
            break;
      }
   }

   var softkeys = [
      { name : "-", action : "vdown" },
      { name : "+", action : "vup" },
      { name : "next", action : "next" }
   ];

   // Get the current state so we know what actions to make available to it
   player.device.getCurrentState(function (err, state) {
      if (state == 'stopped' || state == 'paused') {
         softkeys.push({ name : "play", action : "play" });
      } else {
         softkeys.push({ name : "pause", action : "pause" });
      }
      player.device.currentTrack(function (err, track) {
         var root = builder.create('CiscoIPPhoneText');
         root.ele('Title', player.attributes.CurrentZoneName);
         root.ele('Prompt', 'Now Playing: ' + track.title);
         root.ele('Text', "Track: " + track.title + "\nArtist: " + track.artist + "\nAlbum: " + track.album);

         for (var k in softkeys) {
            var key = root.ele('SoftKeyItem');
            key.ele('Name', softkeys[k].name);
            key.ele('URL', "http://" + req.headers.host + "/" + req.params.id + "/" + softkeys[k].action);
            key.ele('Position', parseInt(k) + 1);
         }

         res.send(root.end({ pretty : true }));
      });
   });
});

