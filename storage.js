const BIN_ID = "6a090b2fadc21f119aaf5293";

/* PEGAR TU API KEY ACA */
const API_KEY = "TU_API_KEY";

const BASE_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

async function loadCloud(){

  try{

    const response = await fetch(
      `${BASE_URL}/latest`,
      {
        headers:{
          "X-Master-Key": API_KEY
        }
      }
    );

    const data = await response.json();

    console.log("Datos cargados:", data);

    return data.record;

  }catch(error){

    console.error("Error cargando nube:", error);

    return null;
  }

}

async function saveCloud(data){

  try{

    const response = await fetch(
      BASE_URL,
      {
        method:"PUT",

        headers:{
          "Content-Type":"application/json",
          "X-Master-Key": API_KEY
        },

        body: JSON.stringify(data)
      }
    );

    const result = await response.json();

    console.log("Datos guardados:", result);

  }catch(error){

    console.error("Error guardando nube:", error);

  }

}
