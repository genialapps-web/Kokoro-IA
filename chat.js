import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Obtener el ID del personaje desde la URL (?id=...)
const urlParams = new URLSearchParams(window.location.search);
personajeId = urlParams.get('id');

if (!personajeId) {
    window.location.href = 'index.html';
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Si no existe un usuario, creamos una sesión anónima automáticamente
        signInAnonymously(auth).catch((error) => {
            console.error("Error de autenticación anónima:", error);
            window.location.href = 'auth.html';
        });
    } else {
        userUID = user.uid;
        isAnon = user.isAnonymous;

        // Mostrar advertencia si es invitado
        if (isAnon) {
            const guestAlert = document.getElementById('guest-chat-alert');
            if (guestAlert) guestAlert.classList.remove('hidden');
        }

        await cargarDatosPersonaje();
        inicializarEscuchaMensajes();
    }
});

// Cargar la información del personaje seleccionado
async function cargarDatosPersonaje() {
    try {
        const docRef = doc(db, "personajes", personajeId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Actualizamos la información en el DOM
            const nameEl = document.getElementById('ia-name');
            if (nameEl) nameEl.innerText = data.name;
            
            const imgElement = document.getElementById('chat-avatar');
            if (imgElement) imgElement.src = data.image;
            
            // Guardamos el prompt del sistema
            systemPrompt = data.physicalPrompt || data.description || "Eres una entidad del multiverso.";
        } else {
            alert("La entidad no existe en el Santuario.");
            window.location.href = 'index.html';
        }
    } catch (e) {
        console.error("Error al cargar datos del personaje:", e);
    }
}

// Enviar mensaje con control de límite de invitados
window.enviarMensaje = async function () {
    const inputField = document.getElementById('chat-input');
    const mensajeTexto = inputField.value.trim();

    if (!mensajeTexto) return;

    // Control de límite para invitados (máximo 3 mensajes)
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

        // Guardar mensaje en la base de datos
        await addDoc(collection(db, "usuarios", userUID, "chats", personajeId, "mensajes"), payload);
        inputField.value = ""; // Limpiamos el input
        
        // Aquí irá la lógica de respuesta de la IA

    } catch (e) {
        alert("Error al enviar el mensaje: " + e.message);
    }
}

function inicializarEscuchaMensajes() {
    // Listener de la base de datos para mostrar mensajes en tiempo real
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

        // Auto-scroll al final del chat
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

