import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";

// --- ADICIONADO: Importações de Autenticação ---
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

// Suas chaves originais
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
const auth = getAuth(app); // --- ADICIONADO: Inicializa o Auth
const db = getFirestore(app);
const storage = getStorage(app);

// Exportando TUDO (Antigos + Novos de Login)
export { 
    app,
    auth, // O objeto de autenticação
    db, 
    storage, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    setDoc, 
    getDoc,
    // Funções de Login que o site precisa agora:
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
};