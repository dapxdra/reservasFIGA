//Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9xEUy5JsfvXRgc_67CIO18omvUxsLq3A",
  authDomain: "trans-reservationfiga.firebaseapp.com",
  projectId: "trans-reservationfiga",
  storageBucket: "trans-reservationfiga.firebasestorage.app",
  messagingSenderId: "391833282452",
  appId: "1:391833282452:web:4557b5ac96d07e32a6d181",
};

// Initialize Firebase
const auth = getAuth(app);
const app = initializeApp(firebaseConfig);
