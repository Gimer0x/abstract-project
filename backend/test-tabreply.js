// Test file to identify tabReply deprecation warning
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// Test session configuration
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false
}));

// Test passport configuration
app.use(passport.initialize());
app.use(passport.session());

console.log('Testing for tabReply deprecation warning...');
console.log('If you see the warning, it will appear above this message.');

app.listen(3001, () => {
  console.log('Test server running on port 3001');
  console.log('Check the console output above for any deprecation warnings.');
}); 