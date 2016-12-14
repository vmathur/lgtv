'use strict';

// --------------- Functions that control the skill's behavior -----------------------
var request = require('request')

function getWelcomeResponse(callback) {
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to a sample app'
    const repromptText = 'Sorry I didn\'t get that';
    const shouldEndSession = true;

    callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying the Hello world. Have a nice day!';
    const shouldEndSession = true;
    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function setInput(intent, session, callback) {
    const cardTitle = intent.name;
    const input = intent.slots.Input.value;
    let speechOutput = 'switching input to '+input;
    let repromptText = 'keep testin';
    let sessionAttributes = {};
    const shouldEndSession = true;
    updateFirebase('tv-input',input);

    callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function setVolume(intent, session, callback) {
    const cardTitle = intent.name;
    const volume = intent.slots.volume.value;
    let speechOutput = 'changing volume to '+volume;
    const shouldEndSession = true;
    updateFirebase('tv-volume',volume);

    callback(sessionAttributes,buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function updateFirebase(field, value){
    var url = "https://alexa-tv-control.firebaseio.com/"+field+".json"
    request({
        url: url,
        method: "PUT",
        json: true,   // <--Very important!!!
        body: {"value":value}
    }, function (error, response, body){
        if(error) console.log(error);
    });
}
// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
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
    }else if (intentName === 'SetVolume') {
        setVolume(intent, session, callback);
    }else {
        throw new Error('Invalid intent');
    }
}

function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

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
