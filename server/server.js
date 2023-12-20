const fs = require('fs');
const express = require('express');
const { ApolloServer, UserInputError } = require('apollo-server-express');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const { MongoClient } = require('mongodb');

/******************************************* 
DATABASE CONNECTION CODE
********************************************/
//Note that the below variable is a global variable 
//that is initialized in the connectToDb function and used elsewhere.
let db;

//Function to connect to the database: flightTrackerdb
async function connectToDb() {
    const url = 'mongodb://localhost/flightTrackerdb';
    const client = new MongoClient(url, { useNewUrlParser: true });
    await client.connect();
    console.log('Connected to MongoDB at', url);
    db = client.db();
  }

/******************************************* 
GraphQL CODE
********************************************/  
const resolvers = {
  Query: {
    getFlights: getFlightsResolver,
    getSharedFlights: getSharedFlightsResolver,
    // getFriends: getFriendsResolver,
    getUser: getUserResolver,
    getUserFriends: getUserFriendsResolver,
  },

  Mutation: {
    deleteFlight: deleteFlightResolver,
    addFlight: addFlightResolver,
    updateFlight: updateFlightResolver,
    updateShareFlight: updateShareFlightResolver,
    addUser: addUserResolver,
    addFriend: addFriendResolver,
    addLocationSearchHistory:addLocationSearchHistoryResolver,
    addFlightSearchHistory:addFlightSearchHistoryResolver,
    deleteFriend: deleteFriendResolver
  }
}

const GraphQLDate = new GraphQLScalarType({
  name: 'GraphQLDate',
  description: 'A Date() type in GraphQL as a scalar',
  serialize(value) {
    return value.toISOString();
  },
  parseValue(value) {
    const dateValue = new Date(value);
    return isNaN(dateValue) ? undefined : dateValue;
  },
  parseLiteral(ast) {
    if (ast.kind == Kind.STRING) {
      const value = new Date(ast.value);
      return isNaN(value) ? undefined : value;
    }
  },
});

/******************************************* 
Flights Resolver
********************************************/  

// Function to get all flights from a user
async function getFlightsResolver(_, {email}){
  try {
    const result = await db.collection('flights').find({email: email}).toArray();
    return result;

  } catch (error) {
    throw new Error(`Error getting flights: ${error.message}`);
  }
};

// Function to get all flights shared with a user
async function getSharedFlightsResolver(_, {email}){
  try {
    const allFlights = await db.collection('flights').find().toArray();
    const result = [];
    for (let i=0; i<allFlights.length; i++){
      if (allFlights[i].share == undefined){
        continue;
      }
      if (allFlights[i].share.includes(email)){
        result.push(allFlights[i]);
      }
    }
    return result;

  } catch (error) {
    throw new Error(`Error getting shared flights: ${error.message}`);
  }
};

// Function to delete a flight
async function deleteFlightResolver(_, {id}){
  try {
    const result = await db.collection('flights').deleteOne({id: Number(id)});

    const deletedCount = result.deletedCount;

    if (deletedCount == 1){
      return Number(id);
    }

  } catch (error) {
    throw new Error(`Error deleting question: ${error.message}`);
  }
}

// Function to add a flight
async function addFlightResolver(_, {flight}){
  try {
    const {flightNumber, from, departDateTime, to, arrivalDateTime, email, name} = flight;

    const newFlight = {
      id: await getNextSequence('flights'), // Get the next running number as id
      flightNumber,
      from,
      departDateTime,
      to,
      arrivalDateTime,
      email,
      name
    }

    const result = await db.collection('flights').insertOne(newFlight);
    if (result.insertedId){
      return true;
    }
    else{
      return false;
    }
  } catch (error) {
    throw new Error(`Error adding flight: ${error.message}`);
  }
}

// Function to update a flight
async function updateFlightResolver(_, args) 
{
  try {
    const { id, flight } = args; // id is the flight id, flight contains the flight details to be updated.
    const {flightNumber, from, departDateTime, to, arrivalDateTime} = flight;

    const result = await db.collection('flights').updateOne({id: Number(id)}, {$set: {flightNumber: flightNumber, from: from, departDateTime: departDateTime, to: to, arrivalDateTime: arrivalDateTime}})
    if (result.modifiedCount == 1){
      return true;
    }
    else{
      return false;
    }
  } catch (error) {
    throw new Error(`Error updating flight: ${error.message}`);
  }
}

// Function to update a list of friends whom the flight is shared with
async function updateShareFlightResolver(_, args) 
{
  try {
    const { id, share } = args; // id is the flight id, share is the list of friends whom the flight is shared with.

    const result = await db.collection('flights').updateOne({id: Number(id)}, {$set: {share: share}})
    if (result.modifiedCount == 1){
      return true;
    }
    else{
      return false;
    }
  } catch (error) {
    throw new Error(`Error updating share flight: ${error.message}`);
  }
}

// Function to get the next running number as FlightId
async function getNextSequence(name) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { current: 1 } },
    { returnOriginal: false },
  );
  return result.value.current;
}

/******************************************* 
Friends and Users Resolver
********************************************/  
async function addFriendResolver(_, { userEmail, friendEmail }) {
  try {
    // Check if the friend email is the same as the user email
    if (userEmail === friendEmail) {
      throw new Error('You cannot add yourself as a friend.');
    }

    // Check if friend exists in the database
    const friend = await db.collection('users').findOne({ email: friendEmail });
    if (!friend) {
      throw new Error('Friend not found on website.');
    }

    // Get the user from the database
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      throw new Error('User not found.');
    }

    // Check if the friend is already in the user's friend list
    if (user.friends && user.friends.some(friendObj => friendObj.email === friendEmail)) {
      throw new Error('This email is already part of your friends list.');
    }

    // Add the friend to the user's friends list
    const updatedUser = await db.collection('users').findOneAndUpdate(
      { email: userEmail },
      { $push: { friends: {email: friend.email, name: friend.name} } },
      { returnOriginal: false }
    );

    return updatedUser.value; // Return the updated user object
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function addLocationSearchHistoryResolver(_, { email, searchHistoryWeather }) {
  const user = await db.collection('users').findOne({ email: email });
  if (!user) {
    throw new Error('User not found.');
  }

  // Check if the searchHistoryWeather already exists in the searchHistory array
  const existingIndex = user.searchHistoryWeather.findIndex(history => history === searchHistoryWeather);
  if (existingIndex !== -1) {
    // If it exists, remove it from the array
    user.searchHistoryWeather.splice(existingIndex, 1);
  }

  // Add the searchHistoryWeather at the beginning of the array
  user.searchHistoryWeather.unshift(searchHistoryWeather.toLowerCase());

  const updatedUser = await db.collection('users').findOneAndUpdate(
    { email: email },
    { $set: { searchHistoryWeather: user.searchHistoryWeather } },
    { returnOriginal: false }
  );
  return updatedUser.value; // Return the updated user object
}

// Function to add flight search history of a user
async function addFlightSearchHistoryResolver(_, { email, searchHistoryFlight }) {
  const user = await db.collection('users').findOne({ email: email }); // Retrieve the user first
  if (!user) {
    throw new Error('User not found.');
  }

  // Check if the new searchHistoryFlight already existed in the searchHistoryFlight array
  const existingIndex = user.searchHistoryFlight.findIndex(history => history === searchHistoryFlight.toUpperCase());
  if (existingIndex !== -1) {
    // If it exists, remove it from the array
    user.searchHistoryFlight.splice(existingIndex, 1);
  }

  // Add the searchHistoryFlight at the beginning of the array
  user.searchHistoryFlight.unshift(searchHistoryFlight.toUpperCase());

  const updatedUser = await db.collection('users').findOneAndUpdate(
    { email: email },
    { $set: { searchHistoryFlight: user.searchHistoryFlight } },
    { returnOriginal: false }
  );
  return updatedUser.value; // Return the updated user object
}

async function deleteFriendResolver(_, { userEmail, friendEmail }) {
  try {
    // Check if the friend email is the same as the user email
    if (userEmail === friendEmail) {
      throw new Error('You cannot delete yourself as a friend.');
    }

    // Get the user from the database
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user) {
      throw new Error('User not found.');
    }

    // Check if the friend is in the user's friend list
    const friendIndex = user.friends.findIndex(friend => friend.email === friendEmail);

    if (friendIndex === -1) {
      throw new Error('Friend not found in your friends list.');
    }

    // Remove the friend from the user's friends list
    user.friends.splice(friendIndex, 1);

    // Update the user's friends list in the database
    const updatedUser = await db.collection('users').findOneAndUpdate(
      { email: userEmail },
      { $set: { friends: user.friends } },
      { returnOriginal: false }
    );

    return updatedUser.value; // Return the updated user object
  } catch (error) {
    console.error(error);
    throw error;
  }
};


async function getUserFriendsResolver(_, { email }) {
  try {
    // Retrieve the user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      throw new Error('User not found.');
    }

    // Assuming friends is an array of user objects (or just email addresses)
    const friendsList = user.friends || [];

    // Fetch each friend's details
    const friendsDetails = await Promise.all(
      friendsList.map(friend =>
        db.collection('users').findOne({ email: friend.email }))
    );

    // Return the details, filtering out any potential nulls
    return friendsDetails.filter(friend => friend !== null);
  } catch (error) {
    console.error(error);
    throw new Error(`Error fetching user's friends: ${error.message}`);
  }
};


async function addUserResolver(_, { email, name }) {
  const newUser = { email, name, searchHistoryWeather: [], searchHistoryFlight:[] };
  const result = await db.collection('users').insertOne(newUser);
  return newUser; // Return the new user object
}

async function getUserResolver(_, { email }) {
  return await db.collection('users').findOne({ email });
};

/******************************************* 
SERVER INITIALIZATION CODE
********************************************/
const app = express();

//Creating and attaching a GraphQL API server.
const server = new ApolloServer({
  typeDefs: fs.readFileSync('./schema.graphql', 'utf-8'),
  resolvers,
  formatError: error => {
    console.log(error);
    return error;
  },
});
server.applyMiddleware({ app, path: '/graphql' });

//Starting the server that runs forever at port 3000.
(async function () {
  const port = 3000;
  try {
    await connectToDb();
    app.listen(port, function () {
      console.log('App started on port ', port);
    });
  } catch (err) {
    console.log('ERROR:', err);
  }
})();