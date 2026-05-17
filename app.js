console.log("KAVAJU ERP iniciado");

/* DEMO SIMPLE */

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

console.log("UI cargada correctamente");
