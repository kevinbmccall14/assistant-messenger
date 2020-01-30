import test from 'ava';
import sendTextRequest from './send_text_request.json';
import addContactRequest from './add_contact_request.json';

const {
  DATABASE_URL,
  STORAGE_BUCKET,
  PROJECT_ID,
  GOOGLE_APPLICATION_CREDENTIALS,
} = process.env;

const firebase = require('firebase-functions-test')(
  {
    databaseURL: DATABASE_URL,
    storageBucket: STORAGE_BUCKET,
    projectId: PROJECT_ID,
  },
  GOOGLE_APPLICATION_CREDENTIALS,
);

let messengerApp;
test.before(() => {
  // TEST CREDENTIALS
  firebase.mockConfig({
    twilio: {
      sid: 'AC5fdb38ad5c49ebe359e95813f57a420f',
      token: '80b1c1fc03a707bf355671854b49ca15',
      number: '+15005550006',
    },
  });
  messengerApp = require('../index').messengerApp;
});

test.after(() => {
  firebase.cleanup();
});

test.serial('responds with default intent', async t => {
  const json = await messengerApp({}, {});
  t.is(
    json.body.payload.google.richResponse.items[0].simpleResponse
      .textToSpeech,
    'I could not understand your command',
  );
});

test.serial('responds to text intent', async t => {
  const json = await messengerApp(sendTextRequest, {});
  t.is(
    json.body.data.google.richResponse.items[0].simpleResponse
      .textToSpeech,
    'Text message sent to Chloe',
  );
});

test.serial('responds to add contact intent', async t => {
  const json = await messengerApp(addContactRequest, {});
  t.is(
    json.body.data.google.richResponse.items[0].simpleResponse
      .textToSpeech,
    'johnny saved into contacts',
  );
});
