require("dotenv").config();

const { REST, Routes } = require("discord.js");
const {
  GUILD_ID: guildId,
  CLIENT_ID: clientId,
  DISCORD_TOKEN: token,
} = process.env;

const fs = require("node:fs");

const commands = [];
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: "10" }).setToken(token);

// Deploy commands
(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // Use the put method to refresh all commands with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
