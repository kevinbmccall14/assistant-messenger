const { dialogflow } = require('actions-on-google');
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

// Create an app instance
const app = dialogflow();

// Register handlers for Dialogflow intents

app.intent('Default Welcome Intent', conv => {
  conv.ask('Welcome to the google assistant messenger');
});

app.intent('Default Fallback Intent', conv => {
  conv.ask(`I could not understand your command`);
});

app.fallback(conv => {
  conv.ask(`I could not understand your command`);
});

app.catch((conv, error) => {
  console.error(error);
  conv.ask('I encountered a glitch. Can you say that again?');
});

// sending text to contact using Twilio
app.intent(
  'send-text',
  async (conv, { 'given-name': contact, any: msg }) => {
    console.log('send text message intent triggered');
    const snapshot = await admin
      .database()
      .ref('/contacts')
      .once('value')
      .catch(err => console.error(err));

    const number = snapshot.val()[contact].phone_number;
    if (number) {
      console.log('found ' + number + ' for ' + contact);
      const client = require('twilio')(
        functions.config().twilio.sid,
        functions.config().twilio.token,
      );
      const message = await client.messages.create({
        to: number,
        from: functions.config().twilio.number,
        body: msg,
      });
    } else {
      throw new Error('Could not find contact phone number');
    }
    conv.ask(`Text message sent to ${contact}`);
  },
);

// adding contact to firebase realtime database
app.intent(
  'add-contact',
  async (conv, { 'given-name': contact, 'phone-number': phone }) => {
    console.log('adding contact function triggered');

    if (!contact) {
      throw new Error('You must provide a name for the contact');
    }

    var PHONE_REGEX = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/;
    if (!phone.match(PHONE_REGEX)) {
      throw new Error(
        'You must provide a valid phone number for the contact',
      );
    }

    await admin
      .database()
      .ref('/contacts')
      .child(contact)
      .set({ phone_number: phone });

    conv.ask(`${contact} saved into contacts`);
  },
);

// for fulfillment
exports.dialogflowFulfillment = functions.https.onRequest(app);
// for testing
exports.messengerApp = app;
