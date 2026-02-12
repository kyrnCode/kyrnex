import path from "path";

// Librerias (Kyrn)
import { windowController } from "../modules/windowController/windowController.mjs";
import pathUtils from "../modules/utils/pathUtils.mjs";

const { __dirname, __filename } = pathUtils.getFileDetails(import.meta.url);

windowController.whenReady(async () => {
  const win = await windowController.createWindow({
    id: "kyrnex",
    width: 800,
    height: 600,
    title: "kyrnex",

    // Eventos personalizados
    onEvent: (event, win, id) => {
      // console.log(`Evento ${event} en ventana ${id}`);
    },

    // Todas las opciones de BrowserWindow
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      nodeIntegration: true
    },
  });

  await win.loadFile(path.join(__dirname, "index.html"));
});
