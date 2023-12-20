/**
 * This file, googlemaps.js, handles the weather, flight and air quality services. It displays the weather, flight and air quality information on Google Maps.
 */

import React, { useState,useEffect } from "react";
import GoogleMapReact from 'google-map-react';
import Weather from '../weather/weather'
import WeatherHistory from '../weather/weatherHistory'
import {Button, Card, Form, Dropdown, Modal, Table} from 'react-bootstrap'

import axios from 'axios'; // To make API calls
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlaneUp, faPaperPlane, faBinoculars } from '@fortawesome/free-solid-svg-icons';
import { geocodeByAddress, getLatLng } from 'react-google-places-autocomplete';

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

// React class component to handle Friend's Flights
class FriendFlights extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      friendsFlights: [], // State variable to store an array of friends flights
    };
  }

  componentDidMount() {
    this.loadFriendsFlights(this.props.userEmail);
  }

  async loadFriendsFlights(email){
    const getSharedFlights = `query getSharedFlights($email: String!){
      getSharedFlights(email: $email){
        id,
        flightNumber, from, departDateTime
        to, arrivalDateTime, email, name
      }
    }`;

    try {
      const data = await graphQLFetch(getSharedFlights, {email});
      if (data.getSharedFlights){
        this.setState({ friendsFlights: data.getSharedFlights });
      }
      
    } catch (error) {
      alert('Error getting list of friends flights:', error);
    }
  }

  // Function to map friends flights to a table row
  mappingFriendsFlight(flight){
    return(
      <tr key={flight.id}>
        <td key={flight.id + "0"}>{flight.flightNumber}</td>
        <td key={flight.id + "1"}>{flight.from}</td>
        <td key={flight.id + "2"}>{new Date(flight.departDateTime).toDateString()}</td>
        <td key={flight.id + "3"}>{new Date(flight.departDateTime).toLocaleTimeString()}</td>
        <td key={flight.id + "4"}>{flight.to}</td>
        <td key={flight.id + "5"}>{new Date(flight.arrivalDateTime).toDateString()}</td>
        <td key={flight.id + "6"}>{new Date(flight.arrivalDateTime).toLocaleTimeString()}</td>
        <td key={flight.id + "7"}>{flight.name}</td>
        <td key={flight.id + "8"}>{flight.email}</td>
        <td key={flight.id + "9"}> <Button variant="outline-secondary" style={{border: 'none'}} title="View Location of Flight" onClick={() => {
          if (new Date(flight.departDateTime).valueOf() > new Date().valueOf() + (1000*60*60)){ // More than 1 hour ahead of current time.
            alert("Flight has not departed.")
          }
          else if (new Date(flight.arrivalDateTime).valueOf() < new Date().valueOf() - (1000*60*60*16)){ // More than 16 hours behind current time.
            alert("This is a past flight.")
          }
          else{
            this.props.handleFriendFlight(flight.flightNumber)
          }
          }}>
          <FontAwesomeIcon icon={faBinoculars} style={{fontSize:'1.6rem'}} /></Button>
        </td>
      </tr>
    )
  }

  populateFriendFlight(){
    return(
      this.state.friendsFlights.map(flight => this.mappingFriendsFlight(flight)));
  }

  // Render a table of friends flights
  render() {
    return(
      <Table striped hover style={{fontSize: '14px'}}> 
      <thead>
        <tr>
          <th>Flight</th>
          <th>From</th>
          <th>Departure Date</th>
          <th>Departure Time</th>
          <th>To</th>
          <th>Arrival Date</th>
          <th>Arrival Time</th>
          <th>Name</th>
          <th>Email</th>
          <th>View Location</th>
        </tr>
      </thead>
      <tbody >
        {this.populateFriendFlight()}
      </tbody>
    </Table>
    )
  }
}

export default function Googlemap(props) {
  const user = props.user
  const defaultProps = {
    center: {
      lat: 1.359167,
      lng: 103.989441
    },
    zoom: 11
  };

  // const [flights, setFlights] = useState([]);
  const [map, setMap] = useState(null);
  const [markerCoords, setMarkerCoords] = useState(defaultProps.center);
  const [weather, updateWeather] = useState();
  const [showWeather, setShowWeather] = useState(false)
  const [tracker, setTracker] = useState(false)
  const [historySearch, setHistorySearch] = useState(false) 
  const [historyArrayCounrty, setHistoryArrayCountry] = useState(user.searchHistoryWeather) // State variable to store an array of search history for weather
  const [historyArrayFlight, setHistoryArrayFlight] = useState(user.searchHistoryFlight) // State variable to store an array of search history for flights
  const [historyQuery, setHistoryQuery] = useState("History")
  const [historyWeather, sethistoryWeather] = useState([]);
  const [showHistoryWeather, setShowHistoryWeather] = useState(false)
  const [airQualityTracker, setAirQualityTracker] = useState(false)
  const [searchHistoryTitle, setHistorySearchTitle] = useState("Search Weather History")
  const [searchTitle, setSearchTitle] = useState("Search Weather")
  const [flightmarkers, setFlightMarkers] = useState([]);
  const [polyline, setPolyline] = useState(null); // State variable to store the flight path
  const [showModal, setShowModal] = useState(false);
  
  function clearMarkers() {
    flightmarkers.forEach((marker) => {
      marker.setMap(null); // Remove marker from map
    });
    if (polyline){
      polyline.setMap(null); // Remove flightpath from map
    }
    setFlightMarkers([]); // Clear all markers
  }

  function addMarker(lat, lng, image, title, modal) {
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map,
      icon: image,
      title: title,
    });
    // Add hover effect
    if (modal){
      const infoWindow = new google.maps.InfoWindow({
        content: modal,
      });
  
      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });
    }else{
      marker.addListener("mouseover", () => {
        marker.setTitle(title);
      });
  
      marker.addListener("mouseout", () => {
        marker.setTitle("");
      });
  
    }
    setFlightMarkers((currentMarkers) => [...currentMarkers, marker]); // Add new marker to the state
  }

  const handleHistorySearchToggle = ()=>{
    if (!tracker){
      setHistorySearchTitle("Search Weather History");
      setSearchTitle("Search City Weather");
    }
    else{
      setHistorySearchTitle("Search Flights History");
      setSearchTitle("Search Flights");
    }
    setHistorySearch(!historySearch);
  }

  const handleMapClick = ({ lat, lng }) => {
    if (map && !tracker) {
      const newZoom = 11;
      map.setZoom(newZoom);
      map.setCenter({ lat, lng });
      setMarkerCoords({ lat, lng });
      fetchWeather(lat,lng)
      setShowWeather(true)
      clearMarkers()
      addMarker(lat, lng, null, '', null)
      setTimeout(()=>{
        setShowWeather(false)
      },3000)
    }

    if (map && tracker) {
      const newZoom = 8;
      map.setZoom(newZoom);
      map.setCenter({ lat, lng });
    }
  };

  const handleMapClickHistory = ({ lat, lng }) => {
    if (map) {
      const newZoom = 11;
      map.setZoom(newZoom);
      map.setCenter({ lat, lng });
      setMarkerCoords({ lat, lng });
      fetchWeatherHistory(lat,lng)
      clearMarkers()
      addMarker(lat, lng, null, '', null)
    }
  };

  const fetchWeatherHistory = async (lat, lng) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&cnt=7&appid={api_key}&units=metric`
      );
      setShowHistoryWeather(true)
      sethistoryWeather(response.data.list);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  const fetchWeather = async (lat,lng) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid={api_key}&units=metric`
      );
      updateWeather(response.data);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  // Function to save user's Weather search query to the database
  const postSearchQuery = async (query) => {
    if (user?.email){
      const mutationQuery = 
      `
        mutation addLocationSearchHistory($email: String!, $searchHistoryWeather: String!) {
          addLocationSearchHistory(email: $email, searchHistoryWeather: $searchHistoryWeather) {
                email
                searchHistoryWeather
            }
        }
      `;

      const variables = {
          email: user.email,
          searchHistoryWeather: query
      };

      const result = await graphQLFetch(mutationQuery, variables);
      const data = result.addLocationSearchHistory
      if (data){
        const searchHistory = data.searchHistoryWeather
        setHistoryArrayCountry(searchHistory)
      }
    }
  }

  // Function to save user's Flight search query to the database
  const postSearchFlightQuery = async (query) => {
    if (user?.email){
      const mutationQuery = 
      `
        mutation addFlightSearchHistory($email: String!, $searchHistoryFlight: String!) {
          addFlightSearchHistory(email: $email, searchHistoryFlight: $searchHistoryFlight) {
            email
            searchHistoryFlight
          }
        }
      `;

      const variables = {
          email: user.email,
          searchHistoryFlight: query.toUpperCase().replace(/ /g,'') // Remove all spaces and convert to uppercase
      };

      const result = await graphQLFetch(mutationQuery, variables);
      const data = result.addFlightSearchHistory;
      if (data){
        const searchHistory = data.searchHistoryFlight;
        setHistoryArrayFlight(searchHistory);
      }
    }
  }

  const searchFlightNumber = async (query) => {
    const response = await axios.get(
      `https://airlabs.co/api/v9/flights?api_key={api_key}&flight_iata=${String(query.toUpperCase().replace(/ /g,''))}` // Remove all spaces and convert to uppercase for flight query
    );
    if (response.data.response.length === 0){
      alert("Flight not found")
      if (document.getElementById('searchField')){
        document.getElementById('searchField').style.border = '2px solid red';
        setTimeout(() => {
          document.getElementById('searchField').style.border = 'var(--bs-border-width) solid var(--bs-border-color)';
        }, 3000);
      }
      return;
    }
    clearMarkers();
    const airplane = response.data.response[0];
    const flight_iata = airplane.flight_iata;
    const arr_iata = airplane.arr_iata;
    const dep_iata = airplane.dep_iata;
    const lat = airplane.lat;
    const lng = airplane.lng;
    const dir = airplane.dir;
    const alt = airplane.alt;
    const speed = airplane.speed;
    const image = {
      path: faPlaneUp.icon[4],
      fillColor: "#ff0000", // red colour
      fillOpacity: 1,
      anchor: new google.maps.Point(
        faPlaneUp.icon[0], // width
        faPlaneUp.icon[1], // height
      ),
      strokeWeight: 1,
      strokeColor: "#ffffff",
      scale: 0.075,
      rotation: parseInt(dir), // Rotate the flight icon based on the plane's direction
    };

    const modal = `
      <div>
        <h5 style="color:#4285F4;">${flight_iata}</h5>
        <p>Departure: <b>${dep_iata}</b></p>
        <p>Arrival: <b>${arr_iata}</b></p>
        <p>Altitude: <b>${alt} m </b></p>
        <p>Speed: <b>${speed} km/h </b></p>
      </div>
    `;
   addMarker(lat, lng, image, flight_iata, modal);

    // Get the departure and arrival airport lat lng and plot the flight path
    getAirportLatLong(dep_iata).then( depLocation => {
      getAirportLatLong(arr_iata).then( arrLocation => {
        const flightPlanCoordinates = [
          { lat: depLocation.lat, lng: depLocation.lng },
          { lat: lat, lng: lng }, // aircraft location
          { lat: arrLocation.lat, lng: arrLocation.lng }
        ];

        const flightPath = new google.maps.Polyline({
          path: flightPlanCoordinates,
          geodesic: true,
          strokeColor: "#FF0000",
          strokeOpacity: 1.0,
          strokeWeight: 2,
        });
        setPolyline(flightPath);
        addMarker(depLocation.lat, depLocation.lng, 'http://maps.google.com/mapfiles/ms/icons/green-dot.png', 'Departure: ' + depLocation.name, null);
        addMarker(arrLocation.lat, arrLocation.lng, 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', 'Arrival: ' + arrLocation.name, null);
        if (map){
          flightPath.setMap(map);
        }
      })
    })

    if (map){
      map.setZoom(6);
      map.setCenter({ lat, lng });
    }
  };


  const submitSearchQuery = async () => {
    const query = document.getElementById('searchField').value;
    if (query && tracker ){
      searchFlightNumber(query);
      postSearchFlightQuery(query); // To save the search query to the database for history
      document.getElementById('searchField').value="";

    }else if (query && !tracker){
      try {
        const results = await geocodeByAddress(query);
        const { lat, lng } = await getLatLng(results[0]);
        handleMapClick({ lat, lng }); 
        postSearchQuery(query);
      } catch (error) {
        alert("Error geocoding the search query, please enter a valid city or country name");
        document.getElementById('searchField').style.border = '2px solid red';
        setTimeout(() => {
          document.getElementById('searchField').style.border = 'var(--bs-border-width) solid var(--bs-border-color)';
        }, 3000);
      }
      document.getElementById('searchField').value="";
    }
  };

  const handleCountrySelection = async (country) => {
    setHistoryQuery(country)
    const results = await geocodeByAddress(country);
    const { lat, lng } = await getLatLng(results[0]);
    handleMapClickHistory({ lat, lng }); 
  }

  const handleFlightHistorySelection = async (flight) => {
    setHistoryQuery(flight); // Set state variable to display the selected flight query as part of history
    searchFlightNumber(flight);
  }
  
  const handleAirTrackerToggle = () => {
    setTracker(!tracker)
    if (!tracker){
      clearMarkers();
      fetchFlights()
      setHistorySearchTitle("Search Flights History")
      setSearchTitle("Search Flights")
    }else{
      if (map){
        clearMarkers();
        map.setZoom(11)
        map.setCenter(defaultProps.center)
        setHistorySearchTitle("Search Weather History")
        setSearchTitle("Search City Weather")
      }
    }
  }
 
  const handleAirQualityToggle = () => {
    setAirQualityTracker(!airQualityTracker)
    if (!airQualityTracker){
      fetchAirQuality()
    }else{
      if (map){
        map.overlayMapTypes.clear()
      }
    }
  }

  const fetchAirQuality = async () => {
    if (map){
      const waqiMapOverlay = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
          return `https://tiles.aqicn.org/tiles/usepa-aqi/${zoom}/${coord.x}/${coord.y}.png?token={api_key}`;
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 18,
        name: "Air Quality",
      });
      map.overlayMapTypes.insertAt(0, waqiMapOverlay);
    }
   
  };

  const fetchFlights = async () => {
    const lat = markerCoords.lat
    const lng = markerCoords.lng
    getCountryCode(lat, lng).then(async (countryCode) => {
      try {
        const response = await axios.get(
          `https://airlabs.co/api/v9/suggest?q=${countryCode}&api_key={api_key}`
        );
        if (response){
          const airports = response.data.response.airports;
          if (airports){
            airports.map((airport) => {
              const lat = airport.lat;
              const lng = airport.lng;
              const markerAirport = {
                url: "https://maps.google.com/mapfiles/kml/shapes/ranger_station.png",
                scaledSize: new google.maps.Size(30, 30),
              };
              addMarker(lat, lng, markerAirport, airport.name)

            });
            if (airports && airports.length !== 0){
              const flag = airports[0].country_code
              const response = await axios.get(
                `https://airlabs.co/api/v9/flights?api_key={api_key}&flag=${flag}&limit=10`
              );
              const airplanes = response.data.response;
              if (airplanes && map) {
                map.setZoom(5); // Adjust the zoom level as per your requirement
              }
              airplanes.map((airplane) => {
                const flight_iata = airplane.flight_iata;
                const arr_iata = airplane.arr_iata;
                const arr_icao = airplane.arr_icao;
                const dep_iata = airplane.dep_iata;
                const dep_icao = airplane.dep_icao;
                const lat = airplane.lat;
                const lng = airplane.lng;
                const dir = airplane.dir;
                const alt = airplane.alt;
                const speed = airplane.speed;
                const image = {
                  path: faPlaneUp.icon[4],
                  fillColor: "#0000ff", // blue colour
                  fillOpacity: 1,
                  anchor: new google.maps.Point(
                    faPlaneUp.icon[0], // width
                    faPlaneUp.icon[1], // height
                  ),
                  strokeWeight: 1,
                  strokeColor: "#ffffff",
                  scale: 0.075,
                  rotation: parseInt(dir), // Rotate the flight icon based on aircraft's direction
                };
                const modal = `
                <div>
                  <h5 style="color:#4285F4;">${flight_iata}</h5>
                  <p>Departure: <b>${dep_iata}</b></p>
                  <p>Arrival: <b>${arr_iata}</b></p>
                  <p>Altitude: <b>${alt} m </b></p>
                  <p>Speed: <b>${speed} km/h </b></p>
                </div>
              `;
                addMarker(lat, lng, image, flight_iata, modal);
  
              }
              )
            }
          }
        }
       
      } catch (error) {
        console.error(error);
      }
    })
    };
    const getCountryCode = async (lat, lng) => {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key={api_key}`
        );
        const results = response.data.results;
        if (results.length > 0) {
          // Extract the country code from the address components
          const addressComponents = results[0].address_components;
          const countryComponent = addressComponents.find(component =>
            component.types.includes('country')
          );
          if (countryComponent) {
            const countryCode = countryComponent.long_name;
            return countryCode;
          }
        }
      } catch (error) {
        console.error(error);
      }
      return null; // Return null if country code is not found
    };

    // Function to make an API call to obtain the airport's latitude and longitude based on its IATA code
    const getAirportLatLong = async (airport_iata) => {
      try {
        const response = await axios.get(
          `https://airlabs.co/api/v9/airports?iata_code=${airport_iata}&api_key={api_key}`
        );
        const results = response.data.response;
        if (results.length > 0) {
          return {lat: results[0].lat, lng: results[0].lng, name: results[0].name};
        }
      } catch (error) {
        console.error(error);
      }
      return {}; // Return empty object if airport location is not found.
    };

    // Function to search for friend's flight once user click on the search/binoculars icon
    const handleFriendFlight = (flight) => {
      searchFlightNumber(flight);
      postSearchFlightQuery(flight); // To save search query into database
      setHistorySearchTitle("Search Flights History");
      setSearchTitle("Search Flights");
      setTracker(true);
      setShowModal(false);
    };

  return (
    <Card className="m-3" id="home">
      <Card.Header style={{border:'none',background:'transparent'}}>
        <h1 style={{fontSize:'30px',fontWeight:'500'}}>Welcome to AeroWeather Explorer!</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
          <Form style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
            <div>
                <Form.Group controlId="switch" style={{ marginBottom: '0', marginRight:'20px' }}>
                  <Form.Check
                    type="switch"
                    id="custom-switch-history"
                    label={searchHistoryTitle}
                    checked={historySearch} // Set the checked prop based on the historySearch state
                    onChange={handleHistorySearchToggle}
                  />
                </Form.Group>
              </div>
              
              <div style={{ width:'20%',marginRight: '10px' }}>
                {!historySearch? 
                <Form.Group controlId="searchField">
                  <div style={{ position: 'relative' }}>
                    <Form.Control type="text" placeholder={searchTitle}/>
                  </div>
                </Form.Group>:
                  <div style={{ position: 'relative' }}>
                  <Dropdown style={{width:"100%"}}>
                    <Dropdown.Toggle id="dropdown-basic-search" style={{width:"100%", background:'transparent', color:'black', border:'var(--bs-border-width) solid var(--bs-border-color)', justifyContent: 'flex-start'}}>
                      {historyQuery}
                    </Dropdown.Toggle>

                    {!tracker?
                    <Dropdown.Menu style={{ width: "100%" }}>
                      {historySearch && historyArrayCounrty && historyArrayCounrty.map((country, index) => {
                        return (
                          <Dropdown.Item key={index} onClick={() => handleCountrySelection(country)}>
                            {country}
                          </Dropdown.Item>
                        );
                      })}
                    </Dropdown.Menu>:

                      <Dropdown.Menu style={{ width: "100%" }}>
                      {historySearch && historyArrayFlight && historyArrayFlight.map((flight, index) => {
                        return (
                          <Dropdown.Item key={index} onClick={() => handleFlightHistorySelection(flight)}>
                            {flight}
                          </Dropdown.Item>
                        );
                      })}
                    </Dropdown.Menu>
                    }
                  </Dropdown>                  
                  </div>
                }
              </div>
              <Button onClick={submitSearchQuery} style={{ marginRight: '20px' }} variant="outline-secondary" title="Search">
                  <FontAwesomeIcon icon={faPaperPlane}/>
              </Button>
              <div>
                <Form.Group controlId="switch" style={{ marginBottom: '0', marginRight:'20px' }}>
                  <Form.Check
                    type="switch"
                    id="custom-switch"
                    label="Air Tracker"
                    checked={tracker} // Set the checked prop based on the tracker state
                    onChange={handleAirTrackerToggle}
                  />
                </Form.Group>
              </div>
              <div>
                <Form.Group controlId="switch" style={{ marginBottom: '0', marginRight:'20px' }}>
                  <Form.Check
                    type="switch"
                    id="custom-switch"
                    label="Air Quality Tracker"
                    checked={airQualityTracker} // Set the checked prop based on the tracker state
                    onChange={handleAirQualityToggle}
                  />
                </Form.Group>
              </div>

              <Button onClick={() => setShowModal(true)} style={{ marginRight: '20px' }} variant="outline-secondary" title="View Friend's Flights">
                <FontAwesomeIcon icon={faBinoculars}/> View Friend <FontAwesomeIcon icon={faPlaneUp} />
              </Button>
            </div>
          </Form>
        </div>
      </Card.Header>
      <Card.Body> 
      <div style={{ height: '65vh', width: '100%' }}>
      <GoogleMapReact
          id="googlemap"
          bootstrapURLKeys={{ key: "{api_key}" }}
          yesIWantToUseGoogleMapApiInternals={true}
          defaultCenter={defaultProps.center}
          defaultZoom={defaultProps.zoom}
          onClick={handleMapClick}
          onGoogleApiLoaded={({ map }) => setMap(map)}
        >
          {/* <LocationComponent
            onClick={handleMapClick}
            coordinate={markerCoords}
          /> */}
      </GoogleMapReact>        
        {weather && showWeather && !tracker?
        <div className="weather-container"><Weather weather={weather}/>
          </div>
          :null}
          {historyWeather && showHistoryWeather && !tracker &&
          <div className="weather-container">
            <WeatherHistory weather={historyWeather}/>
            <Button className="weather-close-btn" variant="secondary" onClick={() => {
              setShowHistoryWeather(false);
              setHistorySearch(!historySearch);
              handleMapClick(defaultProps.center);
            }}>Close</Button>{' '}
          </div>
          }
      </div>
      
      {/* Modal to display friend's flights */}
      <Modal show={showModal} size='xl' onHide={()=>setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Friends' Flights </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FriendFlights userEmail={user.email} handleFriendFlight={handleFriendFlight}/>
        </Modal.Body>
      </Modal>
      </Card.Body>
    </Card>
  );
}