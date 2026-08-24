import dotenv from "dotenv";
import path from "path";
import express from "express";
import webpack from "webpack";
import webpackConfig from "./webpack.config.js";
import webpackDevMiddleware from "webpack-dev-middleware";
import webpackHotMiddleware from "webpack-hot-middleware";
import mongoose from "mongoose";
import {fileURLToPath} from "url";

import {auth_router} from "./auth.js";
import video_router from "./video_routes.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = +process.argv[2];
const app = express();
const compiler = webpack(webpackConfig);

mongoose.connect(process.env.DB_CONN_STR)
.then(data => console.log("Database connected"))
.catch(err => {
       console.error(err);
       process.exit(1);
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({extended: true}))
app.use(express.json());

app.use(
       webpackDevMiddleware(compiler, {
              publicPath: webpackConfig.output.publicPath,
              stats: { colors: true },
       })
);

app.use(webpackHotMiddleware(compiler));

app.use("/auth", auth_router);
app.use("/api", video_router);

// app.get("/getAllVideos", (req, res, next) => {
//        db.query("SELECT * FROM videos;", (err, results, fields) => {
//               if (err) next(err);

//               res.status(200).json(results);
//        });
// });

// app.post("/getVideo", async (req, res, next) => {
//        const results = await getVideoFromDB(req.body.id);
//        res.status(200).json(results);
// });

// app.post("/addVideo", async (req, res, next) => {
//        const videoId = req.body.videoId;
//        const part = "snippet,player";

//        if (videoId) {
//               const results = await getVideoFromDB(videoId);
//               if (results.length > 0) {
//                      res.status(200).send("Video is already in the database");
//                      return;
//               }

//               await getYoutubeResponse(part, videoId).then(data => {
//                      if (!data.data.items.length) {
//                             res.status(200).send("Invalid ID");
//                             return;
//                      } 

//                      const videoData = data.data.items[0];
//                      const thumbnails = {};
//                      for (const type in videoData.snippet.thumbnails) {
//                             thumbnails[type] = videoData.snippet.thumbnails[type].url;
//                      }
//                      const params = [videoId, videoData.snippet.title, JSON.stringify(thumbnails)];
                     
//                      db.query("INSERT INTO videos (videoId, title, thumbnails) VALUES (?, ?, ?);", params, (err, results) => {
//                             if (err) next(err);

//                             res.status(200).send("Video added");
//                      });
//               })
//               .catch(err => next(err));
//        }
//        else {
//               next(new Error("Video ID not Found"));
//        }
// });

// app.delete("/deleteVideo", (req, res, next) => {
//        const id = req.body.id;

//        if (id) {
//               db.query("DELETE FROM videos WHERE id = ?", [id], (err, results) => {
//                      if (err) next(err);

//                      res.status(200).send(`Deleted Video ${id}`);
//               });
//        }
//        else {
//               next(new Error("ID not Found"));
//        }
// });

// app.post("/getPlaylistData", async (req, res, next) => {
//        const reqType = req.body.reqType;
//        let query;
//        const params = [];

//        if (!reqType) {
//               res.status(200).send("Request type not provided");
//               return;
//        }

//        switch (reqType) {
//               case "playlists":
//                      query = "SELECT * FROM playlists;";
//                      break;
//               case "playlist_videos":
//                      query = "SELECT * FROM playlist_videos;";
//                      break;
//               case "fullPlaylistsData":
//                      query = "SELECT p.id AS playlistId, p.name as playlistName, JSON_ARRAYAGG(v.id) AS videos FROM playlists p LEFT JOIN playlist_videos pv ON p.id = pv.playlistId LEFT JOIN videos v ON pv.videoId = v.id GROUP BY p.id;";
//                      break;
//               default:
//                      next(new Error("Invaid request type"));
//                      return;
//        }

//        db.query(query, params, (err, results) => {
//               if (err) next(err);

//               res.status(200).json(results);
//        });
// });

// app.post("/addPlaylist", (req, res, next) => {
//        db.query("INSERT INTO playlists (name) VALUES (?);", [req.body.playlistName], (err, results) => {
//               if (err) next(err);

//               res.status(200).json({playlistId: results.insertId, message: "Playlist Added"});
//        });
// });

// app.delete("/deletePlaylist", (req, res, next) => {
//        db.query("DELETE FROM playlists WHERE id = ?;", [req.body.playlistId], (err, results) => {
//               if (err) next(err);

//               res.status(200).send("Playlist removed");
//        });
// });

// app.patch("/updatePlaylist", async (req, res, next) => {
//        try {
//               const data = req.body;

//               const addVideoObj = data["add"] || {videoIds: []};
//               const addPromises = [];
//               let playlistId = addVideoObj.playlistId || -1;

//               for (const videoId of addVideoObj.videoIds) {
//                      addPromises.push(new Promise((resolve, reject) => {
//                             db.query("INSERT INTO playlist_videos (playlistId, videoId) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM playlist_videos WHERE playlistId = ? AND videoId = ?);", [playlistId, videoId, playlistId, videoId], (err, results) => {
//                                    if (err) reject(err);

//                                    resolve(results);
//                             });
//                      }));
//               }
//               await Promise.all(addPromises);

//               const removeVideoObj = data["remove"] || {videoIds: []};
//               const removePromises = [];
//               playlistId = removeVideoObj.playlistId || -1;

//               for (const videoId of removeVideoObj.videoIds) {
//                      removePromises.push(new Promise((resolve, reject) => {
//                             db.query("DELETE FROM playlist_videos WHERE playlistId = ? AND videoId = ?;", [playlistId, videoId], (err, results) => {
//                                    if (err) reject(err);

//                                    resolve(results);
//                             });
//                      }));
//               }
//               await Promise.all(removePromises);

//               res.status(200).send("Process completed");
//        }
//        catch (err) {
//               next(err);
//        }
// });

app.get("*", (req, res) => {
       res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
       console.error(err);
       res.status(err.statusCode || 500).send(err.message || "Something unexpected happened");
});

app.listen(PORT, (err) => {
       if (err) console.error(err);
       console.log("Server running on PORT:", PORT);
});