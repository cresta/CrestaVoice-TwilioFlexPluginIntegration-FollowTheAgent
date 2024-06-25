## Documentation

This repo contains a sample Twilio Flex plugin and one Serverless Twilio Function.

The required events Cresta needs to be informed about are:

1. Call Acceptance by the Agent
2. Call Transfer/Conference by the Agent (this is handled by wrapping up a task)
3. Call Completion by the Agent

### Integration Approaches to trigger the call to start/stop Twilio Media Streams

1. Twilio [Task Router Event Callbacks](https://www.twilio.com/docs/taskrouter/api/event/reference)
2. Twilio Event Steams ([Task Router Event Types](https://www.twilio.com/docs/events/event-types#taskrouter))
3. Twilio Flex Plugin - covered here ([Twilio Plugin Actions Framework](https://www.twilio.com/docs/flex/developer/ui/actions))

The Twilio Flex plugin will make a call to one Twilio Function to enable a Twilio Media Stream when a Task for an inbound voice call is accepted. The Agent CallSid (call leg) is used to set-up the media stream.

### The following pre-work is required to customize the code for your environment

#### Flex PlugIn
1. For the Twilio Flex Plugin code, make sure to modify the Twilio Function URL’s to start and stop the media streams to the unique FQDN’s of the same Functions created in your unique Flex instance.

#### Twilio Functions
1. The Twilio Function is created as a public Functions (Twilio Token Validator will moderate the use of this Function by extrernal parties).

2. For the Twilio Functions, make sure when creating a Twilio Function Service, to update the default Twilio Node Helper Library (under Dependencies) to a more recent version (the default version, 3.29.2 is very old and does not support Media Streams), we used the latest at the time, 3.78.0.

3. For the Twilio Functions, make sure to also add the NPM package, Twilio Token Validator, as a dependency, we used the latest at the time, 1.5.6.

4. Cresta will provide a unique Websocket URL (which must be provided in the Twilio Function that initiates the media stream). Make sure to use wss:// as the scheme.

5. Cresta will provide you a unique Token to distinguish your Twilio instance when sending the media streams to the websocket URL. You will set this token as an environment variable for your Twilio Function Service with the name: CRESTA_TOKEN.


