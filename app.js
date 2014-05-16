var Sonos = require('sonos'),
    Express = require('express'),
    builder = require('xmlbuilder'),
    SortedMap = require('collections/sorted-map'),
    Iterator = require('collections/shim-array'),
    fs = require('fs'),
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
// And playlists read from file.
var playlists = new Iterator();

// Serach for devices and push them into the pool.
Sonos.search(function (device) {
   device.getZoneAttrs(function(err, data) {
      // If it's not the bridge, push it into the pool.
      // We don't care about the bridge.
      if (data.CurrentZoneName != "BRIDGE") {
         var player = { device : device, attributes : data };
         devices.set(device.host.split('.').join(""), player);
//         console.log(JSON.stringify(player, null, 2));
      }
   });
});

fs.exists("playlists/playlists.json", function (exists) {
   if (exists) {
      fs.readFile("playlists/playlists.json", "utf-8", function (err, data) {
         data = JSON.parse(data);
         for (var i = 0; i < data.length; i++ ) {
            playlists.push(data[i]);
         }
      });
   }
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

/**
 * A listing of all the available playlists.
 */
app.get('/:id/playlists', function (req, res, next) {
   var player = devices.get(req.params.id);
   if (!player) {
      res.status(404).send(error('No player found by that ID'));
      return;
   }

   var root = builder.create('CiscoIPPhoneMenu');
   root.ele('Title', 'Available Playlists');
   root.ele('Prompt', 'Choose a playlist to play:');
   
   // Foreach playlist, add an item
   playlists.forEach(function (playlist, key) {
      var item = root.ele('MenuItem');
      item.ele('Name', playlist.title)
      item.ele('URL', "http://" + req.headers.host + "/" + req.params.id + "/pl/" + key);
   });

   res.send(root.end({ pretty: true }));
});

app.get('/:id/:action?/:uri?', function (req, res, next) {
   var player = devices.get(req.params.id);
   if (!player) {
      res.status(404).send(error('No player found by that ID'));
      return;
   }
   // Autorefresh the page, dropping the action, after 10 seconds.
   res.setHeader('Refresh', "5; url=http://" + req.headers.host + "/" + req.params.id);

   // If there's an action to do, do it.
   if (req.params.action) {
      switch (req.params.action) {
         // Plays a playlist
         case "pl":
            player.device.stop(function (err, stopped) {
               player.device.flush(function (err, flushed) {
                  var playlist = playlists.get(parseInt(req.params.uri));
                  var tracks = playlist.tracks;
                  var queued = 0;
                  // queue every track, depending on the track type.
                  for (var i = 0; i < tracks.length; i++) {
                     switch (tracks[i].type) {
                     case "spotify":
                        player.device.queueSpotify(tracks[i].uri, function (err, data) {
                           queued = queued + 1;
                           if (queued >= tracks.length) {
                              console.log("Sending play... queued is", queued);
                              player.device.play(function (err, playing) {
                                 console.log("play sent");
                                 console.log(err, playing);
                              });
                           }
                        });
                        break;
                     case "mp3":
                        player.device.queue(tracks[i].uri, function (err, queuedit) {
                           queued = queued + 1;
                           if (queued >= tracks.length) {
                              console.log("Sending play... queued is", queued);
                              player.device.play(function (err, playing) {
                                 console.log("play sent");
                                 console.log(err, playing);
                              });
                           }
                        });
                        break;
                     }
                  }
               });
            });
            break;
         case "uri":
            if (req.params.uri) {
               console.log(req.params.uri);
               player.device.play(req.params.uri, function (err, playing) {
                  console.log(err, playing);
               });
            }
            break;
         case "queuespot":
            player.device.queueSpotify(req.params.uri, function (err, data) {
               console.log(err, data);
            });
            break;
         case "flush":
            player.device.flush(function (err, flushed) {
               console.log(err, flushed);
            });
            break;
         case "stop":
            player.device.stop(function (err, stopped) {
               console.log(err, stopped);
            });
            break;
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
      { name : "Playlists", action : "playlists" }
   ];

   // Get the current state so we know what actions to make available to it
   player.device.getCurrentState(function (err, state) {
      if (state == 'stopped' || state == 'paused') {
         softkeys.push({ name : "play", action : "play" });
      } else {
         softkeys.push({ name : "pause", action : "pause" });
      }
      player.device.currentTrack(function (err, track) {
         var curMin = Math.floor(parseInt(track.position) / 60);
         var curSec = parseInt(track.position) - curMin * 60;
         var totalMin = Math.floor(parseInt(track.duration) / 60);
         var totalSec = parseInt(track.duration) - totalMin * 60;
         //console.log(track);
         var root = builder.create('CiscoIPPhoneText');
         root.ele('Title', player.attributes.CurrentZoneName);
         root.ele('Prompt', 'Now Playing: ' + track.title);
         root.ele('Text', 
            "Track: " + track.title + 
            "\nArtist: " + track.artist + 
            "\nAlbum: " + track.album +
            "\nPosition: " + curMin + ":" + curSec + " / " + totalMin + ":" + totalSec  +
            "\n");

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
