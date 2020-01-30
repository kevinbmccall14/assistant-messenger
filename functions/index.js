const { DialogflowApp } = require('actions-on-google');
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const Actions = {
  WELCOME: 'input.welcome',
  UNKNOWN: 'input.unknown',
  ADD_CONTACT: 'add-contact',
  SEND_TEXT: 'send-text',
};

/** Dialogflow Parameters {@link https://dialogflow.com/docs/actions-and-parameters#parameters} */
const Parameters = {
  ELEMENT: 'element',
};

exports.dialogflowFulfillment = functions.https.onRequest(
  (request, response) => {
    console.log(
      'Request headers: ' + JSON.stringify(request.headers),
    );
    console.log('Request body: ' + JSON.stringify(request.body));

    const app = new DialogflowApp({ request, response });

    // Dialogflow function handler
    const actionMap = new Map();
    // actionMap.set(Actions.WELCOME, welcome);
    // actionMap.set(Actions.UNKNOWN, unknown);
    actionMap.set(Actions.ADD_CONTACT, addContact);
    actionMap.set(Actions.SEND_TEXT, sendText);
    app.handleRequest(actionMap);

    function welcome(app) {
      app.ask('Welcome to the google assisstant messenger');
    }

    function unknown(app) {
      app.ask('I could not understand your command');
    }

    // adding contact to firebase realtime database
    function addContact(app) {
      console.log('adding contact function triggered');

      const contact = request.body.result.parameters['given-name'];
      const number = request.body.result.parameters['phone-number'];

      if (!contact) {
        response.status(422).send('Contact must not be blank');
        return;
      }

      var PHONE_REGEX = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/;
      if (!number.match(PHONE_REGEX)) {
        response.status(422).send('Phone number must not be blank');
        return;
      }

      return admin
        .database()
        .ref('/contacts')
        .child(contact)
        .set({ phone_number: number })
        .then(() => {
          return app.tell(contact + ' saved into contacts');
        });
    }

    // sending text to contact using Twilio
    function sendText(app) {
      console.log('send text message function triggered');
      const contact = request.body.result.parameters['given-name'];
      const msg = request.body.result.parameters['any'];
      admin
        .database()
        .ref('/contacts')
        .once('value', snapshot => {
          const number = snapshot.val()[contact].phone_number;

          if (number) {
            console.log('found ' + number + ' for ' + contact);
            const client = require('twilio')(
              functions.config().twilio.sid,
              functions.config().twilio.token,
            );

            client.messages.create(
              {
                to: number,
                from: '+16084000239',
                body: msg,
              },
              (err, message) => {
                console.log(message.sid);
              },
            );
          } else {
            response
              .status(404)
              .send('Phone number not found in contacts');
            return;
          }
        });

      return app.tell('Text message sent to ' + contact);
    }
  },
);
