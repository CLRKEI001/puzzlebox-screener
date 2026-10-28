import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// NOTE: screening/report data has moved to Supabase — see
// src/supabaseClient.js. Firestore is still used for Authentication plus a
// few read paths that haven't been migrated yet: the "users" profile
// lookup (App.js, Login.js) and the psychologist "messages" listener
// (TeacherHome.js, PsychologistHome.js, AdminHome.js, Sidebar.js). Restoring
// this export un-breaks the build for those files; migrating them off
// Firestore entirely is a separate, later task.

const firebaseConfig = {
  apiKey: "AIzaSyCXC57VPWS0IokhkJax56PuLNXfQVWvW8Y",
  authDomain: "puzzle-project-3b369.firebaseapp.com",
  projectId: "puzzle-project-3b369",
  storageBucket: "puzzle-project-3b369.firebasestorage.app",
  messagingSenderId: "216159714579",
  appId: "1:216159714579:web:fbce493e2e1c2c1960eee6",
  measurementId: "G-6FG7GS9WYS"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app; 