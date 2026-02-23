// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPXfc5UJQQ3t8xQjZ_8l6DQOGr7r74pss",
  authDomain: "mechanikv2.firebaseapp.com",
  projectId: "mechanikv2",
  storageBucket: "mechanikv2.firebasestorage.app",
  messagingSenderId: "941184814783",
  appId: "1:941184814783:web:484ae4e43fd4793c89000a",
  measurementId: "G-2269DSSXDB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);