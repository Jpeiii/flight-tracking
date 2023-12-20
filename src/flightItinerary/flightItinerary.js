/**
 * This file, flightItinerary.js, handles the CRUD operations for the user's flight itineraries. 
 * It also handles the sharing of flights with friends.
 */
import 'bootstrap/dist/css/bootstrap.min.css';
import * as React from 'react';
import formData from 'form-data'; // Required for Mailgun API
import Mailgun from 'mailgun.js'; // For sending email to friends
import {Table, Button, Form, Row, Col, Modal} from 'react-bootstrap';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlaneDeparture, faPlaneArrival, faShare, faTrash, faEdit, faPlus} from "@fortawesome/free-solid-svg-icons";

// Helper function to send a GraphQL query and fetch data
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

class FlightList extends React.Component {
  constructor() {
    super();
    this.state = {
      flight: {}, // state variable for user's flight
      friends: [], // state variable for user's friends
      showUpdateModal: false,
      showShareModal: false,
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleUpdate = this.handleUpdate.bind(this);
  }

  handleDelete = (id, flightNumber) => {
    if (confirm("Are you sure you want to delete Flight " + flightNumber + "?")){
      this.props.onDeleteFlight(id);
    }
  };

  handleSubmit = () => {
    const flightNumber = document.getElementById("flightNumber");
    const depatureCity = document.getElementById("depatureCity");
    const depatureDate = document.getElementById("depatureDate");
    const depatureTime = document.getElementById("depatureTime");
    const arrivalCity = document.getElementById("arrivalCity");
    const arrivalDate = document.getElementById("arrivalDate");
    const arrivalTime = document.getElementById("arrivalTime");

    if (flightNumber.value == "" || depatureCity.value == "" || depatureDate.value == "" || depatureTime.value == "" || arrivalCity.value == "" || arrivalDate.value == "" || arrivalTime.value == "") {
      alert("Please fill in all the required fields.")
      return;
    }

    const depatureDateTime = depatureDate.value + 'T' + depatureTime.value; // combine departure date and time
    const arrivalDateTime = arrivalDate.value + 'T' + arrivalTime.value; // combine arrival date and time
    if (new Date(depatureDateTime) >= new Date(arrivalDateTime)){
      alert("Departure date and time must be earlier than arrival date and time.");
      return;
    }

    // Create flight object to add to mongo DB
    const flight ={ flightNumber: flightNumber.value.toUpperCase().replace(/ /g,''), // remove all spaces and convert to uppercase
                    from: depatureCity.value,
                    departDateTime: depatureDateTime,
                    to: arrivalCity.value,
                    arrivalDateTime: arrivalDateTime,
                    email: this.props.user.email,
                    name: this.props.user.name,
                  };
    this.props.onAddFlight(flight);
    
    // Clear the form for the next input
    flightNumber.value = "";
    depatureCity.value = "";
    depatureDate.value = "";
    depatureTime.value = "";
    arrivalCity.value = "";
    arrivalDate.value = "";
    arrivalTime.value = "";
  };

  handleUpdate = () => {
    const flightNumber = document.getElementById("flightNumber2");
    const depatureCity = document.getElementById("depatureCity2");
    const depatureDate = document.getElementById("depatureDate2");
    const depatureTime = document.getElementById("depatureTime2");
    const arrivalCity = document.getElementById("arrivalCity2");
    const arrivalDate = document.getElementById("arrivalDate2");
    const arrivalTime = document.getElementById("arrivalTime2");

    if (flightNumber.value == "" || depatureCity.value == "" || depatureDate.value == "" || depatureTime.value == "" || arrivalCity.value == "" || arrivalDate.value == "" || arrivalTime.value == "") {
      alert("Please fill in all the required fields.")
      return;
    }

    const depatureDateTime = depatureDate.value + 'T' + depatureTime.value; // combine departure date and time
    const arrivalDateTime = arrivalDate.value + 'T' + arrivalTime.value; // combine arrival date and time
    if (new Date(depatureDateTime) >= new Date(arrivalDateTime)){
      alert("Departure date and time must be earlier than arrival date and time.");
      return;
    }

    // Create flight object to update mongo DB
    const flight ={ flightNumber: flightNumber.value.toUpperCase().replace(/ /g,''), // remove all spaces and convert to uppercase
                    from: depatureCity.value,
                    departDateTime: depatureDateTime,
                    to: arrivalCity.value,
                    arrivalDateTime: arrivalDateTime,
                  };
    const id = this.state.flight.id;
    this.props.onUpdateFlights(id, flight);
    this.setState({showUpdateModal: false});
  }

  handleShareIconClicked = (data) => {
    this.setState({showShareModal: true, flight: {id: data.id, flightNumber: data.flightNumber}});

    // Check if the flight is shared with a friend. If yes, set the checkbox to checked.
    var friends = [];
    for (var i = 0; i < this.props.friends.length; i++){
      
      if (data.share?.includes(this.props.friends[i].email) ){
        friends.push({email: this.props.friends[i].email, name: this.props.friends[i].name, shared: true});
      }
      else{
        friends.push({email: this.props.friends[i].email, name: this.props.friends[i].name, shared: false});
      }
    }
    this.setState({friends: friends});
  }

  // keep an array of friends that the flight have been shared (checkbox checked)
  handleShareButtonClicked = () => {
    var share = []
    for (var i = 0; i < this.state.friends.length; i++){
      if (document.getElementById(this.state.friends[i].email).checked){
        share.push(this.state.friends[i].email);
        this.sendEmail(this.state.friends[i].email, this.state.friends[i].name);
      }
    }

    const id = this.state.flight.id;
    this.props.onUpdateShareFlight(id, share);
    if (share.length > 0){
      alert("Flight is shared with your friends and an email has been sent to them.");
    }
    this.setState({showShareModal: false});
  }

  // Function to call API to send email to friends for shared flight.
  sendEmail = (email, name) => {
    const API_KEY = '48561dc44b8830b55a68448f06fbcef5-30b58138-16e45f0e';
    const DOMAIN = 'sandboxa8c59642d32a4a48a12d6d5d8ee6a971.mailgun.org'; // Domain assigned by Mailgun
    const mailgun = new Mailgun(formData);
    const client = mailgun.client({username: 'api', key: API_KEY});

    const messageData = {
      from: 'AeroWeather Explorer <me@samples.mailgun.org>',
      to: email,
      subject: 'New flight shared to you by ' + this.props.user.name,
      text: `Hello ${name}! \n\n${this.props.user.name} has shared his/her flight with you. Please login to AeroWeather Explorer for more details.`
    };

    client.messages.create(DOMAIN, messageData)
    .then((res) => {
      console.log(res);
    })
    .catch((err) => {
      console.error(err);
    });
  }

  // Map the flight data to the table
  mapping(data){
    return(
      <tr key={data.id}>
      <td key={data.id + "0"}>{data.flightNumber}</td>
      <td key={data.id + "1"}>{data.from}</td>
      <td key={data.id + "2"}>{new Date(data.departDateTime).toDateString()}</td>
      <td key={data.id + "3"}>{new Date(data.departDateTime).toLocaleTimeString()}</td>
      <td key={data.id + "4"}>{data.to}</td>
      <td key={data.id + "5"}>{new Date(data.arrivalDateTime).toDateString()}</td>
      <td key={data.id + "6"}>{new Date(data.arrivalDateTime).toLocaleTimeString()}</td>
      <td key={data.id + "7"}> <Button variant="outline-success" style={{border: 'none'}} title="Edit" onClick={() => this.setState({showUpdateModal: true, flight: {
        id: data.id,
        flightNumber: data.flightNumber,
        from: data.from,
        departDateTime: data.departDateTime,
        to: data.to,
        arrivalDateTime: data.arrivalDateTime,
      }})}>
          <FontAwesomeIcon icon={faEdit} style={{fontSize:'1.6rem'}} /></Button>
      </td>
      <td key={data.id + "8"}> <Button variant="outline-primary" style={{border: 'none'}} onClick={() => this.handleShareIconClicked(data)} title="Share">
        <FontAwesomeIcon icon={faShare} style={{fontSize:'1.6rem'}} /></Button>
      </td>
      <td key={data.id + "9"}> <Button variant="outline-secondary" style={{border: 'none'}} onClick={() => this.handleDelete(data.id, data.flightNumber)} title="Delete">
        <FontAwesomeIcon icon={faTrash} style={{fontSize:'1.6rem'}} /></Button>
      </td>
      </tr>
    )
  }

  // Map the friends email and name to the table that appears in a Modal.
  mappingFriends(friend){
    return(
      <tr key={friend.email}>
        <td key={friend.email + "0"}>
          <input type= 'checkbox'
          name="shared"
          id={friend.email}
          value={friend.email}
          defaultChecked={friend.shared} />
        </td>
        <td key={friend.email + "1"}>{friend.name}</td>
        <td key={friend.email + "2"}>{friend.email}</td>
      </tr>
    )
  }
  
  populate(){
    return(
    this.props.flights.map(flight => this.mapping(flight)))
  }

  // Create table header for the friends list
  populateFriends(){
    return(
      <Table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {this.state.friends.map(friend => this.mappingFriends(friend))}
        </tbody>
      </Table>
  )}
  
  render(){
    return (
      // Table for the flight itinerary
        <div style={{height:'90vh',marginTop:10}}>
          <h3 align="center" style={{'color':'#007bff80'}}>
            <FontAwesomeIcon icon={faPlaneDeparture} style={{color: '#007bff80', fontSize:'1rem', marginRight:20}}/> 
            My Flight Itineray
            <FontAwesomeIcon icon={faPlaneArrival} style={{color: '#007bff80', fontSize:'1rem',marginLeft:20}}/> 
          </h3>
          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            <Table striped hover> 
              <thead>
                  <tr>
                    <th>Flight</th>
                    <th>From</th>
                    <th>Departure Date</th>
                    <th>Departure Time</th>
                    <th>To</th>
                    <th>Arrival Date</th>
                    <th>Arrival Time</th>
                    <th>Edit</th>
                    <th>Share</th>
                    <th>Delete</th>
                </tr>
              </thead>
              <tbody style={{ overflowY: 'auto', maxHeight: '150px' }}>
                {this.populate()}
              </tbody>
            </Table>
          </div>

          {/* Add a new flight section*/}
          <div>
            <Form name="flights" className='flight-form-container'>
              <div style={{marginBottom:10, marginRight:'27%' }}>
                <h3 align="center" style={{ color: '#007bff80' }}>Add a New Flight</h3>
              </div>
              <Row className="mb-3" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <Form.Group as={Col} xs={3}>
                  <Form.Label style={{ marginBottom: 0 }}>Flight Number</Form.Label>
                  <Form.Control placeholder="Enter Flight Number" id="flightNumber" />
                </Form.Group>
              </Row>
              <Row className="mb-3" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <h3 style={{ marginBottom: 0 }}>Departure</h3>
                <Form.Group as={Col} xs={3}>
                  <Form.Label style={{ marginBottom: 0 }}>Date</Form.Label>
                  <Form.Control type="date" id="depatureDate" min={new Date().toISOString().split("T")[0]}/>
                </Form.Group>

                <Form.Group as={Col} xs={3}>
                  <Form.Label style={{ marginBottom: 0 }}>Time</Form.Label>
                  <Form.Control type="time" id="depatureTime" />
                </Form.Group>

                <Form.Group as={Col} xs={3}>
                  <Form.Label style={{ marginBottom: 0 }}>City</Form.Label>
                  <Form.Control placeholder="Enter Departure City" id="depatureCity" />
                </Form.Group>
              </Row>
              <Row className="mb-3" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
                <h3 style={{ marginBottom: 0 }}>Arrival</h3>
                <Form.Group as={Col} xs={3}>
                  <Form.Label style={{ marginBottom: 0 }}>Date</Form.Label>
                  <Form.Control type="date" id="arrivalDate" min={new Date().toISOString().split("T")[0]}/>
                </Form.Group>

                <Form.Group as={Col} xs={3}>
                  <Form.Label style={{ marginBottom: 0 }}>Time</Form.Label>
                  <Form.Control type="time" id="arrivalTime" />
                </Form.Group>

                <Form.Group as={Col} xs={3}>
                  <Form.Label style={{ marginBottom: 0 }}>City</Form.Label>
                  <Form.Control placeholder="Enter Arrival City" id="arrivalCity" />
                </Form.Group>
              </Row>
              <div style={{marginTop:10, marginRight:'27%' }}>
                <Button variant="outline-primary" onClick={this.handleSubmit} title="Add a Flight">
                  <FontAwesomeIcon icon={faPlus} style={{color: 'primary', fontSize:'1rem', marginRight:100}} />
                    Add
                </Button>
              </div>
            </Form>
          </div>

          {/* Modal to update a flight  */}
          <Modal show={this.state.showUpdateModal} size={'lg'} onHide={()=>this.setState({showUpdateModal: false})}>
            <Modal.Header closeButton>
              <Modal.Title>Udate Flight {this.state.flight.flightNumber} </Modal.Title>
            </Modal.Header>
            <Form name="flights">
            <Modal.Body>
              <Row className="mb-3">
                <Form.Group as={Col} xs={3}>
                  <Form.Label>Flight Number</Form.Label>
                  <Form.Control placeholder="Enter Flight Number" defaultValue={this.state.flight.flightNumber} id="flightNumber2" />
                </Form.Group>
              </Row>
              <br/>
              <Row className="mb-3">
                <h3>Departure</h3>
                <Form.Group as={Col} xs={3}>
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="date" defaultValue={new String(this.state.flight.departDateTime).split("T")[0]} id="depatureDate2" min={new Date().toISOString().split("T")[0]}/>
                </Form.Group>
                <Form.Group as={Col} xs={3}>
                  <Form.Label>Time</Form.Label>
                  <Form.Control type="time" defaultValue={new Date(this.state.flight.departDateTime).toTimeString().split(" ")[0]} id="depatureTime2" />
                </Form.Group>
                <Form.Group as={Col}>
                  <Form.Label>City</Form.Label>
                  <Form.Control placeholder="Enter Depature City" defaultValue={this.state.flight.from} id="depatureCity2"/>
                </Form.Group>
              </Row>
              <br/>
              <Row className="mb-3">
                <h3>Arrival</h3>
                <Form.Group as={Col} xs={3}>
                  <Form.Label>Date</Form.Label>
                  <Form.Control type="date" defaultValue={new String(this.state.flight.arrivalDateTime).split("T")[0]} id="arrivalDate2" min={new Date().toISOString().split("T")[0]}/>
                </Form.Group>
                <Form.Group as={Col} xs={3}>
                  <Form.Label>Time</Form.Label>
                  <Form.Control type="time" defaultValue={new Date(this.state.flight.arrivalDateTime).toTimeString().split(" ")[0]} id="arrivalTime2" />
                </Form.Group>

                <Form.Group as={Col} >
                  <Form.Label>City</Form.Label>
                  <Form.Control placeholder="Enter Arrival City" defaultValue={this.state.flight.to} id="arrivalCity2"/>
                </Form.Group>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="primary" size="lg" onClick={this.handleUpdate}>
                Update
              </Button>  
              <Button variant="secondary" onClick={()=>this.setState({showUpdateModal: false})} size="lg">
                Close
              </Button>
            </Modal.Footer>
            </Form>
          </Modal>

          {/* Modal to share a flight  */}
          <Modal show={this.state.showShareModal} size={'md'} onHide={()=>this.setState({showShareModal: false})}>
            <Modal.Header closeButton>
              <Modal.Title>Share Flight {this.state.flight.flightNumber} </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form>
                {this.populateFriends()}
              </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" onClick={() => this.handleShareButtonClicked()}>
                  Share
                </Button>  
              <Button variant="secondary" onClick={()=>this.setState({showShareModal: false})}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
      )
    }
  }
  
export default class flightItinerary extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        friends: [], // State to store the user's friends
        flights: [], // State to store the user's flights
      };
    }

    componentDidMount() {
      this.loadFlights(this.props.userEmail);
      this.loadFriendsList(this.props.userEmail);
    }

    // Load the user's flights from the database
    async loadFlights(email){
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
          this.setState({ flights: data.getFlights });
        }
        
      } catch (error) {
        alert('Error getting list of flights:', error);
      }
    }

    // Load the user's friends from the database
    async loadFriendsList(email){
       const query = `
        query getUserFriends($email: String!){
          getUserFriends(email: $email) {
            name,
            email
          }
        }
      `;

      try {
        const data = await graphQLFetch(query, {email});
        if (data && data.getUserFriends){
          this.setState({ friends: data.getUserFriends });
        }
        
      } catch (error) {
        alert('Error getting list of friends:', error);
      }
    }
     
    handleDeleteFlight = async (flightId) => {
      const deleteFlight = `
      mutation deleteFlight ($id: ID!) {
        deleteFlight (id: $id)
      }`;

      const id = Number(flightId);
      try {
        const data = await graphQLFetch(deleteFlight, {id});
        if (!data.deleteFlight){
          alert('Flight is not deleted.');
        }
        else{
          this.loadFlights(this.props.userEmail);
        }
        
      } catch (error) {
        alert('Error deleting flight:', error);
      }
    }

    handleAddFlight = async (flight) => {
      const addFlight = `
      mutation addFlight ($flight: FlightInput!){
        addFlight (flight: $flight)
      }`;

      try {
        const data = await graphQLFetch(addFlight, {flight});
        if (!data.addFlight){
          alert('Flight is not added.');
        }
        else{
          this.loadFlights(this.props.userEmail);
        }
        
      } catch (error) {
        alert('Error adding flight:', error);
      }
    }

    handleUpdateFlight = async (id, flight) => {
      const updateFlight = `
      mutation updateFlight ($id: ID!, $flight: UpdateFlightInput!){
        updateFlight (id: $id, flight: $flight)
      }`;

      try {
        const data = await graphQLFetch(updateFlight, {id, flight});
        if (!data.updateFlight){
          alert('Flight is not updated.');
        }
        else{
          this.loadFlights(this.props.userEmail);
        }
        
      } catch (error) {
        alert('Error updating flight:', error);
      }
    }

    // Handler to update the share flight list
    handleUpdateShareFlight = async (id, share) => {
      const mutation = `
      mutation updateShareFlight ($id: ID!, $share: [String]!){
        updateShareFlight (id: $id, share: $share)
      }`;

      try {
        const data = await graphQLFetch(mutation, {id, share});
        if (!data.updateShareFlight){
          alert('Share flight is not updated.');
        }
        else{
          this.loadFlights(this.props.userEmail);
        }
        
      } catch (error) {
        alert('Error updating share flight:', error);
      }
    }

    render() {    
      return (
        <FlightList flights={this.state.flights} friends={this.state.friends} onDeleteFlight={this.handleDeleteFlight} onAddFlight={this.handleAddFlight} user={{email: this.props.userEmail, name: this.props.userName}} onUpdateFlights={this.handleUpdateFlight} onUpdateShareFlight={this.handleUpdateShareFlight} />
      );
    }
}