import{app,auth,db}from"./firebase-module.js";document.addEventListener("DOMContentLoaded",(function(){console.log("Popup script loaded"),auth.onAuthStateChanged((e=>{e?console.log("User is signed in:",e.email):console.log("No user signed in")}))}));