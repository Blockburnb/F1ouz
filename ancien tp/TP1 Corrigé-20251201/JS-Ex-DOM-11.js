// 1. Modifier le titre
vBody = document.getElementsByTagName("body");
vBody[0].children[0].innerHTML = "Rick Astley - Never Gonna Give You Up";
// OU
document.body.firstElementChild.innerHTML = "Rick Astley - Never Gonna Give You Up";
// OU
alert(vBody[0].childNodes.length);
vBody[0].childNodes[1].childNodes[0].nodeValue= "Rick Astley - Never Gonna Give You Up";

// 2. Supprimer la 1ère ligne qui est en double dans les classes "couplet"
vCoup = document.getElementsByClassName("couplet");
alert(vCoup.length);
for (var i=0; i<vCoup.length; i++) {
    vCoup[i].removeChild(vCoup[i].firstChild);
    vCoup[i].removeChild(vCoup[i].childNodes[0]);
    }

//3. Solution 1 - Par le haut : Supprimer les lignes en double dans les classes "refrain"
vCoupRef = document.getElementsByClassName("refrain");
alert(vCoupRef.length);
for (var i=0; i<vCoupRef.length; i++) {
    alert(vCoupRef[i].childNodes.length);
    for (var j=0; j<vCoupRef[i].childNodes.length; j++) {
        vCoupRef[i].removeChild(vCoupRef[i].childNodes[j]);
        vCoupRef[i].removeChild(vCoupRef[i].childNodes[j]);
    }
} 

/*3. Solution 2 - Par le bas : Supprimer les lignes en double dans les classes "refrain"
vCoupRef = document.getElementsByClassName("refrain");
alert(vCoupRef.length);
for (var i=0; i<vCoupRef.length; i++) {
    vCoupPhrase = vCoupRef[i].childNodes;
    alert(vCoupPhrase.length);
    for (var j=vCoupPhrase.length; j>=0; j-=4) {
        alert(j);
        vCoupRef[i].removeChild(vCoupRef[i].childNodes[j-1]);
        vCoupRef[i].removeChild(vCoupRef[i].childNodes[j-2]);
    }
 }
 */
      
// 4. Supprimer l'élément ayant pour id = "erreur"
vErr = document.getElementById("erreur");
vErr.remove();

// 5. Ajouter un <footer> avec un texte dans le document
vpara = document.createElement("footer");
vpara.innerHTML = "© Copyright 2023 - IUT SD";
document.body.appendChild(vpara);



