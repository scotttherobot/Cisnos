/**
 * A script to import a list of spotify URIs
 * that have been copy-pasted from the spotify
 * app and export is as a playlist file.
 */

var fs = require('fs');

var args = process.argv.slice(2);
var playlists = [];

// For each file name passed in, read it, and put them
// all into the same playlist file.
args.forEach(function (val, index, array) {
   var playlistName = val.replace(/\..+$/, '');
   var data = fs.readFileSync(val, 'utf-8');
   var lines = data.split(/\r\n|\r|\n/g);
   var playlist = { "title" : playlistName, "tracks" : [ ] };
   lines.forEach(function (val, index, array) {
      if (val.length) {
         playlist.tracks.push({ "type" : "spotify", "uri" : val.slice(14) });
      }
   });
   playlists.push(playlist);
});

console.log(JSON.stringify(playlists, null, 2));
