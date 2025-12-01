// Au lieu de '/api/data/drivers', on appelle le fichier PHP
fetch('api/get_data.php?file=drivers')
    .then(response => response.json())
    .then(data => {
        console.log("Données reçues :", data);
        // data est un tableau d'objets : [{driverId: "1", driverRef: "hamilton", ...}, ...]
        
        // --- ICI VOTRE CODE D3.JS ---
        // Exemple : Afficher les noms dans une liste
        /* d3.select("#mon-graphique")
          .selectAll("p")
          .data(data)
          .enter()
          .append("p")
          .text(d => d.surname);
        */
    })
    .catch(error => console.error('Erreur:', error));