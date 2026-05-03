import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCSQw7b4_OJpxZRP8Tu9shvpB4nE-xwmQc",
    authDomain: "smm-proyecto.firebaseapp.com",
    projectId: "smm-proyecto",
    storageBucket: "smm-proyecto.firebasestorage.app",
    messagingSenderId: "696404417299",
    appId: "1:696404417299:web:1c3982babc049a18f398e6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let userUID = null;
let isAnon = false;
let systemPrompt = "";
let personajeId = null;

// Obtener el ID del personaje desde la URL
const urlParams = new URLSearchParams(window.location.search);
personajeId = urlParams.get('id');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        userUID = user.uid;
        isAnon = user.isAnonymous;

        if (personajeId) {
            await cargarDatosPersonaje();
            inicializarEscuchaMensajes();
        }
    } else {
        console.log("Usuario visitante listo para explorar.");
    }
});

// Cargar la información del personaje seleccionado
async function cargarDatosPersonaje() {
    try {
        if (!personajeId) return;
        const docRef = doc(db, "personajes", personajeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            const nameEl = document.getElementById('ia-name');
            if (nameEl) nameEl.innerText = data.name;
            
            const imgElement = document.getElementById('chat-avatar');
            if (imgElement) imgElement.src = data.image;
            
            systemPrompt = data.physicalPrompt || data.description || "Eres una entidad del multiverso.";
        }
    } catch (e) {
        console.error("Error al cargar datos del personaje:", e);
    }
}

// Enviar mensaje con control de límite e inicio de sesión bajo demanda
window.enviarMensaje = async function () {
    const inputField = document.getElementById('chat-input');
    const mensajeTexto = inputField.value.trim();

    if (!mensajeTexto) return;

    // Si el usuario no está autenticado, intentamos autenticarlo anónimamente
    if (!auth.currentUser) {
        try {
            const userCredential = await signInAnonymously(auth);
            userUID = userCredential.user.uid;
            isAnon = userCredential.user.isAnonymous;

            // CREAR EL DOCUMENTO FALTANTE EN LA BASE DE DATOS
            // Esto evita el error de "Usuario no encontrado" para invitados
            await setDoc(doc(db, "usuarios", userUID), {
                createdAt: serverTimestamp(),
                esInvitado: true,
                rol: "invitado"
            }, { merge: true });

        } catch (e) {
            console.error("No se pudo iniciar sesión anónima:", e);
            alert("Por favor, inicia sesión o regístrate para continuar.");
            window.location.href = 'auth.html';
            return;
        }
    }

    // Control de límite para invitados
    if (isAnon) {
        let mensajesInvitado = parseInt(localStorage.getItem('mensajes_invitado') || '0');
        if (mensajesInvitado >= 3) {
            alert("Has alcanzado el límite de mensajes como invitado. ¡Registra una cuenta para continuar tu historia!");
            window.location.href = 'auth.html';
            return;
        }
        localStorage.setItem('mensajes_invitado', mensajesInvitado + 1);
    }

    try {
        const payload = {
            texto: mensajeTexto,
            remitente: "usuario",
            timestamp: serverTimestamp()
        };

        await addDoc(collection(db, "usuarios", userUID, "chats", personajeId, "mensajes"), payload);
        inputField.value = "";
    } catch (e) {
        alert("Error al enviar el mensaje: " + e.message);
    }
}

function inicializarEscuchaMensajes() {
    if (!userUID || !personajeId) return;

    const q = query(
        collection(db, "usuarios", userUID, "chats", personajeId, "mensajes"), 
        orderBy("timestamp", "asc")
    );

    onSnapshot(q, (snapshot) => {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;
        
        chatContainer.innerHTML = "";
        
        if (snapshot.empty) {
            chatContainer.innerHTML = `<p class="text-center text-slate-500 text-[10px] uppercase mt-6">Escribe un mensaje para iniciar la conversación</p>`;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const esUsuario = data.remitente === "usuario";

            chatContainer.innerHTML += `
                <div class="flex ${esUsuario ? 'justify-end' : 'justify-start'} mb-4 animate-card">
                    <div class="max-w-[75%] p-4 rounded-2xl text-xs ${
                        esUsuario 
                        ? 'bg-yellow-500 text-black font-semibold' 
                        : 'glass-premium border border-white/5 text-white'
                    }">
                        <p>${data.texto}</p>
                    </div>
                </div>
            `;
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
        }
