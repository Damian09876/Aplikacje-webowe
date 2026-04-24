import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { CONFIG } from "./config";

const app = initializeApp(CONFIG.firebaseConfig);
export const db = getFirestore(app);
