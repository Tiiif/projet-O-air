console.log("chargement de script.js"); //verifie inst. si fichier js est chargé par HTML


// création des varaibles qui "pointent" les elts HTML pour les modifier

const CO2Bar = document.getElementById("CO2");
const pm1Bar = document.getElementById("pm1");
const pm25Bar = document.getElementById("pm25");
const pm10Bar = document.getElementById("pm10");

// permet de savoir si on est en direct ou en historique
let isHistoryMode = false;


// GESTION DES ONGLETS

function showTab(tabId) { // gère affichage visuel
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active")); //supp tout pour repartir de 0
  document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
  
  document.getElementById(tabId).classList.add("active"); //pour modifier les valeurs des jauges de manières dynamiques
  if(event) event.currentTarget.classList.add("active"); //affiche uniquement l'onglet de l'utilisateur
}

// MISE A JOUR IU (Jauges + Textes)

function updateInterface(valCO2, valPM1, valPM25, valPM10) { //ce,traliser affichage
    if (valCO2 !== null) { //vérifier que la données existe 
        CO2Bar.value = valCO2; //met à jour position jauge 
        document.getElementById("cardCO2").innerText = Math.round(valCO2); //pour arrondir
    }
    if (valPM1 !== null) {
        pm1Bar.value = valPM1;
        document.getElementById("cardPM1").innerText = valPM1.toFixed(1); // on force l'affichage des décimales
    }
    if (valPM25 !== null) {
        pm25Bar.value = valPM25;
        document.getElementById("cardPM25").innerText = valPM25.toFixed(1);
    }
    if (valPM10 !== null) {
        pm10Bar.value = valPM10;
        document.getElementById("cardPM10").innerText = valPM10.toFixed(1);
    }
}


// 1. BOUCLE TEMPS RÉEL

async function refreshRealTimeMetrics() { //récupère le direct
  if (isHistoryMode) return; // On ne fait rien si on regarde l'historique

  try {
      // On demande la dernière heure pour avoir le contexte immédiat
      const response = await fetch("http://localhost:3000/data?start=-1h"); // on appelle le serveur pour demander la dernière heure de données 
      const data = await response.json();

      // On récupère la DERNIÈRE valeur (le "Direct")
      const lastCO2 = data.filter(d => d._field === "CO2").pop(); 
      const lastPM1 = data.filter(d => d._field === "PM1").pop();
      const lastPM25 = data.filter(d => d._field === "PM25").pop();
      const lastPM10 = data.filter(d => d._field === "PM10").pop();

      updateInterface(
          lastCO2 ? lastCO2._value : null,
          lastPM1 ? lastPM1._value : null,
          lastPM25 ? lastPM25._value : null,
          lastPM10 ? lastPM10._value : null
      );

  } catch (error) {
      console.error("Erreur fetch temps réel :", error);
  }
}


// 2. FONCTIONS HISTORIQUE & RESET


async function updateHistoricalData() {
    const startInput = document.getElementById('startDate').value;
    const endInput = document.getElementById('endDate').value;
    
    if (!startInput || !endInput) {
        alert("Veuillez sélectionner les dates.");
        return;
    }

    isHistoryMode = true; // On fige les jauges

    const startISO = new Date(startInput).toISOString(); //convertit la date format ISO
    const endISO = new Date(endInput).toISOString();
    const url = `http://localhost:3000/data?start=${startISO}&end=${endISO}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data || data.length === 0) {
            alert("Pas de données.");
            return;
        }

        drawGraphs(data);

        // En historique, les jauges montrent la MOYENNE de la période
        updateInterface(
            calculateAverage(data, "CO2"),
            calculateAverage(data, "PM1"),
            calculateAverage(data, "PM25"),
            calculateAverage(data, "PM10")
        );

    } catch (error) {
        console.error(error);
    }
}

function resetToRealTime() {
    isHistoryMode = false; // On relance le direct
    
    document.getElementById('startDate').value = "";
    document.getElementById('endDate').value = "";
    
    // Mise à jour immédiate des jauges (valeur actuelle)
    refreshRealTimeMetrics();
    
    // Mise à jour des graphes sur la dernière heure (Zoom sur le présent)
    // C'est ici qu'on définit le "Défaut" au démarrage
    fetch("http://localhost:3000/data?start=-1h")
        .then(res => res.json())
        .then(data => drawGraphs(data));
        
    console.log("Retour au direct (1h glissante)");
}

//  Moyenne
function calculateAverage(data, fieldName) {
    const values = data.filter(d => d._field === fieldName).map(d => d._value); // liste avec que des nombres
    return values.length ? (values.reduce((a, b) => a + b, 0) / values.length) : 0; // somme des valeurs et on / par le nb de pts 
}

// Helper Graphes
function drawGraphs(data) {
  data.sort((a, b) => new Date(a._time) - new Date(b._time)); //ordre chrono 
  const createTrace = (field, color) => ({
      x: data.filter(d => d._field === field).map(d => d._time),
      y: data.filter(d => d._field === field).map(d => d._value),
      mode: "lines", name: field, line: { color: color }
  });
  const getLayout = (yTitle) => ({
      margin: { t: 30, b: 60, l: 70, r: 20 }, 
      xaxis: {
          title: 'Temps',  // Titre Axe X
          showgrid: true,
          zeroline: false
      },
      yaxis: {
          title: yTitle,   // Titre Axe Y (Variable selon le graphe)
          showgrid: true
      },
      autosize: true
  });

  

  // CO2
  Plotly.newPlot("graphCO2", 
      [createTrace("CO2", "#2ca02c")], 
      getLayout("CO2 (ppm)") // Titre spécifique
      
  );

  // PM1
  Plotly.newPlot("graphPM1", 
      [createTrace("PM1", "#1f77b4")], 
      getLayout("PM1 (µg/m³)")
  );

  // PM2.5
  Plotly.newPlot("graphPM25", 
      [createTrace("PM25", "#ff7f0e")], 
      getLayout("PM2.5 (µg/m³)")
  );

  // PM10
  Plotly.newPlot("graphPM10", 
      [createTrace("PM10", "#d62728")], 
      getLayout("PM10 (µg/m³)")
  );
}

// INITIALISATION

setInterval(refreshRealTimeMetrics, 2000); // mise à jour chaque 2 sec
resetToRealTime(); // chargement direct pour que le site ne soit pas "vide" au lancement 