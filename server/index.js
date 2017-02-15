'use strict';
var config = require("./config");
var request = require('request')

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the TV control app'
    const shouldEndSession = true;

    callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, '', shouldEndSession));
}

function setInput(intent, session, callback) {
    const cardTitle = intent.name;
    const input = intent.slots.Input.value;
    const speechOutput = 'Swiching input to '+input;
    const sessionAttributes = {};
    const shouldEndSession = true;
    const field = 'tv-input';
    updateFirebase(field,input);

    callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, '', shouldEndSession));
}

function setVolume(intent, session, callback) {
    const cardTitle = intent.name;
    const volume = intent.slots.Volume.value;
    const speechOutput = 'Changing volume to '+volume;
    const shouldEndSession = true;
    const sessionAttributes = {};
    updateFirebase('tv-volume',volume);

    callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, '', shouldEndSession));
}

function changeVolume(intent, session, change, callback) {
    const cardTitle = intent.name;
    var speechOutput = " ";
    if(change>0){
        speechOutput = 'Turning up';
    }else{
        speechOutput = 'Turning down';        
    }
    const shouldEndSession = true; 
    updateFirebase('tv-volume-change',change);
    let sessionAttributes = {};

    callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, '', shouldEndSession));
}

function shutOff(intent, session, callback) {
    const cardTitle = intent.name;
    const speechOutput = 'Turning off';
    const shouldEndSession = true;
    const sessionAttributes = {};
    updateFirebase('tv-off',true);

    callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, '', shouldEndSession));
}

function turnOn(intent, session, callback) {
    const cardTitle = intent.name;
    const speechOutput = 'Turning on';
    const shouldEndSession = true;
    const sessionAttributes = {};
    updateFirebase('tv-on',true);

    callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, '', shouldEndSession));
}

function updateFirebase(field,input){
    var url = config.getUrl(field);
    request({
        url: url,
        method: "PUT",
        json: true,
        body: {"value":input}
    }, function (error, response, body){
    });
}

// --------------- Events -----------------------
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}


function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);
    getWelcomeResponse(callback);
}

function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    if (intentName === 'SetInput') {
        setInput(intent, session, callback);
    } else if (intentName === 'SetVolume'){
        setVolume(intent, session, callback);
    } else if (intentName === 'ShutOff'){
        shutOff(intent, session, callback);
    } else if (intentName === 'TurnOn'){
        turnOn(intent, session, callback);
    } else if (intentName === 'IncreaseVolume'){
        changeVolume(intent, session, 1, callback);
    } else if (intentName === 'DecreaseVolume'){
        changeVolume(intent, session, -1, callback);
    } else {
        throw new Error('Invalid intent');
    }
}

function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
}


// --------------- Main handler -----------------------
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        if (event.session.application.applicationId !== config.appId) {
             callback('Invalid Application ID');
        }

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
// --------------- Helpers that build all of the responses -----------------------
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}
