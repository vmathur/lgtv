//require
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var lgtv = require("lgtv");
var firebase = require("firebase");
var config = require("./config");
var Client = require('castv2').Client;
var mdns = require('mdns');



//initialize firebase
firebase.initializeApp(config.firebase);
var tvInput = firebase.database().ref('tv-input');
var tvVolume = firebase.database().ref('tv-volume');
var tvOff = firebase.database().ref('tv-off');
var tvOn = firebase.database().ref('tv-on');
var tvVolumeChange = firebase.database().ref('tv-volume-change');

//set constants
var inputMapper = config.inputMapper;
var tv_ip_address = process.argv[2]|| config.TVIpAddress;
var chromeCastIp = config.chromeCastIp;
var VOLUME_CHANGE = 5;

//connect to chromecast
var browser = mdns.createBrowser(mdns.tcp('googlecast'));
console.log("starting chromecast discovery");
browser.start();

tvOn.on('value', function(snapshot) {
	if(snapshot.val()){
		var on = snapshot.val().value;
		if(on){
			tvOn.set({"value":false})
			console.log('turning on');
			ondeviceup(chromeCastIp);
			changeInput(tv_ip_address,inputMapper["live"]);
		}					
	}
});

//connect to LGTV
console.log("starting tv discovery");
console.log("tv ip address is :"+tv_ip_address);

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

function ondeviceup(host) {
  var client = new Client();
  client.connect(host, function() {
    var connection = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.tp.connection', 'JSON');
    var receiver   = client.createChannel('sender-0', 'receiver-0', 'urn:x-cast:com.google.cast.receiver', 'JSON');

    connection.send({ type: 'CONNECT' });
    receiver.send({ type: 'LAUNCH', appId: 'CC1AD845', requestId: 1 });
  });
}

browser.on('serviceUp', function(service) {
  console.log('found device %s at %s:%d', service.name, service.addresses[0], service.port);
  chromeCastIp = service.addresses[0];
});


app.use(bodyParser.urlencoded({
    extended: true
}));

app.get('/', function (req, res) {
    res.send('Alexa LGTV control');
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 3000));
