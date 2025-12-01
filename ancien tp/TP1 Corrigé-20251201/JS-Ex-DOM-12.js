// 1 - Supprimez la classe red.
vCoupRed = document.getElementsByTagName("p");
for (var i=0; i<vCoupRed.length; i++) {
    vCoupRed[i].classList.remove("red");
    } 
    
// 2 - Mettez en italique tous les refrains.
RefIt = document.getElementsByClassName("refrain");
//alert(RefIt.length);
for (var i=0; i<RefIt.length; i++) {
    RefIt[i].setAttribute("style", "font-style:italic");
    }

// 3 - Mettre une couleur de fond bleu uniquement sur les paragraphes.
vBlue = document.getElementsByTagName("p");
for (i=0; i<vBlue.length; i++){
vBlue[i].style.backgroundColor = "#6495ED";
}   
// 3 - Mettre une couleur de fond bleu sur tous les paragraphes
//document.body.style.backgroundColor = "#6495ED";

// 4 - Supprimer les espaces entre les paragraphes.
vPar = document.getElementsByTagName("p");
for (i=0; i<vPar.length; i++){
vPar[i].style.margin = "0%";
}