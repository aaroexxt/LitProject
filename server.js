/*
Main.js - Contains main server file
*/

/*
 * Copyright (c) Aaron Becker
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial expressApplications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    expressAppreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */
/*
TODOS
proper client close
 */

/* Dependency initialization */

const fs = require("fs");
const path = require("path");
const express = require("express");
const ejs = require("ejs");
const expressApp = express();
const http = require("http").Server(expressApp);
const io = require("socket.io")(http, {
  cors: {
    origin: "http://localhost",
    methods: ["GET", "POST"],
  },
  pingTimeout: 180000,
  pingInterval: 25000,
});

//Addtl core deps
const RequestHandler = require("./core/requestHandler.js");

let currentState = "reset";
let clientCount = 0;
let userChoices = {};
io.on("connection", (client) => {
  clientCount++;
  io.emit("console-client-count", clientCount);
  if (currentState == "reset") {
    io.emit("demo-change", "reset");
  } else {
    io.emit("demo-change", "wait");
  }

  client.on("console-event", (event) => {
    if (typeof event != "undefined" && typeof event.name != "undefined") {
      console.log("got console event: ", event.name);

      switch (event.name) {
        case "reset-responses":
          let uKeys = Object.keys(userChoices);
          for (let i = 0; i < uKeys.length; i++) {
            userChoices[uKeys[i]] = [];
          }
          io.emit("console-event-done", "Reset responses OK");
          break;
        default:
          currentState = event.name;
          userChoices[currentState] = [];
          io.emit("demo-change", currentState);

          io.emit(
            "console-event-done",
            "Successfully processed event '" + event.name + "'"
          );
          break;
      }
    }
  });

  client.on("demo-choice", (choice) => {
    userChoices[currentState].push(choice);
  });

  client.on("disconnect", () => {
    clientCount--;
    io.emit("console-client-count", clientCount);
  });
});

setInterval(() => {
  io.emit("console-choices", userChoices);
}, 500);

io.on("close", () => {
  console.log("Client has disconnected");
  clientCount--;
  io.emit("console-client-count", clientCount);
});

expressApp.use(express.static(path.join(__dirname, "assets"))); //define a static assets directory
expressApp.set("view engine", "ejs"); //ejs gang
expressApp.set("views", path.join(__dirname, "views"));

expressApp.get("/status", (req, res) => {
  return res.end(RequestHandler.SUCCESS());
});

expressApp.get("/console", (req, res) => {
  res.render("console");
});

expressApp.get("/client", (req, res) => {
  res.render("client");
});

expressApp.use(function (req, res, next) {
  //anything else that doesn't match those filters
  res.redirect("client");
});

console.log("Starting server");
const port = process.env.PORT || 80;

const server = http.listen(port, () => {
  console.log("LitTester is running on port", server.address().port);
});
