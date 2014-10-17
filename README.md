## Cisnos

This is a Cisco controller for Cisco IP phones. It uses the Cisco XML
service standard, which you can find the docs for [here](http://www.cisco.com/c/en/us/td/docs/voice_ip_comm/cuipph/all_models/xsi/8_0_1/xsi_dev_guide/xmlobjects.html).

I wrote this because I have a bunch of Sonos speakers, and I also have a bunch
of Cisco IP phones throughout my house and I figured they'd be a convenient
place to control Sonos.

Functionality is pretty basic at this point, and it doesn't support playlists defined
by the Sonos service yet. You can define playlists in a JSON format though and queue
from those (which is what I did, as I needed to push custom Spotify URIs to the players).

Note: this will crash if you have players grouped and you attempt to control a 
player that's not the root controller for that group.

To run, install the dependencies with npm and spin up the app with node. It'll
automagically find your controller and all your speakers.
