/* =========================================
   assets/js/firebase-config.js (Versão Completa)
   ========================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
// AQUI: Note que deleteDoc e doc estão sendo importados
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBd9UFvalhbsQb2vSVcladqZX-ZQzpeJPI",
  authDomain: "dispemaq-fe9ef.firebaseapp.com",
  projectId: "dispemaq-fe9ef",
  storageBucket: "dispemaq-fe9ef.firebasestorage.app",
  messagingSenderId: "785500806336",
  appId: "1:785500806336:web:9479f9d107bcb677cca125"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// AQUI: O passo mais importante. Exportar deleteDoc e doc para o admin usar.
export { db, storage, collection, addDoc, getDocs, deleteDoc, doc, ref, uploadBytes, getDownloadURL };