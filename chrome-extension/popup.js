console.log("🐾 CyberPet popup loaded");

document.addEventListener("DOMContentLoaded", () => {
  const pet = document.getElementById("pet");
  const petGif = document.getElementById("petGif");
  const status = document.getElementById("status");

  // Map of reactions — using GIFs instead of MP4
  const reactions = {
    hover: [
      "assets/reactions/head-tilt.gif",
      "assets/reactions/playful-bounce.gif", 
      "assets/reactions/pat.gif"
    ],
    click: [
      "assets/reactions/upgrade.gif",
      "assets/reactions/evolving.gif",
      "assets/reactions/shielding.gif"
    ]
  };

  let isPlaying = false;

  function playReaction(type) {
    if (isPlaying) return;
    
    isPlaying = true;
    
    // Get random reaction
    const reactionArray = reactions[type];
    const randomReaction = reactionArray[Math.floor(Math.random() * reactionArray.length)];
    const gifSrc = chrome.runtime.getURL(randomReaction);

    console.log(`Playing ${type} reaction:`, gifSrc);

    // Hide the pet icon and show the GIF
    pet.style.display = "none";
    petGif.style.display = "block";
    petGif.src = gifSrc;

    // Reset after delay (GIFs loop infinitely, so we time it)
    const resetDelay = type === 'hover' ? 2000 : 3000;
    setTimeout(() => {
      petGif.style.display = "none";
      pet.style.display = "block";
      isPlaying = false;
      
      if (type === 'hover') {
        status.textContent = "CyberPet is watching over you 🛡️";
      } else {
        status.textContent = "CyberPet is ready for action! 🐾";
      }
    }, resetDelay);
  }

  // Hover effect
  pet.addEventListener("mouseenter", () => {
    status.textContent = "CyberPet noticed you 👀";
    playReaction("hover");
  });

  // Click effect
  pet.addEventListener("click", (e) => {
    e.stopPropagation();
    status.textContent = "CyberPet is activating! 🌟";
    playReaction("click");
  });

  // Preload GIFs for better performance
  function preloadGifs() {
    console.log("Preloading GIFs...");
    Object.values(reactions).flat().forEach(gifSrc => {
      const img = new Image();
      img.src = chrome.runtime.getURL(gifSrc);
    });
  }

  preloadGifs();
});