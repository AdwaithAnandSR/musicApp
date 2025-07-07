import * as SQLite from "expo-sqlite";



const db = await SQLite.openDatabaseAsync("musicApp");

console.log(db)