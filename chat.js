async function cargarDatosPersonaje() {
    const docRef = doc(db, "personajes", personajeId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Actualizamos el nombre
        document.getElementById('ia-name').innerText = data.name;
        
        // Actualizamos la imagen del avatar
        const imgElement = document.getElementById('chat-avatar');
        imgElement.src = data.image; // Asegúrate de que el campo se llame 'image' en Firebase
        
        // Guardamos el prompt para la IA
        systemPrompt = data.prompt;
    }
}
