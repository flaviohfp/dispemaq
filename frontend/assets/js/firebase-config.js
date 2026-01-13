/* =========================================
   FIREBASE CONFIG (Atualizado v10.7.1)
   ========================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

// --- AUTH ---
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- FIRESTORE ---
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    setDoc, 
    getDoc,
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- STORAGE ---
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Suas chaves (NÃO ALTERADAS)
const firebaseConfig = {
  apiKey: "AIzaSyBd9UFvalhbsQb2vSVcladqZX-ZQzpeJPI",
  authDomain: "dispemaq-fe9ef.firebaseapp.com",
  projectId: "dispemaq-fe9ef",
  storageBucket: "dispemaq-fe9ef.firebasestorage.app",
  messagingSenderId: "785500806336",
  appId: "1:785500806336:web:9479f9d107bcb677cca125"
};

// Inicializa o App
const app = initializeApp(firebaseConfig);

// Inicializa os serviços
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Exportando TUDO para manter compatibilidade com seus outros arquivos
export { 
    app,
    auth, 
    db, 
    storage, 
    
    // Auth
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,

    // Firestore
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    setDoc, 
    getDoc,
    updateDoc, 

    // Storage
    ref, 
    uploadBytes, 
    getDownloadURL
};