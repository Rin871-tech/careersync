import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDfSGyEZbTc0YapVrCLButxNNk7o7QLyPY",
  authDomain: "careersync-dev.firebaseapp.com",
  projectId: "careersync-dev",
  storageBucket: "careersync-dev.firebasestorage.app",
  messagingSenderId: "782664010524",
  appId: "1:782664010524:web:b34ee0ac61184aa606c8d9",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;