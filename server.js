import express from "express"; //framework qui nous permet de créer un serveur web
import cors from "cors"; //autorise le site à communiquer avec le serveur sans être bloqué
import { InfluxDB } from "@influxdata/influxdb-client"; //bib qui permet à node.js de communiquer avec Influx

const app = express(); //création du serveur
app.use(cors()); //on active le module cors pour que les requetes du navigateur soient acceptées 


// CONFIG INFLUXDB

const INFLUX_URL = "https://us-east-1-1.aws.cloud2.influxdata.com";
const INFLUX_TOKEN = "HeUYNav25VuD5mLMOsnKSubAXYpaMrAx3isIRK4LQsK5tHx9ZG_H74uLuOZn4GWltVBRQJADmZTYWHJ2c75Yow==";  
const INFLUX_ORG = "333ff819ebda9024";
const INFLUX_BUCKET = "oair";

const influx = new InfluxDB({ //on crée la connexion 
    url: INFLUX_URL,
    token: INFLUX_TOKEN,
});

// ROUTE : /data → données temps réel

app.get("/data", async (req, res) => { //le site appelle le serveur
    try {
        const queryApi = influx.getQueryApi(INFLUX_ORG);
        let { start, end } = req.query;
        let rangeStart = start || "-1h";
        let rangeStop = end || "now()";
        if (rangeStart.includes('T')) rangeStart = `time(v: "${rangeStart}")`;
        if (rangeStop.includes('T')) rangeStop = `time(v: "${rangeStop}")`;

        console.log(`Query Influx -> Start: ${rangeStart}, End: ${rangeStop}`);

        // commande envoyée à influx
        const fluxQuery = ` 
            from(bucket: "oair")
                |> range(start: ${rangeStart}, stop: ${rangeStop})
                |> filter(fn: (r) => r["_field"] == "PM10" or r["_field"] == "PM1" or r["_field"] == "CO2" or r["_field"] == "PM25")
                |> yield(name: "last")
        `;

        let lastCO2;
        
        const rows = await queryApi.collectRows(fluxQuery); // on lance la requête et on attend
        res.json(rows); //on renvoie les lignes au site 

    } catch (err) {
        console.error(err);  // Affiche l’erreur complète
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------
app.listen(3000, () => {
    console.log("🚀 Proxy Influx prêt : http://localhost:3000/data");
});
