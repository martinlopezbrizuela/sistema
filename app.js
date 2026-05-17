console.log("KAVAJU ERP iniciado");

/* TEST JSONBIN */

async function iniciarSistema(){

  console.log("Conectando nube...");

  const datos = await loadCloud();

  console.log("Datos nube:", datos);

}

iniciarSistema();

/* EFECTOS UI */

const cards = document.querySelectorAll(".card");

cards.forEach(card => {

  card.addEventListener("mouseenter", () => {

    card.style.transform = "translateY(-4px)";
    card.style.transition = ".2s";

  });

  card.addEventListener("mouseleave", () => {

    card.style.transform = "translateY(0px)";

  });

});

/* MENU */

const menuItems = document.querySelectorAll(".menu-item");

menuItems.forEach(btn => {

  btn.addEventListener("click", () => {

    menuItems.forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

  });

});
