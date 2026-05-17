console.log("KAVAJU ERP iniciado");

async function iniciarSistema(){
  try{
    console.log("Conectando nube...");

    if(typeof loadCloud !== "function"){
      console.error("storage.js no está cargado. Revisá index.html");
      return;
    }

    const datos = await loadCloud();

    console.log("Datos nube:", datos);

    if(!datos){
      console.warn("No llegaron datos desde JSONBin.");
    }

  }catch(error){
    console.error("Error iniciando sistema:", error);
  }
}

iniciarSistema();

document.querySelectorAll(".card").forEach(card=>{
  card.addEventListener("mouseenter",()=>{
    card.style.transform="translateY(-4px)";
    card.style.transition=".2s";
  });

  card.addEventListener("mouseleave",()=>{
    card.style.transform="translateY(0px)";
  });
});

document.querySelectorAll(".menu-item").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".menu-item").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  });
});
