/**
 * The provided code is a React component called "Friends" that is responsible for managing a list of friends. It allows users to view their friends, add new friends, and delete existing friends. The component communicates with a GraphQL server to perform these operations.
 * Here's a high-level overview of what the code is doing:
 * Importing necessary dependencies: The code imports React, useState, useEffect from the 'react' library, FontAwesomeIcon from the "@fortawesome/react-fontawesome" library, 'bootstrap' CSS styles, and faTrash icon from the "@fortawesome/free-solid-svg-icons" library.
 * Defining a helper function: The code defines an asynchronous function called graphQLFetch that sends a GraphQL query or mutation to the server using the fetch API. It handles the response and displays any errors that occur.
 * Defining the Friends component: The code defines a functional component called Friends that takes a prop called userEmail. Inside the component, it initializes two state variables using the useState hook: friends (an array to store the list of friends) and newFriendEmail (a string to store the email of a new friend to be added).
 * Fetching friends list on component mount: The code uses the useEffect hook to fetch the list of friends when the component mounts. It sends a GraphQL query to the server to retrieve the friends associated with the provided userEmail. If the query is successful and returns data, it updates the friends state variable with the retrieved friends.
 */

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import 'bootstrap/dist/css/bootstrap.min.css';
import {faTrash} from "@fortawesome/free-solid-svg-icons";
import {Button} from 'react-bootstrap';

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
function Friends({ userEmail }) {
  const [friends, setFriends] = useState([]);
  const [newFriendEmail, setNewFriendEmail] = useState('');


  useEffect(() => {
    // Fetch friends list when the component mounts
    const fetchFriends = async () => {
      const query = `
        query {
          getUserFriends(email: "${userEmail}") {
            name
            email
          }
        }
      `;
      const data = await graphQLFetch(query);
      if (data && data.getUserFriends) {
        setFriends(data.getUserFriends);
      }
    };

    fetchFriends();
  }, [userEmail]);



  const handleDeleteFriend = async (friendEmail) => {
    const confirmation = window.confirm(`Are you sure you want to delete ${friendEmail}?`);
    if (confirmation) {
      // Call the GraphQL mutation for deletion
      const mutation = `
        mutation deleteFriend($userEmail: String!, $friendEmail: String!) {
          deleteFriend(userEmail: $userEmail, friendEmail: $friendEmail) {
            friends {
              name
              email
            }
          }
        }
      `;
      const data = await graphQLFetch(mutation, { userEmail, friendEmail });
      if (data && data.deleteFriend && Array.isArray(data.deleteFriend.friends)) {
        setFriends(data.deleteFriend.friends); // Update the friends list in the state
      }
    }
  };

  const handleAddFriend = async () => {
    const mutation = `
      mutation addFriend($userEmail: String!, $friendEmail: String!) {
        addFriend(userEmail: $userEmail, friendEmail: $friendEmail) {
          friends {
            name
            email
          }
        }
      }
    `;
    const data = await graphQLFetch(mutation, { userEmail, friendEmail: newFriendEmail });
    if (data && data.addFriend && Array.isArray(data.addFriend.friends)) {
        setFriends(data.addFriend.friends);
        setNewFriendEmail(''); // Reset the input field after adding a friend
        
    }
  };


  return (
    <div className="container my-4">
      {friends.length > 0 ? (
        <table className="table table-striped">
          <thead className="thead-dark">
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {friends.map((friend, index) => (
              <tr key={index}>
                <td>{friend.name}</td>
                <td>{friend.email}</td>
                <td>
                <Button variant="outline-secondary" style={{border: 'none'}} onClick={() => handleDeleteFriend(friend.email)} title="Delete">
                <FontAwesomeIcon icon={faTrash} style={{fontSize:'1.6rem'}} /> </Button>
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="alert alert-info" role="alert">
          You currently have no friends in the system.
        </div>
      )}

      <div className="my-3">
      <input
        type="email"
        value={newFriendEmail}
        onChange={(e) => setNewFriendEmail(e.target.value)}
        placeholder="Enter friend's email"
        className="form-control"
        />

        <button onClick={handleAddFriend} className="btn btn-primary mt-2">Add Friend</button>
      </div>
    </div>
  );
}



export default Friends;
