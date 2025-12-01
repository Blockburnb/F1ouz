// Récupere la case "masquer les paroles"
CBParoles = document.getElementById("masquer-paroles");
// Récupere la case "masquer les paroles"
CBRef = document.getElementById("masquer-refrains");
// Récupère le div contenant les paroles
const DIVParoles = document.getElementById("paroles");

// 1. Masquer les paroles et 2. changer le texte (label de la checkbox)
// Attache une fonction à l'évènement "click" sur checkboxParoles
CBParoles.addEventListener('click', function (event) {
  // cette fonction est executée lorsque l'utilisateur clique sur checkboxParoles
  // event.target contient l'élément cliqué (ici checkboxParoles dans notre cas)
  vLabel = document.getElementsByTagName("label");
  if (event.target.checked) {
    // la case vient d'être cochée
    DIVParoles.style.display = "none";
    vLabel[1].childNodes[1].nodeValue = "Afficher les paroles";
  } else {
     // la case vient d'être décochée
    DIVParoles.style.display = "block";
    vLabel[1].childNodes[1].nodeValue = "Masquer les paroles";
  }
});

/* Question 3 - Fonctionne et mise en commentaire
// 3. Masquer tous les refrains sauf le 1er et Modifier le texte Label de la checkbox
// Récupère les objets contenant les refrains
vRef = document.getElementsByClassName("refrain");
// Attache une fonction à l'évènement "click" sur checkboxRefrain
CBRef.addEventListener('click', function (event) {
  // cette fonction est executée lorsque l'utilisateur clique sur checkboxParoles
  // event.target contient l'élément cliqué (ici checkboxRefrain dans notre cas)
  vLabel = document.getElementsByTagName("label");
  if (event.target.checked) {
    // la case vient d'être cochée
    for(var i=1; i<vRef.length; i++) {
    vRef[i].childNodes[3].style.display = "none";
    //OU //vRef[i].style.visibility = 'hidden';
    }
    vLabel[0].childNodes[2].nodeValue = "Afficher les refrains";
  } else {
     // la case vient d'être décochée
     for(var i=1; i<vRef.length; i++) {
      vRef[i].childNodes[3].style.display = "block";
      vRef[i].childNodes[4].nodeValue = " ";
      //OU
      //vRef[i].style.visibility = 'visible';
      }
      vLabel[0].childNodes[2].nodeValue = "Masquer les refrains";
  }
});
// fin du commentaire pour la Question 3  
*/

/* Questions 4. et 5 : fonctionnent et mise en commentaire
// 4. et 5. Masquer tous les refrains, ajouter le texte [Refrain], et afficher le refrain si mouvement de souris sur le premier refrain uniquement
vRef = document.getElementsByClassName("refrain");
//décocher automatiquement les 2 checkbox
CBRef.checked = false;
CBParoles.checked = false;

CBRef.addEventListener('click', function (event) {
  vLabel = document.getElementsByTagName("label");
  if (event.target.checked) {
    alert("Case cochée valeur : " + event.target.checked);
    for(var i=0; i<vRef.length; i++) {
    vRef[i].childNodes[3].style.display = "none";
    vRef[i].childNodes[4].nodeValue = "[Refrain]";
    }
    vLabel[0].childNodes[2].nodeValue = "Afficher les refrains";
    vRef[0].addEventListener("mouseenter", mouseEnter);
    vRef[0].addEventListener("mouseleave", mouseLeave);
  } else {
    alert("Case décochée valeur : " + event.target.checked);
     for(var i=0; i<vRef.length; i++) {
      vRef[i].childNodes[3].style.display = "block";
      vRef[i].childNodes[4].nodeValue = " ";
      }
      vLabel[0].childNodes[2].nodeValue = "Masquer les refrains";
      vRef[0].removeEventListener("mouseenter", mouseEnter);
      vRef[0].removeEventListener("mouseleave", mouseLeave);
  }
});
function mouseEnter() 
{ vRef[0].childNodes[3].style.display = "block";
  vRef[0].childNodes[4].nodeValue = ""; 
 }  
function mouseLeave() 
{ vRef[0].childNodes[3].style.display = "none";   
  vRef[0].childNodes[4].nodeValue = "[Refrain]";
}
// Fin du commentaire question 4 et 5 
*/

//6. Masquer tous les refrains, afficher le texte si passage souris sur tous les textes [Refrain]
var vRef = document.querySelectorAll(".refrain");
//décocher automatiquement les 2 checkbox
CBRef.checked = false;
CBParoles.checked = false;

CBRef.addEventListener('click', function (event) {
  vLabel = document.getElementsByTagName("label");
  if (event.target.checked) {
    alert("Case cochée valeur : " + event.target.checked);
    for(let i=0; i<vRef.length; i++) {
      vCell = document.getElementsByClassName("refrain")[i];
      vCell.childNodes[3].style.display = "none";
      vCell.childNodes[4].nodeValue = "[Refrain]";
      vCell.addEventListener("mouseenter", mouseEnter);
      vCell.addEventListener("mouseleave", mouseLeave);
    }
    vLabel[0].childNodes[2].nodeValue = "Afficher les refrains";
  } else {
      alert("Case décochée valeur : " + event.target.checked);
      for(let i=0; i<vRef.length; i++) {
        vCel = document.getElementsByClassName("refrain")[i];
        vCel.childNodes[3].style.display = "block";
        vCel.childNodes[4].nodeValue = " ";
        vCel.removeEventListener("mouseenter", mouseEnter);
        vCel.removeEventListener("mouseleave", mouseLeave);
      }
      vLabel[0].childNodes[2].nodeValue = "Masquer les refrains";
  }
});

mouseEnter = function(event) {
    event.target.childNodes[3].style.display = "block";
    event.target.childNodes[4].nodeValue = ""; 
} 

mouseLeave = function(event) {
  event.target.childNodes[3].style.display = "none";   
  event.target.childNodes[4].nodeValue = "[Refrain]";
 }