console.log("KAVAJU ERP funcionando");

document.querySelectorAll(".menu-item").forEach(btn => {

  btn.addEventListener("click", () => {

    document.querySelectorAll(".menu-item").forEach(b => {
      b.classList.remove("active");
    });

    btn.classList.add("active");

    const titulo = btn.textContent.trim();

    document.querySelector(".topbar h1").textContent = titulo;

    document.querySelector(".topbar p").textContent =
      "Módulo " + titulo + " cargado correctamente";

  });

});

document.querySelector(".new-btn").addEventListener("click", () => {

  alert("Nuevo pedido próximamente.");

});
