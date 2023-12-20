//To execute:
//$mongo flightTrackerdb initmongo.js 
//Above command to be executed from the directory where initmongo.js is present

//Perform a cleanup of existing data. 
db.dropDatabase()

// Create 2 collections: flights and users
db.createCollection("flights")
db.createCollection("Users")

// Unique ID for users is email address
db.users.insert([
    {
        email: "it5007team2@gmail.com", // This is a real email address.
        name: "Team 2",
        friends: [{email: "alice@gmail.com", name: "Alice"}, {email: "bob@gmail.com", name: "Bob"}],
        searchHistoryWeather:['penang', 'united states','switzerland'],
        searchHistoryFlight:['SQ944', 'QF23']
    },
    {
        email: "alice@gmail.com", // Fictitious user. Email does not exist
        name: "Alice",
        friends: [{email: "it5007team2@gmail.com", name: "Team 2"}, {email: "bob@gmail.com", name: "Bob"}],
        searchHistoryWeather:['bali', 'japan'],
        searchHistoryFlight:['SQ118']

    },
    {
        email: "bob@gmail.com", // Fictitious user. Email does not exist
        name: "Bob",
        friends: [{email: "it5007team2@gmail.com", name: "Team 2"}, {email: "alice@gmail.com", name: "Alice"}],
        searchHistoryWeather:['singapore', 'switzerland'],
        searchHistoryFlight:['TR302']

    },
])

// Unique ID for flights is id.
db.flights.insert([
    {
        id:1,
        flightNumber: 'SQ346',
        from: 'Singapore', departDateTime: new Date('2023-12-01T23:15'),
        to: 'Zurich', arrivalDateTime: new Date('2023-12-02T06:02'), 
        email: "it5007team2@gmail.com",
        name: "Team 2",
        share: ["alice@gmail.com"]
    },

    {
        id:2,
        flightNumber: 'SQ345',
        from: 'Zurich', departDateTime: new Date('2023-12-02T11:45'),
        to: 'Singapore', arrivalDateTime: new Date ('2023-12-03T05:55'),
        email: "it5007team2@gmail.com",
        name: "Team 2",
        share: ["bob@gmail.com"]
    },

    {
        id:3,
        flightNumber: 'FD354',
        from: 'Singapore', departDateTime: new Date('2023-12-09T17:10'),
        to: 'Bangkok', arrivalDateTime: new Date ('2023-12-09T18:40'), 
        email: "it5007team2@gmail.com",
        name: "Team 2",
        share: []
    },

    {
        id:4,
        flightNumber: 'CX734',
        from: 'Singapore', departDateTime: new Date('2023-12-21T16:45'),
        to: 'Hongkong', arrivalDateTime: new Date ('2023-12-21T20:45'), 
        email: "alice@gmail.com",
        name: "Alice",
        share: ["it5007team2@gmail.com", "bob@gmail.com"]
    },

    {
        id:5,
        flightNumber: 'TR652',
        from: 'Singapore', departDateTime: new Date('2023-12-21T18:20'),
        to: 'Phuket', arrivalDateTime: new Date ('2023-12-21T19:20'), 
        email: "bob@gmail.com",
        name: "Bob",
        share: ["it5007team2@gmail.com", "alice@gmail.com"]
    },
])

const flightCount = db.flights.count();
print('Inserted ', flightCount, 'flights');
print('Inserted ', db.users.count(), 'users');

db.counters.remove({ _id: 'flights' });
db.counters.insert({ _id: 'flights', current: flightCount });