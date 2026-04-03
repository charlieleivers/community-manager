// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBVkLiWlk2AcjWU-QWGPQcGAqePpL8ZZRc",
  authDomain: "community-manager-40800.firebaseapp.com",
  projectId: "community-manager-40800",
  storageBucket: "community-manager-40800.firebasestorage.app",
  messagingSenderId: "875717843952",
  appId: "1:875717843952:web:3d8392d636ecca03d71b35",
  measurementId: "G-Y02EZ7T70S"
};

// Initialize Firebase
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
