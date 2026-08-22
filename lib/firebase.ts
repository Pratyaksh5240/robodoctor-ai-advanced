import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDCNffc_uBD5zM25H52IAjszLUGszAwIAg",
  authDomain: "robodoctor-ai.firebaseapp.com",
  projectId: "robodoctor-ai",
  storageBucket: "robodoctor-ai.appspot.com",
  messagingSenderId: "628646569009",
  appId: "1:628646569009:web:eb3777afa109dff980e110"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
