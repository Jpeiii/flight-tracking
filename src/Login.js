/**
 * This file, Login.js, is a React component that handles user login functionality. It provides both Google OAuth login and manual 
 * login using email and name
 */

import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope,faUser} from "@fortawesome/free-solid-svg-icons";
import { jwtDecode } from 'jwt-decode';
import './css/styles.css'



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

function Login({ onUserLoggedIn, onUserLoginFailed }) {
    // Function to fetch user data based on email
    const fetchUser = async (email) => {
        // GraphQL query to retrieve user information
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
        // Execute the GraphQL query and return the result
        const result = await graphQLFetch(query, variables);
        return result.getUser; // Return the user object or undefined
    };
    // Handler for successful login
    const handleLoginSuccess = async (response) => {
        const userObject = jwtDecode(response.credential);

        // First, try to fetch the user
        const existingUser = await fetchUser(userObject.email);

        if (existingUser) {
            console.log('Existing User Info:', existingUser);
            onUserLoggedIn(existingUser);
        } else {
            // If user does not exist, proceed with addUser mutation
            const mutationQuery = `
                mutation addUser($email: String!, $name: String!) {
                    addUser(email: $email, name: $name) {
                        email
                        name
                    }
                }
            `;
    
            const variables = {
                email: userObject.email,
                name: userObject.name
            };
            // Execute the GraphQL mutation to add a new user
            const addUserResult = await graphQLFetch(mutationQuery, variables);
            if (addUserResult.addUser) {
                // If user is successfully added, log the info and trigger the loggedIn event
                console.log('New User Added:', addUserResult.addUser);
                onUserLoggedIn(addUserResult.addUser);
            } else {
                 // If user addition fails, alert the user and trigger the loginFailed event
                alert("Failed to add user. Please try another method.");
                onUserLoginFailed();
            }
        }
        // Store the user's email in local storage
        localStorage.setItem('email', userObject.email);
    };

    // Handler for login failure
    const handleLoginFailure = (response) => {
        alert('Login Failed'); // Show an alert for failed login
        console.log('Login Failed:', response); // Log the failed response
        onUserLoginFailed();  // Trigger the loginFailed event
    };

    // Function to validate if the string is an email
    const isEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex for validating email
        return emailRegex.test(email); // Test the email string against the regex
    };

    // Handler for credential response (manual login form)
    const handleCredentialResponse = async () => {
        const emailInput = document.getElementById("credentialEmail"); // Get email input element
        const userInput = document.getElementById("credentialUser"); // Get user input element

        const emailValue = emailInput.value; // Extract the email value
        const userValue = userInput.value; // Extract the user value

        if (isEmail(emailValue)) {
            // Check if the email is valid
            const existingUser = await fetchUser(emailValue);
            if (existingUser) {
                console.log('Existing User Info:', existingUser);
                const user = existingUser.name
                if (user !== userValue) {
                    // If user exists, check if the name matches
                    alert("Invalid name");
                    onUserLoginFailed();
                }else{
                    // If name matches, trigger loggedIn event
                    onUserLoggedIn(existingUser);
                }
            } else {
                // If user does not exist, proceed with addUser mutation
                const mutationQuery = `
                    mutation addUser($email: String!, $name: String!) {
                        addUser(email: $email, name: $name) {
                            email
                            name
                        }
                    }
                `;
        
                const variables = {
                    email: emailValue,
                    name: userValue
                };
                 // Execute the GraphQL mutation to add a new user       
                const addUserResult = await graphQLFetch(mutationQuery, variables);
                if (addUserResult.addUser) {
                    // If user is successfully added, log the info and trigger loggedIn event
                    console.log('New User Added:', addUserResult.addUser);
                    onUserLoggedIn(addUserResult.addUser);
                } else {
                    // If user addition fails, alert the user and trigger loginFailed event
                    alert("Failed to add user. Please try another method.");
                    onUserLoginFailed();
                }
            }
            // Store the user's email in local storage
            localStorage.setItem('email', emailValue);
        } else {
            alert("Invalid email");
        }
    };
    // JSX for the login component
    return (
        <div>
            <section className="section section-shaped section-lg login-background">
                <div className="shape shape-style-1 bg-gradient-default">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                </div>
                <div className="container pt-lg-7">
                <div className="row justify-content-center">
                    <div className="col-lg-5">
                    <h2 style={{textAlign: 'center', color:'white'}}>Welcome to AeroWeather Explorer!</h2>
                    <div className="card bg-secondary shadow border-0">
                        <div className="card-header bg-white pb-5">
                        <div className="text-muted text-center mb-3"><small>Sign in with</small></div>
                        <div className="btn-wrapper text-center">
                            <a href="#" className="btn btn-neutral btn-icon">
                                <GoogleLogin
                                onSuccess={handleLoginSuccess}
                                onError={handleLoginFailure}
                                classNameName="btn btn-custom"
                                />
                            </a>
                        </div>
                        </div>
                        <div className="card-body px-lg-5 py-lg-5">
                        <div className="text-center text-muted mb-4">
                            <small style={{color:'white'}}>Or sign in with credentials</small>
                        </div>
                        <form role="form">
                            <div className="form-group mb-3">
                                <div className="input-group input-group-alternative">
                                    <div className="input-group-prepend">
                                        <span className="input-group-text" style={{color:'#fff',fontSize:'1.5rem', background:'transparent', border:'none'}}>
                                            <FontAwesomeIcon icon={faEnvelope} />
                                        </span>
                                    </div>
                                    <input id="credentialEmail" className="form-control" placeholder="Email" type="email"></input>
                                </div>
                            </div>
                            <div className="form-group mb-3">
                                <div className="input-group input-group-alternative">
                                    <div className="input-group-prepend">
                                        <span className="input-group-text" style={{color:'#fff',fontSize:'1.5rem', background:'transparent', border:'none'}}>
                                            <FontAwesomeIcon icon={faUser} />
                                        </span>                                    
                                    </div>
                                    <input id="credentialUser" className="form-control" placeholder="Name" type="text"></input>
                                </div>
                            </div>
                            <div className="text-center">
                                <button onClick={handleCredentialResponse} type="button" className="btn btn-primary my-4">Sign in</button>
                            </div>
                        </form>
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            </section>
        </div>

    );
}


export default Login;
