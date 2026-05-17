document.addEventListener("DOMContentLoaded", () => {
  console.log("KAVAJU ERP funcionando");

  const menuItems = document.querySelectorAll(".menu-item");
  const titulo = document.querySelector(".topbar h1");
  const subtitulo = document.querySelector(".topbar p");
  const nuevoBtn = document.querySelector(".new-btn");

  menuItems.forEach(btn => {
    btn.addEventListener("click", () => {
      menuItems.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const texto = btn.textContent.trim();

      titulo.textContent = texto;
      subtitulo.textContent = "Módulo " + texto + " cargado correctamente";
    });
  });

  nuevoBtn.addEventListener("click", () => {
    alert("Formulario de nuevo pedido próximamente.");
  });
});
