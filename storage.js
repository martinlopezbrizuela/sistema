const BIN_ID = "6a090b2fadc21f119aaf5293";

const API_KEY = "$2a$10$7rFsw/Rs1i.Z39Kt2LYdVuNmfJc0OR5xy706GRKw28q1wUi3tVChK";

async function loadCloud(){

  try{

    const response = await fetch(
      `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
      {
        headers:{
          "X-Master-Key": API_KEY
        }
      }
    );

    const data = await response.json();

    return data.record;

  }catch(error){

    console.error(error);

    return null;
  }

}
