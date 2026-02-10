
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  // Wait a bit for init
  setTimeout(() => {
    console.log("Sending red packet...");
    socket.emit("sendRedPacket", {
      amount: 10,
      count: 2,
      message: "Test Red Packet"
    });
  }, 1000);
});

socket.on("newMessage", (msg) => {
  console.log("Received message:", msg);
  if (msg.type === 'redPacket') {
      console.log("Red Packet sent successfully!");
      process.exit(0);
  }
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
