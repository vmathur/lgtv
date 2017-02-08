var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var lgtv = require("lgtv");
var firebase = require("firebase");

var inputMapper = {
	'live'        : "LIVE",
	'1'           : "HDMI_1",
	'2'           : "HDMI_2",
	'Xbox'        : "HDMI_2",
	'PlayStation' : "HDMI_3",
	'3'           : "HDMI_3"
}

var config = {
	apiKey: "AIzaSyBUrl9DLkJ6mBjuXEkDdDEF3twi8Zpf5xc",
	authDomain: "alexa-tv-control.firebaseapp.com",
	databaseURL: "https://alexa-tv-control.firebaseio.com",
	storageBucket: "alexa-tv-control.appspot.com"
};

firebase.initializeApp(config);
var tvInput = firebase.database().ref('tv-input');
var tvVolume = firebase.database().ref('tv-volume');
var tvOff = firebase.database().ref('tv-off');
var tvVolumeChange = firebase.database().ref('tv-volume-change');

var tv_ip_address = process.argv[2]|| "192.168.0.113";
var VOLUME_CHANGE = 5;

console.log("ip address is :"+tv_ip_address);
console.log("starting discovery");

lgtv.connect(tv_ip_address, function(err, response){
	if (err) {
		console.log("Failed to find TV IP address on the LAN. Verify that TV is on, and that you are on the same LAN/Wifi.");
	} else {		
		lgtv.show_float("Alexa connected", function(err, response){});
	
		if (!err)
		tvInput.on('value', function(snapshot) {
			if(snapshot.val()){
				var input = snapshot.val().value;
				console.log(inputMapper[input]);
				changeInput(tv_ip_address,inputMapper[input]);
			}
		});
	
		tvVolume.on('value', function(snapshot) {
			if(snapshot.val()){
				var volume = snapshot.val().value;
				changeVolume(tv_ip_address,volume);
			}
		});
		
		tvOff.on('value', function(snapshot) {
			if(snapshot.val()){
				var off = snapshot.val().value;
				if(off){
					tvOff.set({"value":false})
					console.log('turning off');
					lgtv.turn_off();	
				}					
			}
		});

		tvVolumeChange.on('value', function(snapshot) {
			if(snapshot.val()){
				console.log('changing volume');
				var change = snapshot.val().value;
				tvVolumeChange.set({"value":0})
				lgtv.volume(function(RESULT, currentVolume){
					var factor = parseInt(change);
					var newVolume = currentVolume+factor*VOLUME_CHANGE;
					changeVolume(tv_ip_address,newVolume);
				});			
			}
		});
  }
});

function changeInput(tv_ip_address,input){
	if(input){
		lgtv.show_float("Changing input to "+input, function(err, response){});
		if(input=='LIVE'){
		 	lgtv.start_app("com.webos.app.livetv", function(err, response){});
		}else{
    		lgtv.set_input(input, function(err, response){});
		}
	}
}

function changeVolume(tv_ip_address,volume){
	if(volume){
	    console.log("setting volume to:" + volume);
	    lgtv.set_volume(Number(volume), function(err, response){});
	}
}

app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', function (req, res) {
    res.send('Alexa LGTV control');
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 3000));
