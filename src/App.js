/**
 * The provided file, App.js, is a JavaScript file that is part of a React project. 
 * It contains the main component, App, which serves as the entry point for the application
 * The file begins with importing necessary dependencies from various libraries, such as React, react-bootstrap, and FontAwesome. 
 * It also imports two custom components, Googlemap and FlightItinerary, from local files.
 */


import React, { useState, useEffect} from 'react'
import Googlemap from './googlemaps/googlemaps';
import FlightItinerary from "../src/flightItinerary/flightItinerary"
import {Container,Row,Col,Navbar,Nav, Badge,Alert} from 'react-bootstrap'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faUsers, faBell, faHouse, faPlaneDeparture, faUserCircle, faSignOutAlt,faEnvelope } from "@fortawesome/free-solid-svg-icons";
import Login from './Login';
import Friends from './Friends';


async function graphQLFetch(query, variables = {}) {
  try {
    const response = await fetch('http://localhost:3000/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify({ query, variables })
    });
    const body = await response.text();
    const result = JSON.parse(body);
    /*
    Check for errors in the GraphQL response
    */
    if (result.errors) {
      const error = result.errors[0];
      if (error.extensions.code == 'BAD_USER_INPUT') {
        const details = error.extensions.exception.errors.join('\n ');
        alert(`${error.message}:\n ${details}`);
      } else {
        alert(`${error.extensions.code}: ${error.message}`);
      }
    }
    return result.data;
  } catch (e) {
    alert(`Error in sending data to server: ${e.message}`);
  }
}



function App() {
  const email = localStorage.getItem('email');
  
  const Views = {
    HOME: 'HOME',
    FRIENDS: 'FRIENDS',
    FLIGHT: 'FLIGHT',
    PROFILE: 'PROFILE'
  };

  const [currentView, setCurrentView] = useState(Views.HOME);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [flightData, setFlightData] = useState([]);
  const [showFlightAlert, setShowFlightAlert] = useState(false);
  const [showNotification, setShowNotification] = useState(true);

  const handleProfileClick = () => {
    setCurrentView(Views.PROFILE);
  };

  const fetchFlight = async (email) => {
    const getFlights = `query getFlights($email: String!){
      getFlights(email: $email){
        id,
        flightNumber, from, departDateTime
        to, arrivalDateTime, email, share
      }
    }`;

    try {
      const data = await graphQLFetch(getFlights, {email});
      if (data.getFlights){
        let flights = data.getFlights;
        const today = new Date();
        const fortyEightHoursFromNow = new Date(today.getTime() + 48 * 60 * 60 * 1000);
        const filteredFlights = flights.filter(flight => new Date(flight.departDateTime) <= fortyEightHoursFromNow && new Date(flight.departDateTime) >= today);
        return filteredFlights
      }
    } catch (error) {
      alert('Error getting list of flights:', error);
    }
  }

  const fetchUser = async (email) => {
    const query = `
        query getUser($email: String!) {
            getUser(email: $email) {
                email
                name
                searchHistoryWeather
                searchHistoryFlight
            }
        }
    `;

    const variables = { email };
    const result = await graphQLFetch(query, variables);
    return result.getUser; // Return the user object or undefined
  };


  useEffect(() => {
    if (email) {
      fetchFlight(email).then((flights) => {
        setFlightData(flights);
      });
      fetchUser(email).then((user) => {
        setUserData(user);
        setIsLoggedIn(true);
      });
    }
  }, [email]);

  const handleFlightClick = () => {
    setCurrentView(Views.FLIGHT);
  };

  const handleFriendsClick = () => {
    setCurrentView(Views.FRIENDS);
  };

  const onUserLoggedIn = (user) => {
    setIsLoggedIn(true);
    setUserData(user);
  };

  const onUserLoginFailed = () => {
    setIsLoggedIn(false);
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setUserData(null);
    setCurrentView(Views.HOME);
    localStorage.removeItem('email');
  };
  const MainContent = () => (
    <>
    <Navbar
        variant="dark"
        style={{
          backgroundImage: 'linear-gradient(to right, #4eade6, #1a8cd1)',
        }}
      >
        <Container>
          <Navbar.Brand href="#home" style={{marginLeft:'10px', fontSize:'20px',fontWeight:'bolder'}}>IT5007 Team 2</Navbar.Brand>
          {/* Welcome Message */}
          {isLoggedIn && userData && (
            <div style={{ color: 'white', marginRight: '20px', fontWeight: 'bold' }}>                Welcome, {userData.name} to the AeroWeather Explorer!
              </div>
            )}
            <Nav className="ml-auto">
                <Nav.Link onClick={() => {
                  setShowFlightAlert(true);
                  setShowNotification(false);
                  setTimeout(() => {
                    setShowFlightAlert(false);
                  }, 5000);
                  
                }}>
                  {showNotification && userData && flightData?.length > 0 && <Badge style={{ fontSize: '0.5rem' }} pill bg="warning" text="dark">{flightData?.length}</Badge>}
                  <FontAwesomeIcon icon={faBell} style={{ fontSize: '1.5rem' }} title="Notification"/>
                </Nav.Link>
              <Nav.Link onClick={handleProfileClick}>
                <FontAwesomeIcon icon={faUserCircle} style={{ fontSize: '1.5rem' }} title="Profile"/>
              </Nav.Link>
              <Nav.Link onClick={handleSignOut} style={{ cursor: 'pointer' }}>
                <FontAwesomeIcon icon={faSignOutAlt} style={{ fontSize: '1.5rem' }} title="Sign Out"/>
              </Nav.Link>
            </Nav>
        </Container>
      </Navbar>
    <Container fluid>
      <Row>
        <Col sm={1} style={{ height: '100vh', background: '#007bff80'}}>
          <Nav defaultActiveKey="/home" className="flex-column" style={{ alignItems: "center", margin: '20px 0px' }}>
            <Nav.Link onClick={() => setCurrentView(Views.HOME)}>
              <FontAwesomeIcon icon={faHouse} style={{ color: '#fff', fontSize: '1.5rem', padding: '10px' }} title="Home" />
            </Nav.Link>
            <Nav.Link onClick={handleFlightClick}>
              <FontAwesomeIcon icon={faPlaneDeparture} style={{ color: '#fff', fontSize: '1.5rem',padding: '10px' }} title="Flight Itinerary" />
            </Nav.Link>
            <Nav.Link onClick={handleFriendsClick}>
              <FontAwesomeIcon icon={faUsers} style={{ color: '#fff', fontSize: '1.5rem',padding: '10px' }} title="Friends"/>
            </Nav.Link>
          </Nav>
        </Col>
        <Col sm={11} style={{ height: '100vh'}}>
            {flightData && showFlightAlert && flightData.map((flight) => {
              const currentTime = new Date();
              const departureTime = new Date(flight.departDateTime);
              const timeDifference = Math.abs(departureTime - currentTime);
              const hours = Math.floor(timeDifference / (1000 * 60 * 60));
              const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
              
              return (
                <Alert key={flight.id} variant="warning" style={{"margin":"10px"}}>
                  {`Flight ${flight.flightNumber} departs in ${hours} hours and ${minutes} minutes.`}
                </Alert>
              );
            })}
          {currentView === Views.HOME  && userData && <Googlemap id="home" user={userData} view={currentView}/>}
          {currentView === Views.FRIENDS && userData  && <Friends userEmail={userData?.email} />}
          {currentView === Views.FLIGHT && userData  && <FlightItinerary userEmail={userData.email} userName={userData.name} />}
          {currentView === Views.PROFILE && userData && (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
              <div className="card shadow p-3 mb-5 bg-white rounded" style={{ width: '50%', maxWidth: '400px' }}>
                <div className="card-body">
                  <h2 className="card-title text-center border-bottom pb-3">Profile</h2>
                    <div class="h6 mt-4">
                    <FontAwesomeIcon icon={faUser} style={{ marginRight:'10px' }}/>
                      {userData.name}
                    </div>
                    <div>
                    <FontAwesomeIcon icon={faEnvelope} style={{ marginRight:'10px' }}/>
                      {userData.email}
                    </div>
                </div>
              </div>
            </div>
          )}

        </Col>
      </Row>
    </Container>
   </>
  );

  return (
    <div className='App'>
      {!email && !isLoggedIn ? (
        <Login
          onUserLoggedIn={onUserLoggedIn}
          onUserLoginFailed={onUserLoginFailed}
        />
      ) : (
        <MainContent />
      )}
    </div>
  );
}


export default App
