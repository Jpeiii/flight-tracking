import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import 'bootstrap/dist/css/bootstrap.min.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './css/styles.css'
import App from "./App";


const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <GoogleOAuthProvider clientId="596030958742-0ll6a847meufspriorpn0ekij0emj0fv.apps.googleusercontent.com"> 
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);