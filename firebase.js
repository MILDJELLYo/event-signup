// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCnAiJixh_3MVzHugTHXpcGDDsn3gA1uiQ",
  authDomain: "signup-app-b8438.firebaseapp.com",
  projectId: "signup-app-b8438",
  storageBucket: "signup-app-b8438.firebasestorage.app",
  messagingSenderId: "939278369140",
  appId: "1:939278369140:web:503750a54542df1d51ac21",
  measurementId: "G-FZWLSCZRDE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);