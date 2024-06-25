/* 

Initiate a Twilio Media Stream with Parameters

Version 1.0.4 

REQUIRED: CRESTA_TOKEN configured as Environmental Parameter (Environmental Parameters of your Twilio Function Service)
REQUIRED: Passing in agentId (POST or GET)
REQUIRED: Passing in callId (POST or GET) - Use is Deprecated
REQUIRED: Passing in conferenceSid (POST or GET) - Call SID's are discovered by looking up conference participants
Edit the Websocket URL parameter below, to match your unique Cresta provided websocket URL

Changes 

1.0.4 Release

Refactor Code

Add Comments
Add Media Stream parameter, ParticipantMode, used to tell Cresta which channel is the customer and which is the Agent (note this is also depedent on what CallSid we bind to)
-- visitor means follow the visitor (When we bind to the customer, outbound is the customer and inbound is the Agent)-- By default, we use visitor mode if not specified, agent means follow the agent.


1.0.3 Release

Refactor to obtain agent CallId from Conference SID, to be abe to handle requirement to capture the Agent side of the conversation. Twilio Flex does not provide a straightforward way to obtain the Agent's CallID for transfer situations which requires backing into it from the Conference SID.

1.0.2 Release
Modify the Twilio Media Stream Name structure, from:

name: `callId-${callId}`

to

name: `${agentId}-${callId}`

To address call transfer use cases, to prevent Media Stream name duplication

1.0.1 Release

We will concatenate the callSid with a dash delimiter + ms since 1970, to allow transfer scenarios
if the Twilio callSid is used as the unique callId identifier. Duplicate callIds per Cresta transcription
are not allowed and happen when transferring a call. 

Code Snippet change:  'parameter3.value': callId + '-' + new Date().getTime() 

Added an environmental variable, CUSTOMER_WSS_URL

*/

const TokenValidator = require('twilio-flex-token-validator').functionValidator;

/* This function uses the Twilio Conference Participants Resource to extract out the different
 Call Leg CallSids in a Conference */

function returnCallSidsInConferenence (client, conferenceSid) {
  return new Promise(async (resolve, reject) => {
    let result = await client.conferences(conferenceSid)
        .participants
        .list({ limit: 3 })
    resolve(result.map(participant => participant.callSid))
    resolve(result);
})}

/* This function uses the Twilio Calls Resource to determine if the call leg is
 for the agent */

function callSidDetails (client, agentUsername, callSid) {
  return new Promise(async (resolve, reject) => {
    let result = await client.calls(callSid)
      .fetch()
    if(result.toFormatted === agentUsername) {
      resolve(true);
    }
    resolve(false);
})}

exports.handler = TokenValidator(async function(context, event, callback) {

  const url = "wss://" + context.CUSTOMER_WSS_URL;
  console.log(`The Websocket URI is ${url}`);
  
  const client = context.getTwilioClient();
  const response = new Twilio.Response();

  response
    .appendHeader('Access-Control-Allow-Origin', '*')
    .appendHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET')
    .appendHeader('Access-Control-Allow-Headers', 'Content-Type')
    .appendHeader('Content-Type', 'application/json');
  
  const { agentId = "", callId = "", conferenceSid = "" } = event;

  console.log('agentId: ', agentId);

  const CRESTA_TOKEN = context.CUSTOMER_CRESTA_TOKEN

  function errorCheck(CRESTA_TOKEN, agentId, callId, conferenceSid) {

    let error = 0;

    if (CRESTA_TOKEN==="" || CRESTA_TOKEN===undefined || CRESTA_TOKEN===null ){
      console.log("REQUIRED: Missing Cresta token environmment variable.");
      error = 1;
    }
    if (agentId==="" || agentId===undefined || agentId===null){
      console.log("REQUIRED: Missing Cresta agentId");
      error = 1;
    }
    if (callId==="" || callId===undefined || callId===null){
      console.log("REQUIRED: Missing callId");
      error = 1;
    }
    if (conferenceSid==="" || conferenceSid===undefined || conferenceSid===null){
      console.log("REQUIRED: Missing conferenceSid");
      error = 1;
    }
    return error
  }

  if (errorCheck(CRESTA_TOKEN, agentId, callId, conferenceSid)) {
      
    response
      .setBody({result: 'Missing Configuration Parameters. Check Console Log.'})
      .setStatusCode(500);
    return callback(null, response)

  } else {

    let callSids = await returnCallSidsInConferenence(client, conferenceSid);

    let keyCallSidPromises = callSids.map(async callSid => {
      const details = await callSidDetails(client, agentId.replace(/\./g, '_2E'), callSid);
      return { callSid, details }; // Return both callSid and the boolean result of a match
    });

    let keyCallSidWithDetails = await Promise.all(keyCallSidPromises);

    console.log('keyCallSidWithDetails: ', keyCallSidWithDetails);

    let agentCallId = keyCallSidWithDetails.filter(item => item.details === true)

    console.log(`agentCallId:`, agentCallId);

    console.log(`XX Starting Media Stream for: ${agentId}-${agentCallId[0].callSid} XX`);

    client.calls(agentCallId[0].callSid)
        .streams
        .create({
          name: `${agentId}-${agentCallId[0].callSid}`, // prefixed with agentId to prevent media stream name duplication
          track: 'both_tracks',
          'parameter1.name': 'AgentId',
          'parameter1.value': agentId,
          'parameter2.name': 'Token',
          'parameter2.value': context.CRESTA_TOKEN,
          'parameter3.name': 'CallId',
          'parameter3.value': agentCallId[0].callSid + '-' + new Date().getTime(),
          url: url,
          'parameter4.name': 'ParticipantMode',
          'parameter4.value': `agent`,          
        })
        .then(stream => {
          console.log(`The streamSid: ${stream.sid}`);
          response
            .setBody({result: stream.sid})
            .setStatusCode(200);
          return callback(null, response);
        })
        .catch(error => {
          console.log(error);
          response
            .setStatusCode(500)
            .setBody({result: error});
          return callback(null, response);
        })
  }
});