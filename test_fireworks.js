
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  // Wait a bit for init
  setTimeout(() => {
    console.log("Sending fireworks event...");
    socket.emit("sendFireworks");
  }, 1000);
});

socket.on("fireworks", () => {
  console.log("Received fireworks event!");
  process.exit(0);
});

socket.on("error", (err) => {
  console.error("Error received:", err);
  process.exit(1);
});

socket.on("disconnect", () => {
  console.log("Disconnected");
});

// Timeout
setTimeout(() => {
    console.log("Timeout waiting for response");
    process.exit(1);
}, 5000);
